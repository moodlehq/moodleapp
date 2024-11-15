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
import { CoreEvents } from '@singletons/events';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreSyncBlockedError } from '@classes/base-sync';
import {
    AddonModAssignAssign,
    AddonModAssignSubmission,
    AddonModAssign,
    AddonModAssignGetSubmissionStatusWSResponse,
    AddonModAssignSubmissionStatusOptions,
} from './assign';
import { makeSingleton, Translate } from '@singletons';
import { CoreCourse } from '@features/course/services/course';
import { CoreCourseActivitySyncBaseProvider } from '@features/course/classes/activity-sync';
import {
    AddonModAssignOffline,
    AddonModAssignSubmissionsDBRecordFormatted,
    AddonModAssignSubmissionsGradingDBRecordFormatted,
} from './assign-offline';
import { CoreSync, CoreSyncResult } from '@services/sync';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreUtils } from '@services/utils/utils';
import { CoreNetwork } from '@services/network';
import { CoreNetworkError } from '@classes/errors/network-error';
import { CoreGradesFormattedItem, CoreGradesHelper } from '@features/grades/services/grades-helper';
import { AddonModAssignSubmissionDelegate } from './submission-delegate';
import { AddonModAssignFeedbackDelegate } from './feedback-delegate';
import { ADDON_MOD_ASSIGN_AUTO_SYNCED, ADDON_MOD_ASSIGN_COMPONENT, ADDON_MOD_ASSIGN_MANUAL_SYNCED } from '../constants';

/**
 * Service to sync assigns.
 */
@Injectable({ providedIn: 'root' })
export class AddonModAssignSyncProvider extends CoreCourseActivitySyncBaseProvider<AddonModAssignSyncResult> {

    protected componentTranslatableString = 'assign';

    constructor() {
        super('AddonModAssignSyncProvider');
    }

    /**
     * Get the sync ID for a certain user grade.
     *
     * @param assignId Assign ID.
     * @param userId User the grade belongs to.
     * @returns Sync ID.
     */
    getGradeSyncId(assignId: number, userId: number): string {
        return 'assignGrade#' + assignId + '#' + userId;
    }

    /**
     * Convenience function to get scale selected option.
     *
     * @param options Possible options.
     * @param selected Selected option to search.
     * @returns Index of the selected option.
     */
    protected getSelectedScaleId(options: string, selected: string): number {
        let optionsList = options.split(',');

        optionsList = optionsList.map((value) => value.trim());

        optionsList.unshift('');

        const index = options.indexOf(selected) || 0;
        if (index < 0) {
            return 0;
        }

        return index;
    }

    /**
     * Check if an assignment has data to synchronize.
     *
     * @param assignId Assign ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: whether it has data to sync.
     */
    hasDataToSync(assignId: number, siteId?: string): Promise<boolean> {
        return AddonModAssignOffline.hasAssignOfflineData(assignId, siteId);
    }

    /**
     * Try to synchronize all the assignments in a certain site or in all sites.
     *
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @param force Wether to force sync not depending on last execution.
     * @returns Promise resolved if sync is successful, rejected if sync fails.
     */
    syncAllAssignments(siteId?: string, force?: boolean): Promise<void> {
        return this.syncOnSites('all assignments', (siteId) => this.syncAllAssignmentsFunc(!!force, siteId), siteId);
    }

    /**
     * Sync all assignments on a site.
     *
     * @param force Wether to force sync not depending on last execution.
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @returns Promise resolved if sync is successful, rejected if sync fails.
     */
    protected async syncAllAssignmentsFunc(force: boolean, siteId: string): Promise<void> {
        // Get all assignments that have offline data.
        const assignIds = await AddonModAssignOffline.getAllAssigns(siteId);

        // Try to sync all assignments.
        await Promise.all(assignIds.map(async (assignId) => {
            const result = force
                ? await this.syncAssign(assignId, siteId)
                : await this.syncAssignIfNeeded(assignId, siteId);

            if (result?.updated) {
                CoreEvents.trigger(ADDON_MOD_ASSIGN_AUTO_SYNCED, {
                    assignId: assignId,
                    warnings: result.warnings,
                    gradesBlocked: result.gradesBlocked,
                }, siteId);
            }
        }));
    }

    /**
     * Sync an assignment only if a certain time has passed since the last time.
     *
     * @param assignId Assign ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the assign is synced or it doesn't need to be synced.
     */
    async syncAssignIfNeeded(assignId: number, siteId?: string): Promise<AddonModAssignSyncResult | undefined> {
        const needed = await this.isSyncNeeded(assignId, siteId);

        if (needed) {
            return this.syncAssign(assignId, siteId);
        }
    }

