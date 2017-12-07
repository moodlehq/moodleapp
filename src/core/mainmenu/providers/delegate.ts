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
import { CoreEventsProvider } from '../../../providers/events';
import { CoreLoggerProvider } from '../../../providers/logger';
import { CoreSitesProvider } from '../../../providers/sites';
import { Subject, BehaviorSubject } from 'rxjs';

export interface CoreMainMenuHandler {
    name: string; // Name of the handler.
    priority: number; // The highest priority is displayed first.
    isEnabled(): boolean|Promise<boolean>; // Whether or not the handler is enabled on a site level.
    getDisplayData(): CoreMainMenuHandlerData; // Returns the data needed to render the handler.
};

export interface CoreMainMenuHandlerData {
    page: string; // Name of the page.
    title: string; // Title to display in the tab.
    icon: string; // Name of the icon to display in the tab.
    class?: string; // Class to add to the displayed handler.
};

/**
 * Service to interact with plugins to be shown in the main menu. Provides functions to register a plugin
 * and notify an update in the data.
 */
@Injectable()
export class CoreMainMenuDelegate {
    protected logger;
    protected handlers: {[s: string]: CoreMainMenuHandler} = {};
    protected enabledHandlers: {[s: string]: CoreMainMenuHandler} = {};
    protected loaded = false;
    protected lastUpdateHandlersStart: number;
    protected siteHandlers: Subject<CoreMainMenuHandlerData[]> = new BehaviorSubject<CoreMainMenuHandlerData[]>([]);

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, eventsProvider: CoreEventsProvider) {
        this.logger = logger.getInstance('CoreMainMenuDelegate');

        eventsProvider.on(CoreEventsProvider.LOGIN, this.updateHandlers.bind(this));
        eventsProvider.on(CoreEventsProvider.SITE_UPDATED, this.updateHandlers.bind(this));
        eventsProvider.on(CoreEventsProvider.REMOTE_ADDONS_LOADED, this.updateHandlers.bind(this));
        eventsProvider.on(CoreEventsProvider.LOGOUT, this.clearSiteHandlers.bind(this));
    }

    /**
     * Check if handlers are loaded.
     *
     * @return {boolean} True if handlers are loaded, false otherwise.
     */
    areHandlersLoaded() : boolean {
        return this.loaded;
    }

    /**
     * Clear current site handlers. Reserved for core use.
     */
    protected clearSiteHandlers() {
        this.loaded = false;
        this.siteHandlers.next([]);
    }

    /**
     * Get the handlers for the current site.
     *
     * @return {Subject<CoreMainMenuHandlerData[]>} An observable that will receive the handlers.
     */
    getHandlers() : Subject<CoreMainMenuHandlerData[]> {
        return this.siteHandlers;
    }

    /**
     * Check if a time belongs to the last update handlers call.
     * This is to handle the cases where updateHandlers don't finish in the same order as they're called.
     *
     * @param {number} time Time to check.
     * @return {boolean} Whether it's the last call.
     */
    isLastUpdateCall(time: number) : boolean {
        if (!this.lastUpdateHandlersStart) {
            return true;
        }
        return time == this.lastUpdateHandlersStart;
    }

    /**
     * Register a handler.
     *
     * @param {CoreInitHandler} handler The handler to register.
     * @return {boolean} True if registered successfully, false otherwise.
     */
    registerHandler(handler: CoreMainMenuHandler) : boolean {
        if (typeof this.handlers[handler.name] !== 'undefined') {
            this.logger.log(`Addon 'handler.name' already registered`);
            return false;
        }
        this.logger.log(`Registered addon 'handler.name'`);
        this.handlers[handler.name] = handler;
        return true;
    }

    /**
     * Update the handler for the current site.
     *
     * @param {CoreInitHandler} handler The handler to check.
     * @param {number} time Time this update process started.
     * @return {Promise<void>} Resolved when done.
     */
    protected updateHandler(handler: CoreMainMenuHandler, time: number) : Promise<void> {
        let promise,
            siteId = this.sitesProvider.getCurrentSiteId(),
            currentSite = this.sitesProvider.getCurrentSite();

        if (!this.sitesProvider.isLoggedIn()) {
            promise = Promise.reject(null);
        } else if (currentSite.isFeatureDisabled('$mmSideMenuDelegate_' + handler.name)) {
            promise = Promise.resolve(false);
        } else {
            promise = Promise.resolve(handler.isEnabled());
        }

        // Checks if the handler is enabled.
        return promise.catch(() => {
            return false;
        }).then((enabled: boolean) => {
            // Verify that this call is the last one that was started.
            // Check that site hasn't changed since the check started.
            if (this.isLastUpdateCall(time) && this.sitesProvider.getCurrentSiteId() === siteId) {
                if (enabled) {
                    this.enabledHandlers[handler.name] = handler;
                } else {
                    delete this.enabledHandlers[handler.name];
                }
            }
        });
    }

    /**
     * Update the handlers for the current site.
     *
     * @return {Promise<void>} Resolved when done.
     */
    protected updateHandlers() : Promise<void> {
        let promises = [],
            now = Date.now();

        this.logger.debug('Updating handlers for current site.');

        this.lastUpdateHandlersStart = now;

        // Loop over all the handlers.
        for (let name in this.handlers) {
            promises.push(this.updateHandler(this.handlers[name], now));
        }

        return Promise.all(promises).then(() => {
            return true;
        }, () => {
            // Never reject.
            return true;
        }).then(() => {
            // Verify that this call is the last one that was started.
            if (this.isLastUpdateCall(now)) {
                let handlersData: any[] = [];

                for (let name in this.enabledHandlers) {
                    let handler = this.enabledHandlers[name],
                        data = handler.getDisplayData();

                    handlersData.push({
                        data: data,
                        priority: handler.priority
                    });
                }

                // Sort them by priority.
                handlersData.sort((a, b) => {
                    return b.priority - a.priority;
                });

                // Return only the display data.
                let displayData = handlersData.map((item) => {
                    return item.data;
                });

                this.loaded = true;
                this.siteHandlers.next(displayData);
            }
        });
    }
}
