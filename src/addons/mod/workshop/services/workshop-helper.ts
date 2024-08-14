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
import { CoreError } from '@classes/errors/error';
import { CoreFileUploader, CoreFileUploaderStoreFilesResult } from '@features/fileuploader/services/fileuploader';
import { FileEntry } from '@awesome-cordova-plugins/file/ngx';
import { CoreFile } from '@services/file';
import { CoreFileEntry } from '@services/file-helper';
import { CoreSites } from '@services/sites';
import { CoreText, CoreTextFormat } from '@singletons/text';
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton, Translate } from '@singletons';
import { CoreFormFields } from '@singletons/form';
import { AddonModWorkshopAssessmentStrategyFieldErrors } from '../components/assessment-strategy/assessment-strategy';
import { AddonWorkshopAssessmentStrategyDelegate } from './assessment-strategy-delegate';
import {
    AddonModWorkshopUserOptions,
    AddonModWorkshopData,
    AddonModWorkshop,
    AddonModWorkshopSubmissionData,
    AddonModWorkshopGetWorkshopAccessInformationWSResponse,
    AddonModWorkshopPhaseTaskData,
    AddonModWorkshopSubmissionAssessmentData,
    AddonModWorkshopGetAssessmentFormDefinitionData,
    AddonModWorkshopGetAssessmentFormFieldsParsedData,
} from './workshop';
import { AddonModWorkshopOffline, AddonModWorkshopOfflineSubmission } from './workshop-offline';
import {
    ADDON_MOD_WORKSHOP_COMPONENT,
    AddonModWorkshopAction,
    AddonModWorkshopExampleMode,
    AddonModWorkshopOverallFeedbackMode,
    AddonModWorkshopPhase,
} from '@addons/mod/workshop/constants';

/**
 * Helper to gather some common functions for workshop.
 */
@Injectable({ providedIn: 'root' })
export class AddonModWorkshopHelperProvider {

    /**
     * Get a task by code.
     *
     * @param tasks Array of tasks.
     * @param taskCode Unique task code.
     * @returns Task requested
     */
    getTask(tasks: AddonModWorkshopPhaseTaskData[], taskCode: string): AddonModWorkshopPhaseTaskData | undefined {
        return tasks.find((task) => task.code == taskCode);
    }

    /**
     * Check is task code is done.
     *
     * @param tasks Array of tasks.
     * @param taskCode Unique task code.
     * @returns True if task is completed.
     */
    isTaskDone(tasks: AddonModWorkshopPhaseTaskData[], taskCode: string): boolean {
        const task = this.getTask(tasks, taskCode);

        if (task) {
            return !!task.completed;
        }

        // Task not found, assume true.
        return true;
    }

    /**
     * Return if a user can submit a workshop.
     *
     * @param workshop Workshop info.
     * @param access Access information.
     * @param tasks Array of tasks.
     * @returns True if the user can submit the workshop.
     */
    canSubmit(
        workshop: AddonModWorkshopData,
        access: AddonModWorkshopGetWorkshopAccessInformationWSResponse,
        tasks: AddonModWorkshopPhaseTaskData[],
    ): boolean {
        const examplesMust = workshop.useexamples &&
            workshop.examplesmode == AddonModWorkshopExampleMode.EXAMPLES_BEFORE_SUBMISSION;
        const examplesDone = access.canmanageexamples ||
            workshop.examplesmode == AddonModWorkshopExampleMode.EXAMPLES_VOLUNTARY ||
            this.isTaskDone(tasks, 'examples');

        return workshop.phase > AddonModWorkshopPhase.PHASE_SETUP && access.cansubmit && (!examplesMust || examplesDone);
    }

    /**
     * Return if a user can assess a workshop.
     *
     * @param workshop Workshop info.
     * @param access Access information.
     * @returns True if the user can assess the workshop.
     */
    canAssess(workshop: AddonModWorkshopData, access: AddonModWorkshopGetWorkshopAccessInformationWSResponse): boolean {
        const examplesMust = workshop.useexamples &&
            workshop.examplesmode == AddonModWorkshopExampleMode.EXAMPLES_BEFORE_ASSESSMENT;

        const examplesDone = access.canmanageexamples;

        return !examplesMust || examplesDone;
    }

