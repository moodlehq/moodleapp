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
import { CoreAppProvider } from '@providers/app';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUserProvider } from '@core/user/providers/user';
import { CoreEmulatorHelperProvider } from '@core/emulator/providers/helper';
import { AddonMessagesProvider, AddonMessagesMarkMessageReadResult } from '@addon/messages/providers/messages';
import { CoreSite } from '@classes/site';
import { CoreWSExternalWarning } from '@providers/ws';

/**
 * Service to handle notifications.
 */
@Injectable()
export class AddonNotificationsProvider {

    static READ_CHANGED_EVENT = 'addon_notifications_read_changed_event';
    static READ_CRON_EVENT = 'addon_notifications_read_cron_event';
    static PUSH_SIMULATION_COMPONENT = 'AddonNotificationsPushSimulation';
    static LIST_LIMIT = 20;

    protected ROOT_CACHE_KEY = 'mmaNotifications:';
    protected logger;

    constructor(logger: CoreLoggerProvider, private appProvider: CoreAppProvider, private sitesProvider: CoreSitesProvider,
            private timeUtils: CoreTimeUtilsProvider, private userProvider: CoreUserProvider,
            private emulatorHelper: CoreEmulatorHelperProvider, private messageProvider: AddonMessagesProvider,
            private textUtils: CoreTextUtilsProvider) {
        this.logger = logger.getInstance('AddonNotificationsProvider');
    }

