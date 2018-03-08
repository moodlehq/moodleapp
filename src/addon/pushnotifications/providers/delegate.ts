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
import { Subject } from 'rxjs';

/**
 * Service to handle push notifications actions to perform when clicked and received.
 */
@Injectable()
export class AddonPushNotificationsDelegate {

    protected logger;
    protected observables: { [s: string]: Subject<any> } = {};
    protected counterHandlers: { [s: string]: string } = {};

    constructor(loggerProvider: CoreLoggerProvider) {
        this.logger = loggerProvider.getInstance('AddonPushNotificationsDelegate');
        this.observables['click'] = new Subject<any>();
        this.observables['receive'] = new Subject<any>();
    }

    /**
     * Function called when a push notification is clicked. Sends notification to handlers.
     *
     * @param {any} notification Notification clicked.
     */
    clicked(notification: any): void {
        this.observables['click'].next(notification);
    }

    /**
     * Function called when a push notification is received in foreground (cannot tell when it's received in background).
     * Sends notification to all handlers.
     *
     * @param {any} notification Notification received.
     */
    received(notification: any): void {
        this.observables['receive'].next(notification);
    }

    /**
     * Register a push notifications observable for click and receive notification event.
     * When a notification is clicked or received, the observable will receive a notification to treat.
     * let observer = pushNotificationsDelegate.on('click').subscribe((notification) => {
     * ...
     * observer.unsuscribe();
     *
     * @param {string}  eventName Only click and receive are permitted.
     * @return {Subject<any>} Observer to subscribe.
     */
    on(eventName: string): Subject<any> {
        if (typeof this.observables[eventName] == 'undefined') {
            const eventNames = Object.keys(this.observables).join(', ');
            this.logger.warn(`'${eventName}' event name is not allowed. Use one of the following: '${eventNames}'.`);

            return new Subject<any>();
        }

        return this.observables[eventName];
    }

    /**
     * Register a push notifications handler for update badge counter.
     *
     * @param {string} name  Handler's name.
     */
    registerCounterHandler(name: string): void {
        if (typeof this.counterHandlers[name] == 'undefined') {
            this.logger.debug(`Registered handler '${name}' as badge counter handler.`);
            this.counterHandlers[name] = name;
        } else {
            this.logger.log(`Handler '${name}' as badge counter handler already registered.`);
        }
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
