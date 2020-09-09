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
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '@providers/app';
import { CoreEventsProvider } from '@providers/events';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSyncProvider } from '@providers/sync';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseLogHelperProvider } from '@core/course/providers/log-helper';
import { CoreGradesHelperProvider } from '@core/grades/providers/helper';
import { CoreSyncBaseProvider, CoreSyncBlockedError } from '@classes/base-sync';
import { AddonModAssignProvider, AddonModAssignAssign, AddonModAssignSubmission } from './assign';
import { AddonModAssignOfflineProvider } from './assign-offline';
import { AddonModAssignSubmissionDelegate } from './submission-delegate';
import { AddonModAssignFeedbackDelegate } from './feedback-delegate';

import { makeSingleton } from '@singletons/core.singletons';

/**
 * Data returned by an assign sync.
 */
export interface AddonModAssignSyncResult {
    /**
     * List of warnings.
     */
    warnings: string[];

    /**
     * Whether data was updated in the site.
     */
    updated: boolean;

    /**
     * Whether some grade couldn't be synced because it was blocked.
     */
    gradesBlocked: number[];
}

/**
 * Service to sync assigns.
 */
@Injectable()
export class AddonModAssignSyncProvider extends CoreSyncBaseProvider {

    static AUTO_SYNCED = 'addon_mod_assign_autom_synced';
    static MANUAL_SYNCED = 'addon_mod_assign_manual_synced';

    protected componentTranslate: string;

    constructor(loggerProvider: CoreLoggerProvider,
            sitesProvider: CoreSitesProvider,
            appProvider: CoreAppProvider,
            syncProvider: CoreSyncProvider,
            textUtils: CoreTextUtilsProvider,
            translate: TranslateService,
            timeUtils: CoreTimeUtilsProvider,
            protected courseProvider: CoreCourseProvider,
            protected eventsProvider: CoreEventsProvider,
            protected assignProvider: AddonModAssignProvider,
            protected assignOfflineProvider: AddonModAssignOfflineProvider,
            protected utils: CoreUtilsProvider,
            protected submissionDelegate: AddonModAssignSubmissionDelegate,
            protected feedbackDelegate: AddonModAssignFeedbackDelegate,
            protected gradesHelper: CoreGradesHelperProvider,
            protected logHelper: CoreCourseLogHelperProvider) {

        super('AddonModAssignSyncProvider', loggerProvider, sitesProvider, appProvider, syncProvider, textUtils, translate,
                timeUtils);

        this.componentTranslate = courseProvider.translateModuleName('assign');
    }

    /**
     * Get the sync ID for a certain user grade.
     *
     * @param assignId Assign ID.
     * @param userId User the grade belongs to.
     * @return Sync ID.
     */
    getGradeSyncId(assignId: number, userId: number): string {
        return 'assignGrade#' + assignId + '#' + userId;
    }

