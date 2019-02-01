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
import { CoreSitesProvider, CoreSiteSchema } from '@providers/sites';

/**
 * Service to handle offline data for courses.
 */
@Injectable()
export class CoreCourseOfflineProvider {

    // Variables for database.
    static MANUAL_COMPLETION_TABLE = 'course_manual_completion';
    protected siteSchema: CoreSiteSchema = {
        name: 'CoreCourseOfflineProvider',
        version: 1,
        tables: [
            {
                name: CoreCourseOfflineProvider.MANUAL_COMPLETION_TABLE,
                columns: [
                    {
                        name: 'cmid',
                        type: 'INTEGER',
                        primaryKey: true
                    },
                    {
                        name: 'completed',
                        type: 'INTEGER'
                    },
                    {
                        name: 'courseid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'coursename',
                        type: 'TEXT'
                    },
                    {
                        name: 'timecompleted',
                        type: 'INTEGER'
                    }
                ]
            }
        ]
    };

    constructor(private sitesProvider: CoreSitesProvider) {
        this.sitesProvider.registerSiteSchema(this.siteSchema);
    }

    /**
     * Delete a manual completion stored.
     *
     * @param {number} cmId The module ID to remove the completion.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when deleted, rejected if failure.
     */
    deleteManualCompletion(cmId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {

            return site.getDb().deleteRecords(CoreCourseOfflineProvider.MANUAL_COMPLETION_TABLE, {cmid: cmId});
        });
    }

    /**
     * Get all offline manual completions for a certain course.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]>} Promise resolved with the list of completions.
     */
    getAllManualCompletions(siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {

            return site.getDb().getRecords(CoreCourseOfflineProvider.MANUAL_COMPLETION_TABLE);
        });
    }

    /**
     * Get all offline manual completions for a certain course.
     *
     * @param {number} courseId Course ID the module belongs to.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]>} Promise resolved with the list of completions.
     */
    getCourseManualCompletions(courseId: number, siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {

            return site.getDb().getRecords(CoreCourseOfflineProvider.MANUAL_COMPLETION_TABLE, {courseid: courseId});
        });
    }

    /**
     * Get the offline manual completion for a certain module.
     *
     * @param {number} cmId The module ID to remove the completion.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved with the completion, rejected if failure or not found.
     */
    getManualCompletion(cmId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {

            return site.getDb().getRecord(CoreCourseOfflineProvider.MANUAL_COMPLETION_TABLE, {cmid: cmId});
        });
    }

    /**
     * Offline version for manually marking a module as completed.
     *
     * @param {number} cmId The module ID to store the completion.
     * @param {number} completed Whether the module is completed or not.
     * @param {number} courseId Course ID the module belongs to.
     * @param {string} [courseName] Course name. Recommended, it is used to display a better warning message.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<{status: boolean, offline: boolean}>} Promise resolved when completion is successfully stored.
     */
    markCompletedManually(cmId: number, completed: number, courseId: number, courseName?: string, siteId?: string)
            : Promise<{status: boolean, offline: boolean}> {

        // Store the offline data.
        return this.sitesProvider.getSite(siteId).then((site) => {
            const entry = {
                cmid: cmId,
                completed: completed,
                courseid: courseId,
                coursename: courseName || '',
                timecompleted: Date.now()
            };

            return site.getDb().insertRecord(CoreCourseOfflineProvider.MANUAL_COMPLETION_TABLE, entry);
        }).then(() => {
            return {
                status: true,
                offline: true
            };
        });
    }
}
