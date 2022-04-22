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

import { Component, OnDestroy, OnInit } from '@angular/core';
import { IonRefresher } from '@ionic/angular';
import { Subscription } from 'rxjs';

import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { CoreEvents, CoreEventObserver } from '@singletons/events';
import {
    AddonNotifications,
    AddonNotificationsProvider,
} from '../../services/notifications';
import { CorePushNotificationsDelegate } from '@features/pushnotifications/services/push-delegate';
import {
    AddonNotificationsHelper,
    AddonNotificationsNotificationToRender,
} from '@addons/notifications/services/notifications-helper';
import { CoreMainMenuDeepLinkManager } from '@features/mainmenu/classes/deep-link-manager';
import { CoreNavigator } from '@services/navigator';
import { CoreTimeUtils } from '@services/utils/time';

/**
 * Page that displays the list of notifications.
 */
@Component({
    selector: 'page-addon-notifications-list',
    templateUrl: 'list.html',
    styleUrls: ['list.scss', '../../notifications.scss'],
})
export class AddonNotificationsListPage implements OnInit, OnDestroy {

    notifications: AddonNotificationsNotificationToRender[] = [];
    notificationsLoaded = false;
    canLoadMore = false;
    loadMoreError = false;
    canMarkAllNotificationsAsRead = false;
    loadingMarkAllNotificationsAsRead = false;

    protected isCurrentView?: boolean;
    protected cronObserver?: CoreEventObserver;
    protected readObserver?: CoreEventObserver;
    protected pushObserver?: Subscription;
    protected pendingRefresh = false;

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.fetchNotifications();

        this.cronObserver = CoreEvents.on(AddonNotificationsProvider.READ_CRON_EVENT, () => {
            if (!this.isCurrentView) {
                return;
            }

            this.notificationsLoaded = false;
            this.refreshNotifications();
        }, CoreSites.getCurrentSiteId());

        this.pushObserver = CorePushNotificationsDelegate.on('receive').subscribe((notification) => {
            // New notification received. If it's from current site, refresh the data.
            if (!this.isCurrentView) {
                this.pendingRefresh = true;

                return;
            }

            if (!CoreUtils.isTrueOrOne(notification.notif) || !CoreSites.isCurrentSite(notification.site)) {
                return;
            }

            this.notificationsLoaded = false;
            this.refreshNotifications();
        });

        this.readObserver = CoreEvents.on(AddonNotificationsProvider.READ_CHANGED_EVENT, (data) => {
            if (!data.id) {
                return;
            }

            const notification = this.notifications.find((notification) => notification.id === data.id);
            if (!notification) {
                return;
            }

            notification.read = true;
            notification.timeread = data.time;
            this.loadMarkAllAsReadButton();
        });

        const deepLinkManager = new CoreMainMenuDeepLinkManager();
        deepLinkManager.treatLink();
    }

    /**
     * Convenience function to get notifications. Gets unread notifications first.
     *
     * @param refresh Whether we're refreshing data.
     * @return Resolved when done.
     */
    protected async fetchNotifications(refresh?: boolean): Promise<void> {
        this.loadMoreError = false;

        try {
            const result = await AddonNotifications.getNotifications(refresh ? [] : this.notifications);

            const notifications = result.notifications
                .map((notification) => AddonNotificationsHelper.formatNotificationText(notification));

            if (refresh) {
                this.notifications = notifications;
            } else {
                this.notifications = this.notifications.concat(notifications);
            }
            this.canLoadMore = result.canLoadMore;

            await this.loadMarkAllAsReadButton();
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.notifications.errorgetnotifications', true);
            this.loadMoreError = true; // Set to prevent infinite calls with infinite-loading.
        } finally {
            this.notificationsLoaded = true;
        }
    }

    /**
     * Mark all notifications as read.
     *
     * @return Promise resolved when done.
     */
    async markAllNotificationsAsRead(): Promise<void> {
        this.loadingMarkAllNotificationsAsRead = true;

        await CoreUtils.ignoreErrors(AddonNotifications.markAllNotificationsAsRead());

        CoreEvents.trigger(AddonNotificationsProvider.READ_CHANGED_EVENT, {
            time: CoreTimeUtils.timestamp(),
        }, CoreSites.getCurrentSiteId());

        // All marked as read, refresh the list.
        this.notificationsLoaded = false;

        await this.refreshNotifications();
    }

    /**
     * Load mark all notifications as read button.
     *
     * @return Promise resolved when done.
     */
    protected async loadMarkAllAsReadButton(): Promise<void> {
        // Check if mark all as read should be displayed (there are unread notifications).
        try {
            this.loadingMarkAllNotificationsAsRead = true;

            const unreadCountData = await AddonNotifications.getUnreadNotificationsCount();

            this.canMarkAllNotificationsAsRead = unreadCountData.count > 0;
        } finally {
            this.loadingMarkAllNotificationsAsRead = false;
        }
    }

    /**
     * Refresh notifications.
     *
     * @param refresher Refresher.
     * @return Promise<any> Promise resolved when done.
     */
    async refreshNotifications(refresher?: IonRefresher): Promise<void> {
        await CoreUtils.ignoreErrors(AddonNotifications.invalidateNotificationsList());

        try {
            await this.fetchNotifications(true);
        } finally {
            refresher?.complete();
        }
    }

    /**
     * Load more results.
     *
     * @param infiniteComplete Infinite scroll complete function. Only used from core-infinite-loading.
     */
    async loadMoreNotifications(infiniteComplete?: () => void): Promise<void> {
        try {
            await this.fetchNotifications();
        } finally {
            infiniteComplete?.();
        }
    }

    /**
     * Open Notification page.
     *
     * @param notification Notification to open.
     */
    openNotification(notification: AddonNotificationsNotificationToRender): void {
        CoreNavigator.navigate('../notification', { params: { notification } });
    }

    /**
     * User entered the page.
     */
    ionViewDidEnter(): void {
        this.isCurrentView = true;

        if (!this.pendingRefresh) {
            return;
        }

        this.pendingRefresh = false;
        this.notificationsLoaded = false;

        this.refreshNotifications();
    }

    /**
     * User left the page.
     */
    ionViewDidLeave(): void {
        this.isCurrentView = false;
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.cronObserver?.off();
        this.readObserver?.off();
        this.pushObserver?.unsubscribe();
    }

}
