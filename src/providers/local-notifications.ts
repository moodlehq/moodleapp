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

import { Injectable, NgZone } from '@angular/core';
import { Platform, Alert, AlertController } from 'ionic-angular';
import { LocalNotifications, ILocalNotification } from '@ionic-native/local-notifications';
import { Push } from '@ionic-native/push';
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from './app';
import { CoreConfigProvider } from './config';
import { CoreEventsProvider } from './events';
import { CoreLoggerProvider } from './logger';
import { CoreTextUtilsProvider } from './utils/text';
import { CoreUtilsProvider } from './utils/utils';
import { SQLiteDB, SQLiteDBTableSchema } from '@classes/sqlitedb';
import { CoreConstants } from '@core/constants';
import { CoreConfigConstants } from '../configconstants';
import { Subject, Subscription } from 'rxjs';

/*
 * Generated class for the LocalNotificationsProvider provider.
 *
 * See https://angular.io/guide/dependency-injection for more info on providers
 * and Angular DI.
*/
@Injectable()
export class CoreLocalNotificationsProvider {
    // Variables for the database.
    protected SITES_TABLE = 'notification_sites'; // Store to asigne unique codes to each site.
    protected COMPONENTS_TABLE = 'notification_components'; // Store to asigne unique codes to each component.
    protected TRIGGERED_TABLE = 'notifications_triggered'; // Store to prevent re-triggering notifications.
    protected tablesSchema: SQLiteDBTableSchema[] = [
        {
            name: this.SITES_TABLE,
            columns: [
                {
                    name: 'id',
                    type: 'TEXT',
                    primaryKey: true
                },
                {
                    name: 'code',
                    type: 'INTEGER',
                    notNull: true
                }
            ]
        },
        {
            name: this.COMPONENTS_TABLE,
            columns: [
                {
                    name: 'id',
                    type: 'TEXT',
                    primaryKey: true
                },
                {
                    name: 'code',
                    type: 'INTEGER',
                    notNull: true
                }
            ]
        },
        {
            name: this.TRIGGERED_TABLE,
            columns: [
                {
                    name: 'id',
                    type: 'INTEGER',
                    primaryKey: true
                },
                {
                    name: 'at',
                    type: 'INTEGER',
                    notNull: true
                }
            ]
        }
    ];

    protected logger;
    protected appDB: SQLiteDB;
    protected codes: { [s: string]: number } = {};
    protected codeRequestsQueue = {};
    protected observables = {};
    protected alertNotification: Alert;
    protected currentNotification = {
        title: '',
        texts: [],
        ids: [],
        timeouts: []
    };
    protected triggerSubscription: Subscription;
    protected clickSubscription: Subscription;
    protected clearSubscription: Subscription;
    protected cancelSubscription: Subscription;
    protected addSubscription: Subscription;
    protected updateSubscription: Subscription;

    constructor(logger: CoreLoggerProvider, private localNotifications: LocalNotifications, private platform: Platform,
            private appProvider: CoreAppProvider, private utils: CoreUtilsProvider, private configProvider: CoreConfigProvider,
            private textUtils: CoreTextUtilsProvider, private translate: TranslateService, private alertCtrl: AlertController,
            eventsProvider: CoreEventsProvider, private push: Push, private zone: NgZone) {

        this.logger = logger.getInstance('CoreLocalNotificationsProvider');
        this.appDB = appProvider.getDB();
        this.appDB.createTablesFromSchema(this.tablesSchema);

        platform.ready().then(() => {
            // Listen to events.
            this.triggerSubscription = localNotifications.on('trigger').subscribe((notification: ILocalNotification) => {
                this.trigger(notification);

                this.handleEvent('trigger', notification);
            });

            this.clickSubscription = localNotifications.on('click').subscribe((notification: ILocalNotification) => {
                this.handleEvent('click', notification);
            });

            this.clearSubscription = localNotifications.on('clear').subscribe((notification: ILocalNotification) => {
                this.handleEvent('clear', notification);
            });

            this.cancelSubscription = localNotifications.on('cancel').subscribe((notification: ILocalNotification) => {
                this.handleEvent('cancel', notification);
            });

            this.addSubscription = localNotifications.on('schedule').subscribe((notification: ILocalNotification) => {
                this.handleEvent('schedule', notification);
            });

            this.updateSubscription = localNotifications.on('update').subscribe((notification: ILocalNotification) => {
                this.handleEvent('update', notification);
            });

            // Create the default channel for local notifications.
            this.createDefaultChannel();

            translate.onLangChange.subscribe((event: any) => {
                // Update the channel name.
                this.createDefaultChannel();
            });
        });

        eventsProvider.on(CoreEventsProvider.SITE_DELETED, (site) => {
            if (site) {
                this.cancelSiteNotifications(site.id);
            }
        });
    }

