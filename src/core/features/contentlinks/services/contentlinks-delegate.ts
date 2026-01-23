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
import { CoreLogger } from '@singletons/logger';
import { CoreSites } from '@services/sites';
import { CoreUrl } from '@singletons/url';
import { makeSingleton } from '@singletons';
import { CoreText } from '@singletons/text';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreNavigator } from '@services/navigator';

/**
 * Interface that all handlers must implement.
 */
export interface CoreContentLinksHandler {
    /**
     * A name to identify the handler.
     */
    name: string;

    /**
     * Handler's priority. The highest priority is treated first.
     */
    priority?: number;

    /**
     * Whether the isEnabled function should be called for all the users in a site. It should be true only if the isEnabled call
     * can return different values for different users in same site.
     */
    checkAllUsers?: boolean;

    /**
     * Name of the feature this handler is related to.
     * It will be used to check if the feature is disabled (@see CoreSite.isFeatureDisabled).
     */
    featureName?: string;

    /**
     * Get the list of actions for a link (url).
     *
     * @param siteIds List of sites the URL belongs to.
     * @param url The URL to treat.  It's a relative URL, it won't include the site URL.
     * @param params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param courseId Course ID related to the URL. Optional but recommended.
     * @param data Extra data to handle the URL.
     * @returns List of (or promise resolved with list of) actions.
     */
    getActions(
        siteIds: string[],
        url: string,
        params: Record<string, string>,
        courseId?: number,
        data?: unknown,
    ): CoreContentLinksAction[] | Promise<CoreContentLinksAction[]>;

    /**
     * Check if a URL is handled by this handler.
     *
     * @param url The URL to check. It's a relative URL, it won't include the site URL.
     * @returns Whether the URL is handled by this handler
     */
    handles(url: string): boolean;

    /**
     * If the URL is handled by this handler, return the site URL.
     *
     * @param url The URL to check.
     * @returns Site URL if it is handled, undefined otherwise.
     */
    getSiteUrl(url: string): string | undefined;

    /**
     * Check if the handler is enabled for a certain site (site + user) and a URL.
     * If not defined, defaults to true.
     *
     * @param siteId The site ID.
     * @param url The URL to treat.  It's a relative URL, it won't include the site URL.
     * @param params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param courseId Course ID related to the URL. Optional but recommended.
     * @returns Whether the handler is enabled for the URL and site.
     */
    isEnabled?(siteId: string, url: string, params: Record<string, string>, courseId?: number): Promise<boolean>;
}

/**
 * Action to perform when a link is clicked.
 */
export interface CoreContentLinksAction {
    /**
     * A message to identify the action. Default: 'core.view'.
     */
    message?: string;

    /**
     * Name of the icon of the action. Default: 'fas-eye'.
     */
    icon?: string;

    /**
     * IDs of the sites that support the action.
     */
    sites?: string[];

    /**
     * Action to perform when the link is clicked.
     *
     * @param siteId The site ID.
     */
    action(siteId: string): Promise<void>;
}

/**
 * Actions and priority for a handler and URL.
 */
export interface CoreContentLinksHandlerActions {
    /**
     * Handler's priority.
     */
    priority: number;

    /**
     * List of actions.
     */
    actions: CoreContentLinksAction[];
}

/**
 * Delegate to register handlers to handle links.
 */
@Injectable({ providedIn: 'root' })
export class CoreContentLinksDelegateService {

    protected logger: CoreLogger;
    protected handlers: { [s: string]: CoreContentLinksHandler } = {}; // All registered handlers.

    constructor() {
        this.logger = CoreLogger.getInstance('CoreContentLinksDelegate');
    }