    /**
     * Return a particular user submission from the submission list.
     *
     * @param workshopId Workshop ID.
     * @param options Other options.
     * @returns Resolved with the submission, resolved with false if not found.
     */
    async getUserSubmission(
        workshopId: number,
        options: AddonModWorkshopUserOptions = {},
    ): Promise<AddonModWorkshopSubmissionData | undefined> {
        const userId = options.userId || CoreSites.getCurrentSiteUserId();

        const submissions = await AddonModWorkshop.getSubmissions(workshopId, options);

        return submissions.find((submission) => submission.authorid == userId);
    }

    /**
     * Return a particular submission. It will use prefetched data if fetch fails.
     *
     * @param workshopId Workshop ID.
     * @param submissionId Submission ID.
     * @param options Other options.
     * @returns Resolved with the submission, resolved with false if not found.
     */
    async getSubmissionById(
        workshopId: number,
        submissionId: number,
        options: AddonModWorkshopUserOptions = {},
    ): Promise<AddonModWorkshopSubmissionData> {
        try {
            return await AddonModWorkshop.getSubmission(workshopId, submissionId, options);
        } catch {
            const submissions = await AddonModWorkshop.getSubmissions(workshopId, options);

            const submission = submissions.find((submission) => submission.id == submissionId);

            if (!submission) {
                throw new CoreError('Submission not found');
            }

            return submission;
        }
    }

    /**
     * Return a particular assesment. It will use prefetched data if fetch fails. It will add assessment form data.
     *
     * @param workshopId Workshop ID.
     * @param assessmentId Assessment ID.
     * @param options Other options.
     * @returns Resolved with the assessment.
     */
    async getReviewerAssessmentById(
        workshopId: number,
        assessmentId: number,
        options: AddonModWorkshopUserOptions = {},
    ): Promise<AddonModWorkshopSubmissionAssessmentWithFormData> {
        let assessment: AddonModWorkshopSubmissionAssessmentWithFormData | undefined;

        try {
            assessment = await AddonModWorkshop.getAssessment(workshopId, assessmentId, options);
        } catch (error) {
            const assessments = await AddonModWorkshop.getReviewerAssessments(workshopId, options);
            assessment = assessments.find((ass) => ass.id === assessmentId);

            if (!assessment) {
                throw error;
            }
        }

        assessment.form = await AddonModWorkshop.getAssessmentForm(workshopId, assessmentId, options);

        return assessment;
    }

    /**
     * Retrieves the assessment of the given user and all the related data.
     *
     * @param workshopId Workshop ID.
     * @param options Other options.
     * @returns Promise resolved when the workshop data is retrieved.
     */
    async getReviewerAssessments(
        workshopId: number,
        options: AddonModWorkshopUserOptions = {},
    ): Promise<AddonModWorkshopSubmissionAssessmentWithFormData[]> {
        options.siteId = options.siteId || CoreSites.getCurrentSiteId();

        const assessments: AddonModWorkshopSubmissionAssessmentWithFormData[] =
            await AddonModWorkshop.getReviewerAssessments(workshopId, options);

        const promises: Promise<void>[] = [];
        assessments.forEach((assessment) => {
            promises.push(this.getSubmissionById(workshopId, assessment.submissionid, options).then((submission) => {
                assessment.submission = submission;

                return;
            }));
            promises.push(AddonModWorkshop.getAssessmentForm(workshopId, assessment.id, options).then((assessmentForm) => {
                assessment.form = assessmentForm;

                return;
            }));

        });
        await Promise.all(promises);

        return assessments;
    }

    /**
     * Delete stored attachment files for a submission.
     *
     * @param workshopId Workshop ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when deleted.
     */
    async deleteSubmissionStoredFiles(workshopId: number, siteId?: string): Promise<void> {
        const folderPath = await AddonModWorkshopOffline.getSubmissionFolder(workshopId, siteId);

        // Ignore any errors, CoreFileProvider.removeDir fails if folder doesn't exists.
        await CoreUtils.ignoreErrors(CoreFile.removeDir(folderPath));
    }

    /**
     * Given a list of files (either online files or local files), store the local files in a local folder
     * to be submitted later.
     *
     * @param workshopId Workshop ID.
     * @param files List of files.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if success, rejected otherwise.
     */
    async storeSubmissionFiles(
        workshopId: number,
        files: CoreFileEntry[],
        siteId?: string,
    ): Promise<CoreFileUploaderStoreFilesResult> {
        // Get the folder where to store the files.
        const folderPath = await AddonModWorkshopOffline.getSubmissionFolder(workshopId, siteId);

        return CoreFileUploader.storeFilesToUpload(folderPath, files);
    }