    /**
     * Function to format notification data.
     *
     * @param notifications List of notifications.
     * @param read Whether the notifications are read or unread.
     * @return Promise resolved with notifications.
     */
    protected formatNotificationsData(notifications: AddonNotificationsAnyNotification[], read?: boolean): Promise<any> {

        const promises = notifications.map((notification) => {

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
                notification.customdata = this.textUtils.parseJSON(notification.customdata, {});
            }

            // Try to set courseid the notification belongs to.
            if (notification.customdata && notification.customdata.courseid) {
                notification.courseid = notification.customdata.courseid;
            } else if (!notification.courseid) {
                const cid = notification.fullmessagehtml.match(/course\/view\.php\?id=([^"]*)/);
                if (cid && cid[1]) {
                    notification.courseid = parseInt(cid[1], 10);
                }
            }

            if (notification.useridfrom > 0) {
                // Try to get the profile picture of the user.
                return this.userProvider.getProfile(notification.useridfrom, notification.courseid, true).then((user) => {
                    notification.profileimageurlfrom = user.profileimageurl;
                    notification.userfromfullname = user.fullname;

                    return notification;
                }).catch(() => {
                    // Error getting user. This can happen if device is offline or the user is deleted.
                });
            }

            return Promise.resolve(notification);
        });

        return Promise.all(promises);
    }

    /**
     * Get the cache key for the get notification preferences call.
     *
     * @return Cache key.
     */
    protected getNotificationPreferencesCacheKey(): string {
        return this.ROOT_CACHE_KEY + 'notificationPreferences';
    }

    /**
     * Get notification preferences.
     *
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved with the notification preferences.
     */
    getNotificationPreferences(siteId?: string): Promise<AddonNotificationsNotificationPreferences> {
        this.logger.debug('Get notification preferences');

        return this.sitesProvider.getSite(siteId).then((site) => {
            const preSets = {
                cacheKey: this.getNotificationPreferencesCacheKey(),
                    updateFrequency: CoreSite.FREQUENCY_SOMETIMES
            };

            return site.read('core_message_get_user_notification_preferences', {}, preSets)
                    .then((data: AddonNotificationsGetUserNotificationPreferencesResult) => {

                return data.preferences;
            });
        });
    }

    /**
     * Get cache key for notification list WS calls.
     *
     * @return Cache key.
     */
    protected getNotificationsCacheKey(): string {
        return this.ROOT_CACHE_KEY + 'list';
    }

    /**
     * Get notifications from site.
     *
     * @param read True if should get read notifications, false otherwise.
     * @param limitFrom Position of the first notification to get.
     * @param limitNumber Number of notifications to get or 0 to use the default limit.
     * @param toDisplay True if notifications will be displayed to the user, either in view or in a notification.
     * @param forceCache True if it should return cached data. Has priority over ignoreCache.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved with notifications.
     */
    getNotifications(read: boolean, limitFrom: number, limitNumber: number = 0, toDisplay: boolean = true,
            forceCache?: boolean, ignoreCache?: boolean, siteId?: string): Promise<AddonNotificationsGetMessagesMessage[]> {
        limitNumber = limitNumber || AddonNotificationsProvider.LIST_LIMIT;
        this.logger.debug('Get ' + (read ? 'read' : 'unread') + ' notifications from ' + limitFrom + '. Limit: ' + limitNumber);

        return this.sitesProvider.getSite(siteId).then((site) => {
            const data = {
                useridto: site.getUserId(),
                useridfrom: 0,
                type: 'notifications',
                read: read ? 1 : 0,
                newestfirst: 1,
                limitfrom: limitFrom,
                limitnum: limitNumber
            };
            const preSets: object = {
                cacheKey: this.getNotificationsCacheKey(),
                omitExpires: forceCache,
                getFromCache: forceCache || !ignoreCache,
                emergencyCache: forceCache || !ignoreCache,
            };

            // Get unread notifications.
            return site.read('core_message_get_messages', data, preSets).then((response: AddonNotificationsGetMessagesResult) => {
                if (response.messages) {
                    const notifications = response.messages;

                    return this.formatNotificationsData(notifications, read).then(() => {
                        if (this.appProvider.isDesktop() && toDisplay && !read && limitFrom === 0) {
                            // Store the last received notification. Don't block the user for this.
                            this.emulatorHelper.storeLastReceivedNotification(
                                AddonNotificationsProvider.PUSH_SIMULATION_COMPONENT, notifications[0], siteId);
                        }

                        return notifications;
                    });
                } else {
                    return Promise.reject(null);
                }
            });
        });
    }

    /**
     * Get notifications from site using the new WebService.
     *
     * @param offset Position of the first notification to get.
     * @param limit Number of notifications to get. Defaults to LIST_LIMIT.
     * @param toDisplay True if notifications will be displayed to the user, either in view or in a notification.
     * @param forceCache True if it should return cached data. Has priority over ignoreCache.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved with notifications and if can load more.
     * @since 3.2
     */
    getPopupNotifications(offset: number, limit?: number, toDisplay: boolean = true, forceCache?: boolean, ignoreCache?: boolean,
            siteId?: string): Promise<{notifications: AddonNotificationsPopupNotificationFormatted[], canLoadMore: boolean}> {

        limit = limit || AddonNotificationsProvider.LIST_LIMIT;

        this.logger.debug('Get popup notifications from ' + offset + '. Limit: ' + limit);

        return this.sitesProvider.getSite(siteId).then((site) => {
            const data = {
                    useridto: site.getUserId(),
                    newestfirst: 1,
                    offset: offset,
                    limit: limit + 1 // Get one more to calculate canLoadMore.
                },
                preSets = {
                    cacheKey: this.getNotificationsCacheKey(),
                    omitExpires: forceCache,
                    getFromCache: forceCache || !ignoreCache,
                    emergencyCache: forceCache || !ignoreCache,
                };

            // Get notifications.
            return site.read('message_popup_get_popup_notifications', data, preSets)
                    .then((response: AddonNotificationsGetPopupNotificationsResult) => {

                if (response.notifications) {
                    const result = {
                            canLoadMore: response.notifications.length > limit,
                            notifications: response.notifications.slice(0, limit)
                        };

                    return this.formatNotificationsData(result.notifications).then(() => {
                        const first = result.notifications[0];

                        if (this.appProvider.isDesktop() && toDisplay && offset === 0 && first && !first.read) {
                            // Store the last received notification. Don't block the user for this.
                            this.emulatorHelper.storeLastReceivedNotification(
                                AddonNotificationsProvider.PUSH_SIMULATION_COMPONENT, first, siteId);
                        }

                        return result;
                    });
                } else {
                    return Promise.reject(null);
                }
            });
        });
    }

    /**
     * Get read notifications from site.
     *
     * @param limitFrom Position of the first notification to get.
     * @param limitNumber Number of notifications to get.
     * @param toDisplay True if notifications will be displayed to the user, either in view or in a notification.
     * @param forceCache True if it should return cached data. Has priority over ignoreCache.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved with notifications.
     */
    getReadNotifications(limitFrom: number, limitNumber: number, toDisplay: boolean = true,
            forceCache?: boolean, ignoreCache?: boolean, siteId?: string): Promise<AddonNotificationsGetMessagesMessage[]> {
        return this.getNotifications(true, limitFrom, limitNumber, toDisplay, forceCache, ignoreCache, siteId);
    }

    /**
     * Get unread notifications from site.
     *
     * @param limitFrom Position of the first notification to get.
     * @param limitNumber Number of notifications to get.
     * @param toDisplay True if notifications will be displayed to the user, either in view or in a notification.
     * @param forceCache True if it should return cached data. Has priority over ignoreCache.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved with notifications.
     */
    getUnreadNotifications(limitFrom: number, limitNumber: number, toDisplay: boolean = true,
            forceCache?: boolean, ignoreCache?: boolean, siteId?: string): Promise<AddonNotificationsGetMessagesMessage[]> {
        return this.getNotifications(false, limitFrom, limitNumber, toDisplay, forceCache, ignoreCache, siteId);
    }

    /**
     * Get unread notifications count. Do not cache calls.
     *
     * @param userId The user id who received the notification. If not defined, use current user.
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved with the message notifications count.
     */
    getUnreadNotificationsCount(userId?: number, siteId?: string): Promise<number> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            // @since 3.2
            if (site.wsAvailable('message_popup_get_unread_popup_notification_count')) {
                userId = userId || site.getUserId();
                const params = {
                    useridto: userId
                };
                const preSets = {
                    getFromCache: false,
                    emergencyCache: false,
                    saveToCache: false,
                    typeExpected: 'number'
                };

                return site.read('message_popup_get_unread_popup_notification_count', params, preSets).catch(() => {
                    // Return no messages if the call fails.
                    return 0;
                });
            }

            // Fallback call.
            const limit = AddonNotificationsProvider.LIST_LIMIT + 1;

            return this.getUnreadNotifications(0, limit, false, false, false, siteId).then((unread) => {
                // Add + sign if there are more than the limit reachable.
                return (unread.length > AddonNotificationsProvider.LIST_LIMIT) ?
                    AddonNotificationsProvider.LIST_LIMIT + '+' : unread.length;
            }).catch(() => {
                // Return no messages if the call fails.
                return 0;
            });
        });
    }

    /**
     * Returns whether or not popup WS is available for a certain site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with true if available, resolved with false or rejected otherwise.
     */
    isPopupAvailable(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.wsAvailable('message_popup_get_popup_notifications');
        });
    }

    /**
     * Mark all message notification as read.
     *
     * @return Resolved when done.
     * @since 3.2
     */
    markAllNotificationsAsRead(): Promise<boolean> {
        const params = {
            useridto: this.sitesProvider.getCurrentSiteUserId()
        };

        return this.sitesProvider.getCurrentSite().write('core_message_mark_all_notifications_as_read', params);
    }

    /**
     * Mark a single notification as read.
     *
     * @param notificationId ID of notification to mark as read
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     * @since 3.5
     */
    markNotificationRead(notificationId: number, siteId?: string)
            : Promise<AddonNotificationsMarkNotificationReadResult | AddonMessagesMarkMessageReadResult> {

        return this.sitesProvider.getSite(siteId).then((site) => {

            if (site.wsAvailable('core_message_mark_notification_read')) {
                const params = {
                    notificationid: notificationId,
                    timeread: this.timeUtils.timestamp()
                };

                return site.write('core_message_mark_notification_read', params);
            } else {
                // Fallback for versions prior to 3.5.
                return this.messageProvider.markMessageRead(notificationId, site.id);
            }
        });
    }

    /**
     * Invalidate get notification preferences.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when data is invalidated.
     */
    invalidateNotificationPreferences(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getNotificationPreferencesCacheKey());
        });
    }

    /**
     * Invalidates notifications list WS calls.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the list is invalidated.
     */
    invalidateNotificationsList(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getNotificationsCacheKey());
        });
    }

    /**
     * Returns whether or not we can mark all notifications as read.
     *
     * @return True if enabled, false otherwise.
     * @since 3.2
     */
    isMarkAllNotificationsAsReadEnabled(): boolean {
        return this.sitesProvider.wsAvailableInCurrentSite('core_message_mark_all_notifications_as_read');
    }

    /**
     * Returns whether or not we can count unread notifications precisely.
     *
     * @return True if enabled, false otherwise.
     * @since 3.2
     */
    isPreciseNotificationCountEnabled(): boolean {
        return this.sitesProvider.wsAvailableInCurrentSite('message_popup_get_unread_popup_notification_count');
    }

    /**
     * Returns whether or not the notification preferences are enabled for the current site.
     *
     * @return True if enabled, false otherwise.
     * @since 3.2
     */
    isNotificationPreferencesEnabled(): boolean {
        return this.sitesProvider.wsAvailableInCurrentSite('core_message_get_user_notification_preferences');
    }
}

