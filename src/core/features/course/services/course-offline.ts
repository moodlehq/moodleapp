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
import { makeSingleton } from '@singletons';
import { CoreSites } from '@services/sites';
import { CoreCourseManualCompletionDBRecord, MANUAL_COMPLETION_TABLE } from './database/course';
import { CoreStatusWithWarningsWSResponse } from '@services/ws';

/**
 * Service to handle offline data for courses.
 */
@Injectable({ providedIn: 'root' })
export class CoreCourseOfflineProvider {

    /**
     * Delete a manual completion stored.
     *
     * @param cmId The module ID to remove the completion.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async deleteManualCompletion(cmId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.getDb().deleteRecords(MANUAL_COMPLETION_TABLE, { cmid: cmId });
    }

    /**
     * Get all offline manual completions for a certain course.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the list of completions.
     */
    async getAllManualCompletions(siteId?: string): Promise<CoreCourseManualCompletionDBRecord[]> {
        const site = await CoreSites.getSite(siteId);

        return await site.getDb().getRecords(MANUAL_COMPLETION_TABLE);
    }

    /**
     * Get all offline manual completions for a certain course.
     *
     * @param courseId Course ID the module belongs to.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the list of completions.
     */
    async getCourseManualCompletions(courseId: number, siteId?: string): Promise<CoreCourseManualCompletionDBRecord[]> {
        const site = await CoreSites.getSite(siteId);

        return await site.getDb().getRecords(MANUAL_COMPLETION_TABLE, { courseid: courseId });
    }

    /**
     * Get the offline manual completion for a certain module.
     *
     * @param cmId The module ID to remove the completion.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the completion, rejected if failure or not found.
     */
    async getManualCompletion(cmId: number, siteId?: string): Promise<CoreCourseManualCompletionDBRecord> {
        const site = await CoreSites.getSite(siteId);

        return await site.getDb().getRecord(MANUAL_COMPLETION_TABLE, { cmid: cmId });
    }

    /**
     * Offline version for manually marking a module as completed.
     *
     * @param cmId The module ID to store the completion.
     * @param completed Whether the module is completed or not.
     * @param courseId Course ID the module belongs to.
     * @param courseName Course name. Recommended, it is used to display a better warning message.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when completion is successfully stored.
     */
    async markCompletedManually(
        cmId: number,
        completed: boolean,
        courseId: number,
        courseName?: string,
        siteId?: string,
    ): Promise<CoreStatusWithWarningsWSResponse> {

        // Store the offline data.
        const site = await CoreSites.getSite(siteId);
        const entry: CoreCourseManualCompletionDBRecord = {
            cmid: cmId,
            completed: completed ? 1 : 0,
            courseid: courseId,
            coursename: courseName || '',
            timecompleted: Date.now(),
        };
        await site.getDb().insertRecord(MANUAL_COMPLETION_TABLE, entry);

        return ({
            status: true,
            offline: true,
        });
    }

}

export const CoreCourseOffline = makeSingleton(CoreCourseOfflineProvider);
