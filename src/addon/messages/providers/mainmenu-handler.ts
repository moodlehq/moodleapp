// (C) Copyright 2015 Martin Dougiamas
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
import { AddonMessagesProvider } from './messages';
import { CoreMainMenuHandler, CoreMainMenuHandlerToDisplay } from '@core/mainmenu/providers/delegate';
import { CoreCronHandler } from '@providers/cron';
import { CoreSitesProvider } from '@providers/sites';
import { CoreEventsProvider } from '@providers/events';
import { CoreAppProvider } from '@providers/app';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreLocalNotificationsProvider } from '@providers/local-notifications';
import { AddonPushNotificationsProvider } from '@addon/pushnotifications/providers/pushnotifications';
import { AddonPushNotificationsDelegate } from '@addon/pushnotifications/providers/delegate';
import { CoreEmulatorHelperProvider } from '@core/emulator/providers/helper';

/**
 * Handler to inject an option into main menu.
 */
@Injectable()
export class AddonMessagesMainMenuHandler implements CoreMainMenuHandler, CoreCronHandler {
    name = 'AddonMessages';
    priority = 800;
    protected handler: CoreMainMenuHandlerToDisplay = {
        icon: 'chatbubbles',
        title: 'addon.messages.messages',
        page: 'AddonMessagesIndexPage',
        class: 'addon-messages-handler',
        showBadge: true, // Do not check isMessageCountEnabled because we'll use fallback it not enabled.
        badge: '',
        loading: true
    };

    protected updating = false;

    constructor(private messagesProvider: AddonMessagesProvider, private sitesProvider: CoreSitesProvider,
            private eventsProvider: CoreEventsProvider, private appProvider: CoreAppProvider,
            private localNotificationsProvider: CoreLocalNotificationsProvider, private textUtils: CoreTextUtilsProvider,
            private pushNotificationsProvider: AddonPushNotificationsProvider, utils: CoreUtilsProvider,
            pushNotificationsDelegate: AddonPushNotificationsDelegate, private emulatorHelper: CoreEmulatorHelperProvider) {

        eventsProvider.on(AddonMessagesProvider.READ_CHANGED_EVENT, (data) => {
            this.updateBadge(data.siteId);
        });

        eventsProvider.on(AddonMessagesProvider.READ_CRON_EVENT, (data) => {
            this.updateBadge(data.siteId);
        });

        eventsProvider.on(AddonMessagesProvider.CONTACT_REQUESTS_COUNT_EVENT, (data) => {
            this.updateBadge(data.siteId, data.count);
        });

        // Reset info on logout.
        eventsProvider.on(CoreEventsProvider.LOGOUT, (data) => {
            this.handler.badge = '';
            this.handler.loading = true;
            this.updating = false;
        });

        // If a message push notification is received, refresh the count.
        pushNotificationsDelegate.on('receive').subscribe((notification) => {
            // New message received. If it's from current site, refresh the data.
            if (utils.isFalseOrZero(notification.notif) && this.sitesProvider.isCurrentSite(notification.site)) {
                this.updateBadge(notification.site);
            }
        });

        // Register Badge counter.
        pushNotificationsDelegate.registerCounterHandler('AddonMessages');
    }

    /**
     * Check if the handler is enabled on a site level.
     *
     * @return {boolean} Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean | Promise<boolean> {
        return this.messagesProvider.isPluginEnabled();
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @return {CoreMainMenuHandlerToDisplay} Data needed to render the handler.
     */
    getDisplayData(): CoreMainMenuHandlerToDisplay {
        this.handler.page = this.messagesProvider.isGroupMessagingEnabled() ?
                'AddonMessagesGroupConversationsPage' : 'AddonMessagesIndexPage';

        if (this.handler.loading) {
            this.updateBadge();
        }

        return this.handler;
    }

