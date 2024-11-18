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

import { CoreError } from '@classes/errors/error';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CoreSite } from '@classes/sites/site';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreFile } from '@services/file';
import { CorePlatform } from '@services/platform';
import { CoreSites, CoreSitesCommonWSOptions } from '@services/sites';
import { CoreText } from '@singletons/text';
import { CoreUrl } from '@singletons/url';
import { CoreOpener } from '@singletons/opener';
import { CoreWSExternalFile, CoreWSExternalWarning } from '@services/ws';
import { makeSingleton, Translate } from '@singletons';
import { ADDON_MOD_LTI_COMPONENT } from '../constants';
import { CoreCacheUpdateFrequency } from '@/core/constants';

/**
 * Service that provides some features for LTI.
 */
@Injectable({ providedIn: 'root' })
export class AddonModLtiProvider {

    protected static readonly ROOT_CACHE_KEY = 'mmaModLti:';
    protected static readonly LAUNCHER_FILE_NAME = 'lti_launcher.html';

    /**
     * Delete launcher.
     *
     * @returns Promise resolved when the launcher file is deleted.
     */
    deleteLauncher(): Promise<void> {
        return CoreFile.removeFile(AddonModLtiProvider.LAUNCHER_FILE_NAME);
    }

    /**
     * Generates a launcher file.
     *
     * @param url Launch URL.
     * @param params Launch params.
     * @returns Promise resolved with the file URL.
     */
    async generateLauncher(url: string, params: AddonModLtiParam[]): Promise<string> {
        if (!CoreFile.isAvailable()) {
            return url;
        }

        // Generate a form with the params.
        let text = `<form action="${url}" name="ltiLaunchForm" method="post" encType="application/x-www-form-urlencoded">\n`;
        params.forEach((p) => {
            if (p.name == 'ext_submit') {
                text += '    <input type="submit"';
            } else {
                text += '    <input type="hidden" name="' + CoreText.escapeHTML(p.name) + '"';
            }
            text += ' value="' + CoreText.escapeHTML(p.value) + '"/>\n';
        });
        text += '</form>\n';

        // Add an in-line script to automatically submit the form.
        text += '<script type="text/javascript"> \n' +
            '    window.onload = function() { \n' +
            '        document.ltiLaunchForm.submit(); \n' +
            '    }; \n' +
            '</script> \n';

        const entry = await CoreFile.writeFile(AddonModLtiProvider.LAUNCHER_FILE_NAME, text);

        return CoreFile.getFileEntryURL(entry);
    }

    /**
     * Get a LTI.
     *
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param options Other options.
     * @returns Promise resolved when the LTI is retrieved.
     */
    async getLti(courseId: number, cmId: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModLtiLti> {
        const params: AddonModLtiGetLtisByCoursesWSParams = {
            courseids: [courseId],
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getLtiCacheKey(courseId),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            component: ADDON_MOD_LTI_COMPONENT,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const site = await CoreSites.getSite(options.siteId);

        const response = await site.read<AddonModLtiGetLtisByCoursesWSResponse>('mod_lti_get_ltis_by_courses', params, preSets);

        const currentLti = response.ltis.find((lti) => lti.coursemodule == cmId);
        if (currentLti) {
            return currentLti;
        }

        throw new CoreError(Translate.instant('core.course.modulenotfound'));
    }

    /**
     * Get cache key for LTI data WS calls.
     *
     * @param courseId Course ID.
     * @returns Cache key.
     */
    protected getLtiCacheKey(courseId: number): string {
        return AddonModLtiProvider.ROOT_CACHE_KEY + 'lti:' + courseId;
    }

    /**
     * Get a LTI launch data.
     *
     * @param id LTI id.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the launch data is retrieved.
     */
    async getLtiLaunchData(id: number, siteId?: string): Promise<AddonModLtiGetToolLaunchDataWSResponse> {
        const params: AddonModLtiGetToolLaunchDataWSParams = {
            toolid: id,
        };

        // Try to avoid using cache since the "nonce" parameter is set to a timestamp.
        const preSets: CoreSiteWSPreSets = {
            getFromCache: false,
            saveToCache: true,
            emergencyCache: true,
            cacheKey: this.getLtiLaunchDataCacheKey(id),
        };

        const site = await CoreSites.getSite(siteId);

        return site.read<AddonModLtiGetToolLaunchDataWSResponse>('mod_lti_get_tool_launch_data', params, preSets);
    }

    /**
     * Get cache key for LTI launch data WS calls.
     *
     * @param id LTI id.
     * @returns Cache key.
     */
    protected getLtiLaunchDataCacheKey(id: number): string {
        return `${AddonModLtiProvider.ROOT_CACHE_KEY}launch:${id}`;
    }

    /**
     * Invalidates LTI data.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateLti(courseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getLtiCacheKey(courseId));
    }

    /**
     * Invalidates options.
     *
     * @param id LTI id.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateLtiLaunchData(id: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getLtiLaunchDataCacheKey(id));
    }

    /**
     * Check if open LTI in browser via site with auto-login is disabled.
     * This setting was added in 3.11.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: whether it's disabled.
     */
    async isLaunchViaSiteDisabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return this.isLaunchViaSiteDisabledInSite(site);
    }

    /**
     * Check if open LTI in browser via site with auto-login is disabled.
     * This setting was added in 3.11.
     *
     * @param site Site. If not defined, current site.
     * @returns Whether it's disabled.
     */
    isLaunchViaSiteDisabledInSite(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return !!site?.isFeatureDisabled('CoreCourseModuleDelegate_AddonModLti:launchViaSite');
    }

    /**
     * Check if open in InAppBrowser is disabled.
     * This setting was removed in Moodle 3.11 because the default behaviour of the app changed.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: whether it's disabled.
     */
    async isOpenInAppBrowserDisabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return this.isOpenInAppBrowserDisabledInSite(site);
    }

