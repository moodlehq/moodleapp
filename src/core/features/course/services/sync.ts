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

import { CoreSyncBaseProvider } from '@classes/base-sync';

import { CoreSites } from '@services/sites';
import { CoreApp } from '@services/app';
import { CoreUtils } from '@services/utils/utils';
import { CoreTextUtils } from '@services/utils/text';
import { CoreCourseOffline } from './course-offline';
import { CoreCourse } from './course';
import { CoreCourseLogHelper } from './log-helper';
import { CoreWSExternalWarning } from '@services/ws';
import { CoreCourseManualCompletionDBRecord } from './database/course';
import { CoreNetworkError } from '@classes/errors/network-error';
import { makeSingleton, Translate } from '@singletons';
import { CoreEvents } from '@singletons/events';

/**
 * Service to sync course offline data. This only syncs the offline data of the course itself, not the offline data of
 * the activities in the course.
 */
@Injectable({ providedIn: 'root' })
export class CoreCourseSyncProvider extends CoreSyncBaseProvider<CoreCourseSyncResult> {

    static readonly AUTO_SYNCED = 'core_course_autom_synced';

    constructor() {
        super('CoreCourseSyncProvider');
    }

    /**
     * Try to synchronize all the courses in a certain site or in all sites.
     *
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @param force Wether the execution is forced (manual sync).
     * @return Promise resolved if sync is successful, rejected if sync fails.
     */
    syncAllCourses(siteId?: string, force?: boolean): Promise<void> {
        return this.syncOnSites('courses', this.syncAllCoursesFunc.bind(this, !!force), siteId);
    }

    /**
     * Sync all courses on a site.
     *
     * @param force Wether the execution is forced (manual sync).
     * @param siteId Site ID to sync.
     * @return Promise resolved if sync is successful, rejected if sync fails.
     */
    protected async syncAllCoursesFunc(force: boolean, siteId: string): Promise<void> {
        await Promise.all([
            CoreCourseLogHelper.syncSite(siteId),
            this.syncCoursesCompletion(siteId, force),
        ]);
    }

    /**
     * Sync courses offline completion.
     *
     * @param siteId Site ID to sync.
     * @param force Wether the execution is forced (manual sync).
     * @return Promise resolved if sync is successful, rejected if sync fails.
     */
    protected async syncCoursesCompletion(siteId: string, force: boolean): Promise<void> {
        const completions = await CoreCourseOffline.getAllManualCompletions(siteId);

        // Sync all courses.
        await Promise.all(completions.map(async (completion) => {
            const result = await (force ? this.syncCourse(completion.courseid, siteId) :
                this.syncCourseIfNeeded(completion.courseid, siteId));

            if (!result || !result.updated) {
                return;
            }

            // Sync successful, send event.
            CoreEvents.trigger(CoreCourseSyncProvider.AUTO_SYNCED, {
                courseId: completion.courseid,
                warnings: result.warnings,
            }, siteId);
        }));
    }

    /**
     * Sync a course if it's needed.
     *
     * @param courseId Course ID to be synced.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the course is synced or it doesn't need to be synced.
     */
    syncCourseIfNeeded(courseId: number, siteId?: string): Promise<CoreCourseSyncResult> {
        // Usually we call isSyncNeeded to check if a certain time has passed.
        // However, since we barely send data for now just sync the course.
        return this.syncCourse(courseId, siteId);
    }

    /**
     * Synchronize a course.
     *
     * @param courseId Course ID to be synced.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if sync is successful, rejected otherwise.
     */
    async syncCourse(courseId: number, siteId?: string): Promise<CoreCourseSyncResult> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        if (this.isSyncing(courseId, siteId)) {
            // There's already a sync ongoing for this discussion, return the promise.
            return this.getOngoingSync(courseId, siteId)!;
        }

        this.logger.debug(`Try to sync course '${courseId}'`);

