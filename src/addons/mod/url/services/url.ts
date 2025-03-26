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
import { CoreSites, CoreSitesCommonWSOptions } from '@services/sites';
import { CoreWSExternalWarning } from '@services/ws';
import { makeSingleton } from '@singletons';
import { CoreCacheUpdateFrequency } from '@/core/constants';
import { CoreMimetypeUtils } from '@services/utils/mimetype';
import { CoreCourse } from '@features/course/services/course';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { ADDON_MOD_URL_COMPONENT_LEGACY } from '../constants';
import { ModResourceDisplay } from '@addons/mod/constants';
import { CoreCourseModuleHelper, CoreCourseModuleStandardElements } from '@features/course/services/course-module-helper';

/**
 * Service that provides some features for urls.
 */
@Injectable({ providedIn: 'root' })
export class AddonModUrlProvider {

    protected static readonly ROOT_CACHE_KEY = 'mmaModUrl:';

    /**
     * Get the final display type for a certain URL. Based on Moodle's url_get_final_display_type.
     *
     * @param url URL data.
     * @returns Final display type.
     */
    getFinalDisplayType(url?: AddonModUrlUrl): ModResourceDisplay {
        if (!url) {
            return -1;
        }

        const extension = CoreMimetypeUtils.guessExtensionFromUrl(url.externalurl);

        // PDFs can be embedded in web, but not in the Mobile app.
        if (url.display === ModResourceDisplay.EMBED && extension === 'pdf') {
            return ModResourceDisplay.DOWNLOAD;
        }

        if (url.display !== ModResourceDisplay.AUTO) {
            return url.display;
        }

        // Detect links to local moodle pages.
        const currentSite = CoreSites.getCurrentSite();
        if (currentSite && currentSite.containsUrl(url.externalurl)) {
            if (url.externalurl.indexOf('file.php') == -1 && url.externalurl.indexOf('.php') != -1) {
                // Most probably our moodle page with navigation.
                return ModResourceDisplay.OPEN;
            }
        }

        const download = ['application/zip', 'application/x-tar', 'application/g-zip', 'application/pdf', 'text/html'];
        let mimetype = CoreMimetypeUtils.getMimeType(extension);

        if (url.externalurl.indexOf('.php') != -1 || url.externalurl.slice(-1) === '/' ||
                (url.externalurl.indexOf('//') != -1 && url.externalurl.match(/\//g)?.length == 2)) {
            // Seems to be a web, use HTML mimetype.
            mimetype = 'text/html';
        }

        if (mimetype && download.indexOf(mimetype) != -1) {
            return ModResourceDisplay.DOWNLOAD;
        }

        if (extension && CoreMimetypeUtils.canBeEmbedded(extension)) {
            return ModResourceDisplay.EMBED;
        }

        // Let the browser deal with it somehow.
        return ModResourceDisplay.OPEN;
    }

    /**
     * Get cache key for url data WS calls.
     *
     * @param courseId Course ID.
     * @returns Cache key.
     */
    protected getUrlCacheKey(courseId: number): string {
        return `${AddonModUrlProvider.ROOT_CACHE_KEY}url:${courseId}`;
    }

    /**
     * Get a url by course module ID.
     *
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param options Other options.
     * @returns Promise resolved when the url is retrieved.
     */
    async getUrl(courseId: number, cmId: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModUrlUrl> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModUrlGetUrlsByCoursesWSParams = {
            courseids: [courseId],
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getUrlCacheKey(courseId),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            component: ADDON_MOD_URL_COMPONENT_LEGACY,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy),
        };

        const response = await site.read<AddonModUrlGetUrlsByCoursesResult>('mod_url_get_urls_by_courses', params, preSets);

        return CoreCourseModuleHelper.getActivityByCmId(response.urls, cmId);
    }

    /**
     * Guess the icon for a certain URL. Based on Moodle's url_guess_icon.
     *
     * @param url URL to check.
     * @returns Icon, empty if it should use the default icon.
     */
    guessIcon(url: string): string {
        url = url || '';

        const matches = url.match(/\//g);
        const extension = CoreMimetypeUtils.guessExtensionFromUrl(url);

        if (!matches || matches.length < 3 || url.slice(-1) === '/' || extension == 'php') {
            // Use default icon.
            return '';
        }

        const icon = CoreMimetypeUtils.getExtensionIcon(extension ?? '');

        // We do not want to return those icon types, the module icon is more appropriate.
        if (icon === CoreMimetypeUtils.getFileIconForType('unknown') ||
            icon === CoreMimetypeUtils.getFileIconForType('html')) {
            return '';
        }

        return icon;
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param moduleId The module ID.
     * @param courseId Course ID of the module.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateContent(moduleId: number, courseId: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const promises: Promise<void>[] = [];

        promises.push(this.invalidateUrlData(courseId, siteId));
        promises.push(CoreCourse.invalidateModule(moduleId, siteId, 'url'));

        await CorePromiseUtils.allPromises(promises);
    }

    /**
     * Invalidates url data.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateUrlData(courseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getUrlCacheKey(courseId));
    }

    /**
     * Report the url as being viewed.
     *
     * @param id Module ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    logView(id: number, siteId?: string): Promise<void> {
        const params: AddonModUrlViewUrlWSParams = {
            urlid: id,
        };

        return CoreCourseLogHelper.log(
            'mod_url_view_url',
            params,
            ADDON_MOD_URL_COMPONENT_LEGACY,
            id,
            siteId,
        );
    }

}
export const AddonModUrl = makeSingleton(AddonModUrlProvider);

/**
 * Params of mod_url_get_urls_by_courses WS.
 */
type AddonModUrlGetUrlsByCoursesWSParams = {
    courseids?: number[]; // Array of course ids.
};

/**
 * Params of mod_url_view_url WS.
 */
type AddonModUrlViewUrlWSParams = {
    urlid: number; // Url instance id.
};

/**
 * URL returnd by mod_url_get_urls_by_courses.
 */
export type AddonModUrlUrl = CoreCourseModuleStandardElements & {
    externalurl: string; // External URL.
    display: ModResourceDisplay; // How to display the url.
    displayoptions: string; // Display options (width, height).
    parameters: string; // Parameters to append to the URL.
    timemodified: number; // Last time the url was modified.
};

/**
 * Result of WS mod_url_get_urls_by_courses.
 */
export type AddonModUrlGetUrlsByCoursesResult = {
    urls: AddonModUrlUrl[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Url Display options as object.
 */
export type AddonModUrlDisplayOptions = {
    printintro?: boolean;
};
