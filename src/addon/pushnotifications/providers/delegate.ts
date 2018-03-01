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
import { CoreLoggerProvider } from '@providers/logger';

/**
 * Service to handle push notifications clicks.
 */
@Injectable()
export class AddonPushNotificationsDelegate {

    protected logger;
    protected clickHandlers: { [s: string]: Function } = {};
    protected receiveHandlers: { [s: string]: Function } = {};
    protected counterHandlers: { [s: string]: string } = {};

    constructor(loggerProvider: CoreLoggerProvider) {
        this.logger = loggerProvider.getInstance('AddonPushNotificationsDelegate');
    }

    /**
     * Function called when a push notification is clicked. Sends notification to handlers.
     *
     * @param {any} notification Notification clicked.
     */
    clicked(notification: any): void {
        for (const name in this.clickHandlers) {
            const callback = this.clickHandlers[name];
            if (typeof callback == 'function') {
                const treated = callback(notification);
                if (treated) {
                    return; // Stop execution when notification is treated.
                }
            }
        }
    }

    /**
     * Function called when a push notification is received in foreground (cannot tell when it's received in background).
     * Sends notification to all handlers.
     *
     * @param {any} notification Notification received.
     */
    received(notification: any): void {
        for (const name in this.receiveHandlers) {
            const callback = this.receiveHandlers[name];
            if (typeof callback == 'function') {
                callback(notification);
            }
        }
    }

    /**
     * Register a push notifications handler for CLICKS.
     * When a notification is clicked, the handler will receive a notification to treat.
     *
     * @param {string} name       Handler's name.
     * @param {Function} callback The callback function. Will get as parameter the clicked notification.
     * @description
     * The handler should return true if the notification is the one expected, false otherwise.
     * @see {@link AddonPushNotificationsDelegate#clicked}
     */
    registerHandler(name: string, callback: Function): void {
        this.logger.debug(`Registered handler '${name}' as CLICK push notification handler.`);
        this.clickHandlers[name] = callback;
    }

    /**
     * Register a push notifications handler for RECEIVE notifications in foreground (cannot tell when it's received in background).
     * When a notification is received, the handler will receive a notification to treat.
     *
     * @param {string} name       Handler's name.
     * @param {Function} callback The callback function. Will get as parameter the clicked notification.
     * @see {@link AddonPushNotificationsDelegate#received}
     */
    registerReceiveHandler(name: string, callback: Function): void {
        this.logger.debug(`Registered handler '${name}' as RECEIVE push notification handler.`);
        this.receiveHandlers[name] = callback;
    }

    /**
     * Unregister a push notifications handler for RECEIVE notifications.
     *
     * @param {string} name       Handler's name.
     */
    unregisterReceiveHandler(name: string): void {
        this.logger.debug(`Unregister handler '${name}' from RECEIVE push notification handlers.`);
        delete this.receiveHandlers[name];
    }

    /**
     * Register a push notifications handler for update badge counter.
     *
     * @param {string} name       Handler's name.
     */
    registerCounterHandler(name: string): void {
        this.logger.debug(`Registered handler '${name}' as badge counter handler.`);
        this.counterHandlers[name] = name;
    }

    /**
     * Check if a counter handler is present.
     *
     * @param {string} name       Handler's name.
     * @return {boolean}  If handler name is present.
     */
    isCounterHandlerRegistered(name: string): boolean {
        return typeof this.counterHandlers[name] != 'undefined';
    }

    /**
     * Get all counter badge handlers.
     *
     * @return {any}  with all the handler names.
     */
    getCounterHandlers(): any {
        return this.counterHandlers;
    }
}
