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
import { CoreText } from '@singletons/text';
import { CoreTime } from '@singletons/time';
import { CoreUser, USER_NOREPLY_USER } from '@features/user/services/user';
import { CoreLogger } from '@singletons/logger';
import { Translate, makeSingleton } from '@singletons';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { AddonNotificationsPushNotification } from './handlers/push-click';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CoreCacheUpdateFrequency } from '@/core/constants';

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [AddonNotificationsProvider.READ_CHANGED_EVENT]: AddonNotificationsReadChangedEvent;
    }

}

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
     * Convert a push notification data to use the same format as the get_messages WS.
     *
     * @param notification Push notification to convert.
     * @returns Converted notification.
     */
    async convertPushToMessage(
        notification: AddonNotificationsPushNotification,
    ): Promise<AddonNotificationsNotificationMessageFormatted> {
        const message = notification.message ?? '';
        const siteInfo = CoreSites.getCurrentSite()?.getInfo();

        if (notification.senderImage && notification.customdata && !notification.customdata.notificationiconurl) {
            notification.customdata.notificationiconurl = notification.senderImage;
        }

        const notificationMessage: AddonNotificationsNotificationMessage = {
            id: notification.savedmessageid || notification.id || 0,
            useridfrom: notification.userfromid ? Number(notification.userfromid) : USER_NOREPLY_USER,
            userfromfullname: notification.userfromfullname ?? Translate.instant('core.noreplyname'),
            useridto: notification.usertoid ? Number(notification.usertoid) : (siteInfo?.userid ?? 0),
            usertofullname: siteInfo?.fullname ?? '',
            subject: notification.title ?? '',
            text: message,
            fullmessage: message,
            fullmessageformat: 1,
            fullmessagehtml: message,
            smallmessage: message,
            notification: Number(notification.notif ?? 1),
            contexturl: notification.contexturl || null,
            contexturlname: null,
            timecreated: Number(notification.date ?? 0),
            timeread: 0,
            component: notification.moodlecomponent,
            customdata: notification.customdata ? JSON.stringify(notification.customdata) : undefined,
        };

        const formatted = await this.formatNotificationsData([notificationMessage]);

        return formatted[0];
    }

    /**
     * Function to format notification data.
     *
     * @param notifications List of notifications.
     * @returns Promise resolved with notifications.
     */
    async formatNotificationsData(
        notifications: AddonNotificationsNotificationMessage[],
    ): Promise<AddonNotificationsNotificationMessageFormatted[]> {

        const promises = notifications.map(async (notificationRaw) => {
            const notification = <AddonNotificationsNotificationMessageFormatted> notificationRaw;

            notification.mobiletext = notification.fullmessagehtml || notification.fullmessage || notification.smallmessage || '';
            notification.moodlecomponent = notification.component;
            notification.notification = 1;
            notification.notif = 1;
            notification.read = notification.timeread > 0;

            if (typeof notification.customdata === 'string') {
                notification.customdata = CoreText.parseJSON<Record<string, string|number>>(notification.customdata, {});
            }

            // Try to set courseid the notification belongs to.
            if (notification.customdata?.courseid) {
                notification.courseid = <number> notification.customdata.courseid;
            } else if (!notification.courseid) {
                const courseIdMatch = notification.fullmessagehtml?.match(/course\/view\.php\?id=([^"]*)/);
                if (courseIdMatch?.[1]) {
                    notification.courseid = parseInt(courseIdMatch[1], 10);
                }
            }

            if (!notification.iconurl) {
                // The iconurl is only returned in 4.0 or above. Calculate it if not present.
                if (notification.moodlecomponent && notification.moodlecomponent.startsWith('mod_')) {
                    notification.iconurl = await CoreCourseModuleDelegate.getModuleIconSrc(
                        notification.moodlecomponent.replace('mod_', ''),
                    );
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
            } else {
                // Do not assign avatar for newlogin notifications.
                if (notification.eventtype !== 'newlogin') {
                    const imgUrl = notification.customdata?.notificationpictureurl || notification.customdata?.notificationiconurl;
                    notification.imgUrl = imgUrl ? String(imgUrl) : undefined;
                }
            }

            return notification;
        });

        return Promise.all(promises);
    }

    /**
     * Get the cache key for the get notification preferences call.
     *
     * @returns Cache key.
     */
    protected getNotificationPreferencesCacheKey(): string {
        return ROOT_CACHE_KEY + 'notificationPreferences';
    }

    /**
     * Get notification preferences.
     *
     * @param options Options.
     * @returns Promise resolved with the notification preferences.
     */
    async getNotificationPreferences(options: CoreSitesCommonWSOptions = {}): Promise<AddonNotificationsPreferences> {
        this.logger.debug('Get notification preferences');

        const site = await CoreSites.getSite(options.siteId);
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getNotificationPreferencesCacheKey(),
            updateFrequency: CoreCacheUpdateFrequency.SOMETIMES,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
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
     * @returns Cache key.
     */
    protected getNotificationsCacheKey(): string {
        return ROOT_CACHE_KEY + 'list';
    }

    /**
     * Get notifications from site.
     *
     * @param read True if should get read notifications, false otherwise.
     * @param options Other options.
     * @returns Promise resolved with notifications.
     */
    async getNotificationsWithStatus(
        read: AddonNotificationsGetReadType,
        options: AddonNotificationsGetNotificationsOptions = {},
    ): Promise<AddonNotificationsNotificationMessageFormatted[]> {
        options.offset = options.offset || 0;
        options.limit = options.limit || AddonNotificationsProvider.LIST_LIMIT;

        const typeText = read === AddonNotificationsGetReadType.READ ?
            'read' :
            (read === AddonNotificationsGetReadType.UNREAD ? 'unread' : 'read and unread');
        this.logger.debug(`Get ${typeText} notifications from ${options.offset}. Limit: ${options.limit}`);

        const site = await CoreSites.getSite(options.siteId);

        const data: AddonNotificationsGetMessagesWSParams = {
            useridto: site.getUserId(),
            useridfrom: 0,
            type: 'notifications',
            read: read,
            newestfirst: true,
            limitfrom: options.offset,
            limitnum: options.limit,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getNotificationsCacheKey(),
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        // Get unread notifications.
        const response = await site.read<AddonNotificationsGetMessagesWSResponse>('core_message_get_messages', data, preSets);

        const notifications = response.messages;

        return this.formatNotificationsData(notifications);
    }

    /**
     * Get unread notifications count. Do not cache calls.
     *
     * @param userId The user id who received the notification. If not defined, use current user.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved with the message notifications count.
     */
    async getUnreadNotificationsCount(userId?: number, siteId?: string): Promise<{ count: number; hasMore: boolean} > {
        const site = await CoreSites.getSite(siteId);

        // @since 4.0
        if (site.wsAvailable('core_message_get_unread_notification_count')) {
            const params: CoreMessageGetUnreadNotificationCountWSParams = {
                useridto: userId || site.getUserId(),
            };

            const preSets: CoreSiteWSPreSets = {
                cacheKey: this.getUnreadNotificationsCountCacheKey(params.useridto),
                getFromCache: false, // Always try to get the latest number.
                typeExpected: 'number',
            };

            try {
                const count = await site.read<number>('core_message_get_unread_notification_count', params, preSets);

                return {
                    count,
                    hasMore: false,
                };
            } catch {
                // Return no notifications if the call fails.
                return {
                    count: 0,
                    hasMore: false,
                };
            }
        }

        // Fallback call
        try {
            const unread = await this.getNotificationsWithStatus(AddonNotificationsGetReadType.UNREAD, {
                limit: AddonNotificationsProvider.LIST_LIMIT + 1,
                siteId,
            });

            return {
                count: Math.min(unread.length, AddonNotificationsProvider.LIST_LIMIT),
                hasMore: unread.length > AddonNotificationsProvider.LIST_LIMIT,
            };
        } catch {
            // Return no notifications if the call fails.
            return {
                count: 0,
                hasMore: false,
            };
        }
    }

    /**
     * Get cache key for unread notifications count WS calls.
     *
     * @param userId User ID.
     * @returns Cache key.
     */
    protected getUnreadNotificationsCountCacheKey(userId: number): string {
        return `${ROOT_CACHE_KEY}count:${userId}`;
    }

    /**
     * Mark all message notification as read.
     *
     * @returns Resolved when done.
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
     * @returns Promise resolved when done.
     */
    async markNotificationRead(
        notificationId: number,
        siteId?: string,
    ): Promise<CoreMessageMarkNotificationReadWSResponse> {

        const site = await CoreSites.getSite(siteId);

        const params: CoreMessageMarkNotificationReadWSParams = {
            notificationid: notificationId,
            timeread: CoreTime.timestamp(),
        };

        return site.write<CoreMessageMarkNotificationReadWSResponse>('core_message_mark_notification_read', params);
    }

    /**
     * Invalidate get notification preferences.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when data is invalidated.
     */
    async invalidateNotificationPreferences(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getNotificationPreferencesCacheKey());
    }

    /**
     * Invalidates notifications list WS calls.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the list is invalidated.
     */
    async invalidateNotificationsList(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getNotificationsCacheKey());
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
    enabled?: boolean; // @since 4.0. Processor enabled.
    loggedin: AddonNotificationsPreferencesNotificationProcessorState; // @deprecatedonmoodle since 4.0.
    loggedoff: AddonNotificationsPreferencesNotificationProcessorState; // @deprecatedonmoodle since 4.0.
};

/**
 * State in notification processor in notification preferences component.
 *
 * @deprecatedonmoodle since 4.0
 */
export type AddonNotificationsPreferencesNotificationProcessorState = {
    name: 'loggedoff' | 'loggedin'; // Name.
    displayname: string; // Display name.
    checked: boolean; // Is checked?.
};

export type AddonNotificationsPreferencesNotificationProcessorStateSetting = 'loggedoff' | 'loggedin' | 'enabled';

/**
 * Params of core_message_get_messages WS.
 */
export type AddonNotificationsGetMessagesWSParams = {
    useridto: number; // The user id who received the message, 0 for any user.
    useridfrom?: number; // The user id who send the message, 0 for any user. -10 or -20 for no-reply or support user.
    type?: string; // Type of message to return, expected values are: notifications, conversations and both.
    read?: AddonNotificationsGetReadType; // 0=unread, 1=read. @since 4.0 it also accepts 2=both.
    newestfirst?: boolean; // True for ordering by newest first, false for oldest first.
    limitfrom?: number; // Limit from.
    limitnum?: number; // Limit number.
};

/**
 * Data returned by core_message_get_messages WS.
 */
export type AddonNotificationsGetMessagesWSResponse = {
    messages: AddonNotificationsNotificationMessage[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Message data returned by core_message_get_messages.
 */
export type AddonNotificationsNotificationMessage = {
    id: number; // Message id.
    useridfrom: number; // User from id.
    useridto: number; // User to id.
    subject: string; // The message subject.
    text: string; // The message text formated.
    fullmessage: string | null; // The message.
    fullmessageformat: number | null; // Fullmessage format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    fullmessagehtml: string | null; // The message in html.
    smallmessage: string | null; // The shorten message.
    notification: number; // Is a notification?.
    contexturl: string | null; // Context URL.
    contexturlname: string | null; // Context URL link name.
    timecreated: number; // Time created.
    timeread: number; // Time read.
    usertofullname: string; // User to full name.
    userfromfullname: string; // User from full name.
    component?: string; // @since 3.7. The component that generated the notification.
    eventtype?: string; // @since 3.7. The type of notification.
    customdata?: string; // @since 3.7. Custom data to be passed to the message processor.
    iconurl?: string; // @since 4.0. Icon URL, only for notifications.
};

/**
 * Message data returned by core_message_get_messages with some calculated data.
 */
export type AddonNotificationsNotificationMessageFormatted =
        Omit<AddonNotificationsNotificationMessage, 'customdata'> & AddonNotificationsNotificationCalculatedData;

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
    mobiletext: string; // Calculated in the app. Text to display for the notification.
    moodlecomponent?: string; // Calculated in the app. Moodle's component.
    notif: number; // Calculated in the app. Whether it's a notification.
    notification: number; // Calculated in the app in some cases. Whether it's a notification.
    read: boolean; // Calculated in the app. Whether the notifications is read.
    courseid?: number; // Calculated in the app. Course the notification belongs to.
    profileimageurlfrom?: string; // Calculated in the app. Avatar of user that sent the notification.
    userfromfullname?: string; // Calculated in the app in some cases. User from full name.
    customdata?: Record<string, string|number>; // Parsed custom data.
    imgUrl?: string; // Calculated in the app. URL of the image to use if the notification has no real user from.
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
 * Params of core_message_get_unread_notification_count WS.
 */
export type CoreMessageGetUnreadNotificationCountWSParams = {
    useridto: number; // User id who received the notification, 0 for any user.
};

/**
 * Options to pass to getNotifications.
 */
export type AddonNotificationsGetNotificationsOptions = CoreSitesCommonWSOptions & {
    offset?: number; // Offset to use. Defaults to 0.
    limit?: number; // Number of notifications to get. Defaults to LIST_LIMIT.
};

/**
 * Constants to get either read, unread or both notifications.
 */
export enum AddonNotificationsGetReadType {
    UNREAD = 0,
    READ = 1,
    BOTH = 2,
}

/**
 * Event triggered when one or more notifications are read.
 */
export type AddonNotificationsReadChangedEvent = {
    id?: number; // Set to the single id notification read. Undefined if multiple.
    time: number; // Time of the change.
};
