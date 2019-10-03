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
import { CoreSitesProvider } from '@providers/sites';
import { CoreSite } from '@classes/site';
import { CoreWSExternalWarning } from '@providers/ws';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreFilterDelegate } from './delegate';

/**
 * Service to provide filter functionalities.
 */
@Injectable()
export class CoreFilterProvider {

    protected ROOT_CACHE_KEY = 'mmFilter:';

    protected logger;

    constructor(logger: CoreLoggerProvider,
            private sitesProvider: CoreSitesProvider,
            private textUtils: CoreTextUtilsProvider,
            private filterDelegate: CoreFilterDelegate) {
        this.logger = logger.getInstance('CoreFilterProvider');
    }

    /**
     * Returns whether or not WS get available in context is avalaible.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with true if ws is avalaible, false otherwise.
     * @since 3.4
     */
    canGetAvailableInContext(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.canGetAvailableInContextInSite(site);
        });
    }

    /**
     * Returns whether or not WS get available in context is avalaible in a certain site.
     *
     * @param site Site. If not defined, current site.
     * @return Promise resolved with true if ws is avalaible, false otherwise.
     * @since 3.4
     */
    canGetAvailableInContextInSite(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.wsAvailable('core_filters_get_available_in_context');
    }

    /**
     * Given some HTML code, this function returns the text as safe HTML.
     *
     * @param text The text to be formatted.
     * @param options Formatting options.
     * @param filters The filters to apply. Required if filter is set to true.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the formatted text.
     */
    formatText(text: string, options?: CoreFilterFormatTextOptions, filters?: CoreFilterFilter[], siteId?: string)
            : Promise<string> {

        if (!text || typeof text != 'string') {
            // No need to do any filters and cleaning.
            return Promise.resolve('');
        }

        // Clone object if needed so we can modify it.
        options = options ? Object.assign({}, options) : {};

        if (typeof options.clean == 'undefined') {
            options.clean = false;
        }

        if (typeof options.filter == 'undefined') {
            options.filter = true;
        }

        if (!options.contextLevel) {
            options.filter  = false;
        }

        let promise: Promise<string>;

        if (options.filter) {
            promise = this.filterDelegate.filterText(text, filters, options, [], siteId);
        } else {
            promise = Promise.resolve(text);
        }

        return promise.then((text) => {

            if (options.clean) {
                text = this.textUtils.cleanTags(text, options.singleLine);
            }

            if (options.shortenLength > 0) {
                text = this.textUtils.shortenText(text, options.shortenLength);
            }

            if (options.highlight) {
                text = this.textUtils.highlightText(text, options.highlight);
            }

            return text;
        });
    }

    /**
     * Get cache key for available in contexts WS calls.
     *
     * @param contexts The contexts to check.
     * @return Cache key.
     */
    protected getAvailableInContextsCacheKey(contexts: {contextlevel: string, instanceid: number}[]): string {
        return this.getAvailableInContextsPrefixCacheKey() + JSON.stringify(contexts);
    }

    /**
     * Get prefixed cache key for available in contexts WS calls.
     *
     * @return Cache key.
     */
    protected getAvailableInContextsPrefixCacheKey(): string {
        return this.ROOT_CACHE_KEY + 'availableInContexts:';
    }

    /**
     * Get the filters available in several contexts.
     *
     * @param contexts The contexts to check.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the filters classified by context.
     */
    getAvailableInContexts(contexts: {contextlevel: string, instanceid: number}[], siteId?: string)
            : Promise<{[contextlevel: string]: {[instanceid: number]: CoreFilterFilter[]}}> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            let hasSystemContext = false,
                hasSiteHomeContext = false;

            const contextsToSend = contexts.slice(); // Copy the contexts array to be able to modify it.

            // Check if any of the contexts is "system". We cannot use system context, so we'll have to use a wrokaround.
            for (let i = 0; i < contextsToSend.length; i++) {
                const context = contextsToSend[i];

                if (context.contextlevel == 'system' && context.instanceid == site.getSiteHomeId()) {
                    hasSystemContext = true;

                    // Use course site home instead. Check if it's already in the list.
                    hasSiteHomeContext = contextsToSend.some((context) => {
                        return context.contextlevel == 'course' && context.instanceid == site.getSiteHomeId();
                    });

                    if (hasSiteHomeContext) {
                        // Site home is already in list, remove this context from the list.
                        contextsToSend.splice(i, 1);
                    } else {
                        // Site home not in list, use it instead of system.
                        contextsToSend[i] = {
                            contextlevel: 'course',
                            instanceid: context.instanceid
                        };
                    }

                    break;
                }
            }

            const data = {
                    contexts: contextsToSend,
                },
                preSets = {
                    cacheKey: this.getAvailableInContextsCacheKey(contextsToSend),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            return site.read('core_filters_get_available_in_context', data, preSets)
                    .then((result: CoreFilterGetAvailableInContextResult) => {

                const classified: {[contextlevel: string]: {[instanceid: number]: CoreFilterFilter[]}} = {};

                // Initialize all contexts.
                contexts.forEach((context) => {
                    classified[context.contextlevel] = classified[context.contextlevel] || {};
                    classified[context.contextlevel][context.instanceid] = [];
                });

                if (contexts.length == 1 && !hasSystemContext) {
                    // Only 1 context, no need to iterate over the filters.
                    classified[contexts[0].contextlevel][contexts[0].instanceid] = result.filters;

                    return classified;
                }

                result.filters.forEach((filter) => {
                    if (hasSystemContext && filter.contextlevel == 'course' && filter.instanceid == site.getSiteHomeId()) {
                        if (hasSiteHomeContext) {
                            // We need to return both site home and system. Add site home first.
                            classified[filter.contextlevel][filter.instanceid].push(filter);

                            // Now copy the object so it can be modified.
                            filter = Object.assign({}, filter);
                        }

                        // Simulate the system context based on the inherited data.
                        filter.contextlevel = 'system';
                        filter.contextid = -1;
                        filter.localstate = filter.inheritedstate;
                    }

                    classified[filter.contextlevel][filter.instanceid].push(filter);
                });

                return classified;
            });
        });
    }

    /**
     * Get the filters available in a certain context.
     *
     * @param contextLevel The context level to check: system, user, coursecat, course, module, block, ...
     * @param instanceId The instance ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the filters.
     */
    getAvailableInContext(contextLevel: string, instanceId: number, siteId?: string): Promise<CoreFilterFilter[]> {
        return this.getAvailableInContexts([{contextlevel: contextLevel, instanceid: instanceId}], siteId).then((result) => {
            return result[contextLevel][instanceId];
        });
    }

    /**
     * Get the filters in a certain context, performing some checks like the site version.
     * It's recommended to use this function instead of canGetAvailableInContext because this function will check if
     * it's really needed to call the WS.
     *
     * @param contextLevel The context level.
     * @param instanceId Instance ID related to the context.
     * @param options Options for format text.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the filters.
     */
    getFilters(contextLevel: string, instanceId: number, options?: CoreFilterFormatTextOptions, siteId?: string)
            : Promise<CoreFilterFilter[]> {

        options.contextLevel = contextLevel;
        options.instanceId = instanceId;
        options.filter = false;

        return this.canGetAvailableInContext(siteId).then((canGet) => {
            if (!canGet) {
                options.filter = true;

                // We cannot check which filters are available, apply them all.
                return this.filterDelegate.getEnabledFilters(contextLevel, instanceId);
            }

            // Check if site has any filter to treat.
            return this.siteHasFiltersToTreat(options, siteId).then((hasFilters) => {
                if (hasFilters) {
                    options.filter = true;

                    return this.getAvailableInContext(contextLevel, instanceId, siteId);
                }

                return [];
            }).catch(() => {
                return [];
            });
        });
    }

    /**
     * Get filters and format text.
     *
     * @param text Text to filter.
     * @param contextLevel The context level.
     * @param instanceId Instance ID related to the context.
     * @param options Options for format text.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the formatted text.
     */
    getFiltersAndFormatText(text: string, contextLevel: string, instanceId: number, options?: CoreFilterFormatTextOptions,
            siteId?: string): Promise<string> {

        return this.getFilters(contextLevel, instanceId, options, siteId).then((filters) => {
            return this.formatText(text, options, filters, siteId);
        });
    }

    /**
     * Invalidates all available in context WS calls.
     *
     * @param siteId Site ID (empty for current site).
     * @return Promise resolved when the data is invalidated.
     */
    invalidateAllAvailableInContext(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getAvailableInContextsPrefixCacheKey());
        });
    }

    /**
     * Invalidates available in context WS call.
     *
     * @param contexts The contexts to check.
     * @param siteId Site ID (empty for current site).
     * @return Promise resolved when the data is invalidated.
     */
    invalidateAvailableInContexts(contexts: {contextlevel: string, instanceid: number}[], siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getAvailableInContextsCacheKey(contexts));
        });
    }

    /**
     * Invalidates available in context WS call.
     *
     * @param contextLevel The context level to check.
     * @param instanceId The instance ID.
     * @param siteId Site ID (empty for current site).
     * @return Promise resolved when the data is invalidated.
     */
    invalidateAvailableInContext(contextLevel: string, instanceId: number, siteId?: string): Promise<any> {
        return this.invalidateAvailableInContexts([{contextlevel: contextLevel, instanceid: instanceId}], siteId);
    }

    /**
     * Check if site has available any filter that should be treated by the app.
     *
     * @param options Options passed to the filters.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with boolean: whether it has filters to treat.
     */
    siteHasFiltersToTreat(options?: CoreFilterFormatTextOptions, siteId?: string): Promise<boolean> {
        options = options || {};

        return this.sitesProvider.getSite(siteId).then((site) => {

            // Get filters at site level.
            return this.getAvailableInContext('system', site.getSiteHomeId(), site.getId()).then((filters) => {

                return this.filterDelegate.shouldBeApplied(filters, options, site);
            });
        });
    }
}

