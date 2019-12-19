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
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { Subject } from 'rxjs';

/**
 * Interface that all click handlers must implement.
 */
export interface CorePushNotificationsClickHandler {
    /**
     * A name to identify the handler.
     */
    name: string;

    /**
     * Handler's priority. The highest priority is treated first.
     */
    priority?: number;

    /**
     * Name of the feature this handler is related to.
     * It will be used to check if the feature is disabled (@see CoreSite.isFeatureDisabled).
     */
    featureName?: string;

    /**
     * Check if a notification click is handled by this handler.
     *
     * @param notification The notification to check.
     * @return Whether the notification click is handled by this handler.
     */
    handles(notification: any): boolean | Promise<boolean>;

    /**
     * Handle the notification click.
     *
     * @param notification The notification to check.
     * @return Promise resolved when done.
     */
    handleClick(notification: any): Promise<any>;
}

/**
 * Service to handle push notifications actions to perform when clicked and received.
 */
@Injectable()
export class CorePushNotificationsDelegate {

    protected logger;
    protected observables: { [s: string]: Subject<any> } = {};
    protected clickHandlers: { [s: string]: CorePushNotificationsClickHandler } = {};
    protected counterHandlers: { [s: string]: string } = {};

    constructor(loggerProvider: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private utils: CoreUtilsProvider) {
        this.logger = loggerProvider.getInstance('CorePushNotificationsDelegate');
        this.observables['receive'] = new Subject<any>();
    }

    /**
     * Function called when a push notification is clicked. Sends notification to handlers.
     *
     * @param notification Notification clicked.
     * @return Promise resolved when done.
     */
    clicked(notification: any): Promise<any> {
        if (!notification) {
            return;
        }

        const promises = [];
        let handlers: CorePushNotificationsClickHandler[] = [];

        for (const name in this.clickHandlers) {
            const handler = this.clickHandlers[name];

            // Check if the handler is disabled for the site.
            promises.push(this.isFeatureDisabled(handler, notification.site).then((disabled) => {
                if (!disabled) {
                    // Check if the handler handles the notification.
                    return Promise.resolve(handler.handles(notification)).then((handles) => {
                        if (handles) {
                            handlers.push(handler);
                        }
                    });
                }
            }));
        }

        return this.utils.allPromises(promises).catch(() => {
            // Ignore errors.
        }).then(() => {
            // Sort by priority.
            handlers = handlers.sort((a, b) => {
                return a.priority <= b.priority ? 1 : -1;
            });

            if (handlers[0]) {
                // Execute the first one.
                handlers[0].handleClick(notification);
            }
        });
    }

    /**
     * Check if a handler's feature is disabled for a certain site.
     *
     * @param handler Handler to check.
     * @param siteId The site ID to check.
     * @return Promise resolved with boolean: whether the handler feature is disabled.
     */
    protected isFeatureDisabled(handler: CorePushNotificationsClickHandler, siteId: string): Promise<boolean> {
        if (handler.featureName) {
            // Check if the feature is disabled.
            return this.sitesProvider.isFeatureDisabled(handler.featureName, siteId);
        } else {
            return Promise.resolve(false);
        }
    }

    /**
     * Function called when a push notification is received in foreground (cannot tell when it's received in background).
     * Sends notification to all handlers.
     *
     * @param notification Notification received.
     */
    received(notification: any): void {
        this.observables['receive'].next(notification);
    }

    /**
     * Register a push notifications observable for a certain event. Right now, only receive is supported.
     * let observer = pushNotificationsDelegate.on('receive').subscribe((notification) => {
     * ...
     * observer.unsuscribe();
     *
     * @param eventName Only receive is permitted.
     * @return Observer to subscribe.
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
     * Register a click handler.
     *
     * @param handler The handler to register.
     * @return True if registered successfully, false otherwise.
     */
    registerClickHandler(handler: CorePushNotificationsClickHandler): boolean {
        if (typeof this.clickHandlers[handler.name] !== 'undefined') {
            this.logger.log(`Addon '${handler.name}' already registered`);

            return false;
        }

        this.logger.log(`Registered addon '${handler.name}'`);
        this.clickHandlers[handler.name] = handler;

        return true;
    }

    /**
     * Register a push notifications handler for update badge counter.
     *
     * @param name Handler's name.
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
     * @param name Handler's name.
     * @return If handler name is present.
     */
    isCounterHandlerRegistered(name: string): boolean {
        return typeof this.counterHandlers[name] != 'undefined';
    }

    /**
     * Get all counter badge handlers.
     *
     * @return with all the handler names.
     */
    getCounterHandlers(): any {
        return this.counterHandlers;
    }
}
