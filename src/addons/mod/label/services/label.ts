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
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
import { CoreFilepool } from '@services/filepool';
import { CoreSites, CoreSitesCommonWSOptions } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CoreWSExternalFile, CoreWSExternalWarning } from '@services/ws';
import { makeSingleton } from '@singletons';

const ROOT_CACHE_KEY = 'mmaModLabel:';

/**
 * Service that provides some features for labels.
 */
@Injectable({ providedIn: 'root' })
export class AddonModLabelProvider {

    static readonly COMPONENT = 'mmaModLabel';

    /**
     * Get cache key for label data WS calls.
     *
     * @param courseId Course ID.
     * @return Cache key.
     */
    protected getLabelDataCacheKey(courseId: number): string {
        return ROOT_CACHE_KEY + 'label:' + courseId;
    }

    /**
     * Get a label with key=value. If more than one is found, only the first will be returned.
     *
     * @param courseId Course ID.
     * @param key Name of the property to check.
     * @param value Value to search.
     * @param options Other options.
     * @return Promise resolved when the label is retrieved.
     */
    protected async getLabelByField(
        courseId: number,
        key: string,
        value: number,
        options: CoreSitesCommonWSOptions = {},
    ): Promise<AddonModLabelLabel> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModLabelGetLabelsByCoursesWSParams = {
            courseids: [courseId],
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getLabelDataCacheKey(courseId),
            updateFrequency: CoreSite.FREQUENCY_RARELY,
            component: AddonModLabelProvider.COMPONENT,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy),
        };

        const response =
            await site.read<AddonModLabelGetLabelsByCoursesWSResponse>('mod_label_get_labels_by_courses', params, preSets);

        const currentLabel = response.labels.find((label) => label[key] == value);
        if (currentLabel) {
            return currentLabel;
        }

        throw new CoreError('Label not found');
    }

    /**
     * Get a label by course module ID.
     *
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param options Other options.
     * @return Promise resolved when the label is retrieved.
     */
    getLabel(courseId: number, cmId: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModLabelLabel> {
        return this.getLabelByField(courseId, 'coursemodule', cmId, options);
    }

    /**
     * Get a label by ID.
     *
     * @param courseId Course ID.
     * @param labelId Label ID.
     * @param options Other options.
     * @return Promise resolved when the label is retrieved.
     */
    getLabelById(courseId: number, labelId: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModLabelLabel> {
        return this.getLabelByField(courseId, 'id', labelId, options);
    }

    /**
     * Invalidate label data.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    async invalidateLabelData(courseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getLabelDataCacheKey(courseId));
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param moduleId The module ID.
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when data is invalidated.
     */
    async invalidateContent(moduleId: number, courseId: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const promises: Promise<void>[] = [];

        promises.push(this.invalidateLabelData(courseId, siteId));
        promises.push(CoreFilepool.invalidateFilesByComponent(siteId, AddonModLabelProvider.COMPONENT, moduleId, true));

        await CoreUtils.allPromises(promises);
    }

    /**
     * Check if the site has the WS to get label data.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with boolean: whether it's available.
     * @since 3.3
     */
    async isGetLabelAvailable(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return site.wsAvailable('mod_label_get_labels_by_courses');
    }

    /**
     * Check if the site has the WS to get label data.
     *
     * @param site Site. If not defined, current site.
     * @return Whether it's available.
     * @since 3.3
     */
    isGetLabelAvailableForSite(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return !!site?.wsAvailable('mod_label_get_labels_by_courses');
    }

}
export const AddonModLabel = makeSingleton(AddonModLabelProvider);

/**
 * Label returned by mod_label_get_labels_by_courses.
 */
export type AddonModLabelLabel = {
    id: number; // Module id.
    coursemodule: number; // Course module id.
    course: number; // Course id.
    name: string; // Label name.
    intro: string; // Label contents.
    introformat?: number; // Intro format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    introfiles: CoreWSExternalFile[];
    timemodified: number; // Last time the label was modified.
    section: number; // Course section id.
    visible: number; // Module visibility.
    groupmode: number; // Group mode.
    groupingid: number; // Grouping id.
};

/**
 * Params of mod_label_get_labels_by_courses WS.
 */
type AddonModLabelGetLabelsByCoursesWSParams = {
    courseids?: number[]; // Array of course ids.
};

/**
 * Data returned by mod_label_get_labels_by_courses WS.
 */
type AddonModLabelGetLabelsByCoursesWSResponse = {
    labels: AddonModLabelLabel[];
    warnings?: CoreWSExternalWarning[];
};
