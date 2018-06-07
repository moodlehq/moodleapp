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
import { LocalNotifications, ILocalNotification } from '@ionic-native/local-notifications';
import { CoreAppProvider } from '@providers/app';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { SQLiteDB } from '@classes/sqlitedb';
import { CoreConstants } from '@core/constants';
import { CoreConfigConstants } from '../../../configconstants';
import * as moment from 'moment';

/**
 * Emulates the Cordova Globalization plugin in desktop apps and in browser.
 */
@Injectable()
export class LocalNotificationsMock extends LocalNotifications {
    // Variables for Windows notifications.
    protected winNotif; // Library for Windows notifications.
    // Templates for Windows ToastNotifications and TileNotifications.
    protected toastTemplate = '<toast><visual><binding template="ToastText02"><text id="1" hint-wrap="true">%s</text>' +
        '<text id="2" hint-wrap="true">%s</text></binding></visual></toast>';
    protected tileBindingTemplate = '<text hint-style="base" hint-wrap="true">%s</text>' +
        '<text hint-style="captionSubtle" hint-wrap="true">%s</text>';
    protected tileTemplate = '<tile><visual branding="nameAndLogo">' +
        '<binding template="TileMedium">' + this.tileBindingTemplate + '</binding>' +
        '<binding template="TileWide">' + this.tileBindingTemplate + '</binding>' +
        '<binding template="TileLarge">' + this.tileBindingTemplate + '</binding>' +
        '</visual></tile>';

    // Variables for database.
    protected DESKTOP_NOTIFS_TABLE = 'desktop_local_notifications';
    protected tableSchema = {
        name: this.DESKTOP_NOTIFS_TABLE,
        columns: [
            {
                name: 'id',
                type: 'INTEGER',
                primaryKey: true
            },
            {
                name: 'title',
                type: 'TEXT'
            },
            {
                name: 'text',
                type: 'TEXT'
            },
            {
                name: 'at',
                type: 'INTEGER'
            },
            {
                name: 'data',
                type: 'TEXT'
            },
            {
                name: 'triggered',
                type: 'INTEGER'
            }
        ]
    };

    protected appDB: SQLiteDB;
    protected scheduled: { [i: number]: any } = {};
    protected triggered: { [i: number]: any } = {};
    protected observers;
    protected defaults = {
        text: '',
        title: '',
        sound: '',
        badge: 0,
        id: 0,
        data: undefined,
        every: undefined,
        at: undefined
    };

    constructor(private appProvider: CoreAppProvider, private utils: CoreUtilsProvider, private textUtils: CoreTextUtilsProvider) {
        super();

        this.appDB = appProvider.getDB();
        this.appDB.createTableFromSchema(this.tableSchema);

        // Initialize observers.
        this.observers = {
            schedule: [],
            trigger: [],
            click: [],
            update: [],
            clear: [],
            clearall: [],
            cancel: [],
            cancelall: []
        };
    }

    /**
     * Cancels single or multiple notifications
     * @param notificationId {any} A single notification id, or an array of notification ids.
     * @returns {Promise<any>} Returns a promise when the notification is canceled
     */
    cancel(notificationId: any): Promise<any> {
        const promises = [];

        notificationId = Array.isArray(notificationId) ? notificationId : [notificationId];
        notificationId = this.convertIds(notificationId);

        // Cancel the notifications.
        notificationId.forEach((id) => {
            if (this.scheduled[id]) {
                promises.push(this.cancelNotification(id, false, 'cancel'));
            }
        });

        return Promise.all(promises);
    }

    /**
     * Cancels all notifications.
     *
     * @returns {Promise<any>} Returns a promise when all notifications are canceled.
     */
    cancelAll(): Promise<any> {
        return this.cancel(Object.keys(this.scheduled)).then(() => {
            this.triggerEvent('cancelall', 'foreground');
        });
    }

    /**
     * Cancel a local notification.
     *
     * @param {number} id Notification ID.
     * @param {boolean} omitEvent If true, the clear/cancel event won't be triggered.
     * @param {string} eventName Name of the event to trigger.
     * @return {Void}
     */
    protected cancelNotification(id: number, omitEvent: boolean, eventName: string): void {
        const notification = this.scheduled[id].notification;

        clearTimeout(this.scheduled[id].timeout);
        clearInterval(this.scheduled[id].interval);
        delete this.scheduled[id];
        delete this.triggered[id];

        this.removeNotification(id);

        if (!omitEvent) {
            this.triggerEvent(eventName, notification, 'foreground');
        }
    }

