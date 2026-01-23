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
import { CoreComments } from '@features/comments/services/comments';
import { CoreCourseCommonModWSOptions, CoreCourse, CoreCourseAnyModuleData } from '@features/course/services/course';
import { CoreCourses } from '@features/courses/services/courses';
import { CoreFilepool } from '@services/filepool';
import { CoreGroup, CoreGroups } from '@services/groups';
import { CoreSitesCommonWSOptions, CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreTime } from '@singletons/time';
import { CoreObject } from '@singletons/object';
import { CoreWSFile } from '@services/ws';
import { makeSingleton } from '@singletons';
import { AddonModDataEntry, AddonModData, AddonModDataData } from '../data';
import { AddonModDataSync, AddonModDataSyncResult } from '../data-sync';
import { ContextLevel } from '@/core/constants';
import { AddonModDataPrefetchHandlerService } from '@addons/mod/data/services/handlers/prefetch';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { ADDON_MOD_DATA_MODNAME } from '../../constants';

/**
 * Handler to prefetch databases.
 */
@Injectable({ providedIn: 'root' })
export class AddonModDataPrefetchHandlerLazyService extends AddonModDataPrefetchHandlerService {

    /**
     * Retrieves all the entries for all the groups and then returns only unique entries.
     *
     * @param dataId Database Id.
     * @param groups Array of groups in the activity.
     * @param options Other options.
     * @returns All unique entries.
     */
    protected async getAllUniqueEntries(
        dataId: number,
        groups: CoreGroup[],
        options: CoreSitesCommonWSOptions = {},
    ): Promise<AddonModDataEntry[]> {

        const promises = groups.map((group) => AddonModData.fetchAllEntries(dataId, {
            groupId: group.id,
            ...options, // Include all options.
        }));

        const responses = await Promise.all(promises);

        const uniqueEntries: Record<number, AddonModDataEntry> = {};
        responses.forEach((groupEntries) => {
            groupEntries.forEach((entry) => {
                uniqueEntries[entry.id] = entry;
            });
        });

        return CoreObject.toArray(uniqueEntries);
    }

