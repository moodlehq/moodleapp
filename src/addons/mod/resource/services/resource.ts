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
import { CoreCourse } from '@features/course/services/course';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreFilepool } from '@services/filepool';
import { CoreSites, CoreSitesCommonWSOptions } from '@services/sites';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreWSExternalFile, CoreWSExternalWarning } from '@services/ws';
import { makeSingleton } from '@singletons';
import { ADDON_MOD_RESOURCE_COMPONENT_LEGACY } from '../constants';
import { CoreCacheUpdateFrequency } from '@/core/constants';
import { CoreTextFormat } from '@singletons/text';
import { ModResourceDisplay } from '@addons/mod/constants';
import { CoreCourseModuleHelper } from '@features/course/services/course-module-helper';

/**
 * Service that provides some features for resources.
 */
@Injectable({ providedIn: 'root' })
export class AddonModResourceProvider {

    protected static readonly ROOT_CACHE_KEY = 'mmaModResource:';

    /**
     * Get cache key for resource data WS calls.
     *
     * @param courseId Course ID.
     * @returns Cache key.
     */
    protected getResourceCacheKey(courseId: number): string {
        return `${AddonModResourceProvider.ROOT_CACHE_KEY}resource:${courseId}`;
    }

    /**
     * Get a resource by course module ID.
     *
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param options Other options.
     * @returns Promise resolved when the resource is retrieved.
     */
    async getResourceData(
        courseId: number,
        cmId: number,
        options: CoreSitesCommonWSOptions = {},
    ): Promise<AddonModResourceResource> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModResourceGetResourcesByCoursesWSParams = {
            courseids: [courseId],
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getResourceCacheKey(courseId),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            component: ADDON_MOD_RESOURCE_COMPONENT_LEGACY,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy),
        };

        const response = await site.read<AddonModResourceGetResourcesByCoursesWSResponse>(
            'mod_resource_get_resources_by_courses',
            params,
            preSets,
        );

        return CoreCourseModuleHelper.getActivityByCmId(response.resources, cmId);
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param moduleId The module ID.
     * @param courseId Course ID of the module.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateContent(moduleId: number, courseId: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const promises: Promise<void>[] = [];

        promises.push(this.invalidateResourceData(courseId, siteId));
        promises.push(CoreFilepool.invalidateFilesByComponent(siteId, ADDON_MOD_RESOURCE_COMPONENT_LEGACY, moduleId));
        promises.push(CoreCourse.invalidateModule(moduleId, siteId, 'resource'));

        await CorePromiseUtils.allPromises(promises);
    }

    /**
     * Invalidates resource data.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateResourceData(courseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getResourceCacheKey(courseId));
    }

    /**
     * Return whether or not the plugin is enabled.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    async isPluginEnabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return site.canDownloadFiles();
    }

    /**
     * Report the resource as being viewed.
     *
     * @param id Module ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    async logView(id: number, siteId?: string): Promise<void> {
        const params: AddonModResourceViewResourceWSParams = {
            resourceid: id,
        };

        await CoreCourseLogHelper.log(
            'mod_resource_view_resource',
            params,
            ADDON_MOD_RESOURCE_COMPONENT_LEGACY,
            id,
            siteId,
        );
    }

}
export const AddonModResource = makeSingleton(AddonModResourceProvider);

/**
 * Params of mod_resource_view_resource WS.
 */
type AddonModResourceViewResourceWSParams = {
    resourceid: number; // Resource instance id.
};

/**
 * Resource returned by mod_resource_get_resources_by_courses.
 */
export type AddonModResourceResource = {
    id: number; // Module id.
    coursemodule: number; // Course module id.
    course: number; // Course id.
    name: string; // Page name.
    intro: string; // Summary.
    introformat: CoreTextFormat; // Intro format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    introfiles: CoreWSExternalFile[];
    contentfiles: CoreWSExternalFile[];
    tobemigrated: number; // Whether this resource was migrated.
    legacyfiles: number; // Legacy files flag.
    legacyfileslast: number; // Legacy files last control flag.
    display: ModResourceDisplay; // How to display the resource.
    displayoptions: string; // Display options (width, height).
    filterfiles: number; // If filters should be applied to the resource content.
    revision: number; // Incremented when after each file changes, to avoid cache.
    timemodified: number; // Last time the resource was modified.
    section: number; // Course section id.
    visible: number; // Module visibility.
    groupmode: number; // Group mode.
    groupingid: number; // Grouping id.
};

export type AddonModResourceCustomData = {
    filedetails?: {
        isref?: boolean; // If file is a reference the 'size' or 'date' attribute can not be cached.
        // If showsize is true.
        size?: number; // Size in bytes.
        // If showtype is true.
        type?: string; // Mimetype description (already translated).
        mimetype?: string; // @since LMS 3.7
        extension?: string; // @since LMS 4.3
        // If showdate is true.
        modifieddate?: number; // Only if file has been modified.
        uploadeddate?: number; // Only if file has NOT been modified.

    };
    showsize?: boolean;
    showtype?: boolean;
    showdate?: boolean;
    printintro?: boolean;
};

/**
 * Params of mod_resource_get_resources_by_courses WS.
 */
type AddonModResourceGetResourcesByCoursesWSParams = {
    courseids?: number[]; // Array of course ids.
};

/**
 * Data returned by mod_resource_get_resources_by_courses WS.
 */
type AddonModResourceGetResourcesByCoursesWSResponse = {
    resources: AddonModResourceResource[];
    warnings?: CoreWSExternalWarning[];
};
