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
import { CoreCourseSummaryExporterData } from '@features/courses/services/courses';

/**
 * Service that provides some features regarding starred courses.
 */
@Injectable( { providedIn: 'root' })
export class AddonBlockStarredCoursesProvider {

    protected static readonly ROOT_CACHE_KEY = 'AddonBlockStarredCourses:';

    /**
     * Get cache key for get starred courrses value WS call.
     *
     * @returns Cache key.
     */
    protected getStarredCoursesCacheKey(): string {
        return `${AddonBlockStarredCoursesProvider.ROOT_CACHE_KEY}:starredcourses`;
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
export type AddonBlockStarredCourse = CoreCourseSummaryExporterData;
