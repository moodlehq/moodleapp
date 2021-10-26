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

/**
 * Page that displays the list of notifications.
 */
@Component({
    selector: 'page-addon-notifications-list',
    templateUrl: 'list.html',
    styleUrls: ['list.scss'],
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
    protected pushObserver?: Subscription;
    protected pendingRefresh = false;

    /**
     * Component being initialized.
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
    }

    /**
     * Convenience function to get notifications. Gets unread notifications first.
     *
     * @param refreh Whether we're refreshing data.
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

            this.markNotificationsAsRead(notifications);
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

        CoreEvents.trigger(AddonNotificationsProvider.READ_CHANGED_EVENT, {}, CoreSites.getCurrentSiteId());

        // All marked as read, refresh the list.
        this.notificationsLoaded = false;

        await this.refreshNotifications();
    }

    /**
     * Mark notifications as read.
     *
     * @param notifications Array of notification objects.
     */
    protected async markNotificationsAsRead(notifications: AddonNotificationsNotificationToRender[]): Promise<void> {
        if (notifications.length > 0) {
            const promises = notifications.map(async (notification) => {
                if (notification.read) {
                    // Already read, don't mark it.
                    return;
                }

                await AddonNotifications.markNotificationRead(notification.id);
            });

            await CoreUtils.ignoreErrors(Promise.all(promises));

            await CoreUtils.ignoreErrors(AddonNotifications.invalidateNotificationsList());

            CoreEvents.trigger(AddonNotificationsProvider.READ_CHANGED_EVENT, {}, CoreSites.getCurrentSiteId());
        }

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
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.cronObserver?.off();
        this.pushObserver?.unsubscribe();
    }

}
