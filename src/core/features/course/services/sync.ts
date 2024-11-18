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
import { CoreNetwork } from '@services/network';
import { CoreWSError } from '@classes/errors/wserror';
import { CoreErrorHelper } from '@services/error-helper';
import { CoreCourseOffline } from './course-offline';
import { CoreCourse } from './course';
import { CoreCourseLogHelper } from './log-helper';
import { CoreWSExternalWarning } from '@services/ws';
import { CoreCourseManualCompletionDBRecord } from './database/course';
import { CoreNetworkError } from '@classes/errors/network-error';
import { makeSingleton, Translate } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { CoreCourses } from '@features/courses/services/courses';
import { CORE_COURSE_AUTO_SYNCED } from '../constants';
import { CorePromiseUtils } from '@singletons/promise-utils';

/**
 * Service to sync course offline data. This only syncs the offline data of the course itself, not the offline data of
 * the activities in the course.
 */
@Injectable({ providedIn: 'root' })
export class CoreCourseSyncProvider extends CoreSyncBaseProvider<CoreCourseSyncResult> {

    constructor() {
        super('CoreCourseSyncProvider');
    }

    /**
     * Try to synchronize all the courses in a certain site or in all sites.
     *
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @param force Wether the execution is forced (manual sync).
     * @returns Promise resolved if sync is successful, rejected if sync fails.
     */
    syncAllCourses(siteId?: string, force?: boolean): Promise<void> {
        return this.syncOnSites('courses', (siteId) => this.syncAllCoursesFunc(!!force, siteId), siteId);
    }

    /**
     * Sync all courses on a site.
     *
     * @param force Wether the execution is forced (manual sync).
     * @param siteId Site ID to sync.
     * @returns Promise resolved if sync is successful, rejected if sync fails.
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
     * @returns Promise resolved if sync is successful, rejected if sync fails.
     */
    protected async syncCoursesCompletion(siteId: string, force: boolean): Promise<void> {
        const completions = await CoreCourseOffline.getAllManualCompletions(siteId);

        const courseNames: Record<number, string | undefined> = {};

        // Sync all courses.
        await Promise.all(completions.map(async (completion) => {
            if (courseNames[completion.courseid] === undefined) {
                const course = await CorePromiseUtils.ignoreErrors(CoreCourses.getUserCourse(completion.courseid, true, siteId));

                courseNames[completion.courseid] = course?.displayname || course?.fullname;
            }

            const result = await (force ? this.syncCourse(completion.courseid, courseNames[completion.courseid], siteId) :
                this.syncCourseIfNeeded(completion.courseid, courseNames[completion.courseid], siteId));

            if (!result || !result.updated) {
                return;
            }

            // Sync successful, send event.
            CoreEvents.trigger(CORE_COURSE_AUTO_SYNCED, {
                courseId: completion.courseid,
                warnings: result.warnings,
            }, siteId);
        }));
    }

    /**
     * Sync a course if it's needed.
     *
     * @param courseId Course ID to be synced.
     * @param courseName Course Name to be synced.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the course is synced or it doesn't need to be synced.
     */
    syncCourseIfNeeded(courseId: number, courseName?: string, siteId?: string): Promise<CoreCourseSyncResult> {
        // Usually we call isSyncNeeded to check if a certain time has passed.
        // However, since we barely send data for now just sync the course.
        return this.syncCourse(courseId, courseName, siteId);
    }

    /**
     * Synchronize a course.
     *
     * @param courseId Course ID to be synced.
     * @param courseName Course Name to be synced.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if sync is successful, rejected otherwise.
     */
    async syncCourse(courseId: number, courseName?: string, siteId?: string): Promise<CoreCourseSyncResult> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const currentSyncPromise = this.getOngoingSync(courseId, siteId);
        if (currentSyncPromise) {
            // There's already a sync ongoing for this discussion, return the promise.
            return currentSyncPromise;
        }

        this.logger.debug(`Try to sync course '${courseId}'`);

        return this.addOngoingSync(courseId, this.syncCourseCompletion(courseId, courseName, siteId), siteId);
    }

    /**
     * Sync course offline completion.
     *
     * @param courseId Course ID to be synced.
     * @param courseName Course Name to be synced.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if sync is successful, rejected otherwise.
     */
    protected async syncCourseCompletion(courseId: number, courseName?: string, siteId?: string): Promise<CoreCourseSyncResult> {
        const result: CoreCourseSyncResult = {
            warnings: [],
            updated: false,
        };

        // Get offline responses to be sent.
        const completions = await CorePromiseUtils.ignoreErrors(
            CoreCourseOffline.getCourseManualCompletions(courseId, siteId),
            <CoreCourseManualCompletionDBRecord[]> [],
        );

        if (!completions || !completions.length) {
            // Nothing to sync, set sync time.
            await this.setSyncTime(courseId, siteId);

            // All done, return the data.
            return result;
        }

        if (!CoreNetwork.isOnline()) {
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
                    result.warnings.push({
                        warningcode: 'apperror',
                        message: Translate.instant('core.course.warningofflinemanualcompletiondeleted', {
                            name: courseName || courseId,
                            error: Translate.instant('core.course.warningmanualcompletionmodified'),
                        }),
                    });
                }

                return;
            }

            try {
                await CoreCourse.markCompletedManuallyOnline(entry.cmid, !!entry.completed, siteId);

                result.updated = true;

                await CoreCourseOffline.deleteManualCompletion(entry.cmid, siteId);
            } catch (error) {
                if (!CoreWSError.isWebServiceError(error)) {
                    // Couldn't connect to server, reject.
                    throw error;
                }

                // The WebService has thrown an error, this means that the completion cannot be submitted. Delete it.
                result.updated = true;

                await CoreCourseOffline.deleteManualCompletion(entry.cmid, siteId);

                // Completion deleted, add a warning.
                result.warnings.push({
                    warningcode: 'apperror',
                    message: Translate.instant('core.course.warningofflinemanualcompletiondeleted', {
                        name: courseName || courseId,
                        error: CoreErrorHelper.getErrorMessageFromError(error),
                    }),
                });
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
 * Data passed to CORE_COURSE_AUTO_SYNCED event.
 */
export type CoreCourseAutoSyncData = {
    courseId: number;
    warnings: CoreWSExternalWarning[];
};

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [CORE_COURSE_AUTO_SYNCED]: CoreCourseAutoSyncData;
    }

}
