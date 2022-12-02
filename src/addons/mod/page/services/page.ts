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
import { CoreSitesCommonWSOptions, CoreSites } from '@services/sites';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
import { CoreWSExternalWarning, CoreWSExternalFile } from '@services/ws';
import { makeSingleton, Translate } from '@singletons';
import { CoreFilepool } from '@services/filepool';
import { CoreCourse } from '@features/course/services/course';
import { CoreUtils } from '@services/utils/utils';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreError } from '@classes/errors/error';

const ROOT_CACHE_KEY = 'mmaModPage:';

/**
 * Service that provides some features for page.
 */
@Injectable({ providedIn: 'root' })
export class AddonModPageProvider {

    static readonly COMPONENT = 'mmaModPage';

    /**
     * Get a page by course module ID.
     *
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param options Other options.
     * @returns Promise resolved when the page is retrieved.
     */
    getPageData(courseId: number, cmId: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModPagePage> {
        return this.getPageByKey(courseId, 'coursemodule', cmId, options);
    }

    /**
     * Get a page.
     *
     * @param courseId Course ID.
     * @param key Name of the property to check.
     * @param value Value to search.
     * @param options Other options.
     * @returns Promise resolved when the page is retrieved.
     */
    protected async getPageByKey(
        courseId: number,
        key: string,
        value: number,
        options: CoreSitesCommonWSOptions = {},
    ): Promise<AddonModPagePage> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModPageGetPagesByCoursesWSParams = {
            courseids: [courseId],
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getPageCacheKey(courseId),
            updateFrequency: CoreSite.FREQUENCY_RARELY,
            component: AddonModPageProvider.COMPONENT,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy),
        };

        const response = await site.read<AddonModPageGetPagesByCoursesWSResponse>('mod_page_get_pages_by_courses', params, preSets);

        const currentPage = response.pages.find((page) => page[key] == value);
        if (currentPage) {
            return currentPage;
        }

        throw new CoreError(Translate.instant('core.course.modulenotfound'));
    }

    /**
     * Get cache key for page data WS calls.
     *
     * @param courseId Course ID.
     * @returns Cache key.
     */
    protected getPageCacheKey(courseId: number): string {
        return ROOT_CACHE_KEY + 'page:' + courseId;
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param moduleId The module ID.
     * @param courseId Course ID of the module.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    invalidateContent(moduleId: number, courseId: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const promises: Promise<void>[] = [];

        promises.push(this.invalidatePageData(courseId, siteId));
        promises.push(CoreFilepool.invalidateFilesByComponent(siteId, AddonModPageProvider.COMPONENT, moduleId));
        promises.push(CoreCourse.invalidateModule(moduleId, siteId));

        return CoreUtils.allPromises(promises);
    }

    /**
     * Invalidates page data.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidatePageData(courseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getPageCacheKey(courseId));
    }

    /**
     * Return whether or not the plugin is enabled.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    async isPluginEnabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return site.canDownloadFiles();
    }

    /**
     * Report a page as being viewed.
     *
     * @param pageid Module ID.
     * @param name Name of the page.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    logView(pageid: number, name?: string, siteId?: string): Promise<void> {
        const params: AddonModPageViewPageWSParams = {
            pageid,
        };

        return CoreCourseLogHelper.logSingle(
            'mod_page_view_page',
            params,
            AddonModPageProvider.COMPONENT,
            pageid,
            name,
            'page',
            {},
            siteId,
        );
    }

}

export const AddonModPage = makeSingleton(AddonModPageProvider);

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
type AddonModPageGetPagesByCoursesWSResponse = {
    pages: AddonModPagePage[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_page_view_page WS.
 */
type AddonModPageViewPageWSParams = {
    pageid: number; // Page instance id.
};

/**
 * Params of mod_page_get_pages_by_courses WS.
 */
type AddonModPageGetPagesByCoursesWSParams = {
    courseids?: number[]; // Array of course ids.
};
