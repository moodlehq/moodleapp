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

import { CoreSyncBlockedError } from '@classes/base-sync';
import { CoreNetworkError } from '@classes/errors/network-error';
import { CoreCourseActivitySyncBaseProvider } from '@features/course/classes/activity-sync';
import { CoreCourse } from '@features/course/services/course';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreApp } from '@services/app';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreSync } from '@services/sync';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreUrlUtils } from '@services/utils/url';
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton, Translate } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { AddonModLessonRetakeFinishedInSyncDBRecord, RETAKES_FINISHED_SYNC_TABLE_NAME } from './database/lesson';
import { AddonModLessonGetPasswordResult, AddonModLessonPrefetchHandler } from './handlers/prefetch';
import { AddonModLesson, AddonModLessonLessonWSData, AddonModLessonProvider } from './lesson';
import { AddonModLessonOffline, AddonModLessonPageAttemptRecord } from './lesson-offline';

/**
 * Service to sync lesson.
 */
@Injectable({ providedIn: 'root' })
export class AddonModLessonSyncProvider extends CoreCourseActivitySyncBaseProvider<AddonModLessonSyncResult> {

    static readonly AUTO_SYNCED = 'addon_mod_lesson_autom_synced';

    protected componentTranslatableString = 'lesson';

    constructor() {
        super('AddonModLessonSyncProvider');
    }

    /**
     * Unmark a retake as finished in a synchronization.
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async deleteRetakeFinishedInSync(lessonId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        // Ignore errors, maybe there is none.
        await CoreUtils.ignoreErrors(site.getDb().deleteRecords(RETAKES_FINISHED_SYNC_TABLE_NAME, { lessonid: lessonId }));
    }

    /**
     * Get a retake finished in a synchronization for a certain lesson (if any).
     *
     * @param lessonId Lesson ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the retake entry (undefined if no retake).
     */
    async getRetakeFinishedInSync(
        lessonId: number,
        siteId?: string,
    ): Promise<AddonModLessonRetakeFinishedInSyncDBRecord | undefined> {
        const site = await CoreSites.getSite(siteId);

        return CoreUtils.ignoreErrors(site.getDb().getRecord(RETAKES_FINISHED_SYNC_TABLE_NAME, { lessonid: lessonId }));
    }

    /**
     * Check if a lesson has data to synchronize.
     *
     * @param lessonId Lesson ID.
     * @param retake Retake number.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with boolean: whether it has data to sync.
     */
    async hasDataToSync(lessonId: number, retake: number, siteId?: string): Promise<boolean> {

        const [hasAttempts, hasFinished] = await Promise.all([
            CoreUtils.ignoreErrors(AddonModLessonOffline.hasRetakeAttempts(lessonId, retake, siteId)),
            CoreUtils.ignoreErrors(AddonModLessonOffline.hasFinishedRetake(lessonId, siteId)),
        ]);

        return !!(hasAttempts || hasFinished);
    }

    /**
     * Mark a retake as finished in a synchronization.
     *
     * @param lessonId Lesson ID.
     * @param retake The retake number.
     * @param pageId The page ID to start reviewing from.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async setRetakeFinishedInSync(lessonId: number, retake: number, pageId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.getDb().insertRecord(RETAKES_FINISHED_SYNC_TABLE_NAME, <AddonModLessonRetakeFinishedInSyncDBRecord> {
            lessonid: lessonId,
            retake: Number(retake),
            pageid: Number(pageId),
            timefinished: CoreTimeUtils.timestamp(),
        });
    }

    /**
     * Try to synchronize all the lessons in a certain site or in all sites.
     *
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @param force Wether to force sync not depending on last execution.
     * @return Promise resolved if sync is successful, rejected if sync fails.
     */
    syncAllLessons(siteId?: string, force = false): Promise<void> {
        return this.syncOnSites('all lessons', this.syncAllLessonsFunc.bind(this, !!force), siteId);
    }

