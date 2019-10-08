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

import { Component } from '@angular/core';
import { IonicPage, NavParams } from 'ionic-angular';
import { Subscription } from 'rxjs';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreEventsProvider, CoreEventObserver } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { AddonNotificationsProvider, AddonNotificationsAnyNotification } from '../../providers/notifications';
import { AddonNotificationsHelperProvider } from '../../providers/helper';
import { CorePushNotificationsDelegate } from '@core/pushnotifications/providers/delegate';

/**
 * Page that displays the list of notifications.
 */
@IonicPage({ segment: 'addon-notifications-list' })
@Component({
    selector: 'page-addon-notifications-list',
    templateUrl: 'list.html',
})
export class AddonNotificationsListPage {

    notifications: AddonNotificationsAnyNotification[] = [];
    notificationsLoaded = false;
    canLoadMore = false;
    loadMoreError = false;
    canMarkAllNotificationsAsRead = false;
    loadingMarkAllNotificationsAsRead = false;

    protected isCurrentView: boolean;
    protected cronObserver: CoreEventObserver;
    protected pushObserver: Subscription;
    protected pendingRefresh = false;

    constructor(navParams: NavParams, private domUtils: CoreDomUtilsProvider, private eventsProvider: CoreEventsProvider,
            private sitesProvider: CoreSitesProvider, private textUtils: CoreTextUtilsProvider,
            private utils: CoreUtilsProvider, private notificationsProvider: AddonNotificationsProvider,
            private pushNotificationsDelegate: CorePushNotificationsDelegate,
            private notificationsHelper: AddonNotificationsHelperProvider) {
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.fetchNotifications();

        this.cronObserver = this.eventsProvider.on(AddonNotificationsProvider.READ_CRON_EVENT, () => {
            if (this.isCurrentView) {
                this.notificationsLoaded = false;
                this.refreshNotifications();
            }
        }, this.sitesProvider.getCurrentSiteId());

        this.pushObserver = this.pushNotificationsDelegate.on('receive').subscribe((notification) => {
            // New notification received. If it's from current site, refresh the data.
            if (this.isCurrentView && this.utils.isTrueOrOne(notification.notif) &&
                    this.sitesProvider.isCurrentSite(notification.site)) {

                this.notificationsLoaded = false;
                this.refreshNotifications();
            } else if (!this.isCurrentView) {
                this.pendingRefresh = true;
            }
        });
    }

    /**
     * Convenience function to get notifications. Gets unread notifications first.
     *
     * @param refreh Whether we're refreshing data.
     * @return Resolved when done.
     */
    protected fetchNotifications(refresh?: boolean): Promise<any> {
        this.loadMoreError = false;

        return this.notificationsHelper.getNotifications(refresh ? [] : this.notifications).then((result) => {
            result.notifications.forEach(this.formatText.bind(this));

            if (refresh) {
                this.notifications = result.notifications;
            } else {
                this.notifications = this.notifications.concat(result.notifications);
            }
            this.canLoadMore = result.canLoadMore;

            this.markNotificationsAsRead(result.notifications);
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.notifications.errorgetnotifications', true);
            this.loadMoreError = true; // Set to prevent infinite calls with infinite-loading.
        }).finally(() => {
            this.notificationsLoaded = true;
        });
    }

    /**
     * Mark all notifications as read.
     */
    markAllNotificationsAsRead(): void {
        this.loadingMarkAllNotificationsAsRead = true;
        this.notificationsProvider.markAllNotificationsAsRead().catch(() => {
            // Omit failure.
        }).then(() => {
            const siteId = this.sitesProvider.getCurrentSiteId();
            this.eventsProvider.trigger(AddonNotificationsProvider.READ_CHANGED_EVENT, null, siteId);

            // All marked as read, refresh the list.
            this.notificationsLoaded = false;

            return this.refreshNotifications();
        });
    }

    /**
     * Mark notifications as read.
     *
     * @param notifications Array of notification objects.
     */
    protected markNotificationsAsRead(notifications: AddonNotificationsAnyNotification[]): void {

        let promise;

        if (notifications.length > 0) {
            const promises: Promise<any>[] = notifications.map((notification) => {
                if (notification.read) {
                    // Already read, don't mark it.
                    return Promise.resolve();
                }

                return this.notificationsProvider.markNotificationRead(notification.id);
            });

            promise = Promise.all(promises).catch(() => {
                // Ignore errors.
            }).finally(() => {
                this.notificationsProvider.invalidateNotificationsList().finally(() => {
                    const siteId = this.sitesProvider.getCurrentSiteId();
                    this.eventsProvider.trigger(AddonNotificationsProvider.READ_CHANGED_EVENT, null, siteId);
                });
            });
        } else {
            promise = Promise.resolve();
        }

        promise.finally(() => {
            // Check if mark all notifications as read is enabled and there are some to read.
            if (this.notificationsProvider.isMarkAllNotificationsAsReadEnabled()) {
                this.loadingMarkAllNotificationsAsRead = true;

                return this.notificationsProvider.getUnreadNotificationsCount().then((unread) => {
                    this.canMarkAllNotificationsAsRead = unread > 0;
                }).finally(() => {
                    this.loadingMarkAllNotificationsAsRead = false;
                });
            }
            this.canMarkAllNotificationsAsRead = false;
        });
    }

    /**
     * Refresh notifications.
     *
     * @param refresher Refresher.
     * @return Promise<any> Promise resolved when done.
     */
    refreshNotifications(refresher?: any): Promise<any> {
        return this.notificationsProvider.invalidateNotificationsList().finally(() => {
            return this.fetchNotifications(true).finally(() => {
                if (refresher) {
                    refresher.complete();
                }
            });
        });
    }

    /**
     * Load more results.
     *
     * @param infiniteComplete Infinite scroll complete function. Only used from core-infinite-loading.
     */
    loadMoreNotifications(infiniteComplete?: any): void {
        this.fetchNotifications().finally(() => {
            infiniteComplete && infiniteComplete();
        });
    }

    /**
     * Formats the text of a notification.
     *
     * @param notification The notification object.
     */
    protected formatText(notification: AddonNotificationsAnyNotification): void {
        const text = notification.mobiletext.replace(/-{4,}/ig, '');
        notification.mobiletext = this.textUtils.replaceNewLines(text, '<br>');
    }

    /**
     * User entered the page.
     */
    ionViewDidEnter(): void {
        this.isCurrentView = true;

        if (this.pendingRefresh) {
            this.pendingRefresh = false;
            this.notificationsLoaded = false;

            this.refreshNotifications();
        }
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
        this.cronObserver && this.cronObserver.off();
        this.pushObserver && this.pushObserver.unsubscribe();
    }
}
