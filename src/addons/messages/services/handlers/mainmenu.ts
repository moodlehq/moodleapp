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
    AddonMessages,
} from '../messages';
import { CoreMainMenuHandler, CoreMainMenuHandlerToDisplay } from '@features/mainmenu/services/mainmenu-delegate';
import { CoreCronHandler } from '@services/cron';
import { CoreSites } from '@services/sites';
import { CoreEvents } from '@singletons/events';
import { CoreUtils } from '@services/utils/utils';
import {
    CorePushNotificationsNotificationBasicData,
} from '@features/pushnotifications/services/pushnotifications';
import { CorePushNotificationsDelegate } from '@features/pushnotifications/services/push-delegate';
import { makeSingleton } from '@singletons';
import {
    ADDON_MESSAGES_UNREAD_CONVERSATION_COUNTS_EVENT,
    ADDON_MESSAGES_CONTACT_REQUESTS_COUNT_EVENT,
} from '@addons/messages/constants';
import { MAIN_MENU_HANDLER_BADGE_UPDATED_EVENT } from '@features/mainmenu/constants';

/**
 * Handler to inject an option into main menu.
 */
@Injectable({ providedIn: 'root' })
export class AddonMessagesMainMenuHandlerService implements CoreMainMenuHandler, CoreCronHandler {

    static readonly PAGE_NAME = 'messages';

    name = 'AddonMessages';
    priority = 700;

    protected handler: CoreMainMenuHandlerToDisplay = {
        icon: 'fas-comments',
        title: 'addon.messages.messages',
        page: AddonMessagesMainMenuHandlerService.PAGE_NAME,
        class: 'addon-messages-handler',
        showBadge: true,
        badge: '',
        badgeA11yText: 'addon.messages.unreadconversations',
        loading: true,
    };

    protected unreadCount = 0;
    protected contactRequestsCount = 0;
    protected orMore = false;
    protected badgeCount?: number;

    constructor() {

        CoreEvents.on(ADDON_MESSAGES_UNREAD_CONVERSATION_COUNTS_EVENT, (data) => {
            this.unreadCount = data.favourites + data.individual + data.group + data.self;
            this.orMore = !!data.orMore;

            data.siteId && this.updateBadge(data.siteId);
        });

        CoreEvents.on(ADDON_MESSAGES_CONTACT_REQUESTS_COUNT_EVENT, (data) => {
            this.contactRequestsCount = data.count;

            data.siteId && this.updateBadge(data.siteId);
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
        CorePushNotificationsDelegate.registerCounterHandler(AddonMessagesMainMenuHandlerService.name);
    }

    /**
     * Check if the handler is enabled on a site level.
     *
     * @returns Whether or not the handler is enabled on a site level.
     */
    isEnabled(): Promise<boolean> {
        return AddonMessages.isPluginEnabled();
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @returns Data needed to render the handler.
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
     * @returns Resolve when done.
     */
    async refreshBadge(siteId?: string, unreadOnly?: boolean): Promise<void> {
        const badgeSiteId = siteId || CoreSites.getCurrentSiteId();

        if (!badgeSiteId) {
            return;
        }

        const promises: Promise<unknown>[] = [];

        promises.push(AddonMessages.refreshUnreadConversationCounts(badgeSiteId).catch(() => {
            this.unreadCount = 0;
            this.orMore = false;
        }));

        // Refresh the number of contact requests in 3.6+ sites.
        if (!unreadOnly && AddonMessages.isGroupMessagingEnabled()) {
            promises.push(AddonMessages.refreshContactRequestsCount(badgeSiteId).catch(() => {
                this.contactRequestsCount = 0;
            }));
        }

        await Promise.all(promises).finally(() => {
            this.updateBadge(badgeSiteId);
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

        if (this.badgeCount === totalCount) {
            return;
        }

        this.badgeCount = totalCount;

        if (totalCount > 0) {
            this.handler.badge = totalCount + (this.orMore ? '+' : '');
        } else {
            this.handler.badge = '';
        }

        // Update push notifications badge.
        CoreEvents.trigger(
            MAIN_MENU_HANDLER_BADGE_UPDATED_EVENT,
            {
                handler: AddonMessagesMainMenuHandlerService.name,
                value: totalCount,
            },
            siteId,
        );
    }

    /**
     * Execute the process.
     * Receives the ID of the site affected, undefined for all sites.
     *
     * @param siteId ID of the site affected, undefined for all sites.
     * @returns Promise resolved when done, rejected if failure.
     */
    async execute(siteId?: string): Promise<void> {
        const site = CoreSites.getCurrentSite();

        if (
            !CoreSites.isCurrentSite(siteId) ||
            !site ||
            site.isFeatureDisabled('CoreMainMenuDelegate_AddonMessages') ||
            !site.canUseAdvancedFeature('messaging')
        ) {
            return;
        }

        this.refreshBadge();
    }

    /**
     * Get the time between consecutive executions.
     *
     * @returns Time between consecutive executions (in ms).
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
     * @returns True if is a sync process, false otherwise.
     */
    isSync(): boolean {
        return false;
    }

    /**
     * Whether the process should be executed during a manual sync.
     *
     * @returns True if is a manual sync process, false otherwise.
     */
    canManualSync(): boolean {
        return true;
    }

}

export const AddonMessagesMainMenuHandler = makeSingleton(AddonMessagesMainMenuHandlerService);
