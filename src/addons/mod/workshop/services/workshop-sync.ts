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
import { CoreSyncBaseProvider, CoreSyncBlockedError } from '@classes/base-sync';
import { CoreNetworkError } from '@classes/errors/network-error';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreFileUploaderStoreFilesResult } from '@features/fileuploader/services/fileuploader';
import { CoreNetwork } from '@services/network';
import { CoreFileEntry } from '@services/file-helper';
import { CoreSites } from '@services/sites';
import { CoreSync, CoreSyncResult } from '@services/sync';
import { CoreErrorHelper } from '@services/error-helper';
import { CoreWSError } from '@classes/errors/wserror';
import { Translate, makeSingleton } from '@singletons';
import { CoreEvents } from '@static/events';
import { AddonModWorkshop,
    AddonModWorkshopData,
} from './workshop';
import { AddonModWorkshopHelper } from './workshop-helper';
import { AddonModWorkshopOffline,
    AddonModWorkshopOfflineAssessment,
    AddonModWorkshopOfflineEvaluateAssessment,
    AddonModWorkshopOfflineEvaluateSubmission,
    AddonModWorkshopOfflineSubmission,
} from './workshop-offline';
import {
    ADDON_MOD_WORKSHOP_AUTO_SYNCED,
    ADDON_MOD_WORKSHOP_COMPONENT,
    AddonModWorkshopAction,
    AddonModWorkshopSubmissionType,
} from '@addons/mod/workshop/constants';
import { CorePromiseUtils } from '@static/promise-utils';

/**
 * Service to sync workshops.
 */
@Injectable({ providedIn: 'root' })
export class AddonModWorkshopSyncProvider extends CoreSyncBaseProvider<AddonModWorkshopSyncResult> {

    protected componentTranslatableString = 'workshop';

    constructor() {
        super('AddonModWorkshopSyncProvider');
    }

    /**
     * Check if an workshop has data to synchronize.
     *
     * @param workshopId Workshop ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: true if has data to sync, false otherwise.
     */
    hasDataToSync(workshopId: number, siteId?: string): Promise<boolean> {
        return AddonModWorkshopOffline.hasWorkshopOfflineData(workshopId, siteId);
    }

    /**
     * Try to synchronize all workshops that need it and haven't been synchronized in a while.
     *
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @param force Wether to force sync not depending on last execution.
     * @returns Promise resolved when the sync is done.
     */
    syncAllWorkshops(siteId?: string, force?: boolean): Promise<void> {
        return this.syncOnSites('all workshops', (siteId) => this.syncAllWorkshopsFunc(!!force, siteId), siteId);
    }

    /**
     * Sync all workshops on a site.
     *
     * @param force Wether to force sync not depending on last execution.
     * @param siteId Site ID to sync.
     * @returns Promise resolved if sync is successful, rejected if sync fails.
     */
    protected async syncAllWorkshopsFunc(force: boolean, siteId: string): Promise<void> {
        const workshopIds = await AddonModWorkshopOffline.getAllWorkshops(siteId);

        // Sync all workshops that haven't been synced for a while.
        const promises = workshopIds.map(async (workshopId) => {
            const data = force
                ? await this.syncWorkshop(workshopId, siteId)
                : await this.syncWorkshopIfNeeded(workshopId, siteId);

            if (data && data.updated) {
                // Sync done. Send event.
                CoreEvents.trigger(ADDON_MOD_WORKSHOP_AUTO_SYNCED, {
                    workshopId: workshopId,
                    warnings: data.warnings,
                }, siteId);
            }
        });

        await Promise.all(promises);
    }

    /**
     * Sync a workshop only if a certain time has passed since the last time.
     *
     * @param workshopId Workshop ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the workshop is synced or if it doesn't need to be synced.
     */
    async syncWorkshopIfNeeded(workshopId: number, siteId?: string): Promise<AddonModWorkshopSyncResult | undefined> {
        const needed = await this.isSyncNeeded(workshopId, siteId);

        if (needed) {
            return this.syncWorkshop(workshopId, siteId);
        }
    }