    /**
     * Clears single or multiple notifications.
     *
     * @param {any} notificationId A single notification id, or an array of notification ids.
     * @returns {Promise<any>} Returns a promise when the notification had been cleared.
     */
    clear(notificationId: any): Promise<any> {
        const promises = [];

        notificationId = Array.isArray(notificationId) ? notificationId : [notificationId];
        notificationId = this.convertIds(notificationId);

        // Clear the notifications.
        notificationId.forEach((id) => {
            // Cancel only the notifications that aren't repeating.
            if (this.scheduled[id] && this.scheduled[id].notification && !this.scheduled[id].notification.every) {
                promises.push(this.cancelNotification(id, false, 'clear'));
            }
        });

        return Promise.all(promises);
    }
    /**
     * Clears all notifications.
     *
     * @returns {Promise<any>} Returns a promise when all notifications have cleared
     */
    clearAll(): Promise<any> {
        return this.clear(Object.keys(this.scheduled)).then(() => {
            this.triggerEvent('clearall', 'foreground');
        });
    }

    /**
     * Convert a list of IDs to numbers.
     * Code extracted from the Cordova plugin.
     *
     * @param {any[]} ids List of IDs.
     * @return {number[]} List of IDs as numbers.
     */
    protected convertIds(ids: any[]): number[] {
        const convertedIds = [];

        for (let i = 0; i < ids.length; i++) {
            convertedIds.push(Number(ids[i]));
        }

        return convertedIds;
    }

    /**
     * Convert the notification options to their required type.
     * Code extracted from the Cordova plugin.
     *
     * @param {ILocalNotification} notification Notification.
     * @return {ILocalNotification} Converted notification.
     */
    protected convertProperties(notification: ILocalNotification): ILocalNotification {
        if (notification.id) {
            if (isNaN(notification.id)) {
                notification.id = this.defaults.id;
            } else {
                notification.id = Number(notification.id);
            }
        }

        if (notification.title) {
            notification.title = notification.title.toString();
        }

        if (notification.text) {
            notification.text = notification.text.toString();
        }

        if (notification.badge) {
            if (isNaN(notification.badge)) {
                notification.badge = this.defaults.badge;
            } else {
                notification.badge = Number(notification.badge);
            }
        }

        if (notification.at) {
            if (typeof notification.at == 'object') {
                notification.at = notification.at.getTime();
            }

            notification.at = Math.round(notification.at / 1000);
        }

        if (typeof notification.data == 'object') {
            notification.data = JSON.stringify(notification.data);
        }

        return notification;
    }

    /**
     * Get a notification object.
     *
     * @param {any} notificationId The id of the notification to get.
     * @returns {Promise<ILocalNotification>}
     */
    get(notificationId: any): Promise<ILocalNotification> {
        return Promise.resolve(this.getNotifications([Number(notificationId)], true, true)[0]);
    }

    /**
     * Get all notification objects.
     *
     * @returns {Promise<Array<ILocalNotification>>}
     */
    getAll(): Promise<Array<ILocalNotification>> {
        return Promise.resolve(this.getNotifications(undefined, true, true));
    }

    /**
     * Get all the notification ids.
     *
     * @returns {Promise<Array<number>>}
     */
    getAllIds(): Promise<Array<number>> {
        let ids = this.utils.mergeArraysWithoutDuplicates(Object.keys(this.scheduled), Object.keys(this.triggered));
        ids = ids.map((id) => {
            return Number(id);
        });

        return Promise.resolve(ids);
    }

    /**
     * Get all the notification stored in local DB.
     *
     * @return {Promise<any>} Promise resolved with the notifications.
     */
    protected getAllNotifications(): Promise<any> {
        return this.appDB.getAllRecords(this.DESKTOP_NOTIFS_TABLE).then((notifications) => {
            notifications.forEach((notification) => {
                notification.at = new Date(notification.at);
                notification.data = this.textUtils.parseJSON(notification.data);
                notification.triggered = !!notification.triggered;
            });

            return notifications;
        });
    }

    /**
     * Get all scheduled notification objects.
     *
     * @returns {Promise<Array<ILocalNotification>>}
     */
    getAllScheduled(): Promise<Array<ILocalNotification>> {
        return Promise.resolve(this.getNotifications(undefined, true, false));
    }

    /**
     * Get all triggered notification objects.
     *
     * @returns {Promise<Array<ILocalNotification>>}
     */
    getAllTriggered(): Promise<Array<ILocalNotification>> {
        return Promise.resolve(this.getNotifications(undefined, false, true));
    }

