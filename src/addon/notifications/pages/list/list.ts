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

import { Component } from '@angular/core';
import { IonicPage, NavParams } from 'ionic-angular';
import { Subscription } from 'rxjs';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreEventsProvider, CoreEventObserver } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { AddonNotificationsProvider } from '../../providers/notifications';
import { AddonPushNotificationsDelegate } from '@addon/pushnotifications/providers/delegate';

/**
 * Page that displays the list of notifications.
 */
@IonicPage({ segment: 'addon-notifications-list' })
@Component({
    selector: 'page-addon-notifications-list',
    templateUrl: 'list.html',
})
export class AddonNotificationsListPage {

    notifications = [];
    notificationsLoaded = false;
    canLoadMore = false;

    protected readCount = 0;
    protected unreadCount = 0;
    protected cronObserver: CoreEventObserver;
    protected pushObserver: Subscription;

    constructor(navParams: NavParams, private domUtils: CoreDomUtilsProvider, private eventsProvider: CoreEventsProvider,
            private sitesProvider: CoreSitesProvider, private textUtils: CoreTextUtilsProvider,
            private utils: CoreUtilsProvider, private notificationsProvider: AddonNotificationsProvider,
            private pushNotificationsDelegate: AddonPushNotificationsDelegate) {
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.fetchNotifications().finally(() => {
            this.notificationsLoaded = true;
        });

        this.cronObserver = this.eventsProvider.on(AddonNotificationsProvider.READ_CRON_EVENT, () => this.refreshNotifications(),
                this.sitesProvider.getCurrentSiteId());

        this.pushObserver = this.pushNotificationsDelegate.on('receive').subscribe((notification) => {
            // New notification received. If it's from current site, refresh the data.
            if (this.utils.isTrueOrOne(notification.notif) && this.sitesProvider.isCurrentSite(notification.site)) {
                this.refreshNotifications();
            }
        });
    }

    /**
     * Convenience function to get notifications. Gets unread notifications first.
     *
     * @param {boolean} refreh Whether we're refreshing data.
     * @return {Promise<any>} Resolved when done.
     */
    protected fetchNotifications(refresh?: boolean): Promise<any> {
        if (refresh) {
            this.readCount = 0;
            this.unreadCount = 0;
        }

        const limit = AddonNotificationsProvider.LIST_LIMIT;

        return this.notificationsProvider.getUnreadNotifications(this.unreadCount, limit).then((unread) => {
            let promise;

            unread.forEach(this.formatText.bind(this));

            /* Don't add the unread notifications to this.notifications yet. If there are no unread notifications
               that causes that the "There are no notifications" message is shown in pull to refresh. */
            this.unreadCount += unread.length;

            if (unread.length < limit) {
                // Limit not reached. Get read notifications until reach the limit.
                const readLimit = limit - unread.length;
                promise = this.notificationsProvider.getReadNotifications(this.readCount, readLimit).then((read) => {
                    read.forEach(this.formatText.bind(this));
                    this.readCount += read.length;
                    if (refresh) {
                        this.notifications = unread.concat(read);
                    } else {
                        this.notifications = this.notifications.concat(unread, read);
                    }
                    this.canLoadMore = read.length >= readLimit;
                }).catch((error) => {
                    if (unread.length == 0) {
                        this.domUtils.showErrorModalDefault(error, 'addon.notifications.errorgetnotifications', true);
                        this.canLoadMore = false; // Set to false to prevent infinite calls with infinite-loading.
                    }
                });
            } else {
                promise = Promise.resolve();
                if (refresh) {
                    this.notifications = unread;
                } else {
                    this.notifications = this.notifications.concat(unread);
                }
                this.canLoadMore = true;
            }

            return promise.then(() => {
                // Mark retrieved notifications as read if they are not.
                this.markNotificationsAsRead(unread);
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.notifications.errorgetnotifications', true);
            this.canLoadMore = false; // Set to false to prevent infinite calls with infinite-loading.
        });
    }

    /**
     * Mark notifications as read.
     *
     * @param {any[]} notifications Array of notification objects.
     */
    protected markNotificationsAsRead(notifications: any[]): void {
        if (notifications.length > 0) {
            const promises = notifications.map((notification) => {
                return this.notificationsProvider.markNotificationRead(notification.id);
            });

            Promise.all(promises).finally(() => {
                this.notificationsProvider.invalidateNotificationsList().finally(() => {
                    const siteId = this.sitesProvider.getCurrentSiteId();
                    this.eventsProvider.trigger(AddonNotificationsProvider.READ_CHANGED_EVENT, null, siteId);
                });
            });
        }
    }

    /**
     * Refresh notifications.
     *
     * @param {any} [refresher] Refresher.
     */
    refreshNotifications(refresher?: any): void {
        this.notificationsProvider.invalidateNotificationsList().finally(() => {
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
     * @param {any} infiniteScroll The infinit scroll instance.
     */
    loadMoreNotifications(infiniteScroll: any): void {
        this.fetchNotifications().finally(() => {
            infiniteScroll.complete();
        });
    }

    /**
     * Formats the text of a notification.
     *
     * @param {any} notification The notification object.
     */
    protected formatText(notification: any): void {
        const text = notification.mobiletext.replace(/-{4,}/ig, '');
        notification.mobiletext = this.textUtils.replaceNewLines(text, '<br>');
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.cronObserver && this.cronObserver.off();
        this.pushObserver && this.pushObserver.unsubscribe();
    }
}