/**
 * Preferences returned by core_message_get_user_notification_preferences.
 */
export type AddonNotificationsNotificationPreferences = {
    userid: number; // User id.
    disableall: number | boolean; // Whether all the preferences are disabled.
    processors: AddonNotificationsNotificationPreferencesProcessor[]; // Config form values.
    components: AddonNotificationsNotificationPreferencesComponent[]; // Available components.
    enableall?: boolean; // Calculated in the app. Whether all the preferences are enabled.
};

/**
 * Processor in notification preferences.
 */
export type AddonNotificationsNotificationPreferencesProcessor = {
    displayname: string; // Display name.
    name: string; // Processor name.
    hassettings: boolean; // Whether has settings.
    contextid: number; // Context id.
    userconfigured: number; // Whether is configured by the user.
};

/**
 * Component in notification preferences.
 */
export type AddonNotificationsNotificationPreferencesComponent = {
    displayname: string; // Display name.
    notifications: AddonNotificationsNotificationPreferencesNotification[]; // List of notificaitons for the component.
};

/**
 * Notification processor in notification preferences component.
 */
export type AddonNotificationsNotificationPreferencesNotification = {
    displayname: string; // Display name.
    preferencekey: string; // Preference key.
    processors: AddonNotificationsNotificationPreferencesNotificationProcessor[]; // Processors values for this notification.
};

