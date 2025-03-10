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
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { makeSingleton } from '@singletons';
import { CoreTextFormat } from '@singletons/text';

const ROOT_CACHE_KEY = 'AddonBlockStarredCourses:';

/**
 * Service that provides some features regarding starred courses.
 */
@Injectable( { providedIn: 'root' })
export class AddonBlockStarredCoursesProvider {

    /**
     * Get cache key for get starred courrses value WS call.
     *
     * @returns Cache key.
     */
    protected getStarredCoursesCacheKey(): string {
        return ROOT_CACHE_KEY + ':starredcourses';
    }

    /**
     * Get starred courrses.
     *
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved when the info is retrieved.
     */
    async getStarredCourses(siteId?: string): Promise<AddonBlockStarredCourse[]> {
        const site = await CoreSites.getSite(siteId);

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getStarredCoursesCacheKey(),
        };

        return site.read<AddonBlockStarredCourse[]>('block_starredcourses_get_starred_courses', undefined, preSets);
    }

    /**
     * Invalidates get starred courrses WS call.
     *
     * @param siteId Site ID to invalidate. If not defined, use current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateStarredCourses(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getStarredCoursesCacheKey());
    }

}
export const AddonBlockStarredCourses = makeSingleton(AddonBlockStarredCoursesProvider);

/**
 * Params of block_starredcourses_get_starred_courses WS.
 */
export type AddonBlockStarredCoursesGetStarredCoursesWSParams = {
    limit?: number; // Limit.
    offset?: number; // Offset.
};

/**
 * Data returned by block_starredcourses_get_starred_courses WS.
 */
export type AddonBlockStarredCourse = {
    id: number; // Id.
    fullname: string; // Fullname.
    shortname: string; // Shortname.
    idnumber: string; // Idnumber.
    summary: string; // Summary.
    summaryformat: CoreTextFormat; // Summary format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    startdate: number; // Startdate.
    enddate: number; // Enddate.
    visible: boolean; // Visible.
    showactivitydates: boolean; // Showactivitydates.
    showcompletionconditions: boolean; // Showcompletionconditions.
    fullnamedisplay: string; // Fullnamedisplay.
    viewurl: string; // Viewurl.
    courseimage: string; // Courseimage.
    progress?: number; // Progress.
    hasprogress: boolean; // Hasprogress.
    isfavourite: boolean; // Isfavourite.
    hidden: boolean; // Hidden.
    timeaccess?: number; // Timeaccess.
    showshortname: boolean; // Showshortname.
    coursecategory: string; // Coursecategory.
};
