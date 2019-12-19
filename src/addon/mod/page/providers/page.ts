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
 * Service that provides some features for page.
 */
@Injectable()
export class AddonModPageProvider {
    static COMPONENT = 'mmaModPage';

    protected ROOT_CACHE_KEY = 'mmaModPage:';
    protected logger;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private courseProvider: CoreCourseProvider,
            private utils: CoreUtilsProvider, private filepoolProvider: CoreFilepoolProvider,
            private logHelper: CoreCourseLogHelperProvider) {
        this.logger = logger.getInstance('AddonModPageProvider');
    }

    /**
     * Get a page by course module ID.
     *
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the page is retrieved.
     */
    getPageData(courseId: number, cmId: number, siteId?: string): Promise<AddonModPagePage> {
        return this.getPageByKey(courseId, 'coursemodule', cmId, siteId);
    }

    /**
     * Get a page.
     *
     * @param courseId Course ID.
     * @param key Name of the property to check.
     * @param value Value to search.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the page is retrieved.
     */
    protected getPageByKey(courseId: number, key: string, value: any, siteId?: string): Promise<AddonModPagePage> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    courseids: [courseId]
                },
                preSets = {
                    cacheKey: this.getPageCacheKey(courseId),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            return site.read('mod_page_get_pages_by_courses', params, preSets)
                    .then((response: AddonModPageGetPagesByCoursesResult): any => {

                if (response && response.pages) {
                    const currentPage = response.pages.find((page) => {
                        return page[key] == value;
                    });
                    if (currentPage) {
                        return currentPage;
                    }
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get cache key for page data WS calls.
     *
     * @param courseId Course ID.
     * @return Cache key.
     */
    protected getPageCacheKey(courseId: number): string {
        return this.ROOT_CACHE_KEY + 'page:' + courseId;
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param moduleId The module ID.
     * @param courseId Course ID of the module.
     * @param siteId Site ID. If not defined, current site.
     */
    invalidateContent(moduleId: number, courseId: number, siteId?: string): Promise<any> {
        const promises = [];

        promises.push(this.invalidatePageData(courseId, siteId));
        promises.push(this.filepoolProvider.invalidateFilesByComponent(siteId, AddonModPageProvider.COMPONENT, moduleId));
        promises.push(this.courseProvider.invalidateModule(moduleId, siteId));

        return this.utils.allPromises(promises);
    }

    /**
     * Invalidates page data.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidatePageData(courseId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getPageCacheKey(courseId));
        });
    }

    /**
     * Returns whether or not getPage WS available or not.
     *
     * @return If WS is avalaible.
     * @since 3.3
     */
    isGetPageWSAvailable(): boolean {
        return this.sitesProvider.wsAvailableInCurrentSite('mod_page_get_pages_by_courses');
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
     * Report a page as being viewed.
     *
     * @param id Module ID.
     * @param name Name of the page.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the WS call is successful.
     */
    logView(id: number, name?: string, siteId?: string): Promise<any> {
        const params = {
            pageid: id
        };

        return this.logHelper.logSingle('mod_page_view_page', params, AddonModPageProvider.COMPONENT, id, name, 'page', {}, siteId);
    }
}

/**
 * Page returned by mod_page_get_pages_by_courses.
 */
export type AddonModPagePage = {
    id: number; // Module id.
    coursemodule: number; // Course module id.
    course: number; // Course id.
    name: string; // Page name.
    intro: string; // Summary.
    introformat: number; // Intro format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    introfiles: CoreWSExternalFile[];
    content: string; // Page content.
    contentformat: number; // Content format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    contentfiles: CoreWSExternalFile[];
    legacyfiles: number; // Legacy files flag.
    legacyfileslast: number; // Legacy files last control flag.
    display: number; // How to display the page.
    displayoptions: string; // Display options (width, height).
    revision: number; // Incremented when after each file changes, to avoid cache.
    timemodified: number; // Last time the page was modified.
    section: number; // Course section id.
    visible: number; // Module visibility.
    groupmode: number; // Group mode.
    groupingid: number; // Grouping id.
};

/**
 * Result of WS mod_page_get_pages_by_courses.
 */
export type AddonModPageGetPagesByCoursesResult = {
    pages: AddonModPagePage[];
    warnings?: CoreWSExternalWarning[];
};
