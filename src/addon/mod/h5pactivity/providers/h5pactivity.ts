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

import { CoreSites } from '@providers/sites';
import { CoreWSExternalWarning, CoreWSExternalFile } from '@providers/ws';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';

import { makeSingleton, Translate } from '@singletons/core.singletons';

/**
 * Service that provides some features for H5P activity.
 */
@Injectable()
export class AddonModH5PActivityProvider {
    static COMPONENT = 'mmaModH5PActivity';

    protected ROOT_CACHE_KEY = 'mmaModH5PActivity:';

    /**
     * Get cache key for H5P activity data WS calls.
     *
     * @param courseId Course ID.
     * @return Cache key.
     */
    protected getH5PActivityDataCacheKey(courseId: number): string {
        return this.ROOT_CACHE_KEY + 'h5pactivity:' + courseId;
    }

    /**
     * Get an H5P activity with key=value. If more than one is found, only the first will be returned.
     *
     * @param courseId Course ID.
     * @param key Name of the property to check.
     * @param value Value to search.
     * @param moduleUrl Module URL.
     * @param forceCache Whether it should always return cached data.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the activity data.
     */
    protected async getH5PActivityByField(courseId: number, key: string, value: any, forceCache?: boolean, siteId?: string)
            : Promise<AddonModH5PActivityData> {

        const site = await CoreSites.instance.getSite(siteId);
        const params = {
            courseids: [courseId],
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getH5PActivityDataCacheKey(courseId),
            updateFrequency: CoreSite.FREQUENCY_RARELY,
        };

        if (forceCache) {
            preSets.omitExpires = true;
        }

        const response: AddonModH5PActivityGetByCoursesRresult =
                await site.read('mod_h5pactivity_get_h5pactivities_by_courses', params, preSets);

        if (response && response.h5pactivities) {
            const currentActivity = response.h5pactivities.find((h5pActivity) => {
                return h5pActivity[key] == value;
            });

            if (currentActivity) {
                return currentActivity;
            }
        }

        throw Translate.instance.instant('addon.mod_h5pactivity.errorgetactivity');
    }

    /**
     * Get an H5P activity by module ID.
     *
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param forceCache Whether it should always return cached data.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the activity data.
     */
    getH5PActivity(courseId: number, cmId: number, forceCache?: boolean, siteId?: string): Promise<AddonModH5PActivityData> {
        return this.getH5PActivityByField(courseId, 'coursemodule', cmId, forceCache, siteId);
    }

    /**
     * Get an H5P activity by instance ID.
     *
     * @param courseId Course ID.
     * @param id Instance ID.
     * @param forceCache Whether it should always return cached data.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the activity data.
     */
    getH5PActivityById(courseId: number, id: number, forceCache?: boolean, siteId?: string): Promise<AddonModH5PActivityData> {
        return this.getH5PActivityByField(courseId, 'id', id, forceCache, siteId);
    }

    /**
     * Invalidates H5P activity data.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    async invalidateActivityData(courseId: number, siteId?: string): Promise<any> {
        const site = await CoreSites.instance.getSite(siteId);

        return site.invalidateWsCacheForKey(this.getH5PActivityDataCacheKey(courseId));
    }

    /**
     * Delete launcher.
     *
     * @return Promise resolved when the launcher file is deleted.
     */
    async isPluginEnabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.instance.getSite(siteId);

        return site.wsAvailable('mod_h5pactivity_get_h5pactivities_by_courses');
    }
}

export class AddonModH5PActivity extends makeSingleton(AddonModH5PActivityProvider) {}

/**
 * Basic data for an H5P activity, exported by Moodle class h5pactivity_summary_exporter.
 */
export type AddonModH5PActivityData = {
    id: number; // The primary key of the record.
    course: number; // Course id this h5p activity is part of.
    name: string; // The name of the activity module instance.
    timecreated?: number; // Timestamp of when the instance was added to the course.
    timemodified?: number; // Timestamp of when the instance was last modified.
    intro: string; // H5P activity description.
    introformat: number; // Intro format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    grade?: number; // The maximum grade for submission.
    displayoptions: number; // H5P Button display options.
    enabletracking: number; // Enable xAPI tracking.
    grademethod: number; // Which H5P attempt is used for grading.
    contenthash?: string; // Sha1 hash of file content.
    coursemodule: number; // Coursemodule.
    introfiles: CoreWSExternalFile[];
    package: CoreWSExternalFile[];
    deployedfile?: {
        filename?: string; // File name.
        filepath?: string; // File path.
        filesize?: number; // File size.
        fileurl?: string; // Downloadable file url.
        timemodified?: number; // Time modified.
        mimetype?: string; // File mime type.
    };
};

/**
 * Result of WS mod_h5pactivity_get_h5pactivities_by_courses.
 */
export type AddonModH5PActivityGetByCoursesRresult = {
    h5pactivities: AddonModH5PActivityData[];
    warnings?: CoreWSExternalWarning[];
};