    /**
     * Upload or store some files for a submission, depending if the user is offline or not.
     *
     * @param workshopId Workshop ID.
     * @param files List of files.
     * @param offline True if files sould be stored for offline, false to upload them.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if success.
     */
    uploadOrStoreSubmissionFiles(
        workshopId: number,
        files: CoreFileEntry[],
        offline: true,
        siteId?: string,
    ): Promise<CoreFileUploaderStoreFilesResult>;
    uploadOrStoreSubmissionFiles(
        workshopId: number,
        files: CoreFileEntry[],
        offline: false,
        siteId?: string,
    ): Promise<number>;
    uploadOrStoreSubmissionFiles(
        workshopId: number,
        files: CoreFileEntry[],
        offline: boolean,
        siteId?: string,
    ): Promise<CoreFileUploaderStoreFilesResult | number> {
        if (offline) {
            return this.storeSubmissionFiles(workshopId, files, siteId);
        }

        return CoreFileUploader.uploadOrReuploadFiles(files, ADDON_MOD_WORKSHOP_COMPONENT, workshopId, siteId);
    }

    /**
     * Get a list of stored attachment files for a submission. See AddonModWorkshopHelperProvider#storeFiles.
     *
     * @param workshopId Workshop ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the files.
     */
    async getStoredSubmissionFiles(
        workshopId: number,
        siteId?: string,
    ): Promise<FileEntry[]> {
        const folderPath = await AddonModWorkshopOffline.getSubmissionFolder(workshopId, siteId);

        // Ignore not found files.
        return CoreUtils.ignoreErrors(CoreFileUploader.getStoredFiles(folderPath), []);
    }

    /**
     * Get a list of stored attachment files for a submission and online files also. See AddonModWorkshopHelperProvider#storeFiles.
     *
     * @param filesObject Files object combining offline and online information.
     * @param workshopId Workshop ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the files.
     */
    async getSubmissionFilesFromOfflineFilesObject(
        filesObject: CoreFileUploaderStoreFilesResult,
        workshopId: number,
        siteId?: string,
    ): Promise<CoreFileEntry[]> {
        const folderPath = await AddonModWorkshopOffline.getSubmissionFolder(workshopId, siteId);

        return CoreFileUploader.getStoredFilesFromOfflineFilesObject(filesObject, folderPath);
    }

    /**
     * Delete stored attachment files for an assessment.
     *
     * @param workshopId Workshop ID.
     * @param assessmentId Assessment ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when deleted.
     */
    async deleteAssessmentStoredFiles(workshopId: number, assessmentId: number, siteId?: string): Promise<void> {
        const folderPath = await AddonModWorkshopOffline.getAssessmentFolder(workshopId, assessmentId, siteId);

        // Ignore any errors, CoreFileProvider.removeDir fails if folder doesn't exists.
        await CoreUtils.ignoreErrors(CoreFile.removeDir(folderPath));
    }

    /**
     * Given a list of files (either online files or local files), store the local files in a local folder
     * to be submitted later.
     *
     * @param workshopId Workshop ID.
     * @param assessmentId Assessment ID.
     * @param files List of files.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if success, rejected otherwise.
     */
    async storeAssessmentFiles(
        workshopId: number,
        assessmentId: number,
        files: CoreFileEntry[],
        siteId?: string,
    ): Promise<CoreFileUploaderStoreFilesResult> {
        // Get the folder where to store the files.
        const folderPath = await AddonModWorkshopOffline.getAssessmentFolder(workshopId, assessmentId, siteId);

        return CoreFileUploader.storeFilesToUpload(folderPath, files);
    }

