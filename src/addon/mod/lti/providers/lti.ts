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
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '@providers/app';
import { CoreFileProvider } from '@providers/file';
import { CoreSitesProvider } from '@providers/sites';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { CoreCourseLogHelperProvider } from '@core/course/providers/log-helper';
import { CoreSite } from '@classes/site';

export interface AddonModLtiParam {
    name: string;
    value: string;
}

/**
 * Service that provides some features for LTI.
 */
@Injectable()
export class AddonModLtiProvider {
    static COMPONENT = 'mmaModLti';

    protected ROOT_CACHE_KEY = 'mmaModLti:';
    protected LAUNCHER_FILE_NAME = 'lti_launcher.html';

    constructor(private fileProvider: CoreFileProvider,
            private sitesProvider: CoreSitesProvider,
            private textUtils: CoreTextUtilsProvider,
            private urlUtils: CoreUrlUtilsProvider,
            private utils: CoreUtilsProvider,
            private translate: TranslateService,
            private appProvider: CoreAppProvider,
            private logHelper: CoreCourseLogHelperProvider) {}

    /**
     * Delete launcher.
     *
     * @return {Promise<any>} Promise resolved when the launcher file is deleted.
     */
    deleteLauncher(): Promise<any> {
        return this.fileProvider.removeFile(this.LAUNCHER_FILE_NAME);
    }

    /**
     * Generates a launcher file.
     *
     * @param {string} url Launch URL.
     * @param {AddonModLtiParam[]} params Launch params.
     * @return {Promise<string>} Promise resolved with the file URL.
     */
    generateLauncher(url: string, params: AddonModLtiParam[]): Promise<string> {
        if (!this.fileProvider.isAvailable()) {
            return Promise.resolve(url);
        }

        // Generate a form with the params.
        let text = '<form action="' + url + '" name="ltiLaunchForm" ' +
                    'method="post" encType="application/x-www-form-urlencoded">\n';
        params.forEach((p) => {
            if (p.name == 'ext_submit') {
                text += '    <input type="submit"';
            } else {
                text += '    <input type="hidden" name="' + this.textUtils.escapeHTML(p.name) + '"';
            }
            text += ' value="' + this.textUtils.escapeHTML(p.value) + '"/>\n';
        });
        text += '</form>\n';

        // Add an in-line script to automatically submit the form.
        text += '<script type="text/javascript"> \n' +
            '    window.onload = function() { \n' +
            '        document.ltiLaunchForm.submit(); \n' +
            '    }; \n' +
            '</script> \n';

        return this.fileProvider.writeFile(this.LAUNCHER_FILE_NAME, text).then((entry) => {
            if (this.appProvider.isDesktop()) {
                return entry.toInternalURL();
            } else {
                return entry.toURL();
            }
        });
    }

    /**
     * Get a LTI.
     *
     * @param {number} courseId Course ID.
     * @param {number} cmId Course module ID.
     * @return {Promise<any>} Promise resolved when the LTI is retrieved.
     */
    getLti(courseId: number, cmId: number): Promise<any> {
        const params: any = {
            courseids: [courseId]
        };
        const preSets: any = {
            cacheKey: this.getLtiCacheKey(courseId),
            updateFrequency: CoreSite.FREQUENCY_RARELY
        };

        return this.sitesProvider.getCurrentSite().read('mod_lti_get_ltis_by_courses', params, preSets).then((response) => {
            if (response.ltis) {
                const currentLti = response.ltis.find((lti) => lti.coursemodule == cmId);
                if (currentLti) {
                    return currentLti;
                }
            }

            return Promise.reject(null);
        });
    }

    /**
     * Get cache key for LTI data WS calls.
     *
     * @param {number} courseId Course ID.
     * @return {string} Cache key.
     */
    protected getLtiCacheKey(courseId: number): string {
        return this.ROOT_CACHE_KEY + 'lti:' + courseId;
    }

    /**
     * Get a LTI launch data.
     *
     * @param {number} id LTI id.
     * @return {Promise<any>} Promise resolved when the launch data is retrieved.
     */
    getLtiLaunchData(id: number): Promise<any> {
        const params: any = {
            toolid: id
        };

        // Try to avoid using cache since the "nonce" parameter is set to a timestamp.
        const preSets = {
            getFromCache: false,
            saveToCache: true,
            emergencyCache: true,
            cacheKey: this.getLtiLaunchDataCacheKey(id)
        };

        return this.sitesProvider.getCurrentSite().read('mod_lti_get_tool_launch_data', params, preSets).then((response) => {
            if (response.endpoint) {
                return response;
            }

            return Promise.reject(null);
        });
    }

    /**
     * Get cache key for LTI launch data WS calls.
     *
     * @param {number} id LTI id.
     * @return {string} Cache key.
     */
    protected getLtiLaunchDataCacheKey(id: number): string {
        return this.ROOT_CACHE_KEY + 'launch:' + id;
    }

    /**
     * Invalidates LTI data.
     *
     * @param {number} courseId Course ID.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateLti(courseId: number): Promise<any> {
        return this.sitesProvider.getCurrentSite().invalidateWsCacheForKey(this.getLtiCacheKey(courseId));
    }

    /**
     * Invalidates options.
     *
     * @param {number} id LTI id.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateLtiLaunchData(id: number): Promise<any> {
        return this.sitesProvider.getCurrentSite().invalidateWsCacheForKey(this.getLtiLaunchDataCacheKey(id));
    }

    /**
     * Launch LTI.
     *
     * @param {string} url Launch URL.
     * @param {AddonModLtiParam[]} params Launch params.
     * @return {Promise<any>} Promise resolved when the WS call is successful.
     */
    launch(url: string, params: AddonModLtiParam[]): Promise<any> {
        if (!this.urlUtils.isHttpURL(url)) {
            return Promise.reject(this.translate.instant('addon.mod_lti.errorinvalidlaunchurl'));
        }

        // Generate launcher and open it.
        return this.generateLauncher(url, params).then((url) => {
            this.utils.openInApp(url);
        });
    }

    /**
     * Report the LTI as being viewed.
     *
     * @param {string} id LTI id.
     * @param {string} [name] Name of the lti.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}  Promise resolved when the WS call is successful.
     */
    logView(id: number, name?: string, siteId?: string): Promise<any> {
        const params: any = {
            ltiid: id
        };

        return this.logHelper.logSingle('mod_lti_view_lti', params, AddonModLtiProvider.COMPONENT, id, name, 'lti', {}, siteId);
    }
}