    /**
     * Get a set of notifications. If ids isn't specified, return all the notifications.
     *
     * @param {Number[]} [ids] Ids of notifications to get. If not specified, get all notifications.
     * @param {boolean} [getScheduled] Get scheduled notifications.
     * @param {boolean} [getTriggered] Get triggered notifications.
     * @return {ILocalNotification[]} List of notifications.
     */
    protected getNotifications(ids?: number[], getScheduled?: boolean, getTriggered?: boolean): ILocalNotification[] {
        const notifications = [];

        if (getScheduled) {
            for (const id in this.scheduled) {
                if (!ids || ids.indexOf(Number(id)) != -1) {
                    notifications.push(this.scheduled[id].notification);
                }
            }
        }

        if (getTriggered) {
            for (const id in this.triggered) {
                if ((!getScheduled || !this.scheduled[id]) && (!ids || ids.indexOf(Number(id)) != -1)) {
                    notifications.push(this.triggered[id].notification);
                }
            }
        }

        return notifications;
    }

    /**
     * Get a scheduled notification object.
     *
     * @param {any} notificationId The id of the notification to ge.
     * @returns {Promise<ILocalNotification>}
     */
    getScheduled(notificationId: any): Promise<ILocalNotification> {
        return Promise.resolve(this.getNotifications([Number(notificationId)], true, false)[0]);
    }

    /**
     * Get the ids of scheduled notifications.
     *
     * @returns {Promise<Array<number>>} Returns a promise
     */
    getScheduledIds(): Promise<Array<number>> {
        const ids = Object.keys(this.scheduled).map((id) => {
            return Number(id);
        });

        return Promise.resolve(ids);
    }

    /**
     * Get a triggered notification object.
     *
     * @param {any} notificationId The id of the notification to get.
     * @returns {Promise<ILocalNotification>}
     */
    getTriggered(notificationId: any): Promise<ILocalNotification> {
        return Promise.resolve(this.getNotifications([Number(notificationId)], false, true)[0]);
    }

    /**
     * Get the ids of triggered notifications.
     *
     * @returns {Promise<Array<number>>}
     */
    getTriggeredIds(): Promise<Array<number>> {
        const ids = Object.keys(this.triggered).map((id) => {
            return Number(id);
        });

        return Promise.resolve(ids);
    }

    /**
     * Given an object of options and a list of properties, return the first property that exists.
     * Code extracted from the Cordova plugin.
     *
     * @param {ILocalNotification} notification Notification.
     * @param {any} ...args List of keys to check.
     * @return {any} First value found.
     */
    protected getValueFor(notification: ILocalNotification, ...args: any[]): any {
        for (const i in args) {
            const key = args[i];
            if (notification.hasOwnProperty(key)) {
                return notification[key];
            }
        }
    }

    /**
     * Informs if the app has the permission to show notifications.
     *
     * @returns {Promise<boolean>}
     */
    hasPermission(): Promise<boolean> {
        return Promise.resolve(true);
    }

    /**
     * Checks presence of a notification.
     *
     * @param {number} notificationId Notification ID.
     * @returns {Promise<boolean>}
     */
    isPresent(notificationId: number): Promise<boolean> {
        return Promise.resolve(!!this.scheduled[notificationId] || !!this.triggered[notificationId]);
    }

    /**
     * Checks is a notification is scheduled.
     *
     * @param {number} notificationId Notification ID.
     * @returns {Promise<boolean>}
     */
    isScheduled(notificationId: number): Promise<boolean> {
        return Promise.resolve(!!this.scheduled[notificationId]);
    }
    /**
     * Checks if a notification is triggered.
     *
     * @param {number} notificationId Notification ID.
     * @returns {Promise<boolean>}
     */
    isTriggered(notificationId: number): Promise<boolean> {
        return Promise.resolve(!!this.triggered[notificationId]);
    }