    /**
     * Helper function to get all database info just once.
     *
     * @param module Module to get the files.
     * @param courseId Course ID the module belongs to.
     * @param omitFail True to always return even if fails. Default false.
     * @param options Other options.
     * @returns Promise resolved with the info fetched.
     */
    protected async getDatabaseInfoHelper(
        module: CoreCourseAnyModuleData,
        courseId: number,
        omitFail: boolean,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<{ database: AddonModDataData; groups: CoreGroup[]; entries: AddonModDataEntry[]; files: CoreWSFile[]}> {
        let groups: CoreGroup[] = [];
        let entries: AddonModDataEntry[] = [];
        let files: CoreWSFile[] = [];

        options.cmId = options.cmId || module.id;
        options.siteId = options.siteId || CoreSites.getCurrentSiteId();

        const database = await AddonModData.getDatabase(courseId, module.id, options);

        try {
            files = this.getIntroFilesFromInstance(module, database);

            const groupInfo = await CoreGroups.getActivityGroupInfo(module.id, false, undefined, options.siteId);
            if (!groupInfo.groups || groupInfo.groups.length == 0) {
                groupInfo.groups = [{ id: 0, name: '' }];
            }
            groups = groupInfo.groups || [];

            entries = await this.getAllUniqueEntries(database.id, groups, options);
            files = files.concat(this.getEntriesFiles(entries));

            return {
                database,
                groups,
                entries,
                files,
            };
        } catch (error) {
            if (omitFail) {
                // Any error, return the info we have.
                return {
                    database,
                    groups,
                    entries,
                    files,
                };
            }

            throw error;
        }
    }

    /**
     * Returns the file contained in the entries.
     *
     * @param entries List of entries to get files from.
     * @returns List of files.
     */
    protected getEntriesFiles(entries: AddonModDataEntry[]): CoreWSFile[] {
        let files: CoreWSFile[] = [];

        entries.forEach((entry) => {
            CoreObject.toArray(entry.contents).forEach((content) => {
                files = files.concat(<CoreWSFile[]>content.files);
            });
        });

        return files;
    }

    /**
     * @inheritdoc
     */
    async getFiles(module: CoreCourseAnyModuleData, courseId: number): Promise<CoreWSFile[]> {
        return this.getDatabaseInfoHelper(module, courseId, true).then((info) => info.files);
    }

    /**
     * @inheritdoc
     */
    async getIntroFiles(module: CoreCourseAnyModuleData, courseId: number): Promise<CoreWSFile[]> {
        const data = await CorePromiseUtils.ignoreErrors(AddonModData.getDatabase(courseId, module.id));

        return this.getIntroFilesFromInstance(module, data);
    }

    /**
     * @inheritdoc
     */
    async invalidateContent(moduleId: number, courseId: number): Promise<void> {
        await AddonModData.invalidateContent(moduleId, courseId);
    }

    /**
     * @inheritdoc
     */
    async invalidateModule(module: CoreCourseAnyModuleData, courseId: number): Promise<void> {
        const promises: Promise<void>[] = [];
        promises.push(AddonModData.invalidateDatabaseData(courseId));
        promises.push(AddonModData.invalidateDatabaseAccessInformationData(module.instance));

        await Promise.all(promises);
    }

    /**
     * @inheritdoc
     */
    async isDownloadable(module: CoreCourseAnyModuleData, courseId: number): Promise<boolean> {
        const database = await AddonModData.getDatabase(courseId, module.id, {
            readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE,
        });

        const accessData = await AddonModData.getDatabaseAccessInformation(database.id, { cmId: module.id });
        // Check if database is restricted by time.
        if (!accessData.timeavailable) {
            const time = CoreTime.timestamp();

            // It is restricted, checking times.
            if (database.timeavailablefrom && time < database.timeavailablefrom) {
                return false;
            }
            if (database.timeavailableto && time > database.timeavailableto) {
                return false;
            }
        }

        return true;
    }

    /**
     * @inheritdoc
     */
    prefetch(module: CoreCourseAnyModuleData, courseId: number): Promise<void> {
        return this.prefetchPackage(module, courseId, (siteId) => this.prefetchDatabase(module, courseId, siteId));
    }

    /**
     * Prefetch a database.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param siteId Site ID.
     * @returns Promise resolved when done.
     */
    protected async prefetchDatabase(module: CoreCourseAnyModuleData, courseId: number, siteId: string): Promise<void> {
        const options = {
            cmId: module.id,
            readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
            siteId,
        };

        const info = await this.getDatabaseInfoHelper(module, courseId, false, options);

        // Prefetch the database data.
        const database = info.database;

        const commentsEnabled = CoreComments.areCommentsEnabledInSite();

        const promises: Promise<unknown>[] = [];

        promises.push(AddonModData.getFields(database.id, options));
        promises.push(CoreFilepool.addFilesToQueue(siteId, info.files, this.component, module.id));

        info.groups.forEach((group) => {
            promises.push(AddonModData.getDatabaseAccessInformation(database.id, {
                groupId: group.id,
                ...options, // Include all options.
            }));
        });

        info.entries.forEach((entry) => {
            promises.push(AddonModData.getEntry(database.id, entry.id, options));

            if (commentsEnabled && database.comments) {
                promises.push(CoreComments.getComments(
                    ContextLevel.MODULE,
                    database.coursemodule,
                    'mod_data',
                    entry.id,
                    'database_entry',
                    0,
                    siteId,
                ));
            }
        });

        // Add Basic Info to manage links.
        promises.push(CoreCourse.getModuleBasicInfoByInstance(database.id, ADDON_MOD_DATA_MODNAME, { siteId }));

        // Get course data, needed to determine upload max size if it's configured to be course limit.
        promises.push(CorePromiseUtils.ignoreErrors(CoreCourses.getCourseByField('id', courseId, siteId)));

        await Promise.all(promises);
    }

    /**
     * Sync a module.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async sync(module: CoreCourseAnyModuleData, courseId: number, siteId?: string): Promise<AddonModDataSyncResult> {
        const promises = [
            AddonModDataSync.syncDatabase(module.instance, siteId),
            AddonModDataSync.syncRatings(module.id, true, siteId),
        ];

        const results = await Promise.all(promises);

        return results.reduce((a, b) => ({
            updated: a.updated || b.updated,
            warnings: (a.warnings || []).concat(b.warnings || []),
        }), { updated: false , warnings: [] });
    }

}
export const AddonModDataPrefetchHandler = makeSingleton(AddonModDataPrefetchHandlerLazyService);
