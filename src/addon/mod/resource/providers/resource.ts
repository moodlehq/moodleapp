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
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseLogHelperProvider } from '@core/course/providers/log-helper';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreSite } from '@classes/site';

/**
 * Service that provides some features for resources.
 */
@Injectable()
export class AddonModResourceProvider {
    static COMPONENT = 'mmaModResource';

    protected ROOT_CACHE_KEY = 'mmaModResource:';
    protected logger;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private courseProvider: CoreCourseProvider,
            private filepoolProvider: CoreFilepoolProvider, private utils: CoreUtilsProvider,
            private logHelper: CoreCourseLogHelperProvider) {
        this.logger = logger.getInstance('AddonModResourceProvider');
    }

    /**
     * Get cache key for resource data WS calls.
     *
     * @param {number} courseId Course ID.
     * @return {string}         Cache key.
     */
    protected getResourceCacheKey(courseId: number): string {
        return this.ROOT_CACHE_KEY + 'resource:' + courseId;
    }

    /**
     * Get a resource data.
     *
     * @param {number} courseId Course ID.
     * @param {string} key     Name of the property to check.
     * @param {any}  value   Value to search.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}  Promise resolved when the resource is retrieved.
     */
    protected getResourceDataByKey(courseId: number, key: string, value: any, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    courseids: [courseId]
                },
                preSets = {
                    cacheKey: this.getResourceCacheKey(courseId),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            return site.read('mod_resource_get_resources_by_courses', params, preSets).then((response) => {
                if (response && response.resources) {
                    const currentResource = response.resources.find((resource) => {
                        return resource[key] == value;
                    });
                    if (currentResource) {
                        return currentResource;
                    }
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get a resource by course module ID.
     *
     * @param {number} courseId Course ID.
     * @param {number} cmId     Course module ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}   Promise resolved when the resource is retrieved.
     */
    getResourceData(courseId: number, cmId: number, siteId?: string): Promise<any> {
        return this.getResourceDataByKey(courseId, 'coursemodule', cmId, siteId);
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param  {number} moduleId The module ID.
     * @param  {number} courseId Course ID of the module.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}    Promise resolved when the data is invalidated.
     */
    invalidateContent(moduleId: number, courseId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const promises = [];

        promises.push(this.invalidateResourceData(courseId, siteId));
        promises.push(this.filepoolProvider.invalidateFilesByComponent(siteId, AddonModResourceProvider.COMPONENT, moduleId));
        promises.push(this.courseProvider.invalidateModule(moduleId, siteId, 'resource'));

        return this.utils.allPromises(promises);
    }

    /**
     * Invalidates resource data.
     *
     * @param {number} courseid Course ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}   Promise resolved when the data is invalidated.
     */
    invalidateResourceData(courseId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getResourceCacheKey(courseId));
        });
    }

    /**
     * Returns whether or not getResource WS available or not.
     *
     * @return {boolean} If WS is abalaible.
     * @since 3.3
     */
    isGetResourceWSAvailable(): boolean {
        return this.sitesProvider.wsAvailableInCurrentSite('mod_resource_get_resources_by_courses');
    }

    /**
     * Return whether or not the plugin is enabled.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    isPluginEnabled(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.canDownloadFiles();
        });
    }

    /**
     * Report the resource as being viewed.
     *
     * @param {number} id Module ID.
     * @param {string} [name] Name of the resource.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}  Promise resolved when the WS call is successful.
     */
    logView(id: number, name?: string, siteId?: string): Promise<any> {
        const params = {
            resourceid: id
        };

        return this.logHelper.logSingle('mod_resource_view_resource', params, AddonModResourceProvider.COMPONENT, id, name,
                'resource', {}, siteId);
    }
}
