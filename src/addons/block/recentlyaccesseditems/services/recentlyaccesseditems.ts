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
import { CoreDomUtils } from '@services/utils/dom';
import { CoreCourse } from '@features/course/services/course';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { makeSingleton } from '@singletons';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';

const ROOT_CACHE_KEY = 'AddonBlockRecentlyAccessedItems:';

/**
 * Service that provides some features regarding recently accessed items.
 */
@Injectable( { providedIn: 'root' })
export class AddonBlockRecentlyAccessedItemsProvider {

    /**
     * Get cache key for get last accessed items value WS call.
     *
     * @returns Cache key.
     */
    protected getRecentItemsCacheKey(): string {
        return ROOT_CACHE_KEY + ':recentitems';
    }

    /**
     * Get last accessed items.
     *
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved when the info is retrieved.
     */
    async getRecentItems(siteId?: string): Promise<AddonBlockRecentlyAccessedItemsItem[]> {
        const site = await CoreSites.getSite(siteId);

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getRecentItemsCacheKey(),
        };

        let items: AddonBlockRecentlyAccessedItemsItem[] =
            await site.read('block_recentlyaccesseditems_get_recent_items', undefined, preSets);

        const cmIds: number[] = [];

        items = await Promise.all(items.map(async (item) => {
            const modicon = item.icon && CoreDomUtils.getHTMLElementAttribute(item.icon, 'src');

            item.iconUrl = await CoreCourseModuleDelegate.getModuleIconSrc(item.modname, modicon || undefined);
            item.iconTitle = item.icon && CoreDomUtils.getHTMLElementAttribute(item.icon, 'title');
            cmIds.push(item.cmid);

            return item;
        }));

        // Check if the viewed module should be updated for each activity.
        const lastViewedMap = await CoreCourse.getCertainModulesViewed(cmIds, site.getId());

        items.forEach((recentItem) => {
            const timeAccess = recentItem.timeaccess * 1000;
            const lastViewed = lastViewedMap[recentItem.cmid];

            if (lastViewed && lastViewed.timeaccess >= timeAccess) {
                return; // No need to update.
            }

            // Update access.
            CoreCourse.storeModuleViewed(recentItem.courseid, recentItem.cmid, {
                timeaccess: recentItem.timeaccess * 1000,
                sectionId: lastViewed && lastViewed.sectionId,
                siteId: site.getId(),
            });
        });

        return items;
    }

    /**
     * Invalidates get last accessed items WS call.
     *
     * @param siteId Site ID to invalidate. If not defined, use current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateRecentItems(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getRecentItemsCacheKey());
    }

}
export const AddonBlockRecentlyAccessedItems = makeSingleton(AddonBlockRecentlyAccessedItemsProvider);

/**
 * Result of WS block_recentlyaccesseditems_get_recent_items.
 *
 * The most recently accessed activities/resources by the logged user.
 */
export type AddonBlockRecentlyAccessedItemsItem = {
    id: number; // Id.
    courseid: number; // Courseid.
    cmid: number; // Cmid.
    userid: number; // Userid.
    modname: string; // Modname.
    name: string; // Name.
    coursename: string; // Coursename.
    timeaccess: number; // Timeaccess.
    viewurl: string; // Viewurl.
    courseviewurl: string; // Courseviewurl.
    icon: string; // Icon.
    purpose?: string; // Purpose. @since 4.0
} & AddonBlockRecentlyAccessedItemsItemCalculatedData;

/**
 * Calculated data for recently accessed item.
 */
export type AddonBlockRecentlyAccessedItemsItemCalculatedData = {
    iconUrl: string; // Icon URL. Calculated by the app.
    iconTitle?: string | null; // Icon title.
};
