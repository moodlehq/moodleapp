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

import { AddonLegacyNotificationsNotificationsSource } from '@addons/notifications/classes/legacy-notifications-source';
import { AddonNotificationsNotificationsSource } from '@addons/notifications/classes/notifications-source';
import { AddonNotificationsPushNotification } from '@addons/notifications/services/handlers/push-click';
import {
    AddonNotifications,
    AddonNotificationsNotificationMessage,
    AddonNotificationsNotificationMessageFormatted,
} from '@addons/notifications/services/notifications';
import {
    AddonNotificationsHelper,
} from '@addons/notifications/services/notifications-helper';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';
import { CoreSwipeNavigationItemsManager } from '@classes/items-management/swipe-navigation-items-manager';
import { CoreContentLinksAction, CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreNavigator } from '@services/navigator';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSites } from '@services/sites';
import { Translate } from '@singletons';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page to render a notification.
 */
@Component({
    selector: 'page-addon-notifications-notification',
    templateUrl: 'notification.html',
    styleUrls: ['../../notifications.scss', 'notification.scss'],
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export default class AddonNotificationsNotificationPage implements OnInit, OnDestroy {

    notifications?: AddonNotificationSwipeItemsManager;
    notification?: AddonNotificationsNotificationMessageFormatted;
    profileImageUrlFrom?: string; // Avatar of the user who sent the notification.
    loaded = false;

    // Actions data.
    actions: CoreContentLinksAction[] = [];
    protected contextUrl?: string;
    protected courseId?: number;
    protected actionsData?: Record<string, string|number>; // Extra data to handle the URL.

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        let notification: AddonNotificationsNotification;

        try {
            notification = this.getNotification();
        } catch (error) {
            CoreAlerts.showError(error);
            CoreNavigator.back();

            return;
        }

        if ('mobiletext' in notification) {
            // Notification from WS and already formatted, just use it.
            this.notification = notification;
        } else if ('fullmessage' in notification) {
            // It's a notification from WS but it isn't formatted for some reason. Format it now.
            const notifications = await AddonNotifications.formatNotificationsData([notification]);
            this.notification = notifications[0];
        } else {
            // Push notification, convert it to the right format.
            this.notification = await AddonNotifications.convertPushToMessage(notification);
        }

        await this.loadActions(this.notification);
        AddonNotificationsHelper.markNotificationAsRead(this.notification);

        this.loaded = true;

        if (notification.id) {
            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM,
                ws: 'core_message_get_messages',
                name: Translate.instant('addon.notifications.notifications'),
                data: { id: notification.id, category: 'notifications' },
                url: `/message/output/popup/notifications.php?notificationid=${notification.id}&offset=0`,
            });
        }
    }

    /**
     * Get notification.
     *
     * @returns notification.
     */
    getNotification(): AddonNotificationsNotification {
        const id = CoreNavigator.getRouteNumberParam('id');
        const notification = id ? this.getNotificationById(id) : undefined;

        return notification ?? CoreNavigator.getRequiredRouteParam('notification');
    }

    /**
     * Obtain notification by passed id.
     *
     * @param notificationId Notification id.
     * @returns Found notification.
     */
    getNotificationById(notificationId: number): AddonNotificationsNotification | undefined {
        const source = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(
            CoreSites.getRequiredCurrentSite().isVersionGreaterEqualThan('4.0')
                ? AddonNotificationsNotificationsSource
                : AddonLegacyNotificationsNotificationsSource,
            [],
        );
        const notification = source.getItems()?.find(({ id }) => id === notificationId);

        if (!notification) {
            return;
        }

        this.loadNotifications(source);

        return notification;
    }

    /**
     * Load notifications from source.
     *
     * @param source Notifications source
     */
    async loadNotifications(source: AddonNotificationsNotificationsSource): Promise<void> {
        this.notifications = new AddonNotificationSwipeItemsManager(source);

        await this.notifications.start();
    }

    /**
     * Load notification actions
     *
     * @param notification Notification.
     * @returns Promise resolved when done.
     */
    async loadActions(notification: AddonNotificationsNotificationMessageFormatted): Promise<void> {
        if (!notification.contexturl && (!notification.customdata || !notification.customdata.appurl)) {
            // No URL, nothing to do.
            return;
        }

        let actions: CoreContentLinksAction[] = [];
        this.actionsData = notification.customdata;
        this.contextUrl = notification.contexturl || undefined;
        this.courseId = 'courseid' in notification ? notification.courseid : undefined;

        // Treat appurl first if any.
        if (this.actionsData?.appurl) {
            actions = await CoreContentLinksDelegate.getActionsFor(
                <string> this.actionsData.appurl,
                this.courseId,
                undefined,
                this.actionsData,
            );
        }

        if (!actions.length && this.contextUrl) {
            // No appurl or cannot handle it. Try with contextUrl.
            actions = await CoreContentLinksDelegate.getActionsFor(this.contextUrl, this.courseId, undefined, this.actionsData);
        }

        if (!actions.length) {
            // URL is not supported. Add an action to open it in browser.
            actions.push({
                message: 'core.view',
                icon: 'fas-eye',
                action: (siteId) => this.openInBrowser(siteId),
            });
        }

        this.actions = actions;
    }

    /**
     * Default action. Open in browser.
     *
     * @param siteId Site ID to use.
     */
    protected async openInBrowser(siteId?: string): Promise<void> {
        const url = <string> this.actionsData?.appurl || this.contextUrl;

        if (!url) {
            return;
        }

        const site = await CoreSites.getSite(siteId);

        site.openInBrowserWithAutoLogin(url);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.notifications?.destroy();
    }

}

/**
 * Helper to manage swiping within a collection of notifications.
 */
class AddonNotificationSwipeItemsManager extends CoreSwipeNavigationItemsManager {

    /**
     * @inheritdoc
     */
    protected getSelectedItemPathFromRoute(route: ActivatedRouteSnapshot | ActivatedRoute): string | null {
        return CoreNavigator.getRouteParams(route).id;
    }

}

type AddonNotificationsNotification = AddonNotificationsNotificationMessageFormatted | AddonNotificationsPushNotification |
    AddonNotificationsNotificationMessage;
