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
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseLogHelperProvider } from '@core/course/providers/log-helper';
import { CoreSite } from '@classes/site';
import { CoreWSExternalWarning, CoreWSExternalFile } from '@providers/ws';

/**
 * Service that provides some features for folder.
 */
@Injectable()
export class AddonModFolderProvider {
    static COMPONENT = 'mmaModFolder';

    protected ROOT_CACHE_KEY = 'mmaModFolder:';
    protected logger;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private courseProvider: CoreCourseProvider,
            private utils: CoreUtilsProvider, private logHelper: CoreCourseLogHelperProvider) {
        this.logger = logger.getInstance('AddonModFolderProvider');
    }

    /**
     * Get a folder by course module ID.
     *
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the book is retrieved.
     */
    getFolder(courseId: number, cmId: number, siteId?: string): Promise<AddonModFolderFolder> {
        return this.getFolderByKey(courseId, 'coursemodule', cmId, siteId);
    }

    /**
     * Get a folder.
     *
     * @param courseId Course ID.
     * @param key Name of the property to check.
     * @param value Value to search.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the book is retrieved.
     */
    protected getFolderByKey(courseId: number, key: string, value: any, siteId?: string): Promise<AddonModFolderFolder> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    courseids: [courseId]
                },
                preSets = {
                    cacheKey: this.getFolderCacheKey(courseId),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            return site.read('mod_folder_get_folders_by_courses', params, preSets)
                    .then((response: AddonModFolderGetFoldersByCoursesResult): any => {

                if (response && response.folders) {
                    const currentFolder = response.folders.find((folder) => {
                        return folder[key] == value;
                    });
                    if (currentFolder) {
                        return currentFolder;
                    }
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get cache key for folder data WS calls.
     *
     * @param courseId Course ID.
     * @return Cache key.
     */
    protected getFolderCacheKey(courseId: number): string {
        return this.ROOT_CACHE_KEY + 'folder:' + courseId;
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param moduleId The module ID.
     * @param courseId Course ID of the module.
     * @param siteId Site ID. If not defined, current site.
     */
    invalidateContent(moduleId: number, courseId: number, siteId?: string): Promise<any> {
        const promises = [];

        promises.push(this.invalidateFolderData(courseId, siteId));
        promises.push(this.courseProvider.invalidateModule(moduleId, siteId));

        return this.utils.allPromises(promises);
    }

    /**
     * Invalidates folder data.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateFolderData(courseId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getFolderCacheKey(courseId));
        });
    }

    /**
     * Returns whether or not getFolder WS available or not.
     *
     * @return If WS is avalaible.
     * @since 3.3
     */
    isGetFolderWSAvailable(): boolean {
        return this.sitesProvider.wsAvailableInCurrentSite('mod_folder_get_folders_by_courses');
    }

    /**
     * Report a folder as being viewed.
     *
     * @param id Module ID.
     * @param name Name of the folder.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the WS call is successful.
     */
    logView(id: number, name?: string, siteId?: string): Promise<any> {
        const params = {
            folderid: id
        };

        return this.logHelper.logSingle('mod_folder_view_folder', params, AddonModFolderProvider.COMPONENT, id, name, 'folder',
                {}, siteId);
    }
}

/**
 * Folder returned by mod_folder_get_folders_by_courses.
 */
export type AddonModFolderFolder = {
    id: number; // Module id.
    coursemodule: number; // Course module id.
    course: number; // Course id.
    name: string; // Page name.
    intro: string; // Summary.
    introformat: number; // Intro format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
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
 * Result of WS mod_folder_get_folders_by_courses.
 */
export type AddonModFolderGetFoldersByCoursesResult = {
    folders: AddonModFolderFolder[];
    warnings?: CoreWSExternalWarning[];
};
