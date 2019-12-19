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
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '@providers/app';
import { CoreFileProvider } from '@providers/file';
import { CoreSitesProvider } from '@providers/sites';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { CoreCourseLogHelperProvider } from '@core/course/providers/log-helper';
import { CoreSite } from '@classes/site';
import { CoreWSExternalWarning, CoreWSExternalFile } from '@providers/ws';

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
     * @return Promise resolved when the launcher file is deleted.
     */
    deleteLauncher(): Promise<any> {
        return this.fileProvider.removeFile(this.LAUNCHER_FILE_NAME);
    }

    /**
     * Generates a launcher file.
     *
     * @param url Launch URL.
     * @param params Launch params.
     * @return Promise resolved with the file URL.
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
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @return Promise resolved when the LTI is retrieved.
     */
    getLti(courseId: number, cmId: number): Promise<AddonModLtiLti> {
        const params: any = {
            courseids: [courseId]
        };
        const preSets: any = {
            cacheKey: this.getLtiCacheKey(courseId),
            updateFrequency: CoreSite.FREQUENCY_RARELY
        };

        return this.sitesProvider.getCurrentSite().read('mod_lti_get_ltis_by_courses', params, preSets)
                .then((response: AddonModLtiGetLtisByCoursesResult): any => {

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
     * @param courseId Course ID.
     * @return Cache key.
     */
    protected getLtiCacheKey(courseId: number): string {
        return this.ROOT_CACHE_KEY + 'lti:' + courseId;
    }

    /**
     * Get a LTI launch data.
     *
     * @param id LTI id.
     * @return Promise resolved when the launch data is retrieved.
     */
    getLtiLaunchData(id: number): Promise<AddonModLtiGetToolLaunchDataResult> {
        const params = {
            toolid: id
        };

        // Try to avoid using cache since the "nonce" parameter is set to a timestamp.
        const preSets = {
            getFromCache: false,
            saveToCache: true,
            emergencyCache: true,
            cacheKey: this.getLtiLaunchDataCacheKey(id)
        };

        return this.sitesProvider.getCurrentSite().read('mod_lti_get_tool_launch_data', params, preSets)
                .then((response: AddonModLtiGetToolLaunchDataResult): any => {

            if (response.endpoint) {
                return response;
            }

            return Promise.reject(null);
        });
    }

    /**
     * Get cache key for LTI launch data WS calls.
     *
     * @param id LTI id.
     * @return Cache key.
     */
    protected getLtiLaunchDataCacheKey(id: number): string {
        return this.ROOT_CACHE_KEY + 'launch:' + id;
    }

    /**
     * Invalidates LTI data.
     *
     * @param courseId Course ID.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateLti(courseId: number): Promise<any> {
        return this.sitesProvider.getCurrentSite().invalidateWsCacheForKey(this.getLtiCacheKey(courseId));
    }

    /**
     * Invalidates options.
     *
     * @param id LTI id.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateLtiLaunchData(id: number): Promise<any> {
        return this.sitesProvider.getCurrentSite().invalidateWsCacheForKey(this.getLtiLaunchDataCacheKey(id));
    }

    /**
     * Launch LTI.
     *
     * @param url Launch URL.
     * @param params Launch params.
     * @return Promise resolved when the WS call is successful.
     */
    launch(url: string, params: AddonModLtiParam[]): Promise<any> {
        if (!this.urlUtils.isHttpURL(url)) {
            return Promise.reject(this.translate.instant('addon.mod_lti.errorinvalidlaunchurl'));
        }

        // Generate launcher and open it.
        return this.generateLauncher(url, params).then((url) => {
            if (this.appProvider.isMobile()) {
                this.utils.openInApp(url);
            } else {
                // In desktop open in browser, we found some cases where inapp caused JS issues.
                this.utils.openInBrowser(url);
            }
        });
    }

    /**
     * Report the LTI as being viewed.
     *
     * @param id LTI id.
     * @param name Name of the lti.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the WS call is successful.
     */
    logView(id: number, name?: string, siteId?: string): Promise<any> {
        const params: any = {
            ltiid: id
        };

        return this.logHelper.logSingle('mod_lti_view_lti', params, AddonModLtiProvider.COMPONENT, id, name, 'lti', {}, siteId);
    }
}

/**
 * LTI returned by mod_lti_get_ltis_by_courses.
 */
export type AddonModLtiLti = {
    id: number; // External tool id.
    coursemodule: number; // Course module id.
    course: number; // Course id.
    name: string; // LTI name.
    intro?: string; // The LTI intro.
    introformat?: number; // Intro format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    introfiles?: CoreWSExternalFile[]; // @since 3.2.
    timecreated?: number; // Time of creation.
    timemodified?: number; // Time of last modification.
    typeid?: number; // Type id.
    toolurl?: string; // Tool url.
    securetoolurl?: string; // Secure tool url.
    instructorchoicesendname?: string; // Instructor choice send name.
    instructorchoicesendemailaddr?: number; // Instructor choice send mail address.
    instructorchoiceallowroster?: number; // Instructor choice allow roster.
    instructorchoiceallowsetting?: number; // Instructor choice allow setting.
    instructorcustomparameters?: string; // Instructor custom parameters.
    instructorchoiceacceptgrades?: number; // Instructor choice accept grades.
    grade?: number; // Enable grades.
    launchcontainer?: number; // Launch container mode.
    resourcekey?: string; // Resource key.
    password?: string; // Shared secret.
    debuglaunch?: number; // Debug launch.
    showtitlelaunch?: number; // Show title launch.
    showdescriptionlaunch?: number; // Show description launch.
    servicesalt?: string; // Service salt.
    icon?: string; // Alternative icon URL.
    secureicon?: string; // Secure icon URL.
    section?: number; // Course section id.
    visible?: number; // Visible.
    groupmode?: number; // Group mode.
    groupingid?: number; // Group id.
};

/**
 * Param to send to the LTI.
 */
export type AddonModLtiParam = {
    name: string; // Parameter name.
    value: string; // Parameter value.
};

/**
 * Result of WS mod_lti_get_ltis_by_courses.
 */
export type AddonModLtiGetLtisByCoursesResult = {
    ltis: AddonModLtiLti[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Result of WS mod_lti_get_tool_launch_data.
 */
export type AddonModLtiGetToolLaunchDataResult = {
    endpoint: string; // Endpoint URL.
    parameters: AddonModLtiParam[];
    warnings?: CoreWSExternalWarning[];
};