    /**
     * Cancel a local notification.
     *
     * @param id Notification id.
     * @param component Component of the notification.
     * @param siteId Site ID.
     * @return Promise resolved when the notification is cancelled.
     */
    cancel(id: number, component: string, siteId: string): Promise<any> {
        return this.getUniqueNotificationId(id, component, siteId).then((uniqueId) => {
            return this.localNotifications.cancel(uniqueId);
        });
    }

    /**
     * Cancel all the scheduled notifications belonging to a certain site.
     *
     * @param siteId Site ID.
     * @return Promise resolved when the notifications are cancelled.
     */
    cancelSiteNotifications(siteId: string): Promise<any> {

        if (!this.isAvailable()) {
            return Promise.resolve();
        } else if (!siteId) {
            return Promise.reject(null);
        }

        return this.localNotifications.getScheduled().then((scheduled) => {
            const ids = [];

            scheduled.forEach((notif) => {
                if (typeof notif.data == 'string') {
                    notif.data = this.textUtils.parseJSON(notif.data);
                }

                if (typeof notif.data == 'object' && notif.data.siteId === siteId) {
                    ids.push(notif.id);
                }
            });

            return this.localNotifications.cancel(ids);
        });
    }

    /**
     * Check whether sound can be disabled for notifications.
     *
     * @return Whether sound can be disabled for notifications.
     */
    canDisableSound(): boolean {
        // Only allow disabling sound in Android 7 or lower. In iOS and Android 8+ it can easily be done with system settings.
        return this.isAvailable() && !this.appProvider.isDesktop() && this.platform.is('android') &&
                this.platform.version().major < 8;
    }

    /**
     * Create the default channel. It is used to change the name.
     *
     * @return Promise resolved when done.
     */
    protected createDefaultChannel(): Promise<any> {
        if (!this.platform.is('android')) {
            return Promise.resolve();
        }

        return this.push.createChannel({
            id: 'default-channel-id',
            description: this.translate.instant('addon.calendar.calendarreminders'),
            importance: 4
        }).catch((error) => {
            this.logger.error('Error changing channel name', error);
        });
    }

    /**
     * Get a code to create unique notifications. If there's no code assigned, create a new one.
     *
     * @param table Table to search in local DB.
     * @param id ID of the element to get its code.
     * @return Promise resolved when the code is retrieved.
     */
    protected getCode(table: string, id: string): Promise<number> {
        const key = table + '#' + id;

        // Check if the code is already in memory.
        if (typeof this.codes[key] != 'undefined') {
            return Promise.resolve(this.codes[key]);
        }

        // Check if we already have a code stored for that ID.
        return this.appDB.getRecord(table, { id: id }).then((entry) => {
            this.codes[key] = entry.code;

            return entry.code;
        }).catch(() => {
            // No code stored for that ID. Create a new code for it.
            return this.appDB.getRecords(table, undefined, 'code DESC').then((entries) => {
                let newCode = 0;
                if (entries.length > 0) {
                    newCode = entries[0].code + 1;
                }

                return this.appDB.insertRecord(table, { id: id, code: newCode }).then(() => {
                    this.codes[key] = newCode;

                    return newCode;
                });
            });
        });
    }

    /**
     * Get a notification component code to be used.
     * If it's the first time this component is used to send notifications, create a new code for it.
     *
     * @param component Component name.
     * @return Promise resolved when the component code is retrieved.
     */
    protected getComponentCode(component: string): Promise<number> {
        return this.requestCode(this.COMPONENTS_TABLE, component);
    }

    /**
     * Get a site code to be used.
     * If it's the first time this site is used to send notifications, create a new code for it.
     *
     * @param siteId Site ID.
     * @return Promise resolved when the site code is retrieved.
     */
    protected getSiteCode(siteId: string): Promise<number> {
        return this.requestCode(this.SITES_TABLE, siteId);
    }

