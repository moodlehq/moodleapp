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
import { NavController } from 'ionic-angular';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { CoreUtilsProvider } from '@providers/utils/utils';

/**
 * Interface that all handlers must implement.
 */
export interface CoreContentLinksHandler {
    /**
     * A name to identify the handler.
     * @type {string}
     */
    name: string;

    /**
     * Handler's priority. The highest priority is treated first.
     * @type {number}
     */
    priority?: number;

    /**
     * Whether the isEnabled function should be called for all the users in a site. It should be true only if the isEnabled call
     * can return different values for different users in same site.
     * @type {boolean}
     */
    checkAllUsers?: boolean;

    /**
     * Name of the feature this handler is related to.
     * It will be used to check if the feature is disabled (@see CoreSite.isFeatureDisabled).
     * @type {string}
     */
    featureName?: string;

    /**
     * Get the list of actions for a link (url).
     *
     * @param {string[]} siteIds List of sites the URL belongs to.
     * @param {string} url The URL to treat.
     * @param {any} params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param {number} [courseId] Course ID related to the URL. Optional but recommended.
     * @param {any} [data] Extra data to handle the URL.
     * @return {CoreContentLinksAction[]|Promise<CoreContentLinksAction[]>} List of (or promise resolved with list of) actions.
     */
    getActions(siteIds: string[], url: string, params: any, courseId?: number, data?: any):
        CoreContentLinksAction[] | Promise<CoreContentLinksAction[]>;

    /**
     * Check if a URL is handled by this handler.
     *
     * @param {string} url The URL to check.
     * @return {boolean} Whether the URL is handled by this handler
     */
    handles(url: string): boolean;

    /**
     * If the URL is handled by this handler, return the site URL.
     *
     * @param {string} url The URL to check.
     * @return {string} Site URL if it is handled, undefined otherwise.
     */
    getSiteUrl(url: string): string;

    /**
     * Check if the handler is enabled for a certain site (site + user) and a URL.
     * If not defined, defaults to true.
     *
     * @param {string} siteId The site ID.
     * @param {string} url The URL to treat.
     * @param {any} params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param {number} [courseId] Course ID related to the URL. Optional but recommended.
     * @return {boolean|Promise<boolean>} Whether the handler is enabled for the URL and site.
     */
    isEnabled?(siteId: string, url: string, params: any, courseId?: number): boolean | Promise<boolean>;
}

/**
 * Action to perform when a link is clicked.
 */
export interface CoreContentLinksAction {
    /**
     * A message to identify the action. Default: 'core.view'.
     * @type {string}
     */
    message?: string;

    /**
     * Name of the icon of the action. Default: 'eye'.
     * @type {string}
     */
    icon?: string;

    /**
     * IDs of the sites that support the action.
     * @type {string[]}
     */
    sites?: string[];

    /**
     * Action to perform when the link is clicked.
     *
     * @param {string} siteId The site ID.
     * @param {NavController} [navCtrl] Nav Controller to use to navigate.
     */
    action(siteId: string, navCtrl?: NavController): void;
}

/**
 * Actions and priority for a handler and URL.
 */
export interface CoreContentLinksHandlerActions {
    /**
     * Handler's priority.
     * @type {number}
     */
    priority: number;

    /**
     * List of actions.
     * @type {CoreContentLinksAction[]}
     */
    actions: CoreContentLinksAction[];
}

/**
 * Delegate to register handlers to handle links.
 */
