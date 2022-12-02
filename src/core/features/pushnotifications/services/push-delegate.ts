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
import { Subject } from 'rxjs';

import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton } from '@singletons';
import { CoreLogger } from '@singletons/logger';
import { CorePushNotificationsNotificationBasicData } from './pushnotifications';

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
     * @returns Whether the notification click is handled by this handler.
     */
    handles(notification: CorePushNotificationsNotificationBasicData): Promise<boolean>;

    /**
     * Handle the notification click.
     *
     * @param notification The notification to check.
     * @returns Promise resolved when done.
     */
    handleClick(notification: CorePushNotificationsNotificationBasicData): Promise<void>;
}

/**
 * Service to handle push notifications actions to perform when clicked and received.
 */
@Injectable({ providedIn: 'root' })
export class CorePushNotificationsDelegateService {

    protected logger: CoreLogger;
    protected observables: { [s: string]: Subject<unknown> } = {};
    protected clickHandlers: { [s: string]: CorePushNotificationsClickHandler } = {};
    protected counterHandlers: Record<string, string> = {};

    constructor() {
        this.logger = CoreLogger.getInstance('CorePushNotificationsDelegate');
        this.observables['receive'] = new Subject<CorePushNotificationsNotificationBasicData>();
    }

    /**
     * Function called when a push notification is clicked. Sends notification to handlers.
     *
     * @param notification Notification clicked.
     * @returns Promise resolved when done.
     */
    async clicked(notification: CorePushNotificationsNotificationBasicData): Promise<void> {
        if (!notification) {
            return;
        }

        let handlers: CorePushNotificationsClickHandler[] = [];

        const promises = Object.values(this.clickHandlers).map(async (handler) => {
            // Check if the handler is disabled for the site.
            const disabled = await this.isFeatureDisabled(handler, notification.site);

            if (disabled) {
                return;
            }

            // Check if the handler handles the notification.
            const handles = await handler.handles(notification);
            if (handles) {
                handlers.push(handler);
            }
        });

        await CoreUtils.ignoreErrors(CoreUtils.allPromises(promises));

        // Sort by priority.
        handlers = handlers.sort((a, b) => (a.priority || 0) <= (b.priority || 0) ? 1 : -1);

        // Execute the first one.
        handlers[0]?.handleClick(notification);
    }

    /**
     * Check if a handler's feature is disabled for a certain site.
     *
     * @param handler Handler to check.
     * @param siteId The site ID to check.
     * @returns Promise resolved with boolean: whether the handler feature is disabled.
     */
    protected async isFeatureDisabled(handler: CorePushNotificationsClickHandler, siteId?: string): Promise<boolean> {
        if (!siteId) {
            // Notification doesn't belong to a site. Assume all handlers are enabled.
            return false;
        } else if (handler.featureName) {
            // Check if the feature is disabled.
            return CoreSites.isFeatureDisabled(handler.featureName, siteId);
        } else {
            return false;
        }
    }

    /**
     * Function called when a push notification is received in foreground (cannot tell when it's received in background).
     * Sends notification to all handlers.
     *
     * @param notification Notification received.
     */
    received(notification: CorePushNotificationsNotificationBasicData): void {
        this.observables['receive'].next(notification);
    }

    /**
     * Register a push notifications observable for a certain event. Right now, only receive is supported.
     * let observer = pushNotificationsDelegate.on('receive').subscribe((notification) => {
     * ...
     * observer.unsuscribe();
     *
     * @param eventName Only receive is permitted.
     * @returns Observer to subscribe.
     */
    on<T = CorePushNotificationsNotificationBasicData>(eventName: string): Subject<T> {
        if (this.observables[eventName] === undefined) {
            const eventNames = Object.keys(this.observables).join(', ');
            this.logger.warn(`'${eventName}' event name is not allowed. Use one of the following: '${eventNames}'.`);

            return new Subject<T>();
        }

        return <Subject<T>> this.observables[eventName];
    }

    /**
     * Register a click handler.
     *
     * @param handler The handler to register.
     * @returns True if registered successfully, false otherwise.
     */
    registerClickHandler(handler: CorePushNotificationsClickHandler): boolean {
        if (this.clickHandlers[handler.name] !== undefined) {
            this.logger.log(`Addon '${handler.name}' already registered`);

            return false;
        }

        this.logger.log(`Registered addon '${handler.name}'`);
        this.clickHandlers[handler.name] = handler;
        handler.priority = handler.priority || 0;

        return true;
    }

    /**
     * Register a push notifications handler for update badge counter.
     *
     * @param name Handler's name.
     */
    registerCounterHandler(name: string): void {
        if (this.counterHandlers[name] === undefined) {
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
     * @returns If handler name is present.
     */
    isCounterHandlerRegistered(name: string): boolean {
        return this.counterHandlers[name] !== undefined;
    }

    /**
     * Get all counter badge handlers.
     *
     * @returns with all the handler names.
     */
    getCounterHandlers(): Record<string, string> {
        return this.counterHandlers;
    }

}

export const CorePushNotificationsDelegate = makeSingleton(CorePushNotificationsDelegateService);