    /**
     * Triggers an update for the badge number and loading status. Mandatory if showBadge is enabled.
     *
     * @param {string} [siteId] Site ID or current Site if undefined.
     * @param {number} [contactRequestsCount] Number of contact requests, if known.
     */
    updateBadge(siteId?: string, contactRequestsCount?: number): void {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();
        if (!siteId) {
            return;
        }

        if (this.updating) {
            // An update is already in prgoress.
            return;
        }

        this.updating = true;

        const promises = [];
        let unreadCount = 0;
        let unreadPlus = false;

        promises.push(this.messagesProvider.getUnreadConversationsCount(undefined, siteId).then((unread) => {
            unreadCount = parseInt(unread, 10);
            unreadPlus = (typeof unread === 'string' && unread.slice(-1) === '+');
        }).catch(() => {
            // Ignore error.
        }));

        // Get the number of contact requests in 3.6+ sites if needed.
        if (contactRequestsCount == null && this.messagesProvider.isGroupMessagingEnabled()) {
            promises.push(this.messagesProvider.getContactRequestsCount(siteId).then((count) => {
                contactRequestsCount = count;
            }).catch(() => {
                // Ignore errors
            }));
        }

        Promise.all(promises).then(() => {
            const totalCount = unreadCount + (contactRequestsCount || 0);
            if (totalCount > 0) {
                this.handler.badge = totalCount + (unreadPlus ? '+' : '');
            } else {
                this.handler.badge = '';
            }

            // Update badge.
            this.pushNotificationsProvider.updateAddonCounter('AddonMessages', totalCount, siteId);
        }).finally(() => {
            this.handler.loading = false;
            this.updating = false;
        });
    }

    /**
     * Execute the process.
     * Receives the ID of the site affected, undefined for all sites.
     *
     * @param  {string} [siteId] ID of the site affected, undefined for all sites.
     * @return {Promise<any>}         Promise resolved when done, rejected if failure.
     */
    execute(siteId?: string): Promise<any> {
        if (this.sitesProvider.isCurrentSite(siteId)) {
            this.eventsProvider.trigger(AddonMessagesProvider.READ_CRON_EVENT, {}, siteId);
        }

        if (this.appProvider.isDesktop() && this.localNotificationsProvider.isAvailable()) {
            this.emulatorHelper.checkNewNotifications(
                AddonMessagesProvider.PUSH_SIMULATION_COMPONENT,
                this.fetchMessages.bind(this), this.getTitleAndText.bind(this), siteId);
        }

        return Promise.resolve();
    }

    /**
     * Get the time between consecutive executions.
     *
     * @return {number} Time between consecutive executions (in ms).
     */
    getInterval(): number {
        return this.appProvider.isDesktop() ? 60000 : 600000; // 1 or 10 minutes.
    }

    /**
     * Whether it's a synchronization process or not.
     *
     * @return {boolean} True if is a sync process, false otherwise.
     */
    isSync(): boolean {
        // This is done to use only wifi if using the fallback function.
        // In desktop it is always sync, since it fetches messages to see if there's a new one.
        return !this.messagesProvider.isMessageCountEnabled() || this.appProvider.isDesktop();
    }

    /**
     * Whether the process should be executed during a manual sync.
     *
     * @return {boolean} True if is a manual sync process, false otherwise.
     */
    canManualSync(): boolean {
        return true;
    }

    /**
     * Get the latest unread received messages from a site.
     *
     * @param  {string} [siteId] Site ID. Default current.
     * @return {Promise<any>}    Promise resolved with the notifications.
     */
    protected fetchMessages(siteId?: string): Promise<any> {
        return this.messagesProvider.getUnreadReceivedMessages(true, false, true, siteId).then((response) => {
            return response.messages;
        });
    }

    /**
     * Given a message, return the title and the text for the message.
     *
     * @param  {any} message Message.
     * @return {Promise<any>}        Promise resolved with an object with title and text.
     */
    protected getTitleAndText(message: any): Promise<any> {
        const data = {
            title: message.userfromfullname,
        };

        return this.textUtils.formatText(message.text, true, true).catch(() => {
            return message.text;
        }).then((formattedText) => {
            data['text'] = formattedText;

            return data;
        });
    }
}
