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

/**
 * Service to provide filter functionalities.
 */
@Injectable()
export class CoreFilterProvider {

    protected ROOT_CACHE_KEY = 'mmFilter:';

    protected logger;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider) {
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
            return site.wsAvailable('core_filters_get_available_in_context');
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

            const data = {
                    contexts: contexts,
                },
                preSets = {
                    cacheKey: this.getAvailableInContextsCacheKey(contexts),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            return site.read('core_filters_get_available_in_context', data, preSets)
                    .then((result: CoreFilterGetAvailableInContextResult) => {

                const classified: {[contextlevel: string]: {[instanceid: number]: CoreFilterFilter[]}} = {};

                // Initialize all contexts.
                contexts.forEach((context) => {
                    classified[context.contextlevel] = {};
                    classified[context.contextlevel][context.instanceid] = [];
                });

                if (contexts.length == 1) {
                    // Only 1 context, no need to iterate over the filters.
                    classified[contexts[0].contextlevel][contexts[0].instanceid] = result.filters;

                    return classified;
                }

                result.filters.forEach((filter) => {
                    classified[filter.contextlevel][filter.instanceid].push(filter);
                });

                return classified;
            });
        });
    }

    /**
     * Get the filters available in a certain context.
     *
     * @param contextLevel The context level to check.
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