        return this.addOngoingSync(courseId, this.syncCourseCompletion(courseId, siteId), siteId);
    }

    /**
     * Sync course offline completion.
     *
     * @param courseId Course ID to be synced.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if sync is successful, rejected otherwise.
     */
    protected async syncCourseCompletion(courseId: number, siteId?: string): Promise<CoreCourseSyncResult> {
        const result: CoreCourseSyncResult = {
            warnings: [],
            updated: false,
        };

        // Get offline responses to be sent.
        const completions = await CoreUtils.ignoreErrors(
            CoreCourseOffline.getCourseManualCompletions(courseId, siteId),
            <CoreCourseManualCompletionDBRecord[]> [],
        );

        if (!completions || !completions.length) {
            // Nothing to sync, set sync time.
            await this.setSyncTime(courseId, siteId);

            // All done, return the data.
            return result;
        }

        if (!CoreApp.isOnline()) {
            // Cannot sync in offline.
            throw new CoreNetworkError();
        }

        // Get the current completion status to check if any completion was modified in web.
        // This can be retrieved on core_course_get_contents since 3.6 but this is an easy way to get them.
        const onlineCompletions = await CoreCourse.getActivitiesCompletionStatus(
            courseId,
            siteId,
            undefined,
            false,
            true,
            false,
        );

        // Send all the completions.
        await Promise.all(completions.map(async (entry) => {
            const onlineComp = onlineCompletions[entry.cmid];

            // Check if the completion was modified in online. If so, discard it.
            if (onlineComp && onlineComp.timecompleted * 1000 > entry.timecompleted) {
                await CoreCourseOffline.deleteManualCompletion(entry.cmid, siteId);

                // Completion deleted, add a warning if the completion status doesn't match.
                if (onlineComp.state != entry.completed) {
                    result.warnings.push(Translate.instant('core.course.warningofflinemanualcompletiondeleted', {
                        name: entry.coursename || courseId,
                        error: Translate.instant('core.course.warningmanualcompletionmodified'),
                    }));
                }

                return;
            }

            try {
                await CoreCourse.markCompletedManuallyOnline(entry.cmid, !!entry.completed, siteId);

                result.updated = true;

                await CoreCourseOffline.deleteManualCompletion(entry.cmid, siteId);
            } catch (error) {
                if (!CoreUtils.isWebServiceError(error)) {
                    // Couldn't connect to server, reject.
                    throw error;
                }

                // The WebService has thrown an error, this means that the completion cannot be submitted. Delete it.
                result.updated = true;

                await CoreCourseOffline.deleteManualCompletion(entry.cmid, siteId);

                // Completion deleted, add a warning.
                result.warnings.push(Translate.instant('core.course.warningofflinemanualcompletiondeleted', {
                    name: entry.coursename || courseId,
                    error: CoreTextUtils.getErrorMessageFromError(error),
                }));
            }
        }));

        if (result.updated) {
            try {
                // Update data.
                await CoreCourse.invalidateSections(courseId, siteId);

                const currentSite = CoreSites.getCurrentSite();

                if (currentSite?.isVersionGreaterEqualThan('3.6')) {
                    await CoreCourse.getSections(courseId, false, true, undefined, siteId);
                } else {
                    await CoreCourse.getActivitiesCompletionStatus(courseId, siteId);
                }
            } catch {
                // Ignore errors.
            }
        }

        // Sync finished, set sync time.
        await this.setSyncTime(courseId, siteId);

        // All done, return the data.
        return result;
    }

}

export const CoreCourseSync = makeSingleton(CoreCourseSyncProvider);

/**
 * Result of course sync.
 */
export type CoreCourseSyncResult = {
    updated: boolean;
    warnings: CoreWSExternalWarning[];
};

/**
 * Data passed to AUTO_SYNCED event.
 */
export type CoreCourseAutoSyncData = {
    courseId: number;
    warnings: CoreWSExternalWarning[];
};