    /**
     * Create a unique notification ID, trying to prevent collisions. Generated ID must be a Number (Android).
     * The generated ID shouldn't be higher than 2147483647 or it's going to cause problems in Android.
     * This function will prevent collisions and keep the number under Android limit if:
     *     -User has used less than 21 sites.
     *     -There are less than 11 components.
     *     -The notificationId passed as parameter is lower than 10000000.
     *
     * @param notificationId Notification ID.
     * @param component Component triggering the notification.
     * @param siteId Site ID.
     * @return Promise resolved when the notification ID is generated.
     */
    protected getUniqueNotificationId(notificationId: number, component: string, siteId: string): Promise<number> {
        if (!siteId || !component) {
            return Promise.reject(null);
        }

        return this.getSiteCode(siteId).then((siteCode) => {
            return this.getComponentCode(component).then((componentCode) => {
                // We use the % operation to keep the number under Android's limit.
                return (siteCode * 100000000 + componentCode * 10000000 + notificationId) % 2147483647;
            });
        });
    }

    /**
     * Handle an event triggered by the local notifications plugin.
     *
     * @param eventName Name of the event.
     * @param notification Notification.
     */
    protected handleEvent(eventName: string, notification: any): void {
        if (notification && notification.data) {
            this.logger.debug('Notification event: ' + eventName + '. Data:', notification.data);

            this.notifyEvent(eventName, notification.data);
        }
    }

    /**
     * Returns whether local notifications plugin is installed.
     *
     * @return Whether local notifications plugin is installed.
     */
    isAvailable(): boolean {
        const win = <any> window;

        return this.appProvider.isDesktop() || !!(win.cordova && win.cordova.plugins && win.cordova.plugins.notification &&
                win.cordova.plugins.notification.local);
    }

    /**
     * Check if a notification has been triggered with the same trigger time.
     *
     * @param notification Notification to check.
     * @return Promise resolved with a boolean indicating if promise is triggered (true) or not.
     */
    isTriggered(notification: ILocalNotification): Promise<any> {
        return this.appDB.getRecord(this.TRIGGERED_TABLE, { id: notification.id }).then((stored) => {
            let triggered = (notification.trigger && notification.trigger.at) || 0;

            if (typeof triggered != 'number') {
                triggered = triggered.getTime();
            }

            return stored.at === triggered;
        }).catch(() => {
            return this.localNotifications.isTriggered(notification.id);
        });
    }

    /**
     * Notify notification click to observers. Only the observers with the same component as the notification will be notified.
     *
     * @param data Data received by the notification.
     */
    notifyClick(data: any): void {
        this.notifyEvent('click', data);
    }

    /**
     * Notify a certain event to observers. Only the observers with the same component as the notification will be notified.
     *
     * @param eventName Name of the event to notify.
     * @param data Data received by the notification.
     */
    notifyEvent(eventName: string, data: any): void {
        // Execute the code in the Angular zone, so change detection doesn't stop working.
        this.zone.run(() => {
            const component = data.component;
            if (component) {
                if (this.observables[eventName] && this.observables[eventName][component]) {
                    this.observables[eventName][component].next(data);
                }
            }
        });
    }

    /**
     * Process the next request in queue.
     */
    protected processNextRequest(): void {
        const nextKey = Object.keys(this.codeRequestsQueue)[0];
        let request,
            promise;

        if (typeof nextKey == 'undefined') {
            // No more requests in queue, stop.
            return;
        }

        request = this.codeRequestsQueue[nextKey];

        // Check if request is valid.
        if (typeof request == 'object' && typeof request.table != 'undefined' && typeof request.id != 'undefined') {
            // Get the code and resolve/reject all the promises of this request.
            promise = this.getCode(request.table, request.id).then((code) => {
                request.promises.forEach((p) => {
                    p.resolve(code);
                });
            }).catch((error) => {
                request.promises.forEach((p) => {
                    p.reject(error);
                });
            });
        } else {
            promise = Promise.resolve();
        }

        // Once this item is treated, remove it and process next.
        promise.finally(() => {
            delete this.codeRequestsQueue[nextKey];
            this.processNextRequest();
        });
    }

    /**
     * Register an observer to be notified when a notification belonging to a certain component is clicked.
     *
     * @param component Component to listen notifications for.
     * @param callback Function to call with the data received by the notification.
     * @return Object with an "off" property to stop listening for clicks.
     */
    registerClick(component: string, callback: Function): any {
        return this.registerObserver('click', component, callback);
    }

