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
import { LocalNotifications, ILocalNotification, ILocalNotificationAction } from '@ionic-native/local-notifications';
import { CoreAppProvider } from '@providers/app';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { SQLiteDB, SQLiteDBTableSchema } from '@classes/sqlitedb';
import { CoreConstants } from '@core/constants';
import { CoreConfigConstants } from '../../../configconstants';
import * as moment from 'moment';
import { Subject, Observable } from 'rxjs';

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
    protected tableSchema: SQLiteDBTableSchema = {
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
    protected observers: {[event: string]: Subject<any>};
    protected defaults = {
        actions       : [],
        attachments   : [],
        autoClear     : true,
        badge         : null,
        channel       : null,
        clock         : true,
        color         : null,
        data          : null,
        defaults      : 0,
        foreground    : null,
        group         : null,
        groupSummary  : false,
        icon          : null,
        id            : 0,
        launch        : true,
        led           : true,
        lockscreen    : true,
        mediaSession  : null,
        number        : 0,
        priority      : 0,
        progressBar   : false,
        silent        : false,
        smallIcon     : 'res://icon',
        sound         : true,
        sticky        : false,
        summary       : null,
        text          : '',
        timeoutAfter  : false,
        title         : '',
        trigger       : { type : 'calendar' },
        vibrate       : false,
        wakeup        : true
    };

    constructor(private appProvider: CoreAppProvider, private utils: CoreUtilsProvider, private textUtils: CoreTextUtilsProvider) {
        super();

        this.appDB = appProvider.getDB();
        this.appDB.createTableFromSchema(this.tableSchema);

        // Initialize observers.
        this.observers = {
            schedule: new Subject<any>(),
            trigger: new Subject<any>(),
            click: new Subject<any>(),
            update: new Subject<any>(),
            clear: new Subject<any>(),
            clearall: new Subject<any>(),
            cancel: new Subject<any>(),
            cancelall: new Subject<any>(),
        };
    }

    /**
     * Adds a group of actions.
     *
     * @param {any} groupId The id of the action group
     * @param {ILocalNotificationAction[]} actions The actions of this group
     * @returns {Promise<any>}
     */
    addActions(groupId: any, actions: ILocalNotificationAction[]): Promise<any> {
        return Promise.reject('Not supported in desktop apps.');
    }

    /**
     * Cancels single or multiple notifications.
     *
     * @param {any} notificationId A single notification id, or an array of notification ids.
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
            this.fireEvent('cancelall', {
                event: 'cancelall',
                foreground: true,
                queued: false
            });
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
        if (!this.scheduled[id]) {
            return;
        }

        const notification = this.scheduled[id].notification;

        clearTimeout(this.scheduled[id].timeout);
        clearInterval(this.scheduled[id].interval);
        delete this.scheduled[id];
        delete this.triggered[id];

        this.removeNotification(id);

        if (!omitEvent) {
            this.fireEvent(eventName, notification);
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
            if (this.scheduled[id] && this.scheduled[id].notification &&
                    (!this.scheduled[id].notification.trigger || !this.scheduled[id].notification.trigger.every)) {
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
            this.fireEvent('clearall', {
                event: 'clearall',
                foreground: true,
                queued: false
            });
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
            notification.id = this.parseToInt('id', notification);
        }

        if (notification.title) {
            notification.title = notification.title.toString();
        }

        if (notification.badge) {
            notification.badge = this.parseToInt('badge', notification);
        }

        if (notification.defaults) {
            notification.defaults = this.parseToInt('defaults', notification);
        }

        if (typeof notification.timeoutAfter === 'boolean') {
            notification.timeoutAfter = notification.timeoutAfter ? 3600000 : null;
        }

        if (notification.timeoutAfter) {
            notification.timeoutAfter = this.parseToInt('timeoutAfter', notification);
        }

        this.convertPriority(notification);
        this.convertTrigger(notification);
        this.convertActions(notification);
        this.convertProgressBar(notification);

        return notification;
    }

    /**
     * Parse a property to number, returning the default value if not valid.
     * Code extracted from the Cordova plugin.
     *
     * @param {string} prop Name of property to convert.
     * @param {any} notification Notification where to search the property.
     * @return {number} Converted number or default value.
     */
    protected parseToInt(prop: string, notification: any): number {
        if (isNaN(notification[prop])) {
            return this.defaults[prop];
        } else {
            return Number(notification[prop]);
        }
    }

    /**
     * Convert the priority of a notification.
     * Code extracted from the Cordova plugin.
     *
     * @param {any} notification Notification.
     * @return {any} Notification.
     */
    protected convertPriority(notification: any): any {
        let prio = notification.priority || notification.prio || 0;

        if (typeof prio === 'string') {
            prio = { min: -2, low: -1, high: 1, max: 2 }[prio] || 0;
        }

        if (notification.foreground === true) {
            prio = Math.max(prio, 1);
        }

        if (notification.foreground === false) {
            prio = Math.min(prio, 0);
        }

        notification.priority = prio;

        return notification;
    }

    /**
     * Convert the actions of a notification.
     * Code extracted from the Cordova plugin.
     *
     * @param {any} notification Notification.
     * @return {any} Notification.
     */
    protected convertActions(notification: any): any {
        const actions = [];

        if (!notification.actions || typeof notification.actions === 'string') {
            return notification;
        }

        for (let i = 0, len = notification.actions.length; i < len; i++) {
            const action = notification.actions[i];

            if (!action.id) {
                // Ignore action, it has no ID.
                continue;
            }

            action.id = action.id.toString();

            actions.push(action);
        }

        notification.actions = actions;

        return notification;
    }

    /**
     * Convert the trigger of a notification.
     * Code extracted from the Cordova plugin.
     *
     * @param {any} notification Notification.
     * @return {any} Notification.
     */
    protected convertTrigger(notification: any): any {
        const trigger = notification.trigger || {};
        let date = this.getValueFor(trigger, 'at', 'firstAt', 'date');

        const dateToNum = (date: any): number => {
            const num = typeof date == 'object' ? date.getTime() : date;

            return Math.round(num);
        };

        if (!notification.trigger) {
            return notification;
        }

        if (!trigger.type) {
            trigger.type = trigger.center ? 'location' : 'calendar';
        }

        const isCal = trigger.type == 'calendar';

        if (isCal && !date) {
            date = this.getValueFor(notification, 'at', 'firstAt', 'date');
        }

        if (isCal && !trigger.every && notification.every) {
            trigger.every = notification.every;
        }

        if (isCal && (trigger.in || trigger.every)) {
            date = null;
        }

        if (isCal && date) {
            trigger.at = dateToNum(date);
        }

        if (isCal && trigger.firstAt) {
            trigger.firstAt = dateToNum(trigger.firstAt);
        }

        if (isCal && trigger.before) {
            trigger.before = dateToNum(trigger.before);
        }

        if (isCal && trigger.after) {
            trigger.after = dateToNum(trigger.after);
        }

        if (!trigger.count) {
            trigger.count = trigger.every ? 5 : 1;
        }

        if (!isCal) {
            trigger.notifyOnEntry = !!trigger.notifyOnEntry;
            trigger.notifyOnExit  = trigger.notifyOnExit === true;
            trigger.radius        = trigger.radius || 5;
            trigger.single        = !!trigger.single;
        }

        if (!isCal || trigger.at) {
            delete trigger.every;
        }

        delete notification.every;
        delete notification.at;
        delete notification.firstAt;
        delete notification.date;

        notification.trigger = trigger;

        return notification;
    }

    /**
     * Convert the progress bar of a notification.
     * Code extracted from the Cordova plugin.
     *
     * @param {any} notification Notification.
     * @return {any} Notification.
     */
    protected convertProgressBar(notification: any): any {
        let cfg = notification.progressBar;

        if (cfg === undefined) {
            return notification;
        }

        if (typeof cfg === 'boolean') {
            cfg = notification.progressBar = { enabled: cfg };
        }

        if (typeof cfg.enabled !== 'boolean') {
            cfg.enabled = !!(cfg.value || cfg.maxValue || cfg.indeterminate !== null);
        }

        cfg.value = cfg.value || 0;

        cfg.enabled = !!cfg.enabled;

        if (cfg.enabled && notification.clock === true) {
            notification.clock = 'chronometer';
        }

        return notification;
    }

    /**
     * Not an official interface, however its possible to manually fire events.
     *
     * @param {string} eventName The name of the event. Available events: schedule, trigger, click, update, clear, clearall, cancel,
     *                  cancelall. Custom event names are possible for actions
     * @param {any} args Optional arguments
     */
    fireEvent(eventName: string, args: any): void {
        if (this.observers[eventName]) {
            this.observers[eventName].next(args);
        }
    }

    /**
     * Fire queued events once the device is ready and all listeners are registered.
     *
     * @returns {Promise<any>}
     */
    fireQueuedEvents(): Promise<any> {
        return Promise.resolve();
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
     * Gets the (platform specific) default settings.
     *
     * @returns {Promise<any>} An object with all default settings
     */
    getDefaults(): Promise<any> {
        return Promise.resolve(this.defaults);
    }

    /**
     * Get all the notification ids.
     *
     * @returns {Promise<Array<number>>}
     */
    getIds(): Promise<Array<number>> {
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
                notification.trigger = {
                    at: new Date(notification.at)
                };
                notification.data = this.textUtils.parseJSON(notification.data);
                notification.triggered = !!notification.triggered;

                this.mergeWithDefaults(notification);
            });

            return notifications;
        });
    }

    /**
     * Get all scheduled notification objects.
     *
     * @returns {Promise<Array<ILocalNotification>>}
     */
    getScheduled(): Promise<Array<ILocalNotification>> {
        return Promise.resolve(this.getNotifications(undefined, true, false));
    }

    /**
     * Get all triggered notification objects.
     *
     * @returns {Promise<Array<ILocalNotification>>}
     */
    getTriggered(): Promise<Array<ILocalNotification>> {
        return Promise.resolve(this.getNotifications(undefined, false, true));
    }

    /**
     * Get a set of notifications. If ids isn't specified, return all the notifications.
     *
     * @param {number[]} [ids] Ids of notifications to get. If not specified, get all notifications.
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
     * Get the trigger "at" in milliseconds.
     *
     * @param {ILocalNotification} notification Notification to get the trigger from.
     * @return {number} Trigger time.
     */
    protected getNotificationTriggerAt(notification: ILocalNotification): number {
        const triggerAt = (notification.trigger && notification.trigger.at) || new Date();

        if (typeof triggerAt != 'number') {
            return triggerAt.getTime();
        }

        return triggerAt;
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
     * Get the type (triggered, scheduled) for the notification.
     *
     * @param {number} id The ID of the notification.
     * @return {Promise<boolean>}
     */
    getType(id: number): Promise<any> {
        if (this.scheduled[id]) {
            return Promise.resolve('scheduled');
        } else if (this.triggered[id]) {
            return Promise.resolve('triggered');
        } else {
            return Promise.resolve('unknown');
        }
    }

    /**
     * Given an object of options and a list of properties, return the first property that exists.
     * Code extracted from the Cordova plugin.
     *
     * @param {ILocalNotification} notification Notification.
     * @param {any[]} ...args List of keys to check.
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
     * Checks if a group of actions is defined.
     *
     * @param {any} groupId The id of the action group
     * @returns {Promise<boolean>} Whether the group is defined.
     */
    hasActions(groupId: any): Promise<boolean> {
        return Promise.resolve(false);
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
     * Check if a notification has a given type.
     *
     * @param {number} id The ID of the notification.
     * @param {string} type  The type of the notification.
     * @returns {Promise<boolean>} Promise resolved with boolean: whether it has the type.
     */
    hasType(id: number, type: string): Promise<boolean> {
        return this.getType(id).then((notifType) => {
            return type == notifType;
        });
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
        const values = this.getDefaults();

        if (values.hasOwnProperty('sticky')) {
            notification.sticky = this.getValueFor(notification, 'sticky', 'ongoing');
        }

        if (notification.sticky && notification.autoClear !== true) {
            notification.autoClear = false;
        }

        Object.assign(values, notification);

        for (const key in values) {
            if (values[key] !== null) {
                notification[key] = values[key];
            } else {
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
        this.fireEvent('click', notification);
        // Focus the app.
        require('electron').ipcRenderer.send('focusApp');
    }

    /**
     * Sets a callback for a specific event.
     *
     * @param {string} eventName The name of the event. Events: schedule, trigger, click, update, clear, clearall, cancel,
     *                           cancelall. Custom event names are possible for actions.
     * @return {Observable<any>} Observable
     */
    on(eventName: string): Observable<any> {
        return this.observers[eventName];
    }

    /**
     * Parse a interval and convert it to a number of milliseconds (0 if not valid).
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
     * Removes a group of actions.
     *
     * @param {any} groupId The id of the action group
     * @returns {Promise<any>}
     */
    removeActions(groupId: any): Promise<any> {
        return Promise.reject('Not supported in desktop apps.');
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
     * Request permission to show notifications if not already granted.
     *
     * @returns {Promise<boolean>}
     */
    requestPermission(): Promise<boolean> {
        return Promise.resolve(true);
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
     * We only support using the "at" property to trigger the notification. Other properties like "in" or "every"
     * aren't supported yet.
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

            const triggerAt = this.getNotificationTriggerAt(notification);

            if (Math.abs(moment().diff(triggerAt, 'days')) > 15) {
                // Notification should trigger more than 15 days from now, don't schedule it.
                return;
            }

            // Schedule the notification.
            const toTriggerTime = triggerAt - Date.now(),
                trigger = (): void => {
                    // Trigger the notification.
                    this.triggerNotification(notification);

                    // Store the notification as triggered. Don't remove it from scheduled, it's how the plugin works.
                    this.triggered[notification.id] = notification;
                    this.storeNotification(notification, true);

                    // Launch the trigger event.
                    this.fireEvent('trigger', notification);
                };

            this.scheduled[notification.id].timeout = setTimeout(trigger, toTriggerTime);

            // Launch the scheduled/update event.
            this.fireEvent(eventName, notification);
        });
    }

    /**
     * Overwrites the (platform specific) default settings.
     *
     * @param {any} defaults The defaults to set.
     * @returns {Promise<any>}
     */
    setDefaults(defaults: any): Promise<any> {
        this.defaults = defaults;

        return Promise.resolve();
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
            at: this.getNotificationTriggerAt(notification),
            data: notification.data ? JSON.stringify(notification.data) : '{}',
            triggered: triggered ? 1 : 0
        };

        return this.appDB.insertRecord(this.DESKTOP_NOTIFS_TABLE, entry);
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
                body: <string> notification.text
            });

            // Listen for click events.
            notifInstance.onclick = (): void => {
                this.notificationClicked(notification);
            };
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