    /**
     * Try to synchronize an assign.
     *
     * @param assignId Assign ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved in success.
     */
    async syncAssign(assignId: number, siteId?: string): Promise<AddonModAssignSyncResult> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const currentSyncPromise = this.getOngoingSync(assignId, siteId);
        if (currentSyncPromise) {
            // There's already a sync ongoing for this assign, return the promise.
            return currentSyncPromise;
        }

        // Verify that assign isn't blocked.
        if (CoreSync.isBlocked(ADDON_MOD_ASSIGN_COMPONENT, assignId, siteId)) {
            this.logger.debug('Cannot sync assign ' + assignId + ' because it is blocked.');

            throw new CoreSyncBlockedError(Translate.instant('core.errorsyncblocked', { $a: this.componentTranslate }));
        }

        this.logger.debug('Try to sync assign ' + assignId + ' in site ' + siteId);

        const syncPromise = this.performSyncAssign(assignId, siteId);

        return this.addOngoingSync(assignId, syncPromise, siteId);
    }

    /**
     * Perform the assign submission.
     *
     * @param assignId Assign ID.
     * @param siteId Site ID.
     * @returns Promise resolved in success.
     */
    protected async performSyncAssign(assignId: number, siteId: string): Promise<AddonModAssignSyncResult> {
        // Sync offline logs.
        await CoreUtils.ignoreErrors(
            CoreCourseLogHelper.syncActivity(ADDON_MOD_ASSIGN_COMPONENT, assignId, siteId),
        );

        const result: AddonModAssignSyncResult = {
            warnings: [],
            updated: false,
            gradesBlocked: [],
        };

        // Load offline data and sync offline logs.
        const [submissions, grades] = await Promise.all([
            this.getOfflineSubmissions(assignId, siteId),
            this.getOfflineGrades(assignId, siteId),
        ]);

        if (!submissions.length && !grades.length) {
            // Nothing to sync.
            await CoreUtils.ignoreErrors(this.setSyncTime(assignId, siteId));

            return result;
        }

        if (!CoreNetwork.isOnline()) {
            // Cannot sync in offline.
            throw new CoreNetworkError();
        }

        const courseId = submissions.length > 0 ? submissions[0].courseid : grades[0].courseid;

        const assign = await AddonModAssign.getAssignmentById(courseId, assignId, { siteId });

        let promises: Promise<void>[] = [];

        promises = promises.concat(submissions.map(async (submission) => {
            await this.syncSubmission(assign, submission, result.warnings, siteId);

            result.updated = true;

            return;
        }));

        promises = promises.concat(grades.map(async (grade) => {
            try {
                await this.syncSubmissionGrade(assign, grade, result.warnings, courseId, siteId);

                result.updated = true;
            } catch (error) {
                if (error instanceof CoreSyncBlockedError) {
                    // Grade blocked, but allow finish the sync.
                    result.gradesBlocked.push(grade.userid);
                } else {
                    throw error;
                }
            }
        }));

        await CoreUtils.allPromises(promises);

        if (result.updated) {
            // Data has been sent to server. Now invalidate the WS calls.
            await CoreUtils.ignoreErrors(AddonModAssign.invalidateContent(assign.cmid, courseId, siteId));
        }

        // Sync finished, set sync time.
        await CoreUtils.ignoreErrors(this.setSyncTime(assignId, siteId));

        // All done, return the result.
        return result;
    }

    /**
     * Get offline grades to be sent.
     *
     * @param assignId Assign ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise with grades.
     */
    protected async getOfflineGrades(
        assignId: number,
        siteId: string,
    ): Promise<AddonModAssignSubmissionsGradingDBRecordFormatted[]> {
        // If no offline data found, return empty array.
        return CoreUtils.ignoreErrors(AddonModAssignOffline.getAssignSubmissionsGrade(assignId, siteId), []);
    }

    /**
     * Get offline submissions to be sent.
     *
     * @param assignId Assign ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise with submissions.
     */
    protected async getOfflineSubmissions(
        assignId: number,
        siteId: string,
    ): Promise<AddonModAssignSubmissionsDBRecordFormatted[]> {
        // If no offline data found, return empty array.
        return CoreUtils.ignoreErrors(AddonModAssignOffline.getAssignSubmissions(assignId, siteId), []);
    }

    /**
     * Synchronize a submission.
     *
     * @param assign Assignment.
     * @param offlineData Submission offline data.
     * @param warnings List of warnings.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if success, rejected otherwise.
     */
    protected async syncSubmission(
        assign: AddonModAssignAssign,
        offlineData: AddonModAssignSubmissionsDBRecordFormatted,
        warnings: string[],
        siteId: string,
    ): Promise<void> {

        const userId = offlineData.userid;
        const pluginData = {};
        const options: AddonModAssignSubmissionStatusOptions = {
            userId,
            cmId: assign.cmid,
            readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
            siteId,
        };

        const status = await AddonModAssign.getSubmissionStatus(assign.id, options);

        const submission = AddonModAssign.getSubmissionObjectFromAttempt(assign, status.lastattempt);

        if (submission && submission.timemodified != offlineData.onlinetimemodified) {
            // The submission was modified in Moodle, discard the submission.
            this.addOfflineDataDeletedWarning(
                warnings,
                assign.name,
                Translate.instant('addon.mod_assign.warningsubmissionmodified'),
            );

            return this.deleteSubmissionData(assign, offlineData, submission, siteId);
        }

        try {
            if (Object.keys(offlineData.plugindata).length == 0) {
                await AddonModAssign.removeSubmissionOnline(assign.id, offlineData.userid, siteId);
            } else {
                if (submission?.plugins) {
                    // Prepare plugins data.
                    await Promise.all(submission.plugins.map((plugin) =>
                        AddonModAssignSubmissionDelegate.preparePluginSyncData(
                            assign,
                            submission,
                            plugin,
                            offlineData,
                            pluginData,
                            siteId,
                        )));
                }

                // Now save the submission.
                await AddonModAssign.saveSubmissionOnline(assign.id, pluginData, siteId);

                if (assign.submissiondrafts && offlineData.submitted) {
                    // The user submitted the assign manually. Submit it for grading.
                    await AddonModAssign.submitForGradingOnline(assign.id, !!offlineData.submissionstatement, siteId);
                }
            }

            // Submission data sent, update cached data. No need to block the user for this.
            AddonModAssign.getSubmissionStatus(assign.id, options);
        } catch (error) {
            if (!error || !CoreUtils.isWebServiceError(error)) {
                // Local error, reject.
                throw error;
            }

            // A WebService has thrown an error, this means it cannot be submitted. Discard the submission.
            this.addOfflineDataDeletedWarning(warnings, assign.name, error);
        }

        // Delete the offline data.
        await this.deleteSubmissionData(assign, offlineData, submission, siteId);
    }

    /**
     * Delete the submission offline data (not grades).
     *
     * @param assign Assign.
     * @param offlineData Offline data.
     * @param submission Submission.
     * @param siteId Site ID.
     * @returns Promise resolved when done.
     */
    protected async deleteSubmissionData(
        assign: AddonModAssignAssign,
        offlineData: AddonModAssignSubmissionsDBRecordFormatted,
        submission?: AddonModAssignSubmission,
        siteId?: string,
    ): Promise<void> {

        // Delete the offline data.
        await AddonModAssignOffline.deleteSubmission(assign.id, offlineData.userid, siteId);

        if (submission?.plugins){
            // Delete plugins data.
            await Promise.all(submission.plugins.map((plugin) =>
                AddonModAssignSubmissionDelegate.deletePluginOfflineData(
                    assign,
                    submission,
                    plugin,
                    offlineData,
                    siteId,
                )));
        }
    }

    /**
     * Synchronize a submission grade.
     *
     * @param assign Assignment.
     * @param offlineData Submission grade offline data.
     * @param warnings List of warnings.
     * @param courseId Course Id.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if success, rejected otherwise.
     */
    protected async syncSubmissionGrade(
        assign: AddonModAssignAssign,
        offlineData: AddonModAssignSubmissionsGradingDBRecordFormatted,
        warnings: string[],
        courseId: number,
        siteId: string,
    ): Promise<void> {

        const userId = offlineData.userid;
        const syncId = this.getGradeSyncId(assign.id, userId);
        const options: AddonModAssignSubmissionStatusOptions = {
            userId,
            cmId: assign.cmid,
            readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
            siteId,
        };

        // Check if this grade sync is blocked.
        if (CoreSync.isBlocked(ADDON_MOD_ASSIGN_COMPONENT, syncId, siteId)) {
            this.logger.error(`Cannot sync grade for assign ${assign.id} and user ${userId} because it is blocked.!!!!`);

            throw new CoreSyncBlockedError(Translate.instant(
                'core.errorsyncblocked',
                { $a: Translate.instant('addon.mod_assign.syncblockedusercomponent') },
            ));
        }

        const status = await AddonModAssign.getSubmissionStatus(assign.id, options);

        const timemodified = (status.feedback && (status.feedback.gradeddate || status.feedback.grade?.timemodified)) || 0;

        if (timemodified > offlineData.timemodified) {
            // The submission grade was modified in Moodle, discard it.
            this.addOfflineDataDeletedWarning(
                warnings,
                assign.name,
                Translate.instant('addon.mod_assign.warningsubmissiongrademodified'),
            );

            return AddonModAssignOffline.deleteSubmissionGrade(assign.id, userId, siteId);
        }

        // If grade has been modified from gradebook, do not use offline.
        const grades = await CoreGradesHelper.getGradeModuleItems(courseId, assign.cmid, userId, undefined, siteId, true);

        const gradeInfo = await CoreCourse.getModuleBasicGradeInfo(assign.cmid, siteId);

        // Override offline grade and outcomes based on the gradebook data.
        grades.forEach((grade: CoreGradesFormattedItem) => {
            if ((grade.gradedategraded || 0) >= offlineData.timemodified) {
                if (!grade.outcomeid && !grade.scaleid) {
                    if (gradeInfo && gradeInfo.scale) {
                        offlineData.grade = this.getSelectedScaleId(gradeInfo.scale, grade.grade || '');
                    } else {
                        offlineData.grade = parseFloat(grade.grade || '');
                    }
                } else if (gradeInfo && grade.outcomeid && gradeInfo.outcomes) {
                    gradeInfo.outcomes.forEach((outcome, index) => {
                        if (outcome.scale && grade.itemnumber == index) {
                            offlineData.outcomes[grade.itemnumber] = this.getSelectedScaleId(
                                outcome.scale,
                                grade.grade || '',
                            );
                        }
                    });
                }
            }
        });

        try {
            // Now submit the grade.
            await AddonModAssign.submitGradingFormOnline(
                assign.id,
                userId,
                offlineData.grade,
                offlineData.attemptnumber,
                !!offlineData.addattempt,
                offlineData.workflowstate,
                !!offlineData.applytoall,
                offlineData.outcomes,
                offlineData.plugindata,
                siteId,
            );

            // Grades sent. Discard grades drafts.
            let promises: Promise<void | AddonModAssignGetSubmissionStatusWSResponse>[] = [];
            if (status.feedback && status.feedback.plugins) {
                promises = status.feedback.plugins.map((plugin) =>
                    AddonModAssignFeedbackDelegate.discardPluginFeedbackData(assign.id, userId, plugin, siteId));
            }

            // Update cached data.
            promises.push(AddonModAssign.getSubmissionStatus(assign.id, options));

            await CoreUtils.allPromises(promises);
        } catch (error) {
            if (!error || !CoreUtils.isWebServiceError(error)) {
                // Local error, reject.
                throw error;
            }

            // A WebService has thrown an error, this means it cannot be submitted. Discard the submission.
            this.addOfflineDataDeletedWarning(warnings, assign.name, error);
        }

        // Delete the offline data.
        await AddonModAssignOffline.deleteSubmissionGrade(assign.id, userId, siteId);
    }

}
export const AddonModAssignSync = makeSingleton(AddonModAssignSyncProvider);

/**
 * Data returned by a assign sync.
 */
export type AddonModAssignSyncResult = CoreSyncResult & {
    courseId?: number; // Course the assign belongs to (if known).
    gradesBlocked: number[]; // Whether some grade couldn't be synced because it was blocked. UserId fields of the blocked grade.
};

/**
 * Data passed to ADDON_MOD_ASSIGN_AUTO_SYNCED event.
 */
export type AddonModAssignAutoSyncData = {
    assignId: number;
    warnings: string[];
    gradesBlocked: number[]; // Whether some grade couldn't be synced because it was blocked. UserId fields of the blocked grade.
};

/**
 * Data passed to ADDON_MOD_ASSIGN_MANUAL_SYNCED event.
 */
export type AddonModAssignManualSyncData = AddonModAssignAutoSyncData & {
    context: string;
    submitId?: number;
};

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [ADDON_MOD_ASSIGN_MANUAL_SYNCED]: AddonModAssignManualSyncData;
        [ADDON_MOD_ASSIGN_AUTO_SYNCED]: AddonModAssignAutoSyncData;
    }

}