/**
 * Notification processor in notification preferences component.
 */
export type AddonNotificationsNotificationPreferencesNotificationProcessor = {
    displayname: string; // Display name.
    name: string; // Processor name.
    locked: boolean; // Is locked by admin?.
    lockedmessage?: string; // @since 3.6. Text to display if locked.
    userconfigured: number; // Is configured?.
    loggedin: AddonNotificationsNotificationPreferencesNotificationProcessorState;
    loggedoff: AddonNotificationsNotificationPreferencesNotificationProcessorState;
};

/**
 * State in notification processor in notification preferences component.
 */
export type AddonNotificationsNotificationPreferencesNotificationProcessorState = {
    name: string; // Name.
    displayname: string; // Display name.
    checked: boolean; // Is checked?.
};

/**
 * Result of WS core_message_get_messages.
 */
export type AddonNotificationsGetMessagesResult = {
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
    customdata?: any; // @since 3.7. Custom data to be passed to the message processor.
};

/**
 * Message data returned by core_message_get_messages with some calculated data.
 */
export type AddonNotificationsGetMessagesMessageFormatted =
        AddonNotificationsGetMessagesMessage & AddonNotificationsNotificationCalculatedData;

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
    customdata?: any; // @since 3.7. Custom data to be passed to the message processor.
};

/**
 * Notification returned by message_popup_get_popup_notifications.
 */
export type AddonNotificationsPopupNotificationFormatted =
        AddonNotificationsPopupNotification & AddonNotificationsNotificationCalculatedData;

/**
 * Any kind of notification that can be retrieved.
 */
export type AddonNotificationsAnyNotification =
        AddonNotificationsPopupNotificationFormatted | AddonNotificationsGetMessagesMessageFormatted;

/**
 * Result of WS core_message_get_user_notification_preferences.
 */
export type AddonNotificationsGetUserNotificationPreferencesResult = {
    preferences: AddonNotificationsNotificationPreferences;
    warnings?: CoreWSExternalWarning[];
};

/**
 * Result of WS core_message_mark_notification_read.
 */
export type AddonNotificationsMarkNotificationReadResult = {
    notificationid: number; // Id of the notification.
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
    displayfullhtml?: boolean; // Whether to display the full HTML of the notification.
};