    /**
     * Register an observer to be notified when a certain event is fired for a notification belonging to a certain component.
     *
     * @param eventName Name of the event to listen to.
     * @param component Component to listen notifications for.
     * @param callback Function to call with the data received by the notification.
     * @return Object with an "off" property to stop listening for events.
     */
    registerObserver(eventName: string, component: string, callback: Function): any {
        this.logger.debug(`Register observer '${component}' for event '${eventName}'.`);

        if (typeof this.observables[eventName] == 'undefined') {
            this.observables[eventName] = {};
        }

        if (typeof this.observables[eventName][component] == 'undefined') {
            // No observable for this component, create a new one.
            this.observables[eventName][component] = new Subject<any>();
        }

        this.observables[eventName][component].subscribe(callback);

        return {
            off: (): void => {
                this.observables[eventName][component].unsubscribe(callback);
            }
        };
    }

    /**
     * Remove a notification from triggered store.
     *
     * @param id Notification ID.
     * @return Promise resolved when it is removed.
     */
    removeTriggered(id: number): Promise<any> {
        return this.appDB.deleteRecords(this.TRIGGERED_TABLE, { id: id });
    }

    /**
     * Request a unique code. The request will be added to the queue and the queue is going to be started if it's paused.
     *
     * @param table Table to search in local DB.
     * @param id ID of the element to get its code.
     * @return Promise resolved when the code is retrieved.
     */
    protected requestCode(table: string, id: string): Promise<number> {
        const deferred = this.utils.promiseDefer(),
            key = table + '#' + id,
            isQueueEmpty = Object.keys(this.codeRequestsQueue).length == 0;

        if (typeof this.codeRequestsQueue[key] != 'undefined') {
            // There's already a pending request for this store and ID, add the promise to it.
            this.codeRequestsQueue[key].promises.push(deferred);
        } else {
            // Add a pending request to the queue.
            this.codeRequestsQueue[key] = {
                table: table,
                id: id,
                promises: [deferred]
            };
        }

        if (isQueueEmpty) {
            this.processNextRequest();
        }

        return deferred.promise;
    }

    /**
     * Reschedule all notifications that are already scheduled.
     *
     * @return Promise resolved when all notifications have been rescheduled.
     */
    rescheduleAll(): Promise<any> {
        // Get all the scheduled notifications.
        return this.localNotifications.getScheduled().then((notifications) => {
            const promises = [];

            notifications.forEach((notification) => {
                // Convert some properties to the needed types.
                notification.data = notification.data ? this.textUtils.parseJSON(notification.data, {}) : {};

                promises.push(this.scheduleNotification(notification));
            });

            return Promise.all(promises);
        });
    }

    /**
     * Schedule a local notification.
     *
     * @param notification Notification to schedule. Its ID should be lower than 10000000 and it should
     *                     be unique inside its component and site.
     * @param component Component triggering the notification. It is used to generate unique IDs.
     * @param siteId Site ID.
     * @param alreadyUnique Whether the ID is already unique.
     * @return Promise resolved when the notification is scheduled.
     */
    schedule(notification: ILocalNotification, component: string, siteId: string, alreadyUnique?: boolean): Promise<any> {
        let promise;

        if (alreadyUnique) {
            promise = Promise.resolve(notification.id);
        } else {
            promise = this.getUniqueNotificationId(notification.id, component, siteId);
        }

        return promise.then((uniqueId) => {
            notification.id = uniqueId;
            notification.data = notification.data || {};
            notification.data.component = component;
            notification.data.siteId = siteId;

            if (this.platform.is('android')) {
                notification.icon = notification.icon || 'res://icon';
                notification.smallIcon = notification.smallIcon || 'res://smallicon';
                notification.color = notification.color || CoreConfigConstants.notificoncolor;

                const led: any = notification.led || {};
                notification.led = {
                    color: led.color || 'FF9900',
                    on: led.on || 1000,
                    off: led.off || 1000
                };
            }

            return this.scheduleNotification(notification);
        });
    }

    /**
     * Helper function to schedule a notification object if it hasn't been triggered already.
     *
     * @param notification Notification to schedule.
     * @return Promise resolved when scheduled.
     */
    protected scheduleNotification(notification: ILocalNotification): Promise<any> {
        // Check if the notification has been triggered already.
        return this.isTriggered(notification).then((triggered) => {
            // Cancel the current notification in case it gets scheduled twice.
            return this.localNotifications.cancel(notification.id).finally(() => {
                if (!triggered) {
                    // Check if sound is enabled for notifications.
                    let promise;

                    if (this.canDisableSound()) {
                        promise = this.configProvider.get(CoreConstants.SETTINGS_NOTIFICATION_SOUND, true);
                    } else {
                        promise = Promise.resolve(true);
                    }

                    return promise.then((soundEnabled) => {
                        if (!soundEnabled) {
                            notification.sound = null;
                        } else {
                            delete notification.sound; // Use default value.
                        }

                        notification.foreground = true;

                        // Remove from triggered, since the notification could be in there with a different time.
                        this.removeTriggered(notification.id);
                        this.localNotifications.schedule(notification);
                    });
                }
            });
        });
    }

