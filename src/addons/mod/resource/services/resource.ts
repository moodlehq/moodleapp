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
import { CoreCourse } from '@features/course/services/course';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreFilepool } from '@services/filepool';
import { CoreSites, CoreSitesCommonWSOptions } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CoreWSExternalFile, CoreWSExternalWarning } from '@services/ws';
import { makeSingleton } from '@singletons';

const ROOT_CACHE_KEY = 'mmaModResource:';

/**
 * Service that provides some features for resources.
 */
@Injectable({ providedIn: 'root' })
export class AddonModResourceProvider {

    static readonly COMPONENT = 'mmaModResource';

    /**
     * Get cache key for resource data WS calls.
     *
     * @param courseId Course ID.
     * @return Cache key.
     */
    protected getResourceCacheKey(courseId: number): string {
        return ROOT_CACHE_KEY + 'resource:' + courseId;
    }

    /**
     * Get a resource data.
     *
     * @param courseId Course ID.
     * @param key Name of the property to check.
     * @param value Value to search.
     * @param options Other options.
     * @return Promise resolved when the resource is retrieved.
     */
    protected async getResourceDataByKey(
        courseId: number,
        key: string,
        value: number,
        options: CoreSitesCommonWSOptions = {},
    ): Promise<AddonModResourceResource> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModResourceGetResourcesByCoursesWSParams = {
            courseids: [courseId],
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getResourceCacheKey(courseId),
            updateFrequency: CoreSite.FREQUENCY_RARELY,
            component: AddonModResourceProvider.COMPONENT,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy),
        };

        const response = await site.read<AddonModResourceGetResourcesByCoursesWSResponse>(
            'mod_resource_get_resources_by_courses',
            params,
            preSets,
        );

        const currentResource = response.resources.find((resource) => resource[key] == value);
        if (currentResource) {
            return currentResource;
        }

        throw new CoreError('Resource not found');
    }

    /**
     * Get a resource by course module ID.
     *
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param options Other options.
     * @return Promise resolved when the resource is retrieved.
     */
    getResourceData(courseId: number, cmId: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModResourceResource> {
        return this.getResourceDataByKey(courseId, 'coursemodule', cmId, options);
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param moduleId The module ID.
     * @param courseId Course ID of the module.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    async invalidateContent(moduleId: number, courseId: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const promises: Promise<void>[] = [];

        promises.push(this.invalidateResourceData(courseId, siteId));
        promises.push(CoreFilepool.invalidateFilesByComponent(siteId, AddonModResourceProvider.COMPONENT, moduleId));
        promises.push(CoreCourse.invalidateModule(moduleId, siteId, 'resource'));

        await CoreUtils.allPromises(promises);
    }

    /**
     * Invalidates resource data.
     *
     * @param courseid Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    async invalidateResourceData(courseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getResourceCacheKey(courseId));
    }

    /**
     * Returns whether or not getResource WS available or not.
     *
     * @return If WS is abalaible.
     * @since 3.3
     */
    isGetResourceWSAvailable(): boolean {
        return CoreSites.wsAvailableInCurrentSite('mod_resource_get_resources_by_courses');
    }

    /**
     * Return whether or not the plugin is enabled.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    async isPluginEnabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return site.canDownloadFiles();
    }

    /**
     * Report the resource as being viewed.
     *
     * @param id Module ID.
     * @param name Name of the resource.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the WS call is successful.
     */
    async logView(id: number, name?: string, siteId?: string): Promise<void> {
        const params: AddonModResourceViewResourceWSParams = {
            resourceid: id,
        };

        await CoreCourseLogHelper.logSingle(
            'mod_resource_view_resource',
            params,
            AddonModResourceProvider.COMPONENT,
            id,
            name,
            'resource',
            {},
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
    introformat: number; // Intro format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    introfiles: CoreWSExternalFile[];
    contentfiles: CoreWSExternalFile[];
    tobemigrated: number; // Whether this resource was migrated.
    legacyfiles: number; // Legacy files flag.
    legacyfileslast: number; // Legacy files last control flag.
    display: number; // How to display the resource.
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
    showsize?: boolean;
    filedetails?: {
        size: number;
        modifieddate: number;
        uploadeddate: number;
    };
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
