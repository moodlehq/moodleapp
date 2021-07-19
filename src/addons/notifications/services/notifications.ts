// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Injectable } from '@angular/core';

import { CoreSites, CoreSitesCommonWSOptions } from '@services/sites';
import { CoreWSExternalWarning } from '@services/ws';
import { CoreTextUtils } from '@services/utils/text';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreUser } from '@features/user/services/user';
import { AddonMessages, AddonMessagesMarkMessageReadResult } from '@addons/messages/services/messages';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
import { CoreLogger } from '@singletons/logger';
import { makeSingleton } from '@singletons';

const ROOT_CACHE_KEY = 'mmaNotifications:';

/**
 * Service to handle notifications.
 */
@Injectable({ providedIn: 'root' })
export class AddonNotificationsProvider {

    static readonly READ_CHANGED_EVENT = 'addon_notifications_read_changed_event';
    static readonly READ_CRON_EVENT = 'addon_notifications_read_cron_event';
    static readonly PUSH_SIMULATION_COMPONENT = 'AddonNotificationsPushSimulation';
    static readonly LIST_LIMIT = 20;

    protected logger: CoreLogger;

    constructor() {
        this.logger = CoreLogger.getInstance('AddonNotificationsProvider');
    }

    /**
     * Function to format notification data.
     *
     * @param notifications List of notifications.
     * @param read Whether the notifications are read or unread.
     * @return Promise resolved with notifications.
     */
    protected async formatNotificationsData(
        notifications: AddonNotificationsGetMessagesMessage[],
        read?: boolean,
    ): Promise<AddonNotificationsGetMessagesMessageFormatted[]>;
    protected async formatNotificationsData(
        notifications: AddonNotificationsPopupNotification[],
        read?: boolean,
    ): Promise<AddonNotificationsPopupNotificationFormatted[]>;
    protected async formatNotificationsData(
        notifications: (AddonNotificationsGetMessagesMessage | AddonNotificationsPopupNotification)[],
        read?: boolean,
    ): Promise<AddonNotificationsAnyNotification[]> {

        const promises = notifications.map(async (notificationRaw) => {
            const notification = <AddonNotificationsAnyNotification> notificationRaw;

            // Set message to show.
            if (notification.component && notification.component == 'mod_forum') {
                notification.mobiletext = notification.smallmessage;
            } else {
                notification.mobiletext = notification.fullmessage;
            }

            notification.moodlecomponent = notification.component;
            notification.notification = 1;
            notification.notif = 1;
            if (typeof read != 'undefined') {
                notification.read = read;
            }

            if (typeof notification.customdata == 'string') {
                notification.customdata = CoreTextUtils.parseJSON<Record<string, unknown>>(notification.customdata, {});
            }

            // Try to set courseid the notification belongs to.
            if (notification.customdata?.courseid) {
                notification.courseid = <number> notification.customdata.courseid;
            } else if (!notification.courseid) {
                const courseIdMatch = notification.fullmessagehtml.match(/course\/view\.php\?id=([^"]*)/);
                if (courseIdMatch?.[1]) {
                    notification.courseid = parseInt(courseIdMatch[1], 10);
                }
            }

            if (notification.useridfrom > 0) {
                // Try to get the profile picture of the user.
                try {
                    const user = await CoreUser.getProfile(notification.useridfrom, notification.courseid, true);

                    notification.profileimageurlfrom = user.profileimageurl;
                    notification.userfromfullname = user.fullname;
                } catch {
                    // Error getting user. This can happen if device is offline or the user is deleted.
                }
            }

            return notification;
        });

        return Promise.all(promises);
    }

    /**
     * Get the cache key for the get notification preferences call.
     *
     * @return Cache key.
     */
    protected getNotificationPreferencesCacheKey(): string {
        return ROOT_CACHE_KEY + 'notificationPreferences';
    }

    /**
     * Get notification preferences.
     *
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved with the notification preferences.
     */
    async getNotificationPreferences(siteId?: string): Promise<AddonNotificationsPreferences> {
        this.logger.debug('Get notification preferences');

        const site = await CoreSites.getSite(siteId);
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getNotificationPreferencesCacheKey(),
            updateFrequency: CoreSite.FREQUENCY_SOMETIMES,
        };

        const data = await site.read<AddonNotificationsGetUserNotificationPreferencesResult>(
            'core_message_get_user_notification_preferences',
            {},
            preSets,
        );

        return data.preferences;
    }

    /**
     * Get cache key for notification list WS calls.
     *
     * @return Cache key.
     */
    protected getNotificationsCacheKey(): string {
        return ROOT_CACHE_KEY + 'list';
    }

    /**
     * Get notifications from site.
     *
     * @param read True if should get read notifications, false otherwise.
     * @param offset Position of the first notification to get.
     * @param options Other options.
     * @return Promise resolved with notifications.
     */
    async getNotifications(
        read: boolean,
        offset: number,
        options?: AddonNotificationsGetNotificationsOptions,
    ): Promise<AddonNotificationsGetMessagesMessageFormatted[]> {
        options = options || {};
        options.limit = options.limit || AddonNotificationsProvider.LIST_LIMIT;

        this.logger.debug(`Get ${(read ? 'read' : 'unread')} notifications from ${offset}. Limit: ${options.limit}`);

        const site = await CoreSites.getSite(options.siteId);
        const data: AddonNotificationsGetMessagesWSParams = {
            useridto: site.getUserId(),
            useridfrom: 0,
            type: 'notifications',
            read: !!read,
            newestfirst: true,
            limitfrom: offset,
            limitnum: options.limit,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getNotificationsCacheKey(),
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        // Get unread notifications.
        const response = await site.read<AddonNotificationsGetMessagesWSResponse>('core_message_get_messages', data, preSets);

        const notifications = response.messages;

        return this.formatNotificationsData(notifications, read);
    }

    /**
     * Get notifications from site using the new WebService.
     *
     * @param offset Position of the first notification to get.
     * @param options Other options.
     * @return Promise resolved with notifications and if can load more.
     * @since 3.2
     */
    async getPopupNotifications(
        offset: number,
        options?: AddonNotificationsGetNotificationsOptions,
    ): Promise<{notifications: AddonNotificationsPopupNotificationFormatted[]; canLoadMore: boolean}> {
        options = options || {};
        options.limit = options.limit || AddonNotificationsProvider.LIST_LIMIT;

        this.logger.debug(`Get popup notifications from ${offset}. Limit: ${options.limit}`);

        const site = await CoreSites.getSite(options.siteId);
        const data: AddonNotificationsPopupGetPopupNotificationsWSParams = {
            useridto: site.getUserId(),
            newestfirst: true,
            offset,
            limit: options.limit + 1, // Get one more to calculate canLoadMore.
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getNotificationsCacheKey(),
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        // Get notifications.
        const response = await site.read<AddonNotificationsGetPopupNotificationsResult>(
            'message_popup_get_popup_notifications',
            data,
            preSets,
        );

        const notifications = await this.formatNotificationsData(response.notifications.slice(0, options.limit));

        return {
            canLoadMore: response.notifications.length > options.limit,
            notifications,
        };
    }

    /**
     * Get read notifications from site.
     *
     * @param offset Position of the first notification to get.
     * @param options Other options.
     * @return Promise resolved with notifications.
     */
    getReadNotifications(
        offset: number,
        options?: AddonNotificationsGetNotificationsOptions,
    ): Promise<AddonNotificationsGetMessagesMessageFormatted[]> {
        return this.getNotifications(true, offset, options);
    }

    /**
     * Get unread notifications from site.
     *
     * @param offset Position of the first notification to get.
     * @param options Other options.
     * @return Promise resolved with notifications.
     */
    getUnreadNotifications(
        offset: number,
        options?: AddonNotificationsGetNotificationsOptions,
    ): Promise<AddonNotificationsGetMessagesMessageFormatted[]> {
        return this.getNotifications(false, offset, options);
    }

    /**
     * Get unread notifications count. Do not cache calls.
     *
     * @param userId The user id who received the notification. If not defined, use current user.
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved with the message notifications count.
     */
    async getUnreadNotificationsCount(userId?: number, siteId?: string): Promise<number> {
        const site = await CoreSites.getSite(siteId);

        // @since 3.2
        if (site.wsAvailable('message_popup_get_unread_popup_notification_count')) {
            userId = userId || site.getUserId();
            const params: AddonNotificationsPopupGetUnreadPopupNotificationCountWSParams = {
                useridto: userId,
            };
            const preSets: CoreSiteWSPreSets = {
                getFromCache: false,
                emergencyCache: false,
                saveToCache: false,
                typeExpected: 'number',
            };

            try {
                return await site.read<number>('message_popup_get_unread_popup_notification_count', params, preSets);
            } catch {
                // Return no messages if the call fails.
                return 0;
            }
        }

        // Fallback call
        try {
            const unread = await this.getUnreadNotifications(0, { limit: AddonNotificationsProvider.LIST_LIMIT, siteId });

            // The app used to add a + sign if needed, but 3.1 will be dropped soon so it's easier to always return a number.
            return unread.length;
        } catch {
            // Return no messages if the call fails.
            return 0;
        }
    }

    /**
     * Returns whether or not popup WS is available for a certain site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with true if available, resolved with false or rejected otherwise.
     * @since 3.2
     */
    async isPopupAvailable(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return site.wsAvailable('message_popup_get_popup_notifications');
    }

    /**
     * Mark all message notification as read.
     *
     * @return Resolved when done.
     * @since 3.2
     */
    async markAllNotificationsAsRead(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        const params: CoreMessageMarkAllNotificationsAsReadWSParams = {
            useridto: CoreSites.getCurrentSiteUserId(),
        };

        return site.write<boolean>('core_message_mark_all_notifications_as_read', params);
    }

    /**
     * Mark a single notification as read.
     *
     * @param notificationId ID of notification to mark as read
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     * @since 3.5
     */
    async markNotificationRead(
        notificationId: number,
        siteId?: string,
    ): Promise<CoreMessageMarkNotificationReadWSResponse | AddonMessagesMarkMessageReadResult> {

        const site = await CoreSites.getSite(siteId);

        if (site.wsAvailable('core_message_mark_notification_read')) {
            const params: CoreMessageMarkNotificationReadWSParams = {
                notificationid: notificationId,
                timeread: CoreTimeUtils.timestamp(),
            };

            return site.write<CoreMessageMarkNotificationReadWSResponse>('core_message_mark_notification_read', params);
        } else {
            // Fallback for versions prior to 3.5.
            return AddonMessages.markMessageRead(notificationId, site.id);
        }
    }

    /**
     * Invalidate get notification preferences.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when data is invalidated.
     */
    async invalidateNotificationPreferences(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getNotificationPreferencesCacheKey());
    }

    /**
     * Invalidates notifications list WS calls.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the list is invalidated.
     */
    async invalidateNotificationsList(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getNotificationsCacheKey());
    }

    /**
     * Returns whether or not we can mark all notifications as read.
     *
     * @return True if enabled, false otherwise.
     * @since 3.2
     */
    isMarkAllNotificationsAsReadEnabled(): boolean {
        return CoreSites.wsAvailableInCurrentSite('core_message_mark_all_notifications_as_read');
    }

    /**
     * Returns whether or not we can count unread notifications precisely.
     *
     * @return True if enabled, false otherwise.
     * @since 3.2
     */
    isPreciseNotificationCountEnabled(): boolean {
        return CoreSites.wsAvailableInCurrentSite('message_popup_get_unread_popup_notification_count');
    }

    /**
     * Returns whether or not the notification preferences are enabled for the current site.
     *
     * @return True if enabled, false otherwise.
     * @since 3.2
     */
    isNotificationPreferencesEnabled(): boolean {
        return CoreSites.wsAvailableInCurrentSite('core_message_get_user_notification_preferences');
    }

}

export const AddonNotifications = makeSingleton(AddonNotificationsProvider);

/**
 * Preferences returned by core_message_get_user_notification_preferences.
 */
export type AddonNotificationsPreferences = {
    userid: number; // User id.
    disableall: number | boolean; // Whether all the preferences are disabled.
    processors: AddonNotificationsPreferencesProcessor[]; // Config form values.
    components: AddonNotificationsPreferencesComponent[]; // Available components.
    enableall?: boolean; // Calculated in the app. Whether all the preferences are enabled.
};

/**
 * Processor in notification preferences.
 */
export type AddonNotificationsPreferencesProcessor = {
    displayname: string; // Display name.
    name: string; // Processor name.
    hassettings: boolean; // Whether has settings.
    contextid: number; // Context id.
    userconfigured: number; // Whether is configured by the user.
};

/**
 * Component in notification preferences.
 */
export type AddonNotificationsPreferencesComponent = {
    displayname: string; // Display name.
    notifications: AddonNotificationsPreferencesNotification[]; // List of notificaitons for the component.
};

/**
 * Notification processor in notification preferences component.
 */
export type AddonNotificationsPreferencesNotification = {
    displayname: string; // Display name.
    preferencekey: string; // Preference key.
    processors: AddonNotificationsPreferencesNotificationProcessor[]; // Processors values for this notification.
};

/**
 * Notification processor in notification preferences component.
 */
export type AddonNotificationsPreferencesNotificationProcessor = {
    displayname: string; // Display name.
    name: string; // Processor name.
    locked: boolean; // Is locked by admin?.
    lockedmessage?: string; // @since 3.6. Text to display if locked.
    userconfigured: number; // Is configured?.
    loggedin: AddonNotificationsPreferencesNotificationProcessorState;
    loggedoff: AddonNotificationsPreferencesNotificationProcessorState;
};

/**
 * State in notification processor in notification preferences component.
 */
export type AddonNotificationsPreferencesNotificationProcessorState = {
    name: string; // Name.
    displayname: string; // Display name.
    checked: boolean; // Is checked?.
};

/**
 * Params of core_message_get_messages WS.
 */
export type AddonNotificationsGetMessagesWSParams = {
    useridto: number; // The user id who received the message, 0 for any user.
    useridfrom?: number; // The user id who send the message, 0 for any user. -10 or -20 for no-reply or support user.
    type?: string; // Type of message to return, expected values are: notifications, conversations and both.
    read?: boolean; // True for getting read messages, false for unread.
    newestfirst?: boolean; // True for ordering by newest first, false for oldest first.
    limitfrom?: number; // Limit from.
    limitnum?: number; // Limit number.
};

/**
 * Data returned by core_message_get_messages WS.
 */
export type AddonNotificationsGetMessagesWSResponse = {
    messages: AddonNotificationsGetMessagesMessage[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Message data returned by core_message_get_messages.
 */
export type AddonNotificationsGetMessagesMessage = {
    id: number; // Message id.
    useridfrom: number; // User from id.
    useridto: number; // User to id.
    subject: string; // The message subject.
    text: string; // The message text formated.
    fullmessage: string; // The message.
    fullmessageformat: number; // Fullmessage format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    fullmessagehtml: string; // The message in html.
    smallmessage: string; // The shorten message.
    notification: number; // Is a notification?.
    contexturl: string; // Context URL.
    contexturlname: string; // Context URL link name.
    timecreated: number; // Time created.
    timeread: number; // Time read.
    usertofullname: string; // User to full name.
    userfromfullname: string; // User from full name.
    component?: string; // @since 3.7. The component that generated the notification.
    eventtype?: string; // @since 3.7. The type of notification.
    customdata?: string; // @since 3.7. Custom data to be passed to the message processor.
};

/**
 * Message data returned by core_message_get_messages with some calculated data.
 */
export type AddonNotificationsGetMessagesMessageFormatted =
        Omit<AddonNotificationsGetMessagesMessage, 'customdata'> & AddonNotificationsNotificationCalculatedData;

/**
 * Params of message_popup_get_popup_notifications WS.
 */
export type AddonNotificationsPopupGetPopupNotificationsWSParams = {
    useridto: number; // The user id who received the message, 0 for current user.
    newestfirst?: boolean; // True for ordering by newest first, false for oldest first.
    limit?: number; // The number of results to return.
    offset?: number; // Offset the result set by a given amount.
};

/**
 * Result of WS message_popup_get_popup_notifications.
 */
export type AddonNotificationsGetPopupNotificationsResult = {
    notifications: AddonNotificationsPopupNotification[];
    unreadcount: number; // The number of unread message for the given user.
};

/**
 * Notification returned by message_popup_get_popup_notifications.
 */
export type AddonNotificationsPopupNotification = {
    id: number; // Notification id (this is not guaranteed to be unique within this result set).
    useridfrom: number; // User from id.
    useridto: number; // User to id.
    subject: string; // The notification subject.
    shortenedsubject: string; // The notification subject shortened with ellipsis.
    text: string; // The message text formated.
    fullmessage: string; // The message.
    fullmessageformat: number; // Fullmessage format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    fullmessagehtml: string; // The message in html.
    smallmessage: string; // The shorten message.
    contexturl: string; // Context URL.
    contexturlname: string; // Context URL link name.
    timecreated: number; // Time created.
    timecreatedpretty: string; // Time created in a pretty format.
    timeread: number; // Time read.
    read: boolean; // Notification read status.
    deleted: boolean; // Notification deletion status.
    iconurl: string; // URL for notification icon.
    component?: string; // The component that generated the notification.
    eventtype?: string; // The type of notification.
    customdata?: string; // @since 3.7. Custom data to be passed to the message processor.
};

/**
 * Notification returned by message_popup_get_popup_notifications.
 */
export type AddonNotificationsPopupNotificationFormatted =
        Omit<AddonNotificationsPopupNotification, 'customdata'> & AddonNotificationsNotificationCalculatedData;

/**
 * Any kind of notification that can be retrieved.
 */
export type AddonNotificationsAnyNotification =
        AddonNotificationsPopupNotificationFormatted | AddonNotificationsGetMessagesMessageFormatted;

/**
 * Result of WS core_message_get_user_notification_preferences.
 */
export type AddonNotificationsGetUserNotificationPreferencesResult = {
    preferences: AddonNotificationsPreferences;
    warnings?: CoreWSExternalWarning[];
};

/**
 * Calculated data for messages returned by core_message_get_messages.
 */
export type AddonNotificationsNotificationCalculatedData = {
    mobiletext?: string; // Calculated in the app. Text to display for the notification.
    moodlecomponent?: string; // Calculated in the app. Moodle's component.
    notif?: number; // Calculated in the app. Whether it's a notification.
    notification?: number; // Calculated in the app in some cases. Whether it's a notification.
    read?: boolean; // Calculated in the app. Whether the notifications is read.
    courseid?: number; // Calculated in the app. Course the notification belongs to.
    profileimageurlfrom?: string; // Calculated in the app. Avatar of user that sent the notification.
    userfromfullname?: string; // Calculated in the app in some cases. User from full name.
    customdata?: Record<string, unknown>; // Parsed custom data.
};

/**
 * Params of message_popup_get_unread_popup_notification_count WS.
 */
export type AddonNotificationsPopupGetUnreadPopupNotificationCountWSParams = {
    useridto: number; // The user id who received the message, 0 for any user.
};

/**
 * Params of core_message_mark_all_notifications_as_read WS.
 */
export type CoreMessageMarkAllNotificationsAsReadWSParams = {
    useridto: number; // The user id who received the message, 0 for any user.
    useridfrom?: number; // The user id who send the message, 0 for any user. -10 or -20 for no-reply or support user.
    timecreatedto?: number; // Mark messages created before this time as read, 0 for all messages.
};

/**
 * Params of core_message_mark_notification_read WS.
 */
export type CoreMessageMarkNotificationReadWSParams = {
    notificationid: number; // Id of the notification.
    timeread?: number; // Timestamp for when the notification should be marked read.
};

/**
 * Data returned by core_message_mark_notification_read WS.
 */
export type CoreMessageMarkNotificationReadWSResponse = {
    notificationid: number; // Id of the notification.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Options to pass to getNotifications and getPopupNotifications.
 */
export type AddonNotificationsGetNotificationsOptions = CoreSitesCommonWSOptions & {
    limit?: number; // Number of notifications to get. Defaults to LIST_LIMIT.
};