    /**
     * Upload or store some files for an assessment, depending if the user is offline or not.
     *
     * @param workshopId Workshop ID.
     * @param assessmentId ID.
     * @param files List of files.
     * @param offline True if files sould be stored for offline, false to upload them.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if success.
     */
    uploadOrStoreAssessmentFiles(
        workshopId: number,
        assessmentId: number,
        files: CoreFileEntry[],
        offline: true,
        siteId?: string,
    ): Promise<CoreFileUploaderStoreFilesResult>;
    uploadOrStoreAssessmentFiles(
        workshopId: number,
        assessmentId: number,
        files: CoreFileEntry[],
        offline: false,
        siteId?: string,
    ): Promise<number>;
    uploadOrStoreAssessmentFiles(
        workshopId: number,
        assessmentId: number,
        files: CoreFileEntry[],
        offline: boolean,
        siteId?: string,
    ): Promise<CoreFileUploaderStoreFilesResult | number> {
        if (offline) {
            return this.storeAssessmentFiles(workshopId, assessmentId, files, siteId);
        }

        return CoreFileUploader.uploadOrReuploadFiles(files, ADDON_MOD_WORKSHOP_COMPONENT, workshopId, siteId);
    }

    /**
     * Get a list of stored attachment files for an assessment. See AddonModWorkshopHelperProvider#storeFiles.
     *
     * @param workshopId Workshop ID.
     * @param assessmentId Assessment ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the files.
     */
    async getStoredAssessmentFiles(workshopId: number, assessmentId: number, siteId?: string): Promise<FileEntry[]> {
        const folderPath = await AddonModWorkshopOffline.getAssessmentFolder(workshopId, assessmentId, siteId);

        // Ignore not found files.
        return CoreUtils.ignoreErrors(CoreFileUploader.getStoredFiles(folderPath), []);
    }

    /**
     * Get a list of stored attachment files for an assessment and online files also. See AddonModWorkshopHelperProvider#storeFiles.
     *
     * @param filesObject Files object combining offline and online information.
     * @param workshopId Workshop ID.
     * @param assessmentId Assessment ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the files.
     */
    async getAssessmentFilesFromOfflineFilesObject(
        filesObject: CoreFileUploaderStoreFilesResult,
        workshopId: number,
        assessmentId: number,
        siteId?: string,
    ): Promise<CoreFileEntry[]> {
        const folderPath = await AddonModWorkshopOffline.getAssessmentFolder(workshopId, assessmentId, siteId);

        return CoreFileUploader.getStoredFilesFromOfflineFilesObject(filesObject, folderPath);
    }

    /**
     * Applies offline data to submission.
     *
     * @param submission Submission object to be modified.
     * @param actions Offline actions to be applied to the given submission.
     * @returns Promise resolved with the files.
     */
    async applyOfflineData(
        submission?: AddonModWorkshopSubmissionDataWithOfflineData,
        actions: AddonModWorkshopOfflineSubmission[] = [],
    ): Promise<AddonModWorkshopSubmissionDataWithOfflineData | undefined> {
        if (actions.length === 0) {
            return submission;
        }

        const baseSubmission = submission ?? {
            id: 0,
            workshopid: 0,
            title: '',
            content: '',
            timemodified: 0,
            example: false,
            authorid: 0,
            timecreated: 0,
            contenttrust: 0,
            attachment: 0,
            published: false,
            late: 0,
        };

        let attachmentsId: CoreFileUploaderStoreFilesResult | undefined;
        const workshopId = actions[0].workshopid;

        actions.forEach((action) => {
            switch (action.action) {
                case AddonModWorkshopAction.ADD:
                case AddonModWorkshopAction.UPDATE:
                    baseSubmission.title = action.title;
                    baseSubmission.content = action.content;
                    baseSubmission.title = action.title;
                    baseSubmission.courseid = action.courseid;
                    baseSubmission.submissionmodified = action.timemodified / 1000;
                    baseSubmission.offline = true;
                    attachmentsId = action.attachmentsid as CoreFileUploaderStoreFilesResult;
                    break;
                case AddonModWorkshopAction.DELETE:
                    baseSubmission.deleted = true;
                    baseSubmission.submissionmodified = action.timemodified / 1000;
                    break;
                default:
            }
        });

        // Check offline files for latest attachmentsid.
        if (attachmentsId) {
            baseSubmission.attachmentfiles =
                await this.getSubmissionFilesFromOfflineFilesObject(attachmentsId, workshopId);
        } else {
            baseSubmission.attachmentfiles = [];
        }

        return baseSubmission;
    }

