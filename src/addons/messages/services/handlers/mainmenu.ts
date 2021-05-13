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
import {
    AddonMessagesProvider,
    AddonMessages,
} from '../messages';
import { CoreMainMenuHandler, CoreMainMenuHandlerToDisplay } from '@features/mainmenu/services/mainmenu-delegate';
import { CoreCronHandler } from '@services/cron';
import { CoreSites } from '@services/sites';
import { CoreEvents } from '@singletons/events';
import { CoreUtils } from '@services/utils/utils';
import {
    CorePushNotifications,
    CorePushNotificationsNotificationBasicData,
} from '@features/pushnotifications/services/pushnotifications';
import { CorePushNotificationsDelegate } from '@features/pushnotifications/services/push-delegate';
import { makeSingleton } from '@singletons';

/**
 * Handler to inject an option into main menu.
 */
@Injectable({ providedIn: 'root' })
export class AddonMessagesMainMenuHandlerService implements CoreMainMenuHandler, CoreCronHandler {

    static readonly PAGE_NAME = 'messages';

    name = 'AddonMessages';
    priority = 800;

    protected handler: CoreMainMenuHandlerToDisplay = {
        icon: 'fas-comments',
        title: 'addon.messages.messages',
        page: AddonMessagesMainMenuHandlerService.PAGE_NAME,
        class: 'addon-messages-handler',
        showBadge: true, // Do not check isMessageCountEnabled because we'll use fallback it not enabled.
        badge: '',
        badgeA11yText: 'addon.messages.unreadconversations',
        loading: true,
    };

    protected unreadCount = 0;
    protected contactRequestsCount = 0;
    protected orMore = false;

    constructor() {

        CoreEvents.on(AddonMessagesProvider.UNREAD_CONVERSATION_COUNTS_EVENT, (data) => {
            this.unreadCount = data.favourites + data.individual + data.group + data.self;
            this.orMore = !!data.orMore;
            this.updateBadge(data.siteId!);
        });

        CoreEvents.on(AddonMessagesProvider.CONTACT_REQUESTS_COUNT_EVENT, (data) => {
            this.contactRequestsCount = data.count;
            this.updateBadge(data.siteId!);
        });

        // Reset info on logout.
        CoreEvents.on(CoreEvents.LOGOUT, () => {
            this.unreadCount = 0;
            this.contactRequestsCount = 0;
            this.orMore = false;
            this.handler.badge = '';
            this.handler.loading = true;
        });

        // If a message push notification is received, refresh the count.
        CorePushNotificationsDelegate.on<CorePushNotificationsNotificationBasicData>('receive').subscribe(
            (notification) => {
            // New message received. If it's from current site, refresh the data.
                const isMessage = CoreUtils.isFalseOrZero(notification.notif) ||
                    notification.name == 'messagecontactrequests';
                if (isMessage && CoreSites.isCurrentSite(notification.site)) {
                    this.refreshBadge(notification.site);
                }
            },
        );

        // Register Badge counter.
        CorePushNotificationsDelegate.registerCounterHandler('AddonMessages');
    }

    /**
     * Check if the handler is enabled on a site level.
     *
     * @return Whether or not the handler is enabled on a site level.
     */
    isEnabled(): Promise<boolean> {
        return AddonMessages.isPluginEnabled();
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @return Data needed to render the handler.
     */
    getDisplayData(): CoreMainMenuHandlerToDisplay {
        if (this.handler.loading) {
            this.refreshBadge();
        }

        return this.handler;
    }

    /**
     * Refreshes badge number.
     *
     * @param siteId Site ID or current Site if undefined.
     * @param unreadOnly If true only the unread conversations count is refreshed.
     * @return Resolve when done.
     */
    async refreshBadge(siteId?: string, unreadOnly?: boolean): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();
        if (!siteId) {
            return;
        }

        const promises: Promise<unknown>[] = [];

        promises.push(AddonMessages.refreshUnreadConversationCounts(siteId).catch(() => {
            this.unreadCount = 0;
            this.orMore = false;
        }));

        // Refresh the number of contact requests in 3.6+ sites.
        if (!unreadOnly && AddonMessages.isGroupMessagingEnabled()) {
            promises.push(AddonMessages.refreshContactRequestsCount(siteId).catch(() => {
                this.contactRequestsCount = 0;
            }));
        }

        await Promise.all(promises).finally(() => {
            this.updateBadge(siteId!);
            this.handler.loading = false;
        });
    }

    /**
     * Update badge number and push notifications counter from loaded data.
     *
     * @param siteId Site ID.
     */
    updateBadge(siteId: string): void {
        const totalCount = this.unreadCount + (this.contactRequestsCount || 0);
        if (totalCount > 0) {
            this.handler.badge = totalCount + (this.orMore ? '+' : '');
        } else {
            this.handler.badge = '';
        }

        // Update push notifications badge.
        CorePushNotifications.updateAddonCounter('AddonMessages', totalCount, siteId);
    }

    /**
     * Execute the process.
     * Receives the ID of the site affected, undefined for all sites.
     *
     * @param siteId ID of the site affected, undefined for all sites.
     * @return Promise resolved when done, rejected if failure.
     */
    async execute(siteId?: string): Promise<void> {
        if (!CoreSites.isCurrentSite(siteId)) {
            return;
        }

        this.refreshBadge();
    }

    /**
     * Get the time between consecutive executions.
     *
     * @return Time between consecutive executions (in ms).
     */
    getInterval(): number {
        if (!this.isSync()) {
            return 300000; // We have a WS to check the number, check it every 5 minutes.
        }

        return 600000; // Check it every 10 minutes.
    }

    /**
     * Whether it's a synchronization process or not.
     *
     * @return True if is a sync process, false otherwise.
     */
    isSync(): boolean {
        // This is done to use only wifi if using the fallback function.
        return !AddonMessages.isMessageCountEnabled() && !AddonMessages.isGroupMessagingEnabled();
    }

    /**
     * Whether the process should be executed during a manual sync.
     *
     * @return True if is a manual sync process, false otherwise.
     */
    canManualSync(): boolean {
        return true;
    }

}

export const AddonMessagesMainMenuHandler = makeSingleton(AddonMessagesMainMenuHandlerService);