    /**
     * Convenience function to get scale selected option.
     *
     * @param options Possible options.
     * @param selected Selected option to search.
     * @return Index of the selected option.
     */
    protected getSelectedScaleId(options: string, selected: string): number {
        let optionsList = options.split(',');

        optionsList = optionsList.map((value) => {
            return value.trim();
        });

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
     * @return Promise resolved with boolean: whether it has data to sync.
     */
    hasDataToSync(assignId: number, siteId?: string): Promise<boolean> {
        return this.assignOfflineProvider.hasAssignOfflineData(assignId, siteId);
    }

    /**
     * Try to synchronize all the assignments in a certain site or in all sites.
     *
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @param force Wether to force sync not depending on last execution.
     * @return Promise resolved if sync is successful, rejected if sync fails.
     */
    syncAllAssignments(siteId?: string, force?: boolean): Promise<void> {
        return this.syncOnSites('all assignments', this.syncAllAssignmentsFunc.bind(this), [force], siteId);
    }

    /**
     * Sync all assignments on a site.
     *
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @param force Wether to force sync not depending on last execution.
     * @param Promise resolved if sync is successful, rejected if sync fails.
     */
    protected async syncAllAssignmentsFunc(siteId?: string, force?: boolean): Promise<void> {
        // Get all assignments that have offline data.
        const assignIds = await this.assignOfflineProvider.getAllAssigns(siteId);

        // Try to sync all assignments.
        await Promise.all(assignIds.map(async (assignId) => {
            const data = force ? await this.syncAssign(assignId, siteId) : await this.syncAssignIfNeeded(assignId, siteId);

            if (!data || !data.updated) {
                // Not updated.
                return;
            }

            this.eventsProvider.trigger(AddonModAssignSyncProvider.AUTO_SYNCED, {
                assignId: assignId,
                warnings: data.warnings,
                gradesBlocked: data.gradesBlocked,
            }, siteId);
        }));
    }

    /**
     * Sync an assignment only if a certain time has passed since the last time.
     *
     * @param assignId Assign ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the assign is synced or it doesn't need to be synced.
     */
    async syncAssignIfNeeded(assignId: number, siteId?: string): Promise<void | AddonModAssignSyncResult> {
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
     * @return Promise resolved in success.
     */
    async syncAssign(assignId: number, siteId?: string): Promise<AddonModAssignSyncResult> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        if (this.isSyncing(assignId, siteId)) {
            // There's already a sync ongoing for this assign, return the promise.
            return this.getOngoingSync(assignId, siteId);
        }

        // Verify that assign isn't blocked.
        if (this.syncProvider.isBlocked(AddonModAssignProvider.COMPONENT, assignId, siteId)) {
            this.logger.error('Cannot sync assign ' + assignId + ' because it is blocked.');

            throw new CoreSyncBlockedError(this.translate.instant('core.errorsyncblocked', {$a: this.componentTranslate}));
        }

        return this.addOngoingSync(assignId, this.performSyncAssign(assignId, siteId), siteId);
    }

    /**
     * Perform the assign submission.
     *
     * @param assignId Assign ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved in success.
     */
    protected async performSyncAssign(assignId: number, siteId?: string): Promise<AddonModAssignSyncResult> {

        this.logger.error('Try to sync assign ' + assignId + ' in site ' + siteId);

        const result: AddonModAssignSyncResult = {
            warnings: [],
            updated: false,
            gradesBlocked: [],
        };

        // Load offline data and sync offline logs.
        const promisesResults = await Promise.all([
            this.getOfflineSubmissions(assignId, siteId),
            this.getOfflineGrades(assignId, siteId),
            this.logHelper.syncIfNeeded(AddonModAssignProvider.COMPONENT, assignId, siteId),
        ]);

        const submissions = promisesResults[0];
        const grades = promisesResults[1];

        if (!submissions.length && !grades.length) {
            // Nothing to sync.
            await this.utils.ignoreErrors(this.setSyncTime(assignId, siteId));

            return result;
        } else if (!this.appProvider.isOnline()) {
            // Cannot sync in offline.
            throw new Error(this.translate.instant('core.cannotconnect'));
        }

        const courseId = submissions.length > 0 ? submissions[0].courseid : grades[0].courseid;

        const assign = await this.assignProvider.getAssignmentById(courseId, assignId, false, siteId);

        let promises = [];

        promises = promises.concat(submissions.map(async (submission) => {
            await this.syncSubmission(assign, submission, result.warnings, siteId);

            result.updated = true;
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

        await Promise.all(promises);

        if (result.updated) {
            // Data has been sent to server. Now invalidate the WS calls.
            await this.utils.ignoreErrors(this.assignProvider.invalidateContent(assign.cmid, courseId, siteId));
        }

        // Sync finished, set sync time.
        await this.utils.ignoreErrors(this.setSyncTime(assignId, siteId));

        // All done, return the result.
        return result;
    }

    /**
     * Get offline grades to be sent.
     *
     * @param assignId Assign ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise with grades.
     */
    protected async getOfflineGrades(assignId: number, siteId: string): Promise<any[]> {
        try {
            const submissions = await this.assignOfflineProvider.getAssignSubmissionsGrade(assignId, siteId);

            return submissions;
        } catch (error) {
            // No offline data found, return empty array.
            return [];
        }
    }

    /**
     * Get offline submissions to be sent.
     *
     * @param assignId Assign ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise with submissions.
     */
    protected async getOfflineSubmissions(assignId: number, siteId: string): Promise<any[]> {
        try {
            const submissions = await this.assignOfflineProvider.getAssignSubmissions(assignId, siteId);

            return submissions;
        } catch (error) {
            // No offline data found, return empty array.
            return [];
        }
    }

    /**
     * Synchronize a submission.
     *
     * @param assign Assignment.
     * @param offlineData Submission offline data.
     * @param warnings List of warnings.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if success, rejected otherwise.
     */
    protected async syncSubmission(assign: AddonModAssignAssign, offlineData: any, warnings: string[], siteId?: string)
            : Promise<void> {

        const userId = offlineData.userid;
        const pluginData = {};

        const status = await this.assignProvider.getSubmissionStatus(assign.id, userId, undefined, false, true, true, siteId);

        const submission = this.assignProvider.getSubmissionObjectFromAttempt(assign, status.lastattempt);

        if (submission.timemodified != offlineData.onlinetimemodified) {
            // The submission was modified in Moodle, discard the submission.
            this.addOfflineDataDeletedWarning(warnings, this.componentTranslate, assign.name,
                    this.translate.instant('addon.mod_assign.warningsubmissionmodified'));

            return this.deleteSubmissionData(assign, submission, offlineData, siteId);
        }

        try {
            // Prepare plugins data.
            await Promise.all(submission.plugins.map(async (plugin) => {
                await this.submissionDelegate.preparePluginSyncData(assign, submission, plugin, offlineData, pluginData, siteId);
            }));

            // Now save the submission.
            if (Object.keys(pluginData).length > 0) {
                await this.assignProvider.saveSubmissionOnline(assign.id, pluginData, siteId);
            }

            if (assign.submissiondrafts && offlineData.submitted) {
                // The user submitted the assign manually. Submit it for grading.
                await this.assignProvider.submitForGradingOnline(assign.id, offlineData.submissionstatement, siteId);
            }

            // Submission data sent, update cached data. No need to block the user for this.
            this.assignProvider.getSubmissionStatus(assign.id, userId, undefined, false, true, true, siteId);
        } catch (error) {
            if (!error || !this.utils.isWebServiceError(error)) {
                // Local error, reject.
                throw error;
            }

            // A WebService has thrown an error, this means it cannot be submitted. Discard the submission.
            this.addOfflineDataDeletedWarning(warnings, this.componentTranslate, assign.name,
                this.textUtils.getErrorMessageFromError(error));
        }

        // Delete the offline data.
        await this.deleteSubmissionData(assign, submission, offlineData, siteId);
    }

    /**
     * Delete the submission offline data (not grades).
     *
     * @param assign Assign.
     * @param submission Submission.
     * @param offlineData Offline data.
     * @param siteId Site ID.
     * @return Promise resolved when done.
     */
    protected async deleteSubmissionData(assign: AddonModAssignAssign, submission: AddonModAssignSubmission, offlineData: any,
            siteId?: string): Promise<void> {

        // Delete the offline data.
        await this.assignOfflineProvider.deleteSubmission(assign.id, offlineData.userid, siteId);

        // Delete plugins data.
        await Promise.all(submission.plugins.map(async (plugin) => {
            await this.submissionDelegate.deletePluginOfflineData(assign, submission, plugin, offlineData, siteId);
        }));
    }

    /**
     * Synchronize a submission grade.
     *
     * @param assign Assignment.
     * @param offlineData Submission grade offline data.
     * @param warnings List of warnings.
     * @param courseId Course Id.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if success, rejected otherwise.
     */
    protected async syncSubmissionGrade(assign: AddonModAssignAssign, offlineData: any, warnings: string[], courseId: number,
            siteId?: string): Promise<any> {

        const userId = offlineData.userid;
        const syncId = this.getGradeSyncId(assign.id, userId);

        // Check if this grade sync is blocked.
        if (this.syncProvider.isBlocked(AddonModAssignProvider.COMPONENT, syncId, siteId)) {
            this.logger.error(`Cannot sync grade for assign ${assign.id} and user ${userId} because it is blocked.!!!!`);

            throw new CoreSyncBlockedError(this.translate.instant('core.errorsyncblocked',
                    {$a: this.translate.instant('addon.mod_assign.syncblockedusercomponent')}));
        }

        const status = await this.assignProvider.getSubmissionStatus(assign.id, userId, undefined, false, true, true, siteId);

        const timemodified = status.feedback && (status.feedback.gradeddate || status.feedback.grade.timemodified);

        if (timemodified > offlineData.timemodified) {
            // The submission grade was modified in Moodle, discard it.
            this.addOfflineDataDeletedWarning(warnings, this.componentTranslate, assign.name,
                    this.translate.instant('addon.mod_assign.warningsubmissiongrademodified'));

            return this.assignOfflineProvider.deleteSubmissionGrade(assign.id, userId, siteId);
        }

        // If grade has been modified from gradebook, do not use offline.
        const grades = await this.gradesHelper.getGradeModuleItems(courseId, assign.cmid, userId, undefined, siteId, true);

        const gradeInfo = await this.courseProvider.getModuleBasicGradeInfo(assign.cmid, siteId);

        // Override offline grade and outcomes based on the gradebook data.
        grades.forEach((grade) => {
            if (grade.gradedategraded >= offlineData.timemodified) {
                if (!grade.outcomeid && !grade.scaleid) {
                    if (gradeInfo && gradeInfo.scale) {
                        offlineData.grade = this.getSelectedScaleId(gradeInfo.scale, grade.gradeformatted);
                    } else {
                        offlineData.grade = parseFloat(grade.gradeformatted) || null;
                    }
                } else if (grade.outcomeid && this.assignProvider.isOutcomesEditEnabled() && gradeInfo.outcomes) {
                    gradeInfo.outcomes.forEach((outcome, index) => {
                        if (outcome.scale && grade.itemnumber == index) {
                            offlineData.outcomes[grade.itemnumber] = this.getSelectedScaleId(outcome.scale,
                                    outcome.selected);
                        }
                    });
                }
            }
        });

        try {
             // Now submit the grade.
            await this.assignProvider.submitGradingFormOnline(assign.id, userId, offlineData.grade, offlineData.attemptnumber,
                    offlineData.addattempt, offlineData.workflowstate, offlineData.applytoall, offlineData.outcomes,
                    offlineData.plugindata, siteId);

            // Grades sent. Discard grades drafts.
            const promises = [];
            if (status.feedback && status.feedback.plugins) {
                status.feedback.plugins.forEach((plugin) => {
                    promises.push(this.feedbackDelegate.discardPluginFeedbackData(assign.id, userId, plugin, siteId));
                });
            }

            // Update cached data.
            promises.push(this.assignProvider.getSubmissionStatus(assign.id, userId, undefined, false, true, true, siteId));

            await Promise.all(promises);
        } catch (error) {
            if (!error || !this.utils.isWebServiceError(error)) {
                // Local error, reject.
                throw error;
            }

            // A WebService has thrown an error, this means it cannot be submitted. Discard the submission.
            this.addOfflineDataDeletedWarning(warnings, this.componentTranslate, assign.name,
                this.textUtils.getErrorMessageFromError(error));
        }

        // Delete the offline data.
        await this.assignOfflineProvider.deleteSubmissionGrade(assign.id, userId, siteId);
    }
}

export class AddonModAssignSync extends makeSingleton(AddonModAssignSyncProvider) {}
