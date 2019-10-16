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
import { CoreAppProvider } from '@providers/app';
import { CoreEventsProvider } from '@providers/events';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreFilterDelegate } from './delegate';
import { CoreFilterProvider, CoreFilterFilter, CoreFilterFormatTextOptions, CoreFilterClassifiedFilters } from './filter';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreSite } from '@classes/site';

/**
 * Helper service to provide filter functionalities.
 */
@Injectable()
export class CoreFilterHelperProvider {

    protected logger;

    /**
     * When a module context is requested, we request all the modules in a course to decrease WS calls. If there are a lot of
     * modules, checking the cache of all contexts can be really slow, so we use this memory cache to speed up the process.
     */
    protected moduleContextsCache: {
        [siteId: string]: {
            [courseId: number]: {
                contexts: CoreFilterClassifiedFilters,
                time: number
            }
        }
    } = {};

    constructor(logger: CoreLoggerProvider,
            eventsProvider: CoreEventsProvider,
            private appProvider: CoreAppProvider,
            private sitesProvider: CoreSitesProvider,
            private filterDelegate: CoreFilterDelegate,
            private courseProvider: CoreCourseProvider,
            private filterProvider: CoreFilterProvider) {

        this.logger = logger.getInstance('CoreFilterHelperProvider');

        eventsProvider.on(CoreEventsProvider.WS_CACHE_INVALIDATED, (data) => {
            delete this.moduleContextsCache[data.siteId];
        });

        eventsProvider.on(CoreEventsProvider.SITE_STORAGE_DELETED, (data) => {
            delete this.moduleContextsCache[data.siteId];
        });
    }

    /**
     * Get the contexts of all course modules in a course.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the contexts.
     */
    getCourseModulesContexts(courseId: number, siteId?: string): Promise<{contextlevel: string, instanceid: number}[]> {

        return this.courseProvider.getSections(courseId, false, true, {omitExpires: true}, siteId).then((sections) => {
            const contexts: {contextlevel: string, instanceid: number}[] = [];

            sections.forEach((section) => {
                if (section.modules) {
                    section.modules.forEach((module) => {
                        if (module.uservisible) {
                            contexts.push({
                                contextlevel: 'module',
                                instanceid: module.id
                            });
                        }
                    });
                }
            });

            return contexts;
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

        options = options || {};
        options.contextLevel = contextLevel;
        options.instanceId = instanceId;
        options.filter = false;

        return this.sitesProvider.getSite(siteId).then((site) => {
            siteId = site.getId();

            return this.filterProvider.canGetAvailableInContext(siteId).then((canGet) => {
                if (!canGet) {
                    options.filter = true;

                    // We cannot check which filters are available, apply them all.
                    return this.filterDelegate.getEnabledFilters(contextLevel, instanceId);
                }

                let promise: Promise<boolean>;

                if (contextLevel == 'system' || (contextLevel == 'course' && instanceId == site.getSiteHomeId())) {
                    // No need to check the site filters because we're requesting the same context, so we'd do the same twice.
                    promise = Promise.resolve(true);
                } else {
                    // Check if site has any filter to treat.
                    promise = this.siteHasFiltersToTreat(options, siteId);
                }

                return promise.then((hasFilters) => {
                    if (hasFilters) {
                        options.filter = true;

                        if (contextLevel == 'module' && options.courseId) {
                            // Get all the modules filters with a single call to decrease the number of WS calls.
                            // Check the memory cache first to speed up the process.

                            const result = this.getFromMemoryCache(options.courseId, contextLevel, instanceId, site);
                            if (result) {
                                return result;
                            }

                            return this.getCourseModulesContexts(options.courseId, siteId).then((contexts) => {

                                return this.filterProvider.getAvailableInContexts(contexts, siteId).then((filters) => {
                                    this.storeInMemoryCache(options.courseId, filters, siteId);

                                    return filters[contextLevel][instanceId] || [];
                                });
                            });
                        }

                        return this.filterProvider.getAvailableInContext(contextLevel, instanceId, siteId);
                    }

                    return [];
                });
            });
        }).catch((error) => {
            this.logger.error('Error getting filters, return an empty array', error, contextLevel, instanceId);

            return [];
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
            return this.filterProvider.formatText(text, options, filters, siteId);
        });
    }

    /**
     * Get module context filters from the memory cache.
     *
     * @param courseId Course the module belongs to.
     * @param contextLevel Context level.
     * @param instanceId Instance ID.
     * @param site Site.
     * @return The filters, undefined if not found.
     */
    protected getFromMemoryCache(courseId: number, contextLevel: string, instanceId: number, site: CoreSite): CoreFilterFilter[] {

        const siteId = site.getId();

        // Check if we have the context in the memory cache.
        if (this.moduleContextsCache[siteId] && this.moduleContextsCache[siteId][courseId]) {
            const cachedCourse = this.moduleContextsCache[siteId][courseId];

            if (!this.appProvider.isOnline() ||
                    Date.now() <= cachedCourse.time + site.getExpirationDelay(CoreSite.FREQUENCY_RARELY)) {

                // We can use cache, return the filters if found.
                return cachedCourse.contexts[contextLevel] && cachedCourse.contexts[contextLevel][instanceId];
            }
        }
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
            return this.filterProvider.getAvailableInContext('system', 0, site.getId()).then((filters) => {

                return this.filterDelegate.shouldBeApplied(filters, options, site);
            });
        });
    }

    /**
     * Store filters in the memory cache.
     *
     * @param contexts Filters to store, classified by contextlevel and instanceid
     * @param siteId Site ID.
     */
    protected storeInMemoryCache(courseId: number, contexts: CoreFilterClassifiedFilters, siteId: string): void {
        this.moduleContextsCache[siteId] = this.moduleContextsCache[siteId] || {};
        this.moduleContextsCache[siteId][courseId] = {
            contexts: contexts,
            time: Date.now()
        };
    }
}
