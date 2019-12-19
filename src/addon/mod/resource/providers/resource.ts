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
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseLogHelperProvider } from '@core/course/providers/log-helper';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreSite } from '@classes/site';
import { CoreWSExternalWarning, CoreWSExternalFile } from '@providers/ws';

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
     * @param courseId Course ID.
     * @return Cache key.
     */
    protected getResourceCacheKey(courseId: number): string {
        return this.ROOT_CACHE_KEY + 'resource:' + courseId;
    }

    /**
     * Get a resource data.
     *
     * @param courseId Course ID.
     * @param key Name of the property to check.
     * @param value Value to search.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the resource is retrieved.
     */
    protected getResourceDataByKey(courseId: number, key: string, value: any, siteId?: string): Promise<AddonModResourceResource> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    courseids: [courseId]
                },
                preSets = {
                    cacheKey: this.getResourceCacheKey(courseId),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            return site.read('mod_resource_get_resources_by_courses', params, preSets)
                    .then((response: AddonModResourceGetResourcesByCoursesResult): any => {

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
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the resource is retrieved.
     */
    getResourceData(courseId: number, cmId: number, siteId?: string): Promise<AddonModResourceResource> {
        return this.getResourceDataByKey(courseId, 'coursemodule', cmId, siteId);
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param moduleId The module ID.
     * @param courseId Course ID of the module.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
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
     * @param courseid Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateResourceData(courseId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getResourceCacheKey(courseId));
        });
    }

    /**
     * Returns whether or not getResource WS available or not.
     *
     * @return If WS is abalaible.
     * @since 3.3
     */
    isGetResourceWSAvailable(): boolean {
        return this.sitesProvider.wsAvailableInCurrentSite('mod_resource_get_resources_by_courses');
    }

    /**
     * Return whether or not the plugin is enabled.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    isPluginEnabled(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.canDownloadFiles();
        });
    }

    /**
     * Report the resource as being viewed.
     *
     * @param id Module ID.
     * @param name Name of the resource.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the WS call is successful.
     */
    logView(id: number, name?: string, siteId?: string): Promise<any> {
        const params = {
            resourceid: id
        };

        return this.logHelper.logSingle('mod_resource_view_resource', params, AddonModResourceProvider.COMPONENT, id, name,
                'resource', {}, siteId);
    }
}

/**
 * Resource returned by mod_resource_get_resources_by_courses.
 */
export type AddonModResourceResource = {
    id: number; // Module id.
    coursemodule: number; // Course module id.
    course: number; // Course id.
    name: string; // Page name.
    intro: string; // Summary.
    introformat: number; // Intro format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    introfiles: CoreWSExternalFile[];
    contentfiles: CoreWSExternalFile[];
    tobemigrated: number; // Whether this resource was migrated.
    legacyfiles: number; // Legacy files flag.
    legacyfileslast: number; // Legacy files last control flag.
    display: number; // How to display the resource.
    displayoptions: string; // Display options (width, height).
    filterfiles: number; // If filters should be applied to the resource content.
    revision: number; // Incremented when after each file changes, to avoid cache.
    timemodified: number; // Last time the resource was modified.
    section: number; // Course section id.
    visible: number; // Module visibility.
    groupmode: number; // Group mode.
    groupingid: number; // Grouping id.
};

/**
 * Result of WS mod_resource_get_resources_by_courses.
 */
export type AddonModResourceGetResourcesByCoursesResult = {
    resources: AddonModResourceResource[];
    warnings?: CoreWSExternalWarning[];
};