/**
 * Filter object returned by core_filters_get_available_in_context.
 */
export type CoreFilterFilter = {
    contextlevel: string; // The context level where the filters are: (coursecat, course, module).
    instanceid: number; // The instance id of item associated with the context.
    contextid: number; // The context id.
    filter: string; // Filter plugin name.
    localstate: number; // Filter state: 1 for on, -1 for off, 0 if inherit.
    inheritedstate: number; // 1 or 0 to use when localstate is set to inherit.
};

/**
 * Result of core_filters_get_available_in_context.
 */
export type CoreFilterGetAvailableInContextResult = {
    filters: CoreFilterFilter[]; // Available filters.
    warning: CoreWSExternalWarning[]; // List of warnings.
};

/**
 * Options that can be passed to format text.
 */
export type CoreFilterFormatTextOptions = {
    contextLevel?: string; // The context level where the text is.
    instanceId?: number; // The instance id related to the context.
    clean?: boolean; // If true all HTML will be removed. Default false.
    filter?: boolean; // If true the string will be run through applicable filters as well. Default true.
    singleLine?: boolean; // If true then new lines will be removed (all the text in a single line).
    shortenLength?: number; // Number of characters to shorten the text.
    highlight?: string; // Text to highlight.
    wsNotFiltered?: boolean; // If true it means the WS didn't filter the text for some reason.
};