    /**
     * Prepare assessment data to be sent to the server.
     *
     * @param workshop Workshop object.
     * @param selectedValues Assessment current values
     * @param feedbackText Feedback text.
     * @param form Assessment form original data.
     * @param attachmentsId The draft file area id for attachments.
     * @returns Promise resolved with the data to be sent. Or rejected with the input errors object.
     */
    async prepareAssessmentData(
        workshop: AddonModWorkshopData,
        selectedValues: AddonModWorkshopGetAssessmentFormFieldsParsedData[],
        feedbackText: string,
        form: AddonModWorkshopGetAssessmentFormDefinitionData,
        attachmentsId: CoreFileUploaderStoreFilesResult | number = 0,
    ): Promise<CoreFormFields<unknown>> {

        if (workshop.overallfeedbackmode == AddonModWorkshopOverallFeedbackMode.ENABLED_REQUIRED && !feedbackText) {
            const errors: AddonModWorkshopAssessmentStrategyFieldErrors =
                { feedbackauthor: Translate.instant('core.err_required') };
            throw errors;
        }

        const data =
            (await AddonWorkshopAssessmentStrategyDelegate.prepareAssessmentData(workshop.strategy ?? '', selectedValues, form)) ||
            {};
        data.feedbackauthor = feedbackText;
        data.feedbackauthorformat = CoreTextFormat.FORMAT_HTML;
        data.feedbackauthorattachmentsid = attachmentsId;
        data.nodims = form.dimenssionscount;

        return data;
    }

    /**
     * Calculates the real value of a grade based on real_grade_value.
     *
     * @param value Percentual value from 0 to 100.
     * @param max The maximal grade.
     * @param decimals Decimals to show in the formatted grade.
     * @returns Real grade formatted.
     */
    protected realGradeValueHelper(value?: number | string, max = 0, decimals = 0): string | undefined {
        if (typeof value === 'string') {
            // Already treated.
            return value;
        }

        if (value === null || value === undefined) {
            return undefined;
        }

        if (max === 0) {
            return '0';
        }

        value = CoreText.roundToDecimals(max * value / 100, decimals);

        return CoreUtils.formatFloat(value);
    }

    /**
     * Calculates the real value of a grades of an assessment.
     *
     * @param workshop Workshop object.
     * @param assessment Assessment data.
     * @returns Assessment with real grades.
     */
    realGradeValue(
        workshop: AddonModWorkshopData,
        assessment: AddonModWorkshopSubmissionAssessmentWithFormData,
    ): AddonModWorkshopSubmissionAssessmentWithFormData {
        assessment.grade = this.realGradeValueHelper(assessment.grade, workshop.grade, workshop.gradedecimals);
        assessment.gradinggrade = this.realGradeValueHelper(assessment.gradinggrade, workshop.gradinggrade, workshop.gradedecimals);

        assessment.gradinggradeover = this.realGradeValueHelper(
            assessment.gradinggradeover,
            workshop.gradinggrade,
            workshop.gradedecimals,
        );

        return assessment;
    }

    /**
     * Check grade should be shown
     *
     * @param grade Grade to be shown
     * @returns If grade should be shown or not.
     */
    showGrade(grade?: number|string): boolean {
        return grade !== undefined && grade !== null;
    }

}
export const AddonModWorkshopHelper = makeSingleton(AddonModWorkshopHelperProvider);

export type AddonModWorkshopSubmissionAssessmentWithFormData =
    Omit<AddonModWorkshopSubmissionAssessmentData, 'grade'|'gradinggrade'|'gradinggradeover'|'feedbackattachmentfiles'> & {
        form?: AddonModWorkshopGetAssessmentFormDefinitionData;
        submission?: AddonModWorkshopSubmissionData;
        offline?: boolean;
        strategy?: string;
        grade?: string | number;
        gradinggrade?: string | number;
        gradinggradeover?: string | number;
        ownAssessment?: boolean;
        feedbackauthor?: string;
        feedbackattachmentfiles: CoreFileEntry[]; // Feedbackattachmentfiles.
    };

export type AddonModWorkshopSubmissionDataWithOfflineData = Omit<AddonModWorkshopSubmissionData, 'attachmentfiles'> & {
    courseid?: number;
    submissionmodified?: number;
    offline?: boolean;
    deleted?: boolean;
    attachmentfiles?: CoreFileEntry[];
    reviewedby?: AddonModWorkshopSubmissionAssessmentWithFormData[];
    reviewerof?: AddonModWorkshopSubmissionAssessmentWithFormData[];
    gradinggrade?: number;
    reviewedbydone?: number;
    reviewerofdone?: number;
    reviewedbycount?: number;
    reviewerofcount?: number;
};
