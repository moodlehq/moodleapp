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
import { CoreMainMenuDelegate, CoreMainMenuHandler, CoreMainMenuHandlerToDisplay } from '@core/mainmenu/providers/delegate';
import { CoreCronHandler } from '@providers/cron';
import { CoreSitesProvider } from '@providers/sites';
import { CoreEventsProvider } from '@providers/events';
import { CoreAppProvider } from '@providers/app';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreLocalNotificationsProvider } from '@providers/local-notifications';

/**
 * Handler to inject an option into main menu.
 */
@Injectable()
export class AddonMessagesMainMenuHandler implements CoreMainMenuHandler, CoreCronHandler {
    name = 'AddonMessages';
    priority = 600;
    protected badge = '';
    protected loading = true;

    constructor(private messagesProvider: AddonMessagesProvider, private sitesProvider: CoreSitesProvider,
            private eventsProvider: CoreEventsProvider, private appProvider: CoreAppProvider,
            private localNotificationsProvider: CoreLocalNotificationsProvider, private textUtils: CoreTextUtilsProvider) {

        eventsProvider.on(AddonMessagesProvider.READ_CHANGED_EVENT, (data) => {
            this.updateBadge(data.siteId);
        });

        eventsProvider.on(AddonMessagesProvider.READ_CRON_EVENT, (data) => {
            this.updateBadge(data.siteId);
        });

        // Reset info on logout.
        eventsProvider.on(CoreEventsProvider.LOGOUT, (data) => {
            this.badge = '';
            this.loading = true;
        });
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
        if (this.loading) {
            this.updateBadge();
        }

        return {
            icon: 'chatbubbles',
            title: 'addon.messages.messages',
            page: 'AddonMessagesIndexPage',
            class: 'addon-messages-handler',
            showBadge: true, // Do not check isMessageCountEnabled because we'll use fallback it not enabled.,
            badge: this.badge,
            loading: this.loading
        };
    }

    /**
     * Triggers an update for the badge number and loading status. Mandatory if showBadge is enabled.
     *
     * @param {string} siteId Site ID or current Site if undefined.
     */
    updateBadge(siteId?: string): void {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();
        if (!siteId) {
            return;
        }

        this.messagesProvider.getUnreadConversationsCount(undefined, siteId).then((unread) => {
            // Leave badge enter if there is a 0+ or a 0.
            this.badge = parseInt(unread, 10) > 0 ? unread : '';
            // Update badge.
            /*
            $mmaPushNotifications = $mmAddonManager.get('$mmaPushNotifications');
            if ($mmaPushNotifications) {
                $mmaPushNotifications.updateAddonCounter(siteId, 'mmaMessages', unread);
            }*/
        }).catch(() => {
            this.badge = '';
        }).finally(() => {
            this.loading = false;
            this.eventsProvider.trigger(CoreMainMenuDelegate.UPDATE_BADGE_EVENT, {
                name: this.name,
                badge: this.badge
            }, siteId);
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
            this.eventsProvider.trigger(AddonMessagesProvider.READ_CRON_EVENT, undefined, siteId);
        }

        if (this.appProvider.isDesktop() && this.localNotificationsProvider.isAvailable()) {
            /*$mmEmulatorHelper.checkNewNotifications(
                    AddonMessagesProvider.PUSH_SIMULATION_COMPONENT, this.fetchMessages, this.getTitleAndText, siteId);*/
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
