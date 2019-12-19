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
import { CoreSitesProvider } from '@providers/sites';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
import { CoreWSExternalWarning, CoreWSExternalFile } from '@providers/ws';

/**
 * Service that provides some features for labels.
 */
@Injectable()
export class AddonModLabelProvider {
    static COMPONENT = 'mmaModLabel';

    protected ROOT_CACHE_KEY = 'mmaModLabel:';

    constructor(private sitesProvider: CoreSitesProvider, private filepoolProvider: CoreFilepoolProvider,
            private utils: CoreUtilsProvider) {}

    /**
     * Get cache key for label data WS calls.
     *
     * @param courseId Course ID.
     * @return Cache key.
     */
    protected getLabelDataCacheKey(courseId: number): string {
        return this.ROOT_CACHE_KEY + 'label:' + courseId;
    }

    /**
     * Get a label with key=value. If more than one is found, only the first will be returned.
     *
     * @param courseId Course ID.
     * @param key Name of the property to check.
     * @param value Value to search.
     * @param forceCache True to always get the value from cache, false otherwise.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not provided, current site.
     * @return Promise resolved when the label is retrieved.
     */
    protected getLabelByField(courseId: number, key: string, value: any, forceCache?: boolean, ignoreCache?: boolean,
            siteId?: string): Promise<AddonModLabelLabel> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    courseids: [courseId]
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getLabelDataCacheKey(courseId),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

             if (forceCache) {
                 preSets.omitExpires = true;
             } else if (ignoreCache) {
                 preSets.getFromCache = false;
                 preSets.emergencyCache = false;
             }

            return site.read('mod_label_get_labels_by_courses', params, preSets)
                    .then((response: AddonModLabelGetLabelsByCoursesResult): any => {

                if (response && response.labels) {
                    const currentLabel = response.labels.find((label) => label[key] == value);
                    if (currentLabel) {
                        return currentLabel;
                    }
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get a label by course module ID.
     *
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param forceCache True to always get the value from cache, false otherwise.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the label is retrieved.
     */
    getLabel(courseId: number, cmId: number, forceCache?: boolean, ignoreCache?: boolean, siteId?: string)
            : Promise<AddonModLabelLabel> {
        return this.getLabelByField(courseId, 'coursemodule', cmId, forceCache, ignoreCache, siteId);
    }

    /**
     * Get a label by ID.
     *
     * @param courseId Course ID.
     * @param labelId Label ID.
     * @param forceCache True to always get the value from cache, false otherwise.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the label is retrieved.
     */
    getLabelById(courseId: number, labelId: number, forceCache?: boolean, ignoreCache?: boolean, siteId?: string)
            : Promise<AddonModLabelLabel> {
        return this.getLabelByField(courseId, 'id', labelId, forceCache, ignoreCache, siteId);
    }

    /**
     * Invalidate label data.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateLabelData(courseId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(null).then((site) => {
            return site.invalidateWsCacheForKey(this.getLabelDataCacheKey(courseId));
        });
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param moduleId The module ID.
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when data is invalidated.
     */
    invalidateContent(moduleId: number, courseId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const promises = [];

        promises.push(this.invalidateLabelData(courseId, siteId));

        promises.push(this.filepoolProvider.invalidateFilesByComponent(siteId, AddonModLabelProvider.COMPONENT, moduleId, true));

        return this.utils.allPromises(promises);
    }

    /**
     * Check if the site has the WS to get label data.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with boolean: whether it's available.
     * @since 3.3
     */
    isGetLabelAvailable(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.wsAvailable('mod_label_get_labels_by_courses');
        });
    }

    /**
     * Check if the site has the WS to get label data.
     *
     * @param site Site. If not defined, current site.
     * @return Whether it's available.
     * @since 3.3
     */
    isGetLabelAvailableForSite(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.wsAvailable('mod_label_get_labels_by_courses');
    }
}

/**
 * Label returned by mod_label_get_labels_by_courses.
 */
export type AddonModLabelLabel = {
    id: number; // Module id.
    coursemodule: number; // Course module id.
    course: number; // Course id.
    name: string; // Label name.
    intro: string; // Label contents.
    introformat: number; // Intro format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    introfiles: CoreWSExternalFile[];
    timemodified: number; // Last time the label was modified.
    section: number; // Course section id.
    visible: number; // Module visibility.
    groupmode: number; // Group mode.
    groupingid: number; // Grouping id.
};

/**
 * Result of WS mod_label_get_labels_by_courses.
 */
export type AddonModLabelGetLabelsByCoursesResult = {
    labels: AddonModLabelLabel[];
    warnings?: CoreWSExternalWarning[];
};