    /**
     * Check if open in InAppBrowser is disabled.
     * This setting was removed in Moodle 3.11 because the default behaviour of the app changed.
     *
     * @param site Site. If not defined, current site.
     * @returns Whether it's disabled.
     */
    isOpenInAppBrowserDisabledInSite(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return !!site?.isFeatureDisabled('CoreCourseModuleDelegate_AddonModLti:openInAppBrowser');
    }

    /**
     * Launch LTI.
     *
     * @param url Launch URL.
     * @param params Launch params.
     * @returns Promise resolved when the WS call is successful.
     */
    async launch(url: string, params: AddonModLtiParam[]): Promise<void> {
        if (!CoreUrl.isHttpURL(url)) {
            throw Translate.instant('addon.mod_lti.errorinvalidlaunchurl');
        }

        // Generate launcher and open it.
        const launcherUrl = await this.generateLauncher(url, params);

        if (CorePlatform.isMobile()) {
            CoreOpener.openInApp(launcherUrl);
        } else {
            // In desktop open in browser, we found some cases where inapp caused JS issues.
            CoreOpener.openInBrowser(launcherUrl);
        }
    }

    /**
     * Report the LTI as being viewed.
     *
     * @param id LTI id.
     * @param name Name of the lti.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    logView(id: number, name?: string, siteId?: string): Promise<void> {
        const params: AddonModLtiViewLtiWSParams = {
            ltiid: id,
        };

        return CoreCourseLogHelper.log(
            'mod_lti_view_lti',
            params,
            ADDON_MOD_LTI_COMPONENT,
            id,
            siteId,
        );
    }

    /**
     * Check whether the LTI should be launched in browser via the site with auto-login.
     *
     * @param siteId Site ID.
     * @returns Promise resolved with boolean.
     */
    async shouldLaunchInBrowser(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        if (site.isVersionGreaterEqualThan('3.11')) {
            // In 3.11+, launch in browser by default unless it's disabled.
            return !this.isLaunchViaSiteDisabledInSite(site);
        } else {
            // In old sites the default behaviour is to launch in InAppBrowser.
            return this.isOpenInAppBrowserDisabledInSite(site);
        }
    }

}

export const AddonModLti = makeSingleton(AddonModLtiProvider);

/**
 * Params of mod_lti_get_ltis_by_courses WS.
 */
export type AddonModLtiGetLtisByCoursesWSParams = {
    courseids?: number[]; // Array of course ids.
};

/**
 * Data returned by mod_lti_get_ltis_by_courses WS.
 */
export type AddonModLtiGetLtisByCoursesWSResponse = {
    ltis: AddonModLtiLti[];
    warnings?: CoreWSExternalWarning[];
};

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
    introfiles?: CoreWSExternalFile[];
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
 * Params of mod_lti_get_tool_launch_data WS.
 */
export type AddonModLtiGetToolLaunchDataWSParams = {
    toolid: number; // External tool instance id.
};

/**
 * Data returned by mod_lti_get_tool_launch_data WS.
 */
export type AddonModLtiGetToolLaunchDataWSResponse = {
    endpoint: string; // Endpoint URL.
    parameters: AddonModLtiParam[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Param to send to the LTI.
 */
export type AddonModLtiParam = {
    name: string; // Parameter name.
    value: string; // Parameter value.
};
/**
 * Params of mod_lti_view_lti WS.
 */
export type AddonModLtiViewLtiWSParams = {
    ltiid: number; // Lti instance id.
};