    /**
     * Loads an initialize the API for desktop.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    load(): Promise<any> {
        if (!this.appProvider.isDesktop()) {
            return Promise.resolve();
        }

        if (this.appProvider.isWindows()) {
            try {
                this.winNotif = require('electron-windows-notifications');
            } catch (ex) {
                // Ignore errors.
            }
        }

        // App is being loaded, re-schedule all the notifications that were scheduled before.
        return this.getAllNotifications().catch(() => {
            return [];
        }).then((notifications) => {
            notifications.forEach((notification) => {
                if (notification.triggered) {
                    // Notification was triggered already, store it in memory but don't schedule it again.
                    delete notification.triggered;
                    this.scheduled[notification.id] = {
                        notification: notification
                    };
                    this.triggered[notification.id] = notification;
                } else {
                    // Schedule the notification again unless it should have been triggered more than an hour ago.
                    delete notification.triggered;
                    notification.at = notification.at * 1000;
                    if (notification.at - Date.now() > - CoreConstants.SECONDS_HOUR * 1000) {
                        this.schedule(notification);
                    }
                }
            });
        });
    }

    /**
     * Merge notification options with default values.
     * Code extracted from the Cordova plugin.
     *
     * @param {ILocalNotification} notification Notification.
     * @return {ILocalNotification} Treated notification.
     */
    protected mergeWithDefaults(notification: ILocalNotification): ILocalNotification {
        notification.at = this.getValueFor(notification, 'at', 'firstAt', 'date');
        notification.text = this.getValueFor(notification, 'text', 'message');
        notification.data = this.getValueFor(notification, 'data', 'json');

        if (notification.at === undefined || notification.at === null) {
            notification.at = new Date();
        }

        for (const key in this.defaults) {
            if (notification[key] === null || notification[key] === undefined) {
                if (notification.hasOwnProperty(key) && ['data', 'sound'].indexOf(key) > -1) {
                    notification[key] = undefined;
                } else {
                    notification[key] = this.defaults[key];
                }
            }
        }

        for (const key in notification) {
            if (!this.defaults.hasOwnProperty(key)) {
                delete notification[key];
            }
        }

        return notification;
    }

    /**
     * Function called when a notification is clicked.
     *
     * @param {ILocalNotification} notification Clicked notification.
     */
    protected notificationClicked(notification: ILocalNotification): void {
        this.triggerEvent('click', notification, 'foreground');
        // Focus the app.
        require('electron').ipcRenderer.send('focusApp');
    }

    /**
     * Sets a callback for a specific event.
     *
     * @param {string} eventName Name of the event. Events: schedule, trigger, click, update, clear, clearall, cancel, cancelall
     * @param {any} callback Call back function.
     */
    on(eventName: string, callback: any): void {
        if (!this.observers[eventName] || typeof callback != 'function') {
            // Event not supported, stop.
            return;
        }
        this.observers[eventName].push(callback);
    }

    /**
     * Parse a interval and convert it to a number of milliseconds (0 if not valid).
     * Code extracted from the Cordova plugin.
     *
     * @param {string} every Interval to convert.
     * @return {number} Number of milliseconds of the interval-
     */
    protected parseInterval(every: string): number {
        let interval;

        every = String(every).toLowerCase();

        if (!every || every == 'undefined') {
            interval = 0;
        } else if (every == 'second') {
            interval = 1000;
        } else if (every == 'minute') {
            interval = CoreConstants.SECONDS_MINUTE * 1000;
        } else if (every == 'hour') {
            interval = CoreConstants.SECONDS_HOUR * 1000;
        } else if (every == 'day') {
            interval = CoreConstants.SECONDS_DAY * 1000;
        } else if (every == 'week') {
            interval = CoreConstants.SECONDS_DAY * 7 * 1000;
        } else if (every == 'month') {
            interval = CoreConstants.SECONDS_DAY * 31 * 1000;
        } else if (every == 'quarter') {
            interval = CoreConstants.SECONDS_HOUR * 2190 * 1000;
        } else if (every == 'year') {
            interval = CoreConstants.SECONDS_YEAR * 1000;
        } else {
            interval = parseInt(every, 10);
            if (isNaN(interval)) {
                interval = 0;
            } else {
                interval *= 60000;
            }
        }

        return interval;
    }

    /**
     * Register permission to show notifications if not already granted.
     *
     * @returns {Promise<boolean>}
     */
    registerPermission(): Promise<boolean> {
        return Promise.resolve(true);
    }

    /**
     * Remove a notification from local DB.
     *
     * @param {number} id ID of the notification.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected removeNotification(id: number): Promise<any> {
        return this.appDB.deleteRecords(this.DESKTOP_NOTIFS_TABLE, { id: id });
    }

    /**
     * Schedules a single or multiple notifications.
     *
     * @param {ILocalNotification | Array<ILocalNotification>} [options] Notification or notifications.
     */
    schedule(options?: ILocalNotification | Array<ILocalNotification>): void {
        this.scheduleOrUpdate(options);
    }