    /**
     * Get the list of possible actions to do for a URL.
     *
     * @param url URL to handle.
     * @param courseId Course ID related to the URL. Optional but recommended.
     * @param username Username to use to filter sites.
     * @param data Extra data to handle the URL.
     * @returns Promise resolved with the actions.
     */
    async getActionsFor(url: string, courseId?: number, username?: string, data?: unknown): Promise<CoreContentLinksAction[]> {
        if (!url) {
            return [];
        }

        // Get the list of sites the URL belongs to.
        const siteIds = await CoreSites.getSiteIdsFromUrl(url, true, username);
        if (!siteIds.length) {
            // No sites, no actions.
            return [];
        }

        const site = await CoreSites.getSite(siteIds[0]);

        const linkActions: CoreContentLinksHandlerActions[] = [];
        const promises: Promise<void>[] = [];
        const params = CoreUrl.extractUrlParams(url);
        const relativeUrl = CoreText.addStartingSlash(CoreUrl.toRelativeURL(site.getURL(), url));

        for (const name in this.handlers) {
            const handler = this.handlers[name];
            const checkAll = handler.checkAllUsers;
            const isEnabledFn = (siteId: string) => this.isHandlerEnabled(handler, relativeUrl, params, courseId, siteId);

            if (!handler.handles(relativeUrl)) {
                // Invalid handler or it doesn't handle the URL. Stop.
                continue;
            }

            // Filter the site IDs using the isEnabled function.
            promises.push(CoreSites.filterEnabledSites(siteIds, isEnabledFn, checkAll).then(async (siteIds) => {
                if (!siteIds.length) {
                    // No sites supported, no actions.
                    return;
                }

                const actions = await CorePromiseUtils.ignoreErrors(
                    Promise.resolve(handler.getActions(siteIds, relativeUrl, params, courseId, data)),
                    <CoreContentLinksAction[]> [],
                );

                if (actions && actions.length) {
                    // Set default values if any value isn't supplied.
                    actions.forEach((action) => {
                        action.message = action.message || 'core.view';
                        action.icon = action.icon || 'fas-eye';
                        action.sites = action.sites || siteIds;

                        // Wrap the action function in our own function to treat logged out sites.
                        const actionFunction = action.action;
                        action.action = async (siteId) => {
                            if (!CoreSites.isLoggedIn()) {
                                // Not logged in, load site first.
                                const loggedIn = await CoreSites.loadSite(siteId, { urlToOpen: url });
                                if (loggedIn) {
                                    await CoreNavigator.navigateToSiteHome({ params: { urlToOpen: url } });
                                }

                                return;
                            }

                            if (siteId !== CoreSites.getCurrentSiteId()) {
                                // Different site, logout and login first before treating the URL because token could be expired.
                                await CoreSites.logout({ urlToOpen: url, siteId });

                                return;
                            }

                            actionFunction(siteId);
                        };
                    });

                    // Add them to the list.
                    linkActions.push({
                        priority: handler.priority || 0,
                        actions: actions,
                    });
                }

                return;
            }));
        }
        try {
            await CorePromiseUtils.allPromises(promises);
        } catch {
            // Ignore errors.
        }

        // Sort link actions by priority.
        return this.sortActionsByPriority(linkActions);
    }

    /**
     * Get the site URL if the URL is supported by any handler.
     *
     * @param url URL to handle.
     * @returns Site URL if the URL is supported by any handler, undefined otherwise.
     */
    getSiteUrl(url: string): string | void {
        if (!url) {
            return;
        }

        // Check if any handler supports this URL.
        for (const name in this.handlers) {
            const handler = this.handlers[name];
            const siteUrl = handler.getSiteUrl(url);

            if (siteUrl) {
                return siteUrl;
            }
        }
    }

    /**
     * Check if a handler is enabled for a certain site and URL.
     *
     * @param handler Handler to check.
     * @param url The URL to check.  It's a relative URL, it won't include the site URL.
     * @param params The params of the URL
     * @param courseId Course ID the URL belongs to (can be undefined).
     * @param siteId The site ID to check.
     * @returns Promise resolved with boolean: whether the handler is enabled.
     */
    protected async isHandlerEnabled(
        handler: CoreContentLinksHandler,
        url: string,
        params: Record<string, string>,
        courseId: number | undefined,
        siteId: string,
    ): Promise<boolean> {

        let disabled = false;
        if (handler.featureName) {
            // Check if the feature is disabled.
            disabled = await CoreSites.isFeatureDisabled(handler.featureName, siteId);
        }

        if (disabled) {
            return false;
        }

        if (!handler.isEnabled) {
            // Handler doesn't implement isEnabled, assume it's enabled.
            return true;
        }

        return handler.isEnabled(siteId, url, params, courseId);
    }

    /**
     * Register a handler.
     *
     * @param handler The handler to register.
     * @returns True if registered successfully, false otherwise.
     */
    registerHandler(handler: CoreContentLinksHandler): boolean {
        if (this.handlers[handler.name] !== undefined) {
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
     * @param actions Actions to sort.
     * @returns Sorted actions.
     */
    protected sortActionsByPriority(actions: CoreContentLinksHandlerActions[]): CoreContentLinksAction[] {
        let sorted: CoreContentLinksAction[] = [];

        // Sort by priority.
        actions = actions.sort((a, b) => (a.priority || 0) <= (b.priority || 0) ? 1 : -1);

        // Fill result array.
        actions.forEach((entry) => {
            sorted = sorted.concat(entry.actions);
        });

        return sorted;
    }

}

export const CoreContentLinksDelegate = makeSingleton(CoreContentLinksDelegateService);