    /**
     * Show an in app notification popover.
     * This function was used because local notifications weren't displayed when the app was in foreground in iOS10+,
     * but the issue was fixed in the plugin and this function is no longer used.
     *
     * @param notification Notification.
     */
    showNotificationPopover(notification: ILocalNotification): void {

        if (!notification || !notification.title || !notification.text) {
            // Invalid data.
            return;
        }

        const clearAlert = (all: boolean = false): void => {
            // Only erase first notification.
            if (!all && this.alertNotification && this.currentNotification.ids.length > 1) {
                this.currentNotification.texts.shift();
                this.currentNotification.ids.shift();
                clearTimeout(this.currentNotification.timeouts.shift());

                const text = '<p>' + this.currentNotification.texts.join('</p><p>') + '</p>';
                this.alertNotification.setMessage(text);
            } else {
                // Close the alert and reset the current object.
                if (this.alertNotification && !all) {
                    this.alertNotification.dismiss();
                }

                this.alertNotification = null;
                this.currentNotification.title = '';
                this.currentNotification.texts = [];
                this.currentNotification.ids = [];
                this.currentNotification.timeouts.forEach((time) => {
                    clearTimeout(time);
                });
                this.currentNotification.timeouts = [];
            }
        };

        if (this.alertNotification && this.currentNotification.title == notification.title) {
            if (this.currentNotification.ids.indexOf(notification.id) != -1) {
                // Notification already shown, don't show it again, just renew the timeout.
                return;
            }

            // Same title and the notification is shown, update it.
            this.currentNotification.texts.push(notification.text);
            this.currentNotification.ids.push(notification.id);
            if (this.currentNotification.texts.length > 3) {
                this.currentNotification.texts.shift();
                this.currentNotification.ids.shift();
                clearTimeout(this.currentNotification.timeouts.shift());
            }
        } else {
            this.currentNotification.timeouts.forEach((time) => {
                clearTimeout(time);
            });
            this.currentNotification.timeouts = [];

            // Not shown or title is different, set new data.
            this.currentNotification.title = notification.title;
            this.currentNotification.texts = [notification.text];
            this.currentNotification.ids = [notification.id];
        }

        const text = '<p>' + this.currentNotification.texts.join('</p><p>') + '</p>';
        if (this.alertNotification) {
            this.alertNotification.setTitle(this.currentNotification.title);
            this.alertNotification.setMessage(text);
        } else {
            this.alertNotification = this.alertCtrl.create({
                title: this.currentNotification.title,
                message: text,
                cssClass: 'core-inapp-notification',
                enableBackdropDismiss: false,
                buttons: [{
                    text: this.translate.instant('core.dismiss'),
                    role: 'cancel',
                    handler: (): void => {
                        clearAlert(true);
                    }
                }]
            });
        }

        this.alertNotification.present();

        this.currentNotification.timeouts.push(setTimeout(() => {
            clearAlert();
        }, 4000));
    }

    /**
     * Function to call when a notification is triggered. Stores the notification so it's not scheduled again unless the
     * time is changed.
     *
     * @param notification Triggered notification.
     * @return Promise resolved when stored, rejected otherwise.
     */
    trigger(notification: ILocalNotification): Promise<any> {
        const entry = {
            id: notification.id,
            at: notification.trigger && notification.trigger.at ? notification.trigger.at : Date.now()
        };

        return this.appDB.insertRecord(this.TRIGGERED_TABLE, entry);
    }

    /**
     * Update a component name.
     *
     * @param oldName The old name.
     * @param newName The new name.
     * @return Promise resolved when done.
     */
    updateComponentName(oldName: string, newName: string): Promise<any> {
        const oldId = this.COMPONENTS_TABLE + '#' + oldName,
            newId = this.COMPONENTS_TABLE + '#' + newName;

        return this.appDB.updateRecords(this.COMPONENTS_TABLE, {id: newId}, {id: oldId});
    }
}