    /**
     * Schedules or updates a single or multiple notifications.
     *
     * @param {ILocalNotification | Array<ILocalNotification>} [options] Notification or notifications.
     * @param {string} [eventName] Name of the event: schedule or update.
     */
    protected scheduleOrUpdate(options?: ILocalNotification | Array<ILocalNotification>, eventName: string = 'schedule'): void {
        options = Array.isArray(options) ? options : [options];

        options.forEach((notification) => {
            this.mergeWithDefaults(notification);
            this.convertProperties(notification);

            // Cancel current notification if exists.
            this.cancelNotification(notification.id, true, 'cancel');

            // Store the notification in the scheduled list and in the DB.
            this.scheduled[notification.id] = {
                notification: notification
            };
            this.storeNotification(notification, false);

            if (Math.abs(moment().diff(notification.at * 1000, 'days')) > 15) {
                // Notification should trigger more than 15 days from now, don't schedule it.
                return;
            }

            // Schedule the notification.
            const toTriggerTime = notification.at * 1000 - Date.now(),
                trigger = (): void => {
                    // Trigger the notification.
                    this.triggerNotification(notification);

                    // Store the notification as triggered. Don't remove it from scheduled, it's how the plugin works.
                    this.triggered[notification.id] = notification;
                    this.storeNotification(notification, true);

                    // Launch the trigger event.
                    this.triggerEvent('trigger', notification, 'foreground');

                    if (notification.every && this.scheduled[notification.id] && !this.scheduled[notification.id].interval) {
                        const interval = this.parseInterval(notification.every);
                        if (interval > 0) {
                            this.scheduled[notification.id].interval = setInterval(trigger, interval);
                        }
                    }
                };

            this.scheduled[notification.id].timeout = setTimeout(trigger, toTriggerTime);

            // Launch the scheduled/update event.
            this.triggerEvent(eventName, notification, 'foreground');
        });
    }

    /**
     * Store a notification in local DB.
     *
     * @param {ILocalNotification} notification Notification to store.
     * @param {boolean} triggered Whether the notification has been triggered.
     * @return {Promise<any>} Promise resolved when stored.
     */
    protected storeNotification(notification: ILocalNotification, triggered: boolean): Promise<any> {
        // Only store some of the properties.
        const entry = {
            id : notification.id,
            title: notification.title,
            text: notification.text,
            at: notification.at ? notification.at.getTime() : 0,
            data: notification.data ? JSON.stringify(notification.data) : '{}',
            triggered: triggered ? 1 : 0
        };

        return this.appDB.insertRecord(this.DESKTOP_NOTIFS_TABLE, entry);
    }

    /**
     * Trigger an event.
     *
     * @param {string} eventName Event name.
     * @param {any[]} ...args List of parameters to pass.
     */
    protected triggerEvent(eventName: string, ...args: any[]): void {
        if (this.observers[eventName]) {
            this.observers[eventName].forEach((callback) => {
                callback.apply(null, args);
            });
        }
    }

    /**
     * Trigger a notification, using the best method depending on the OS.
     *
     * @param {ILocalNotification} notification Notification to trigger.
     */
    protected triggerNotification(notification: ILocalNotification): void {
        if (this.winNotif) {
            // Use Windows notifications.
            const notifInstance = new this.winNotif.ToastNotification({
                appId: CoreConfigConstants.app_id,
                template: this.toastTemplate,
                strings: [notification.title, notification.text]
            });

            // Listen for click events.
            notifInstance.on('activated', () => {
                this.notificationClicked(notification);
            });

            notifInstance.show();

            try {
                // Show it in Tile too.
                const tileNotif = new this.winNotif.TileNotification({
                    tag: notification.id + '',
                    template: this.tileTemplate,
                    strings: [notification.title, notification.text, notification.title, notification.text, notification.title,
                    notification.text],
                    expirationTime: new Date(Date.now() + CoreConstants.SECONDS_HOUR * 1000) // Expire in 1 hour.
                });

                tileNotif.show();
            } catch (ex) {
                // tslint:disable-next-line
                console.warn('Error showing TileNotification. Please notice they only work with the app installed.', ex);
            }
        } else {
            // Use Electron default notifications.
            const notifInstance = new Notification(notification.title, {
                body: notification.text
            });

            // Listen for click events.
            notifInstance.onclick = (): void => {
                this.notificationClicked(notification);
            };
        }
    }

    /**
     * Removes a callback of a specific event.
     *
     * @param {string} eventName Name of the event. Events: schedule, trigger, click, update, clear, clearall, cancel, cancelall
     * @param {any} callback Call back function.
     */
    un(eventName: string, callback: any): void {
        if (this.observers[eventName] && this.observers[eventName].length) {
            for (let i = 0; i < this.observers[eventName].length; i++) {
                if (this.observers[eventName][i] == callback) {
                    this.observers[eventName].splice(i, 1);
                    break;
                }
            }
        }
    }

    /**
     * Updates a previously scheduled notification. Must include the id in the options parameter.
     *
     * @param {ILocalNotification} [options] Notification.
     */
    update(options?: ILocalNotification): void {
        return this.scheduleOrUpdate(options, 'update');
    }
}
