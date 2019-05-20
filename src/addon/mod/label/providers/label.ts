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
import { CoreSitesProvider } from '@providers/sites';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';

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
     * @param  {number} courseId Course ID.
     * @return {string} Cache key.
     */
    protected getLabelDataCacheKey(courseId: number): string {
        return this.ROOT_CACHE_KEY + 'label:' + courseId;
    }

    /**
     * Get a label with key=value. If more than one is found, only the first will be returned.
     *
     * @param {number} courseId Course ID.
     * @param {string} key Name of the property to check.
     * @param {any} value Value to search.
     * @param {boolean} [forceCache] True to always get the value from cache, false otherwise.
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param {string} [siteId] Site ID. If not provided, current site.
     * @return {Promise<any>} Promise resolved when the label is retrieved.
     */
    protected getLabelByField(courseId: number, key: string, value: any, forceCache?: boolean, ignoreCache?: boolean,
            siteId?: string): Promise<any> {

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

            return site.read('mod_label_get_labels_by_courses', params, preSets).then((response) => {
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
     * @param {number} courseId Course ID.
     * @param {number} cmId Course module ID.
     * @param {boolean} [forceCache] True to always get the value from cache, false otherwise.
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the label is retrieved.
     */
    getLabel(courseId: number, cmId: number, forceCache?: boolean, ignoreCache?: boolean, siteId?: string): Promise<any> {
        return this.getLabelByField(courseId, 'coursemodule', cmId, forceCache, ignoreCache, siteId);
    }

    /**
     * Get a label by ID.
     *
     * @param {number} courseId Course ID.
     * @param {number} labelId Label ID.
     * @param {boolean} [forceCache] True to always get the value from cache, false otherwise.
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the label is retrieved.
     */
    getLabelById(courseId: number, labelId: number, forceCache?: boolean, ignoreCache?: boolean, siteId?: string): Promise<any> {
        return this.getLabelByField(courseId, 'id', labelId, forceCache, ignoreCache, siteId);
    }

    /**
     * Invalidate label data.
     *
     * @param {number} courseId Course ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateLabelData(courseId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(null).then((site) => {
            return site.invalidateWsCacheForKey(this.getLabelDataCacheKey(courseId));
        });
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param  {number} moduleId The module ID.
     * @param  {number} courseId Course ID.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when data is invalidated.
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
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with boolean: whether it's available.
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
     * @param  {CoreSite} [site] Site. If not defined, current site.
     * @return {boolean} Whether it's available.
     * @since 3.3
     */
    isGetLabelAvailableForSite(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.wsAvailable('mod_label_get_labels_by_courses');
    }
}