    /**
     * Sync all lessons on a site.
     *
     * @param force Wether to force sync not depending on last execution.
     * @param siteId Site ID to sync.
     * @param Promise resolved if sync is successful, rejected if sync fails.
     */
    protected async syncAllLessonsFunc(force: boolean, siteId: string): Promise<void> {
        // Get all the lessons that have something to be synchronized.
        const lessons = await AddonModLessonOffline.getAllLessonsWithData(siteId);

        // Sync all lessons that need it.
        await Promise.all(lessons.map(async (lesson) => {
            const result = force ?
                await this.syncLesson(lesson.id, false, false, siteId) :
                await this.syncLessonIfNeeded(lesson.id, false, siteId);

            if (result?.updated) {
                // Sync successful, send event.
                CoreEvents.trigger(AddonModLessonSyncProvider.AUTO_SYNCED, {
                    lessonId: lesson.id,
                    warnings: result.warnings,
                }, siteId);
            }
        }));
    }

    /**
     * Sync a lesson only if a certain time has passed since the last time.
     *
     * @param lessonId Lesson ID.
     * @param askPreflight Whether we should ask for password if needed.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the lesson is synced or if it doesn't need to be synced.
     */
    async syncLessonIfNeeded(
        lessonId: number,
        askPassword = false,
        siteId?: string,
    ): Promise<AddonModLessonSyncResult | undefined> {
        const needed = await this.isSyncNeeded(lessonId, siteId);

        if (needed) {
            return this.syncLesson(lessonId, askPassword, false, siteId);
        }
    }

    /**
     * Try to synchronize a lesson.
     *
     * @param lessonId Lesson ID.
     * @param askPassword True if we should ask for password if needed, false otherwise.
     * @param ignoreBlock True to ignore the sync block setting.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved in success.
     */
    async syncLesson(
        lessonId: number,
        askPassword = false,
        ignoreBlock = false,
        siteId?: string,
    ): Promise<AddonModLessonSyncResult> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        let syncPromise = this.getOngoingSync(lessonId, siteId);
        if (syncPromise) {
            // There's already a sync ongoing for this lesson, return the promise.
            return syncPromise;
        }

        // Verify that lesson isn't blocked.
        if (!ignoreBlock && CoreSync.isBlocked(AddonModLessonProvider.COMPONENT, lessonId, siteId)) {
            this.logger.debug('Cannot sync lesson ' + lessonId + ' because it is blocked.');

            throw new CoreSyncBlockedError(Translate.instant('core.errorsyncblocked', { $a: this.componentTranslate }));
        }

        this.logger.debug('Try to sync lesson ' + lessonId + ' in site ' + siteId);

        syncPromise = this.performSyncLesson(lessonId, askPassword, ignoreBlock, siteId);

