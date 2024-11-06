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

import { CoreSites } from '@services/sites';
import { CoreSite } from '@classes/sites/site';
import { makeSingleton } from '@singletons';
import { CoreCourse } from '../../course/services/course';
import { CoreCourses } from '../../courses/services/courses';
import { AddonModForumData } from '@addons/mod/forum/services/forum';
import { CoreError } from '@classes/errors/error';
import { CoreBlockHelper } from '@features/block/services/block-helper';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';

/**
 * Items with index 1 and 3 were removed on 2.5 and not being supported in the app.
 */
export enum FrontPageItemNames {
    NEWS_ITEMS = 0,
    LIST_OF_CATEGORIES = 2,
    COMBO_LIST = 4,
    ENROLLED_COURSES = 5,
    LIST_OF_COURSE = 6,
    COURSE_SEARCH_BOX = 7,
}

/**
 * Service that provides some features regarding site home.
 */
@Injectable({ providedIn: 'root' })
export class CoreSiteHomeProvider {

    /**
     * Get the news forum for the Site Home.
     *
     * @param siteHomeId Site Home ID.
     * @returns Promise resolved with the forum if found, rejected otherwise.
     */
    async getNewsForum(siteHomeId?: number): Promise<AddonModForumData> {
        if (!siteHomeId) {
            siteHomeId = CoreSites.getCurrentSiteHomeId();
        }

        const { AddonModForum } = await import('@addons/mod/forum/services/forum');

        const forums = await AddonModForum.getCourseForums(siteHomeId);
        const forum = forums.find((forum) => forum.type == 'news');

        if (forum) {
            return forum;
        }

        throw new CoreError('No news forum found');
    }

    /**
     * Invalidate the WS call to get the news forum for the Site Home.
     *
     * @param siteHomeId Site Home ID.
     */
    async invalidateNewsForum(siteHomeId: number): Promise<void> {
        const { AddonModForum } = await import('@addons/mod/forum/services/forum');

        await AddonModForum.invalidateForumData(siteHomeId);
    }

    /**
     * Returns whether or not the frontpage is available for the current site.
     *
     * @param siteId The site ID. If not defined, current site.
     * @returns Promise resolved with boolean: whether it's available.
     */
    async isAvailable(siteId?: string): Promise<boolean> {
        try {
            const site = await CoreSites.getSite(siteId);

            // First check if it's disabled.
            if (this.isDisabledInSite(site)) {
                return false;
            }

            // Use a WS call to check if there's content in the site home.
            const siteHomeId = site.getSiteHomeId();
            const preSets: CoreSiteWSPreSets = { emergencyCache: false };

            try {
                const sections = await CoreCourse.getSections(siteHomeId, false, true, preSets, site.id);

                if (!sections || !sections.length) {
                    throw Error('No sections found');
                }

                const hasContent = sections.some((section) => section.summary || section.contents.length);
                const hasCourseBlocks = await CoreBlockHelper.hasCourseBlocks(siteHomeId);

                if (hasContent || hasCourseBlocks) {
                    // There's a section with content.
                    return true;
                }
            } catch {
                // Ignore errors.
            }

            const config = site.getStoredConfig();
            if (config && config.frontpageloggedin) {
                const items = await this.getFrontPageItems(config.frontpageloggedin);

                // There are items to show.
                return items.length > 0;
            }
        } catch {
            // Ignore errors.
        }

        return false;
    }

    /**
     * Check if Site Home is disabled in a certain site.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @returns Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    async isDisabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return this.isDisabledInSite(site);
    }

    /**
     * Check if Site Home is disabled in a certain site.
     *
     * @param site Site. If not defined, use current site.
     * @returns Whether it's disabled.
     */
    isDisabledInSite(site: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return site.isFeatureDisabled('CoreMainMenuDelegate_CoreSiteHome');
    }

    /**
     * Get the nams of the valid frontpage items.
     *
     * @param frontpageItemIds CSV string with indexes of site home components.
     * @returns Valid names for each item.
     */
    async getFrontPageItems(frontpageItemIds?: string): Promise<string[]> {
        if (!frontpageItemIds) {
            return [];
        }

        const items = frontpageItemIds.split(',');

        const filteredItems: string[] = [];

        for (const item of items) {
            let itemNumber = parseInt(item, 10);

            let add = false;
            switch (itemNumber) {
                case FrontPageItemNames['NEWS_ITEMS']:
                    // Get number of news items to show.
                    add = !!CoreSites.getCurrentSite()?.getStoredConfig('newsitems');
                    break;
                case FrontPageItemNames['COMBO_LIST']:
                    itemNumber = FrontPageItemNames['LIST_OF_CATEGORIES']; // Do not break here.
                case FrontPageItemNames['LIST_OF_CATEGORIES']:
                case FrontPageItemNames['LIST_OF_COURSE']:
                case FrontPageItemNames['ENROLLED_COURSES']:
                    add = true;
                    break;
                case FrontPageItemNames['COURSE_SEARCH_BOX']:
                    add = !CoreCourses.isSearchCoursesDisabledInSite();
                    break;
                default:
                    break;
            }

            // Do not add an item twice.
            if (add && filteredItems.indexOf(FrontPageItemNames[itemNumber]) < 0) {
                filteredItems.push(FrontPageItemNames[itemNumber]);
            }
        }

        return filteredItems;
    }

}

export const CoreSiteHome = makeSingleton(CoreSiteHomeProvider);
