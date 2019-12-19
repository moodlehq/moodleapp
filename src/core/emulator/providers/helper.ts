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
import { CoreFileProvider } from '@providers/file';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { File } from '@ionic-native/file';
import { LocalNotifications, ILocalNotification } from '@ionic-native/local-notifications';
import { CoreAppProvider } from '@providers/app';
import { CoreInitDelegate, CoreInitHandler } from '@providers/init';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider, CoreSiteSchema } from '@providers/sites';
import { CoreLocalNotificationsProvider } from '@providers/local-notifications';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { FileTransferErrorMock } from './file-transfer';
import { CoreEmulatorCaptureHelperProvider } from './capture-helper';
import { CoreConstants } from '../../constants';

/**
 * Helper service for the emulator feature. It also acts as an init handler.
 */
@Injectable()
export class CoreEmulatorHelperProvider implements CoreInitHandler {
    name = 'CoreEmulator';
    priority = CoreInitDelegate.MAX_RECOMMENDED_PRIORITY + 500;
    blocking = true;

    protected logger;

    // Variables for database.
    protected LAST_RECEIVED_NOTIFICATION_TABLE = 'core_emulator_last_received_notification';
    protected siteSchema: CoreSiteSchema = {
        name: 'CoreEmulatorHelperProvider',
        version: 1,
        tables: [
            {
                name: this.LAST_RECEIVED_NOTIFICATION_TABLE,
                columns: [
                    {
                        name: 'component',
                        type: 'TEXT'
                    },
                    {
                        name: 'id',
                        type: 'INTEGER',
                    },
                    {
                        name: 'timecreated',
                        type: 'INTEGER',
                    },
                ],
                primaryKeys: ['component']
            }
        ]
    };

    constructor(private file: File, private fileProvider: CoreFileProvider, private utils: CoreUtilsProvider,
            logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private localNotif: LocalNotifications,
            private captureHelper: CoreEmulatorCaptureHelperProvider, private timeUtils: CoreTimeUtilsProvider,
            private appProvider: CoreAppProvider, private localNotifProvider: CoreLocalNotificationsProvider) {
        this.logger = logger.getInstance('CoreEmulatorHelper');
        sitesProvider.registerSiteSchema(this.siteSchema);
    }

    /**
     * Load the Mocks that need it.
     *
     * @return Promise resolved when loaded.
     */
    load(): Promise<void> {
        const promises = [];

        promises.push((<any> this.file).load().then((basePath: string) => {
            this.fileProvider.setHTMLBasePath(basePath);
        }));
        promises.push((<any> this.localNotif).load());
        promises.push(this.captureHelper.load());

        (<any> window).FileTransferError = FileTransferErrorMock;

        return this.utils.allPromises(promises);
    }

    /**
     * Check if there are new notifications, triggering a local notification if found.
     * Only for desktop apps since they don't support push notifications.
     *
     * @param component Component to check.
     * @param fetchFn Function that receives a site ID and returns a Promise resolved with an array of notifications.
     * @param getDataFn Function that receives a notification and returns a promise resolved with the title and text.
     * @param siteId Site ID to check. If not defined, check all sites.
     * @return Promise resolved when done.
     */
    checkNewNotifications(component: string, fetchFn: Function, getDataFn: Function, siteId?: string): Promise<any> {
        if (!this.appProvider.isDesktop() || !this.localNotifProvider.isAvailable()) {
            return Promise.resolve(null);
        }

        if (!this.appProvider.isOnline()) {
            this.logger.debug('Cannot check push notifications because device is offline.');

            return Promise.reject(null);
        }

        let promise: Promise<string[]>;
        if (!siteId) {
            // No site ID defined, check all sites.
            promise = this.sitesProvider.getSitesIds();
        } else {
            promise = Promise.resolve([siteId]);
        }

        return promise.then((siteIds) => {
            const sitePromises = siteIds.map((siteId) => {
                // Check new notifications for each site.
                return this.checkNewNotificationsForSite(component, fetchFn, getDataFn, siteId);
            });

            return Promise.all(sitePromises);
        });
    }

    /**
     * Check if there are new notifications for a certain site, triggering a local notification if found.
     *
     * @param component Component to check.
     * @param fetchFn Function that receives a site ID and returns a Promise resolved with an array of notifications.
     * @param getDataFn Function that receives a notification and returns a promise resolved with the title and text.
     * @param siteId Site ID to check.
     * @return Promise resolved when done.
     */
    protected checkNewNotificationsForSite(component: string, fetchFn: Function, getDataFn: Function, siteId: string)
            : Promise<any> {
        // Get the last received notification in the app.
        return this.getLastReceivedNotification(component, siteId).then((lastNotification) => {
            // Now fetch the latest notifications from the server.
            return fetchFn(siteId).then((notifications) => {
                if (!lastNotification || !notifications.length) {
                    // No last notification stored (first call) or no new notifications. Stop.
                    return;
                }

                const notification = notifications[0];

                if (notification.id == lastNotification.id || notification.timecreated <= lastNotification.timecreated ||
                        this.timeUtils.timestamp() - notification.timecreated > CoreConstants.SECONDS_DAY) {
                    // There are no new notifications or the newest one happened more than a day ago, stop.
                    return;
                }

                // There is a new notification, show it.
                return getDataFn(notification).then((titleAndText) => {
                    // Set some calculated data.
                    notification.site = siteId;
                    notification.name = notification.name || notification.eventtype;

                    const localNotif: ILocalNotification = {
                        id: 1,
                        title: titleAndText.title,
                        text: titleAndText.text,
                        data: notification
                    };

                    return this.localNotifProvider.schedule(localNotif, component, siteId);
                });
            });
        });
    }

    /**
     * Get the last notification received in a certain site for a certain component.
     *
     * @param component Component of the notification to get.
     * @param siteId Site ID of the notification.
     * @return Promise resolved with the notification or false if not found.
     */
    getLastReceivedNotification(component: string, siteId: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecord(this.LAST_RECEIVED_NOTIFICATION_TABLE, {component: component});
        }).catch(() => {
            return false;
        });
    }

    /**
     * Store the last notification received in a certain site.
     *
     * @param component Component of the notification to store.
     * @param notification Notification to store.
     * @param siteId Site ID of the notification.
     * @return Promise resolved when done.
     */
    storeLastReceivedNotification(component: string, notification: any, siteId: string): Promise<any> {
        if (!notification) {
            // No notification, store a fake one.
            notification = {id: -1, timecreated: 0};
        }

        return this.sitesProvider.getSite(siteId).then((site) => {
            const entry = {
                component: component,
                id: notification.id,
                timecreated: notification.timecreated,
            };

            return site.getDb().insertRecord(this.LAST_RECEIVED_NOTIFICATION_TABLE, entry);
        });
    }
}