        return this.addOngoingSync(lessonId, syncPromise, siteId);
    }

    /**
     * Try to synchronize a lesson.
     *
     * @param lessonId Lesson ID.
     * @param askPassword True if we should ask for password if needed, false otherwise.
     * @param ignoreBlock True to ignore the sync block setting.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved in success.
     */
    protected async performSyncLesson(
        lessonId: number,
        askPassword = false,
        ignoreBlock = false,
        siteId?: string,
    ): Promise<AddonModLessonSyncResult> {
        // Sync offline logs.
        await CoreUtils.ignoreErrors(
            CoreCourseLogHelper.syncActivity(AddonModLessonProvider.COMPONENT, lessonId, siteId),
        );

        const result: AddonModLessonSyncResult = {
            warnings: [],
            updated: false,
        };

        // Try to synchronize the page attempts first.
        const passwordData = await this.syncAttempts(lessonId, result, askPassword, siteId);

        // Now sync the retake.
        await this.syncRetake(lessonId, result, passwordData, askPassword, ignoreBlock, siteId);

        if (result.updated && result.courseId) {
            try {
                // Data has been sent to server, update data.
                const module = await CoreCourse.getModuleBasicInfoByInstance(lessonId, 'lesson', siteId);
                await this.prefetchAfterUpdate(AddonModLessonPrefetchHandler.instance, module, result.courseId, undefined, siteId);
            } catch {
                // Ignore errors.
            }
        }

        // Sync finished, set sync time.
        await CoreUtils.ignoreErrors(this.setSyncTime(lessonId, siteId));

        // All done, return the result.
        return result;
    }

    /**
     * Sync all page attempts.
     *
     * @param lessonId Lesson ID.
     * @param result Sync result where to store the result.
     * @param askPassword True if we should ask for password if needed, false otherwise.
     * @param siteId Site ID. If not defined, current site.
     */
    protected async syncAttempts(
        lessonId: number,
        result: AddonModLessonSyncResult,
        askPassword = false,
        siteId?: string,
    ): Promise<AddonModLessonGetPasswordResult | undefined> {
        let attempts = await AddonModLessonOffline.getLessonAttempts(lessonId, siteId);

        if (!attempts.length) {
            return;
        } else if (!CoreApp.isOnline()) {
            // Cannot sync in offline.
            throw new CoreNetworkError();
        }

        result.courseId = attempts[0].courseid;
        const attemptsLength = attempts.length;

        // Get the info, access info and the lesson password if needed.
        const lesson = await AddonModLesson.getLessonById(result.courseId, lessonId, { siteId });

        const passwordData = await AddonModLessonPrefetchHandler.getLessonPassword(lessonId, {
            readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
            askPassword,
            siteId,
        });

        const promises: Promise<void>[] = [];
        passwordData.lesson = passwordData.lesson || lesson;

        // Filter the attempts, get only the ones that belong to the current retake.
        attempts = attempts.filter((attempt) => {
            if (attempt.retake == passwordData.accessInfo.attemptscount) {
                return true;
            }

            // Attempt doesn't belong to current retake, delete.
            promises.push(CoreUtils.ignoreErrors(AddonModLessonOffline.deleteAttempt(
                lesson.id,
                attempt.retake,
                attempt.pageid,
                attempt.timemodified,
                siteId,
            )));

            return false;
        });

        if (attempts.length != attemptsLength) {
            // Some attempts won't be sent, add a warning.
            this.addOfflineDataDeletedWarning(
                result.warnings,
                lesson.name,
                Translate.instant('addon.mod_lesson.warningretakefinished'),
            );

        }

        await Promise.all(promises);

        if (!attempts.length) {
            return passwordData;
        }

        // Send the attempts in the same order they were answered.
        attempts.sort((a, b) => a.timemodified - b.timemodified);

        const promisesData = attempts.map((attempt) => ({
            function: this.sendAttempt.bind(this, lesson, passwordData.password, attempt, result, siteId),
            blocking: true,
        }));

        await CoreUtils.executeOrderedPromises(promisesData);

        return passwordData;
    }

    /**
     * Send an attempt to the site and delete it afterwards.
     *
     * @param lesson Lesson.
     * @param password Password (if any).
     * @param attempt Attempt to send.
     * @param result Result where to store the data.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    protected async sendAttempt(
        lesson: AddonModLessonLessonWSData,
        password: string,
        attempt: AddonModLessonPageAttemptRecord,
        result: AddonModLessonSyncResult,
        siteId?: string,
    ): Promise<void> {
        const retake = attempt.retake;
        const pageId = attempt.pageid;
        const timemodified = attempt.timemodified;

        try {
            // Send the page data.
            await AddonModLesson.processPageOnline(lesson.id, attempt.pageid, attempt.data || {}, {
                password,
                siteId,
            });

            result.updated = true;

            await AddonModLessonOffline.deleteAttempt(lesson.id, retake, pageId, timemodified, siteId);
        } catch (error) {
            if (!error || !CoreUtils.isWebServiceError(error)) {
                // Couldn't connect to server.
                throw error;
            }

            // The WebService has thrown an error, this means that the attempt cannot be submitted. Delete it.
            result.updated = true;

            await AddonModLessonOffline.deleteAttempt(lesson.id, retake, pageId, timemodified, siteId);

            // Attempt deleted, add a warning.
            this.addOfflineDataDeletedWarning(result.warnings, lesson.name, error);
        }
    }

    /**
     * Sync retake.
     *
     * @param lessonId Lesson ID.
     * @param result Sync result where to store the result.
     * @param passwordData Password data. If not provided it will be calculated.
     * @param askPassword True if we should ask for password if needed, false otherwise.
     * @param ignoreBlock True to ignore the sync block setting.
     * @param siteId Site ID. If not defined, current site.
     */
    protected async syncRetake(
        lessonId: number,
        result: AddonModLessonSyncResult,
        passwordData?: AddonModLessonGetPasswordResult,
        askPassword = false,
        ignoreBlock = false,
        siteId?: string,
    ): Promise<void> {
        // Attempts sent or there was none. If there is a finished retake, send it.
        const retake = await CoreUtils.ignoreErrors(AddonModLessonOffline.getRetake(lessonId, siteId));

        if (!retake) {
            // No retake to sync.
            return;
        }

        if (!retake.finished) {
            // The retake isn't marked as finished, nothing to send. Delete the retake.
            await AddonModLessonOffline.deleteRetake(lessonId, siteId);

            return;
        } else if (!CoreApp.isOnline()) {
            // Cannot sync in offline.
            throw new CoreNetworkError();
        }

        result.courseId = retake.courseid || result.courseId;

        if (!passwordData?.lesson) {
            // Retrieve the needed data.
            const lesson = await AddonModLesson.getLessonById(result.courseId!, lessonId, { siteId });
            passwordData = await AddonModLessonPrefetchHandler.getLessonPassword(lessonId, {
                readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
                askPassword,
                siteId,
            });

            passwordData.lesson = passwordData.lesson || lesson;
        }

        if (retake.retake != passwordData.accessInfo.attemptscount) {
            // The retake changed, add a warning if it isn't there already.
            if (!result.warnings.length) {
                this.addOfflineDataDeletedWarning(
                    result.warnings,
                    passwordData.lesson.name,
                    Translate.instant('addon.mod_lesson.warningretakefinished'),
                );
            }

            await AddonModLessonOffline.deleteRetake(lessonId, siteId);
        }

        try {
            // All good, finish the retake.
            const response = await AddonModLesson.finishRetakeOnline(lessonId, {
                password: passwordData.password,
                siteId,
            });

            result.updated = true;

            // Mark the retake as finished in a sync if it can be reviewed.
            if (!ignoreBlock && response.data?.reviewlesson) {
                const params = CoreUrlUtils.extractUrlParams(<string> response.data.reviewlesson.value);
                if (params.pageid) {
                    // The retake can be reviewed, mark it as finished. Don't block the user for this.
                    this.setRetakeFinishedInSync(lessonId, retake.retake, Number(params.pageid), siteId);
                }
            }

            await AddonModLessonOffline.deleteRetake(lessonId, siteId);
        } catch (error) {
            if (!error || !CoreUtils.isWebServiceError(error)) {
                // Couldn't connect to server.
                throw error;
            }

            // The WebService has thrown an error, this means that responses cannot be submitted. Delete them.
            result.updated = true;

            await AddonModLessonOffline.deleteRetake(lessonId, siteId);

            // Retake deleted, add a warning.
            this.addOfflineDataDeletedWarning(result.warnings, passwordData.lesson.name, error);
        }
    }

}

export const AddonModLessonSync = makeSingleton(AddonModLessonSyncProvider);

/**
 * Data returned by a lesson sync.
 */
export type AddonModLessonSyncResult = {
    warnings: string[]; // List of warnings.
    updated: boolean; // Whether some data was sent to the server or offline data was updated.
    courseId?: number; // Course the lesson belongs to (if known).
};

/**
 * Data passed to AUTO_SYNCED event.
 */
export type AddonModLessonAutoSyncData = {
    lessonId: number;
    warnings: string[];
};