@Injectable()
export class CoreContentLinksDelegate {
    protected logger;
    protected handlers: { [s: string]: CoreContentLinksHandler } = {}; // All registered handlers.

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private urlUtils: CoreUrlUtilsProvider,
            private utils: CoreUtilsProvider) {
        this.logger = logger.getInstance('CoreContentLinksDelegate');
    }

    /**
     * Get the list of possible actions to do for a URL.
     *
     * @param {string} url URL to handle.
     * @param {number} [courseId] Course ID related to the URL. Optional but recommended.
     * @param {string} [username] Username to use to filter sites.
     * @param {any} [data] Extra data to handle the URL.
     * @return {Promise<CoreContentLinksAction[]>}  Promise resolved with the actions.
     */
    getActionsFor(url: string, courseId?: number, username?: string, data?: any): Promise<CoreContentLinksAction[]> {
        if (!url) {
            return Promise.resolve([]);
        }

        // Get the list of sites the URL belongs to.
        return this.sitesProvider.getSiteIdsFromUrl(url, true, username).then((siteIds) => {
            const linkActions: CoreContentLinksHandlerActions[] = [],
                promises = [],
                params = this.urlUtils.extractUrlParams(url);

            for (const name in this.handlers) {
                const handler = this.handlers[name],
                    checkAll = handler.checkAllUsers,
                    isEnabledFn = this.isHandlerEnabled.bind(this, handler, url, params, courseId);

                if (!handler.handles(url)) {
                    // Invalid handler or it doesn't handle the URL. Stop.
                    continue;
                }

                // Filter the site IDs using the isEnabled function.
                promises.push(this.utils.filterEnabledSites(siteIds, isEnabledFn, checkAll).then((siteIds) => {
                    if (!siteIds.length) {
                        // No sites supported, no actions.
                        return;
                    }

                    return Promise.resolve(handler.getActions(siteIds, url, params, courseId, data)).then((actions) => {
                        if (actions && actions.length) {
                            // Set default values if any value isn't supplied.
                            actions.forEach((action) => {
                                action.message = action.message || 'core.view';
                                action.icon = action.icon || 'eye';
                                action.sites = action.sites || siteIds;
                            });

                            // Add them to the list.
                            linkActions.push({
                                priority: handler.priority,
                                actions: actions
                            });
                        }
                    });
                }));
            }

            return this.utils.allPromises(promises).catch(() => {
                // Ignore errors.
            }).then(() => {
                // Sort link actions by priority.
                return this.sortActionsByPriority(linkActions);
            });
        });
    }

    /**
     * Get the site URL if the URL is supported by any handler.
     *
     * @param {string} url URL to handle.
     * @return {string} Site URL if the URL is supported by any handler, undefined otherwise.
     */
    getSiteUrl(url: string): string {
        if (!url) {
            return;
        }

        // Check if any handler supports this URL.
        for (const name in this.handlers) {
            const handler = this.handlers[name],
                siteUrl = handler.getSiteUrl(url);

            if (siteUrl) {
                return siteUrl;
            }
        }
    }

    /**
     * Check if a handler is enabled for a certain site and URL.
     *
     * @param {CoreContentLinksHandler} handler Handler to check.
     * @param {string} url The URL to check.
     * @param {any} params The params of the URL
     * @param {number} courseId Course ID the URL belongs to (can be undefined).
     * @param {string} siteId The site ID to check.
     * @return {Promise<boolean>} Promise resolved with boolean: whether the handler is enabled.
     */
    protected isHandlerEnabled(handler: CoreContentLinksHandler, url: string, params: any, courseId: number, siteId: string)
            : Promise<boolean> {
        let promise;

        if (handler.featureName) {
            // Check if the feature is disabled.
            promise = this.sitesProvider.isFeatureDisabled(handler.featureName, siteId);
        } else {
            promise = Promise.resolve(false);
        }

        return promise.then((disabled) => {
            if (disabled) {
                return false;
            }

            if (!handler.isEnabled) {
                // Handler doesn't implement isEnabled, assume it's enabled.
                return true;
            }

            return handler.isEnabled(siteId, url, params, courseId);
        });
    }

    /**
     * Register a handler.
     *
     * @param {CoreContentLinksHandler} handler The handler to register.
     * @return {boolean} True if registered successfully, false otherwise.
     */
    registerHandler(handler: CoreContentLinksHandler): boolean {
        if (typeof this.handlers[handler.name] !== 'undefined') {
            this.logger.log(`Addon '${handler.name}' already registered`);

            return false;
        }
        this.logger.log(`Registered addon '${handler.name}'`);
        this.handlers[handler.name] = handler;

        return true;
    }

    /**
     * Sort actions by priority.
     *
     * @param {CoreContentLinksHandlerActions[]} actions Actions to sort.
     * @return {CoreContentLinksAction[]} Sorted actions.
     */
    protected sortActionsByPriority(actions: CoreContentLinksHandlerActions[]): CoreContentLinksAction[] {
        let sorted: CoreContentLinksAction[] = [];

        // Sort by priority.
        actions = actions.sort((a, b) => {
            return a.priority <= b.priority ? 1 : -1;
        });

        // Fill result array.
        actions.forEach((entry) => {
            sorted = sorted.concat(entry.actions);
        });

        return sorted;
    }
}