    /**
     * Try to synchronize a workshop.
     *
     * @param workshopId Workshop ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if sync is successful, rejected otherwise.
     */
    syncWorkshop(workshopId: number, siteId?: string): Promise<AddonModWorkshopSyncResult> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const currentSyncPromise = this.getOngoingSync(workshopId, siteId);
        if (currentSyncPromise) {
            // There's already a sync ongoing for this discussion, return the promise.
            return currentSyncPromise;
        }

        // Verify that workshop isn't blocked.
        if (CoreSync.isBlocked(ADDON_MOD_WORKSHOP_COMPONENT, workshopId, siteId)) {
            this.logger.debug(`Cannot sync workshop '${workshopId}' because it is blocked.`);

            throw new CoreSyncBlockedError(Translate.instant('core.errorsyncblocked', { $a: this.componentTranslate }));
        }

        this.logger.debug(`Try to sync workshop '${workshopId}' in site ${siteId}'`);

        const syncPromise = this.performSyncWorkshop(workshopId, siteId);

        return this.addOngoingSync(workshopId, syncPromise, siteId);
    }

    /**
     * Perform the workshop sync.
     *
     * @param workshopId Workshop ID.
     * @param siteId Site ID.
     * @returns Promise resolved if sync is successful, rejected otherwise.
     */
    protected async performSyncWorkshop(workshopId: number, siteId: string): Promise<AddonModWorkshopSyncResult> {
        const result: AddonModWorkshopSyncResult = {
            warnings: [],
            updated: false,
        };

        // Sync offline logs.
        await CorePromiseUtils.ignoreErrors(CoreCourseLogHelper.syncActivity(ADDON_MOD_WORKSHOP_COMPONENT, workshopId, siteId));

        // Get offline submissions to be sent.
        const syncs = await Promise.all([
            // Get offline submissions to be sent.
            CorePromiseUtils.ignoreErrors(AddonModWorkshopOffline.getSubmissions(workshopId, siteId), []),
            // Get offline submission assessments to be sent.
            CorePromiseUtils.ignoreErrors(AddonModWorkshopOffline.getAssessments(workshopId, siteId), []),
            // Get offline submission evaluations to be sent.
            CorePromiseUtils.ignoreErrors(AddonModWorkshopOffline.getEvaluateSubmissions(workshopId, siteId), []),
            // Get offline assessment evaluations to be sent.
            CorePromiseUtils.ignoreErrors(AddonModWorkshopOffline.getEvaluateAssessments(workshopId, siteId), []),
        ]);

        let courseId: number | undefined;

        // Get courseId from the first object
        for (const x in syncs) {
            if (syncs[x].length > 0 && syncs[x][0].courseid) {
                courseId = syncs[x][0].courseid;
                break;
            }
        }

        if (!courseId) {
            // Sync finished, set sync time.
            await CorePromiseUtils.ignoreErrors(this.setSyncTime(workshopId, siteId));

            // Nothing to sync.
            return result;
        }

        if (!CoreNetwork.isOnline()) {
            // Cannot sync in offline.
            throw new CoreNetworkError();
        }

        const workshop = await AddonModWorkshop.getWorkshopById(courseId, workshopId, { siteId });

        const submissionsActions: AddonModWorkshopOfflineSubmission[] = syncs[0];
        const assessments: AddonModWorkshopOfflineAssessment[] = syncs[1];
        const submissionEvaluations: AddonModWorkshopOfflineEvaluateSubmission[] = syncs[2];
        const assessmentEvaluations: AddonModWorkshopOfflineEvaluateAssessment[] = syncs[3];
        const offlineSubmissions: Record<string, AddonModWorkshopOfflineSubmission[]> = {};

        const promises: Promise<void>[] = [];

        submissionsActions.forEach((action) => {
            offlineSubmissions[action.submissionid] = offlineSubmissions[action.submissionid] || [];
            offlineSubmissions[action.submissionid].push(action);
        });

        Object.keys(offlineSubmissions).forEach((submissionId) => {
            const submissionActions = offlineSubmissions[submissionId];
            promises.push(this.syncSubmission(workshop, submissionActions, result, siteId).then(() => {
                result.updated = true;

                return;
            }));
        });

        assessments.forEach((assessment) => {
            promises.push(this.syncAssessment(workshop, assessment, result, siteId).then(() => {
                result.updated = true;

                return;
            }));
        });

        submissionEvaluations.forEach((evaluation) => {
            promises.push(this.syncEvaluateSubmission(workshop, evaluation, result, siteId).then(() => {
                result.updated = true;

                return;
            }));
        });

        assessmentEvaluations.forEach((evaluation) => {
            promises.push(this.syncEvaluateAssessment(workshop, evaluation, result, siteId).then(() => {
                result.updated = true;

                return;
            }));
        });

        await Promise.all(promises);

        if (result.updated) {
            // Data has been sent to server. Now invalidate the WS calls.
            await CorePromiseUtils.ignoreErrors(AddonModWorkshop.invalidateContentById(workshopId, courseId, siteId));
        }

        // Sync finished, set sync time.
        await CorePromiseUtils.ignoreErrors(this.setSyncTime(workshopId, siteId));

        // All done, return the warnings.
        return result;
    }

    /**
     * Synchronize a submission.
     *
     * @param workshop Workshop.
     * @param submissionActions Submission actions offline data.
     * @param result Object with the result of the sync.
     * @param siteId Site ID.
     * @returns Promise resolved if success, rejected otherwise.
     */
    protected async syncSubmission(
        workshop: AddonModWorkshopData,
        submissionActions: AddonModWorkshopOfflineSubmission[],
        result: AddonModWorkshopSyncResult,
        siteId: string,
    ): Promise<void> {
        let discardError: string | undefined;

        // Sort entries by timemodified.
        submissionActions = submissionActions.sort((a, b) => a.timemodified - b.timemodified);

        let timemodified = 0;
        let submissionId = submissionActions[0].submissionid;

        if (submissionId > 0) {
            // Is editing.
            try {
                const submission = await AddonModWorkshop.getSubmission(workshop.id, submissionId, {
                    cmId: workshop.coursemodule,
                    siteId,
                });

                timemodified = submission.timemodified;
            } catch {
                timemodified = -1;
            }
        }

        if (timemodified < 0 || timemodified >= submissionActions[0].timemodified) {
            // The entry was not found in Moodle or the entry has been modified, discard the action.
            result.updated = true;
            discardError = Translate.instant('addon.mod_workshop.warningsubmissionmodified');

            await AddonModWorkshopOffline.deleteAllSubmissionActions(workshop.id, siteId);

            this.addOfflineDataDeletedWarning(result.warnings, workshop.name, discardError);

            return;
        }

        await Promise.all(submissionActions.map(async (action) => {
            submissionId = action.submissionid > 0 ? action.submissionid : submissionId;

            try {
                let attachmentsId: number | undefined;

                // Upload attachments first if any.
                if (action.attachmentsid) {
                    const files = await AddonModWorkshopHelper.getSubmissionFilesFromOfflineFilesObject(
                        action.attachmentsid,
                        workshop.id,
                        siteId,
                    );

                    attachmentsId = await AddonModWorkshopHelper.uploadOrStoreSubmissionFiles(
                        workshop.id,
                        files,
                        false,
                        siteId,
                    );
                } else {
                    // Remove all files.
                    attachmentsId = await AddonModWorkshopHelper.uploadOrStoreSubmissionFiles(
                        workshop.id,
                        [],
                        false,
                        siteId,
                    );
                }

                if (workshop.submissiontypefile == AddonModWorkshopSubmissionType.SUBMISSION_TYPE_DISABLED) {
                    attachmentsId = undefined;
                }

                // Perform the action.
                switch (action.action) {
                    case AddonModWorkshopAction.ADD:
                        submissionId = await AddonModWorkshop.addSubmissionOnline(
                            workshop.id,
                            action.title,
                            action.content,
                            attachmentsId,
                            siteId,
                        );

                        break;
                    case AddonModWorkshopAction.UPDATE:
                        await AddonModWorkshop.updateSubmissionOnline(
                            submissionId,
                            action.title,
                            action.content,
                            attachmentsId,
                            siteId,
                        );

                        break;
                    case AddonModWorkshopAction.DELETE:
                        await AddonModWorkshop.deleteSubmissionOnline(submissionId, siteId);
                }
            } catch (error) {
                if (CoreWSError.isWebServiceError(error)) {
                    // The WebService has thrown an error, this means it cannot be performed. Discard.
                    discardError = CoreErrorHelper.getErrorMessageFromError(error);
                }

                // Couldn't connect to server, reject.
                throw error;

            }
            // Delete the offline data.
            result.updated = true;

            await AddonModWorkshopOffline.deleteSubmissionAction(
                action.workshopid,
                action.action,
                siteId,
            );

            // Delete stored files.
            if (action.action == AddonModWorkshopAction.ADD || action.action == AddonModWorkshopAction.UPDATE) {

                return AddonModWorkshopHelper.deleteSubmissionStoredFiles(
                    action.workshopid,
                    siteId,
                );
            }
        }));

        if (discardError) {
            // Submission was discarded, add a warning.
            this.addOfflineDataDeletedWarning(result.warnings, workshop.name, discardError);
        }
    }

    /**
     * Synchronize an assessment.
     *
     * @param workshop Workshop.
     * @param assessmentData Assessment offline data.
     * @param result Object with the result of the sync.
     * @param siteId Site ID.
     * @returns Promise resolved if success, rejected otherwise.
     */
    protected async syncAssessment(
        workshop: AddonModWorkshopData,
        assessmentData: AddonModWorkshopOfflineAssessment,
        result: AddonModWorkshopSyncResult,
        siteId: string,
    ): Promise<void> {
        let discardError: string | undefined;
        const assessmentId = assessmentData.assessmentid;

        let timemodified = 0;

        try {
            const assessment = await AddonModWorkshop.getAssessment(workshop.id, assessmentId, {
                cmId: workshop.coursemodule,
                siteId,
            });

            timemodified = assessment.timemodified;
        } catch {
            timemodified = -1;
        }

        if (timemodified < 0 || timemodified >= assessmentData.timemodified) {
            // The entry was not found in Moodle or the entry has been modified, discard the action.
            result.updated = true;
            discardError = Translate.instant('addon.mod_workshop.warningassessmentmodified');

            await AddonModWorkshopOffline.deleteAssessment(workshop.id, assessmentId, siteId);

            this.addOfflineDataDeletedWarning(result.warnings, workshop.name, discardError);

            return;
        }

        let attachmentsId = 0;
        const inputData = assessmentData.inputdata;

        try {
            let files: CoreFileEntry[] = [];
            // Upload attachments first if any.
            if (inputData.feedbackauthorattachmentsid && typeof inputData.feedbackauthorattachmentsid !== 'number') {
                files = await AddonModWorkshopHelper.getAssessmentFilesFromOfflineFilesObject(
                    <CoreFileUploaderStoreFilesResult>inputData.feedbackauthorattachmentsid,
                    workshop.id,
                    assessmentId,
                    siteId,
                );
            }

            attachmentsId =
                await AddonModWorkshopHelper.uploadOrStoreAssessmentFiles(workshop.id, assessmentId, files, false, siteId);

            inputData.feedbackauthorattachmentsid = attachmentsId || 0;

            await AddonModWorkshop.updateAssessmentOnline(assessmentId, inputData, siteId);
        } catch (error) {
            if (CoreWSError.isWebServiceError(error)) {
                // The WebService has thrown an error, this means it cannot be performed. Discard.
                discardError = CoreErrorHelper.getErrorMessageFromError(error);
            } else {
                // Couldn't connect to server, reject.
                throw error;
            }
        }

        // Delete the offline data.
        result.updated = true;

        await AddonModWorkshopOffline.deleteAssessment(workshop.id, assessmentId, siteId);
        await AddonModWorkshopHelper.deleteAssessmentStoredFiles(workshop.id, assessmentId, siteId);

        if (discardError) {
            // Assessment was discarded, add a warning.
            this.addOfflineDataDeletedWarning(result.warnings, workshop.name, discardError);
        }
    }

    /**
     * Synchronize a submission evaluation.
     *
     * @param workshop Workshop.
     * @param evaluate Submission evaluation offline data.
     * @param result Object with the result of the sync.
     * @param siteId Site ID.
     * @returns Promise resolved if success, rejected otherwise.
     */
    protected async syncEvaluateSubmission(
        workshop: AddonModWorkshopData,
        evaluate: AddonModWorkshopOfflineEvaluateSubmission,
        result: AddonModWorkshopSyncResult,
        siteId: string,
    ): Promise<void> {
        let discardError: string | undefined;
        const submissionId = evaluate.submissionid;

        let timemodified = 0;

        try {
            const submission = await AddonModWorkshop.getSubmission(workshop.id, submissionId, {
                cmId: workshop.coursemodule,
                siteId,
            });

            timemodified = submission.timemodified;
        } catch {
            timemodified = -1;
        }

        if (timemodified < 0 || timemodified >= evaluate.timemodified) {
            // The entry was not found in Moodle or the entry has been modified, discard the action.
            result.updated = true;
            discardError = Translate.instant('addon.mod_workshop.warningsubmissionmodified');

            await AddonModWorkshopOffline.deleteEvaluateSubmission(workshop.id, submissionId, siteId);

            this.addOfflineDataDeletedWarning(result.warnings, workshop.name, discardError);

            return;
        }

        try {
            await AddonModWorkshop.evaluateSubmissionOnline(
                submissionId,
                evaluate.feedbacktext,
                evaluate.published,
                evaluate.gradeover,
                siteId,
            );
        } catch (error) {
            if (CoreWSError.isWebServiceError(error)) {
                // The WebService has thrown an error, this means it cannot be performed. Discard.
                discardError = CoreErrorHelper.getErrorMessageFromError(error);
            } else {
                // Couldn't connect to server, reject.
                throw error;
            }
        }

        // Delete the offline data.
        result.updated = true;

        await AddonModWorkshopOffline.deleteEvaluateSubmission(workshop.id, submissionId, siteId);

        if (discardError) {
            // Assessment was discarded, add a warning.
            this.addOfflineDataDeletedWarning(result.warnings, workshop.name, discardError);
        }
    }

    /**
     * Synchronize a assessment evaluation.
     *
     * @param workshop Workshop.
     * @param evaluate Assessment evaluation offline data.
     * @param result Object with the result of the sync.
     * @param siteId Site ID.
     * @returns Promise resolved if success, rejected otherwise.
     */
    protected async syncEvaluateAssessment(
        workshop: AddonModWorkshopData,
        evaluate: AddonModWorkshopOfflineEvaluateAssessment,
        result: AddonModWorkshopSyncResult,
        siteId: string,
    ): Promise<void> {
        let discardError: string | undefined;
        const assessmentId = evaluate.assessmentid;

        let timemodified = 0;

        try {
            const assessment = await AddonModWorkshop.getAssessment(workshop.id, assessmentId, {
                cmId: workshop.coursemodule,
                siteId,
            });

            timemodified = assessment.timemodified;
        } catch {
            timemodified = -1;
        }

        if (timemodified < 0 || timemodified >= evaluate.timemodified) {
            // The entry was not found in Moodle or the entry has been modified, discard the action.
            result.updated = true;
            discardError = Translate.instant('addon.mod_workshop.warningassessmentmodified');

            return AddonModWorkshopOffline.deleteEvaluateAssessment(workshop.id, assessmentId, siteId);
        }

        try {
            await AddonModWorkshop.evaluateAssessmentOnline(
                assessmentId,
                evaluate.feedbacktext,
                evaluate.weight,
                evaluate.gradinggradeover,
                siteId,
            );
        } catch (error) {
            if (CoreWSError.isWebServiceError(error)) {
                // The WebService has thrown an error, this means it cannot be performed. Discard.
                discardError = CoreErrorHelper.getErrorMessageFromError(error);
            } else {
                // Couldn't connect to server, reject.
                throw error;
            }
        }

        // Delete the offline data.
        result.updated = true;

        await AddonModWorkshopOffline.deleteEvaluateAssessment(workshop.id, assessmentId, siteId);

        if (discardError) {
            // Assessment was discarded, add a warning.
            this.addOfflineDataDeletedWarning(result.warnings, workshop.name, discardError);
        }
    }

}
export const AddonModWorkshopSync = makeSingleton(AddonModWorkshopSyncProvider);

export type AddonModWorkshopAutoSyncData = {
    workshopId: number;
    warnings: string[];
};

export type AddonModWorkshopSyncResult = CoreSyncResult;

declare module '@static/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [ADDON_MOD_WORKSHOP_AUTO_SYNCED]: AddonModWorkshopAutoSyncData;
    }
}
