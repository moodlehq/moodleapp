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
import { CoreSites, CoreSitesCommonWSOptions } from '@services/sites';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreWSExternalFile, CoreWSExternalWarning } from '@services/ws';
import { makeSingleton } from '@singletons';
import { ADDON_MOD_FOLDER_COMPONENT_LEGACY } from '../constants';
import { CoreCacheUpdateFrequency } from '@/core/constants';
import { CoreTextFormat } from '@singletons/text';
import { CoreCourseModuleHelper } from '@features/course/services/course-module-helper';

/**
 * Service that provides some features for folder.
 */
@Injectable({ providedIn: 'root' })
export class AddonModFolderProvider {

    protected static readonly ROOT_CACHE_KEY = 'mmaModFolder:';

    /**
     * Get a folder by course module ID.
     *
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param options Other options.
     * @returns Promise resolved when the book is retrieved.
     */
    async getFolder(courseId: number, cmId: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModFolderFolder> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModFolderGetFoldersByCoursesWSParams = {
            courseids: [courseId],
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getFolderCacheKey(courseId),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            component: ADDON_MOD_FOLDER_COMPONENT_LEGACY,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy),
        };

        const response =
            await site.read<AddonModFolderGetFoldersByCoursesWSResponse>('mod_folder_get_folders_by_courses', params, preSets);

        return CoreCourseModuleHelper.getActivityByCmId(response.folders, cmId);
    }

    /**
     * Get cache key for folder data WS calls.
     *
     * @param courseId Course ID.
     * @returns Cache key.
     */
    protected getFolderCacheKey(courseId: number): string {
        return AddonModFolderProvider.ROOT_CACHE_KEY + 'folder:' + courseId;
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param moduleId The module ID.
     * @param courseId Course ID of the module.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateContent(moduleId: number, courseId: number, siteId?: string): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(this.invalidateFolderData(courseId, siteId));
        promises.push(CoreCourse.invalidateModule(moduleId, siteId));

        await CorePromiseUtils.allPromises(promises);
    }

    /**
     * Invalidates folder data.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateFolderData(courseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getFolderCacheKey(courseId));
    }

    /**
     * Report a folder as being viewed.
     *
     * @param id Module ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    async logView(id: number, siteId?: string): Promise<void> {
        const params: AddonModFolderViewFolderWSParams = {
            folderid: id,
        };

        await CoreCourseLogHelper.log(
            'mod_folder_view_folder',
            params,
            ADDON_MOD_FOLDER_COMPONENT_LEGACY,
            id,
            siteId,
        );
    }

}
export const AddonModFolder = makeSingleton(AddonModFolderProvider);

/**
 * Folder returned by mod_folder_get_folders_by_courses.
 */
export type AddonModFolderFolder = {
    id: number; // Module id.
    coursemodule: number; // Course module id.
    course: number; // Course id.
    name: string; // Page name.
    intro: string; // Summary.
    introformat?: CoreTextFormat; // Intro format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    introfiles: CoreWSExternalFile[];
    revision: number; // Incremented when after each file changes, to avoid cache.
    timemodified: number; // Last time the folder was modified.
    display: number; // Display type of folder contents on a separate page or inline.
    showexpanded: number; // 1 = expanded, 0 = collapsed for sub-folders.
    showdownloadfolder: number; // Whether to show the download folder button.
    section: number; // Course section id.
    visible: number; // Module visibility.
    groupmode: number; // Group mode.
    groupingid: number; // Grouping id.
};

/**
 * Params of mod_folder_get_folders_by_courses WS.
 */
type AddonModFolderGetFoldersByCoursesWSParams = {
    courseids?: number[]; // Array of course ids.
};

/**
 * Data returned by mod_folder_get_folders_by_courses WS.
 */
type AddonModFolderGetFoldersByCoursesWSResponse = {
    folders: AddonModFolderFolder[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_folder_view_folder WS.
 */
type AddonModFolderViewFolderWSParams = {
    folderid: number; // Folder instance id.
};
