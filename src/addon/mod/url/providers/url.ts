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
import { CoreMimetypeUtilsProvider } from '@providers/utils/mimetype';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseLogHelperProvider } from '@core/course/providers/log-helper';
import { CoreConstants } from '@core/constants';
import { CoreSite } from '@classes/site';

/**
 * Service that provides some features for urls.
 */
@Injectable()
export class AddonModUrlProvider {
    static COMPONENT = 'mmaModUrl';

    protected ROOT_CACHE_KEY = 'mmaModUrl:';
    protected logger;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private courseProvider: CoreCourseProvider,
            private utils: CoreUtilsProvider, private mimeUtils: CoreMimetypeUtilsProvider,
            private logHelper: CoreCourseLogHelperProvider) {
        this.logger = logger.getInstance('AddonModUrlProvider');
    }

    /**
     * Get the final display type for a certain URL. Based on Moodle's url_get_final_display_type.
     *
     * @param {any} url URL data.
     * @return {number} Final display type.
     */
    getFinalDisplayType(url: any): number {
        if (!url) {
            return -1;
        }

        const extension = this.mimeUtils.guessExtensionFromUrl(url.externalurl);

        // PDFs can be embedded in web, but not in the Mobile app.
        if (url.display == CoreConstants.RESOURCELIB_DISPLAY_EMBED && extension == 'pdf') {
            return CoreConstants.RESOURCELIB_DISPLAY_DOWNLOAD;
        }

        if (url.display != CoreConstants.RESOURCELIB_DISPLAY_AUTO) {
            return url.display;
        }

        // Detect links to local moodle pages.
        const currentSite = this.sitesProvider.getCurrentSite();
        if (currentSite && currentSite.containsUrl(url.externalurl)) {
            if (url.externalurl.indexOf('file.php') == -1 && url.externalurl.indexOf('.php') != -1) {
                // Most probably our moodle page with navigation.
                return CoreConstants.RESOURCELIB_DISPLAY_OPEN;
            }
        }

        const download = ['application/zip', 'application/x-tar', 'application/g-zip', 'application/pdf', 'text/html'];
        let mimetype = this.mimeUtils.getMimeType(extension);

        if (url.externalurl.indexOf('.php') != -1 || url.externalurl.substr(-1) === '/' ||
                (url.externalurl.indexOf('//') != -1 && url.externalurl.match(/\//g).length == 2)) {
            // Seems to be a web, use HTML mimetype.
            mimetype = 'text/html';
        }

        if (download.indexOf(mimetype) != -1) {
            return CoreConstants.RESOURCELIB_DISPLAY_DOWNLOAD;
        }

        if (this.mimeUtils.canBeEmbedded(extension)) {
            return CoreConstants.RESOURCELIB_DISPLAY_EMBED;
        }

        // Let the browser deal with it somehow.
        return CoreConstants.RESOURCELIB_DISPLAY_OPEN;
    }

    /**
     * Get cache key for url data WS calls.
     *
     * @param {number} courseId Course ID.
     * @return {string}         Cache key.
     */
    protected getUrlCacheKey(courseId: number): string {
        return this.ROOT_CACHE_KEY + 'url:' + courseId;
    }

    /**
     * Get a url data.
     *
     * @param {number} courseId Course ID.
     * @param {string} key     Name of the property to check.
     * @param {any}  value   Value to search.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}  Promise resolved when the url is retrieved.
     */
    protected getUrlDataByKey(courseId: number, key: string, value: any, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    courseids: [courseId]
                },
                preSets = {
                    cacheKey: this.getUrlCacheKey(courseId),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            return site.read('mod_url_get_urls_by_courses', params, preSets).then((response) => {
                if (response && response.urls) {
                    const currentUrl = response.urls.find((url) => {
                        return url[key] == value;
                    });
                    if (currentUrl) {
                        return currentUrl;
                    }
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get a url by course module ID.
     *
     * @param {number} courseId Course ID.
     * @param {number} cmId     Course module ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}   Promise resolved when the url is retrieved.
     */
    getUrl(courseId: number, cmId: number, siteId?: string): Promise<any> {
        return this.getUrlDataByKey(courseId, 'coursemodule', cmId, siteId);
    }

    /**
     * Guess the icon for a certain URL. Based on Moodle's url_guess_icon.
     *
     * @param {string} url URL to check.
     * @return {string} Icon, empty if it should use the default icon.
     */
    guessIcon(url: string): string {
        url = url || '';

        const matches = url.match(/\//g),
            extension = this.mimeUtils.getFileExtension(url);

        if (!matches || matches.length < 3 || url.substr(-1) === '/' || extension == 'php') {
            // Use default icon.
            return '';
        }

        const icon = this.mimeUtils.getFileIcon(url);

        // We do not want to return those icon types, the module icon is more appropriate.
        if (icon === this.mimeUtils.getFileIconForType('unknown') || icon === this.mimeUtils.getFileIconForType('html')) {
            return '';
        }

        return icon;
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

        promises.push(this.invalidateUrlData(courseId, siteId));
        promises.push(this.courseProvider.invalidateModule(moduleId, siteId, 'url'));

        return this.utils.allPromises(promises);
    }

    /**
     * Invalidates url data.
     *
     * @param {number} courseid Course ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}   Promise resolved when the data is invalidated.
     */
    invalidateUrlData(courseId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getUrlCacheKey(courseId));
        });
    }

    /**
     * Returns whether or not getUrl WS available or not.
     *
     * @return {boolean} If WS is abalaible.
     * @since 3.3
     */
    isGetUrlWSAvailable(): boolean {
        return this.sitesProvider.wsAvailableInCurrentSite('mod_url_get_urls_by_courses');
    }

    /**
     * Report the url as being viewed.
     *
     * @param {number} id Module ID.
     * @param {string} [name] Name of the assign.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}  Promise resolved when the WS call is successful.
     */
    logView(id: number, name?: string, siteId?: string): Promise<any> {
        const params = {
            urlid: id
        };

        return this.logHelper.logSingle('mod_url_view_url', params, AddonModUrlProvider.COMPONENT, id, name, 'url', {}, siteId);
    }
}
