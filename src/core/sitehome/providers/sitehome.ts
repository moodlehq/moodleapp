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
import { CoreSite } from '@classes/site';
import { CoreCourseProvider } from '@core/course/providers/course';
import { AddonModForumProvider } from '@addon/mod/forum/providers/forum';

/**
 * Service that provides some features regarding site home.
 */
@Injectable()
export class CoreSiteHomeProvider {
    protected logger;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private courseProvider: CoreCourseProvider,
            private forumProvider: AddonModForumProvider) {
        this.logger = logger.getInstance('CoreSiteHomeProvider');
    }

    /**
     * Get the news forum for the Site Home.
     *
     * @param {number} siteHomeId Site Home ID.
     * @return {Promise<any>} Promise resolved with the forum if found, rejected otherwise.
     */
    getNewsForum(siteHomeId: number): Promise<any> {
        return this.forumProvider.getCourseForums(siteHomeId).then((forums) => {
            for (let i = 0; i < forums.length; i++) {
                if (forums[i].type == 'news') {
                    return forums[i];
                }
            }

            return Promise.reject(null);
        });
    }

    /**
     * Invalidate the WS call to get the news forum for the Site Home.
     *
     * @param {number} siteHomeId Site Home ID.
     * @return {Promise<any>} Promise resolved when invalidated.
     */
    invalidateNewsForum(siteHomeId: number): Promise<any> {
        return this.forumProvider.invalidateForumData(siteHomeId);
    }

    /**
     * Returns whether or not the frontpage is available for the current site.
     *
     * @param {string} [siteId] The site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with boolean: whether it's available.
     */
    isAvailable(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            // First check if it's disabled.
            if (this.isDisabledInSite(site)) {
                return false;
            }

            // Use a WS call to check if there's content in the site home.
            const siteHomeId = site.getSiteHomeId(),
                preSets = { emergencyCache: false };

            this.logger.debug('Using WS call to check if site home is available.');

            return this.courseProvider.getSections(siteHomeId, false, true, preSets, site.id).then((sections): any => {
                if (!sections || !sections.length) {
                    return Promise.reject(null);
                }

                for (let i = 0; i < sections.length; i++) {
                    const section = sections[i];
                    if (section.summary || (section.modules && section.modules.length)) {
                        // It has content, return true.
                        return true;
                    }
                }

                return Promise.reject(null);
            }).catch(() => {
                const config = site.getStoredConfig();
                if (config && config.frontpageloggedin) {
                    const items = config.frontpageloggedin.split(',');
                    if (items.length > 0) {
                        // It's enabled.
                        return true;
                    }
                }

                return false;
            });
        }).catch(() => {
            return false;
        });
    }

    /**
     * Check if Site Home is disabled in a certain site.
     *
     * @param {string} [siteId] Site Id. If not defined, use current site.
     * @return {Promise<boolean>} Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    isDisabled(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.isDisabledInSite(site);
        });
    }

    /**
     * Check if Site Home is disabled in a certain site.
     *
     * @param {CoreSite} [site] Site. If not defined, use current site.
     * @return {boolean} Whether it's disabled.
     */
    isDisabledInSite(site: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.isFeatureDisabled('CoreMainMenuDelegate_CoreSiteHome');
    }
}
