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
import { CorePushNotificationsProvider } from '@core/pushnotifications/providers/pushnotifications';
import { CorePushNotificationsDelegate } from '@core/pushnotifications/providers/delegate';
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

    protected unreadCount = 0;
    protected contactRequestsCount = 0;
    protected orMore = false;

    constructor(private messagesProvider: AddonMessagesProvider, private sitesProvider: CoreSitesProvider,
            eventsProvider: CoreEventsProvider, private appProvider: CoreAppProvider,
            private localNotificationsProvider: CoreLocalNotificationsProvider, private textUtils: CoreTextUtilsProvider,
            private pushNotificationsProvider: CorePushNotificationsProvider, utils: CoreUtilsProvider,
            pushNotificationsDelegate: CorePushNotificationsDelegate, private emulatorHelper: CoreEmulatorHelperProvider) {

        eventsProvider.on(AddonMessagesProvider.UNREAD_CONVERSATION_COUNTS_EVENT, (data) => {
            this.unreadCount = data.favourites + data.individual + data.group + data.self;
            this.orMore = data.orMore;
            this.updateBadge(data.siteId);
        });

        eventsProvider.on(AddonMessagesProvider.CONTACT_REQUESTS_COUNT_EVENT, (data) => {
            this.contactRequestsCount = data.count;
            this.updateBadge(data.siteId);
        });

        // Reset info on logout.
        eventsProvider.on(CoreEventsProvider.LOGOUT, (data) => {
            this.unreadCount = 0;
            this.contactRequestsCount = 0;
            this.orMore = false;
            this.handler.badge = '';
            this.handler.loading = true;
        });

        // If a message push notification is received, refresh the count.
        pushNotificationsDelegate.on('receive').subscribe((notification) => {
            // New message received. If it's from current site, refresh the data.
            const isMessage = utils.isFalseOrZero(notification.notif) || notification.name == 'messagecontactrequests';
            if (isMessage && this.sitesProvider.isCurrentSite(notification.site)) {
                this.refreshBadge(notification.site);
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
            this.refreshBadge();
        }

        return this.handler;
    }

    /**
     * Refreshes badge number.
     *
     * @param {string} [siteId] Site ID or current Site if undefined.
     * @param {boolean} [unreadOnly] If true only the unread conversations count is refreshed.
     * @return {Promise<any>} Resolve when done.
     */
    refreshBadge(siteId?: string, unreadOnly?: boolean): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();
        if (!siteId) {
            return;
        }

        const promises = [];

        promises.push(this.messagesProvider.refreshUnreadConversationCounts(siteId).catch(() => {
            this.unreadCount = 0;
            this.orMore = false;
        }));

        // Refresh the number of contact requests in 3.6+ sites.
        if (!unreadOnly && this.messagesProvider.isGroupMessagingEnabled()) {
            promises.push(this.messagesProvider.refreshContactRequestsCount(siteId).catch(() => {
                this.contactRequestsCount = 0;
            }));
        }

        return Promise.all(promises).finally(() => {
            this.updateBadge(siteId);
            this.handler.loading = false;
        });
    }

    /**
     * Update badge number and push notifications counter from loaded data.
     *
     * @param {string} siteId Site ID.
     */
    updateBadge(siteId: string): void {
        const totalCount = this.unreadCount + (this.contactRequestsCount || 0);
        if (totalCount > 0) {
            this.handler.badge = totalCount + (this.orMore ? '+' : '');
        } else {
            this.handler.badge = '';
        }

        // Update push notifications badge.
        this.pushNotificationsProvider.updateAddonCounter('AddonMessages', totalCount, siteId);
    }

    /**
     * Execute the process.
     * Receives the ID of the site affected, undefined for all sites.
     *
     * @param  {string} [siteId] ID of the site affected, undefined for all sites.
     * @param {boolean} [force] Wether the execution is forced (manual sync).
     * @return {Promise<any>}         Promise resolved when done, rejected if failure.
     */
    execute(siteId?: string, force?: boolean): Promise<any> {
        if (this.sitesProvider.isCurrentSite(siteId)) {
            this.refreshBadge();
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
        if (this.appProvider.isDesktop()) {
            return 60000; // Desktop usually has a WiFi connection, check it every minute.
        } else if (this.messagesProvider.isGroupMessagingEnabled() || this.messagesProvider.isMessageCountEnabled()) {
            return 300000; // We have a WS to check the number, check it every 5 minutes.
        } else {
            return 600000; // Check it every 10 minutes.
        }
    }

    /**
     * Whether it's a synchronization process or not.
     *
     * @return {boolean} True if is a sync process, false otherwise.
     */
    isSync(): boolean {
        // This is done to use only wifi if using the fallback function.

        if (this.appProvider.isDesktop()) {
            // In desktop it is always sync, since it fetches messages to see if there's a new one.
            return true;
        }

        return !this.messagesProvider.isMessageCountEnabled() && !this.messagesProvider.isGroupMessagingEnabled();
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
        return this.sitesProvider.getSite(siteId).then((site) => {
            if (site.isVersionGreaterEqualThan('3.7')) {

                // Use get conversations WS to be able to get group conversations messages.
                return this.messagesProvider.getConversations(undefined, undefined, 0, site.id, undefined, false, true)
                        .then((result) => {

                    // Find the first unmuted conversation.
                    const conv = result.conversations.find((conversation) => {
                        return !conversation.ismuted;
                    });

                    if (conv.isread) {
                        // The conversation is read, no unread messages.
                        return [];
                    }

                    const currentUserId = site.getUserId(),
                        message = conv.messages[0]; // Treat only the last message, is the one we're interested.

                    if (!message || message.useridfrom == currentUserId) {
                        // No last message or not from current user. Return empty list.
                        return [];
                    }

                    // Add some calculated data.
                    message.contexturl = '';
                    message.contexturlname = '';
                    message.convid = conv.id;
                    message.fullmessage = message.text;
                    message.fullmessageformat = 0;
                    message.fullmessagehtml = '';
                    message.notification = 0;
                    message.read = 0;
                    message.smallmessage = message.smallmessage || message.text;
                    message.subject = conv.name;
                    message.timecreated = message.timecreated * 1000;
                    message.timeread = 0;
                    message.useridto = currentUserId;
                    message.usertofullname = site.getInfo().fullname;

                    const userFrom = conv.members.find((member) => {
                        return member.id == message.useridfrom;
                    });
                    message.userfromfullname = userFrom && userFrom.fullname;

                    return [message];
                });
            } else {
                return this.messagesProvider.getUnreadReceivedMessages(true, false, true, siteId).then((response) => {
                    return response.messages;
                });
            }
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
            title: message.name || message.userfromfullname,
        };

        return this.textUtils.formatText(message.text, true, true).catch(() => {
            return message.text;
        }).then((formattedText) => {
            data['text'] = formattedText;

            return data;
        });
    }
}
