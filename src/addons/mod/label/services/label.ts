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
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CoreFilepool } from '@services/filepool';
import { CoreSites, CoreSitesCommonWSOptions } from '@services/sites';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreWSExternalFile, CoreWSExternalWarning } from '@services/ws';
import { makeSingleton } from '@singletons';
import { ADDON_MOD_LABEL_COMPONENT_LEGACY } from '../constants';
import { CoreCacheUpdateFrequency } from '@/core/constants';
import { CoreTextFormat } from '@singletons/text';
import { CoreCourseModuleHelper } from '@features/course/services/course-module-helper';

/**
 * Service that provides some features for labels.
 */
@Injectable({ providedIn: 'root' })
export class AddonModLabelProvider {

    protected static readonly ROOT_CACHE_KEY = 'mmaModLabel:';

    /**
     * Get cache key for label data WS calls.
     *
     * @param courseId Course ID.
     * @returns Cache key.
     */
    protected getLabelDataCacheKey(courseId: number): string {
        return `${AddonModLabelProvider.ROOT_CACHE_KEY}label:${courseId}`;
    }

    /**
     * Get a label by course module ID.
     *
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param options Other options.
     * @returns Promise resolved when the label is retrieved.
     */
    async getLabel(courseId: number, cmId: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModLabelLabel> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModLabelGetLabelsByCoursesWSParams = {
            courseids: [courseId],
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getLabelDataCacheKey(courseId),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            component: ADDON_MOD_LABEL_COMPONENT_LEGACY,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy),
        };

        const response =
            await site.read<AddonModLabelGetLabelsByCoursesWSResponse>('mod_label_get_labels_by_courses', params, preSets);

        return CoreCourseModuleHelper.getActivityByCmId(response.labels, cmId);
    }

    /**
     * Invalidate label data.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
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
     * @returns Promise resolved when data is invalidated.
     */
    async invalidateContent(moduleId: number, courseId: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const promises: Promise<void>[] = [];

        promises.push(this.invalidateLabelData(courseId, siteId));
        promises.push(CoreFilepool.invalidateFilesByComponent(siteId, ADDON_MOD_LABEL_COMPONENT_LEGACY, moduleId, true));

        await CorePromiseUtils.allPromises(promises);
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
    introformat?: CoreTextFormat; // Intro format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
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
