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
import { CoreFileProvider } from '@providers/file';
import { CoreFileUploaderProvider } from '@core/fileuploader/providers/fileuploader';
import { CoreSitesProvider } from '@providers/sites';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { AddonModWorkshopProvider } from './workshop';
import { AddonModWorkshopOfflineProvider } from './offline';
import { AddonWorkshopAssessmentStrategyDelegate } from './assessment-strategy-delegate';

/**
 * Helper to gather some common functions for workshop.
 */
@Injectable()
export class AddonModWorkshopHelperProvider {

    constructor(
            private translate: TranslateService,
            private fileProvider: CoreFileProvider,
            private uploaderProvider: CoreFileUploaderProvider,
            private sitesProvider: CoreSitesProvider,
            private textUtils: CoreTextUtilsProvider,
            private utils: CoreUtilsProvider,
            private workshopProvider: AddonModWorkshopProvider,
            private workshopOffline: AddonModWorkshopOfflineProvider,
            private strategyDelegate: AddonWorkshopAssessmentStrategyDelegate) {}

    /**
     * Get a task by code.
     *
     * @param tasks Array of tasks.
     * @param taskCode Unique task code.
     * @return Task requested
     */
    getTask(tasks: any[], taskCode: string): any {
        for (const x in tasks) {
            if (tasks[x].code == taskCode) {
                return tasks[x];
            }
        }

        return false;
    }

    /**
     * Check is task code is done.
     *
     * @param tasks Array of tasks.
     * @param taskCode Unique task code.
     * @return True if task is completed.
     */
    isTaskDone(tasks: any[], taskCode: string): boolean {
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
     * @return True if the user can submit the workshop.
     */
    canSubmit(workshop: any, access: any, tasks: any[]): boolean {
        const examplesMust = workshop.useexamples && workshop.examplesmode == AddonModWorkshopProvider.EXAMPLES_BEFORE_SUBMISSION;
        const examplesDone = access.canmanageexamples || workshop.examplesmode == AddonModWorkshopProvider.EXAMPLES_VOLUNTARY ||
                this.isTaskDone(tasks, 'examples');

        return workshop.phase > AddonModWorkshopProvider.PHASE_SETUP && access.cansubmit && (!examplesMust || examplesDone);
    }

    /**
     * Return if a user can assess a workshop.
     *
     * @param workshop Workshop info.
     * @param access Access information.
     * @return True if the user can assess the workshop.
     */
    canAssess(workshop: any, access: any): boolean {
        const examplesMust = workshop.useexamples && workshop.examplesmode == AddonModWorkshopProvider.EXAMPLES_BEFORE_ASSESSMENT;
        const examplesDone = access.canmanageexamples;

        return !examplesMust || examplesDone;
    }

    /**
     * Return a particular user submission from the submission list.
     *
     * @param workshopId Workshop ID.
     * @param userId User ID. If not defined current user Id.
     * @return Resolved with the submission, resolved with false if not found.
     */
    getUserSubmission(workshopId: number, userId: number = 0): Promise<any> {
        return this.workshopProvider.getSubmissions(workshopId).then((submissions) => {
            userId = userId || this.sitesProvider.getCurrentSiteUserId();

            for (const x in submissions) {
                if (submissions[x].authorid == userId) {
                    return submissions[x];
                }
            }

            return false;
        });
    }

    /**
     * Return a particular submission. It will use prefetched data if fetch fails.
     *
     * @param workshopId Workshop ID.
     * @param submissionId Submission ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Resolved with the submission, resolved with false if not found.
     */
    getSubmissionById(workshopId: number, submissionId: number, siteId?: string): Promise<any> {
        return this.workshopProvider.getSubmission(workshopId, submissionId, siteId).catch(() => {
            return this.workshopProvider.getSubmissions(workshopId, undefined, undefined, undefined, undefined, siteId)
                    .then((submissions) => {
                for (const x in submissions) {
                    if (submissions[x].id == submissionId) {
                        return submissions[x];
                    }
                }

                return false;
            });
        });
    }

    /**
     * Return a particular assesment. It will use prefetched data if fetch fails. It will add assessment form data.
     *
     * @param workshopId Workshop ID.
     * @param assessmentId Assessment ID.
     * @param userId User ID. If not defined, current user.
     * @param siteId Site ID. If not defined, current site.
     * @return Resolved with the assessment.
     */
    getReviewerAssessmentById(workshopId: number, assessmentId: number, userId: number = 0, siteId?: string): Promise<any> {
        return this.workshopProvider.getAssessment(workshopId, assessmentId, siteId).catch((error) => {
            return this.workshopProvider.getReviewerAssessments(workshopId, userId, undefined, undefined, siteId)
                    .then((assessments) => {
                for (const x in assessments) {
                    if (assessments[x].id == assessmentId) {
                        return assessments[x];
                    }
                }

                // Not found, return original error.
                return Promise.reject(error);
            });
        }).then((assessment) => {
            return this.workshopProvider.getAssessmentForm(workshopId, assessmentId, undefined, undefined, undefined, siteId)
                    .then((assessmentForm) => {
                assessment.form = assessmentForm;

                return assessment;
            });
        });
    }

    /**
     * Retrieves the assessment of the given user and all the related data.
     *
     * @param workshopId Workshop ID.
     * @param userId User ID. If not defined, current user.
     * @param offline True if it should return cached data. Has priority over ignoreCache.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the workshop data is retrieved.
     */
    getReviewerAssessments(workshopId: number, userId: number = 0, offline: boolean = false, ignoreCache: boolean = false,
            siteId?: string): Promise<any[]> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.workshopProvider.getReviewerAssessments(workshopId, userId, offline, ignoreCache, siteId)
                .then((assessments) => {
            const promises = assessments.map((assessment) => {
                return this.getSubmissionById(workshopId, assessment.submissionid, siteId).then((submission) => {
                    assessment.submission = submission;
                });
            });

            return Promise.all(promises).then(() => {
                return assessments;
            });
        });
    }

    /**
     * Delete stored attachment files for a submission.
     *
     * @param workshopId Workshop ID.
     * @param submissionId If not editing, it will refer to timecreated.
     * @param editing If the submission is being edited or added otherwise.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when deleted.
     */
    deleteSubmissionStoredFiles(workshopId: number, submissionId: number, editing: boolean, siteId?: string): Promise<any> {
        return this.workshopOffline.getSubmissionFolder(workshopId, submissionId, editing, siteId).then((folderPath) => {
            return this.fileProvider.removeDir(folderPath).catch(() => {
                // Ignore any errors, CoreFileProvider.removeDir fails if folder doesn't exists.
            });
        });
    }

    /**
     * Given a list of files (either online files or local files), store the local files in a local folder
     * to be submitted later.
     *
     * @param workshopId Workshop ID.
     * @param submissionId If not editing, it will refer to timecreated.
     * @param editing If the submission is being edited or added otherwise.
     * @param files List of files.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if success, rejected otherwise.
     */
    storeSubmissionFiles(workshopId: number, submissionId: number, editing: boolean, files: any[], siteId?: string): Promise<any> {
        // Get the folder where to store the files.
        return this.workshopOffline.getSubmissionFolder(workshopId, submissionId, editing, siteId).then((folderPath) => {
            return this.uploaderProvider.storeFilesToUpload(folderPath, files);
        });
    }

    /**
     * Upload or store some files for a submission, depending if the user is offline or not.
     *
     * @param workshopId Workshop ID.
     * @param submissionId If not editing, it will refer to timecreated.
     * @param files List of files.
     * @param editing If the submission is being edited or added otherwise.
     * @param offline True if files sould be stored for offline, false to upload them.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if success.
     */
    uploadOrStoreSubmissionFiles(workshopId: number, submissionId: number, files: any[], editing: boolean, offline: boolean,
            siteId?: string): Promise<any> {
        if (offline) {
            return this.storeSubmissionFiles(workshopId, submissionId, editing, files, siteId);
        } else {
            return this.uploaderProvider.uploadOrReuploadFiles(files, AddonModWorkshopProvider.COMPONENT, workshopId, siteId);
        }
    }

    /**
     * Get a list of stored attachment files for a submission. See AddonModWorkshopHelperProvider#storeFiles.
     *
     * @param workshopId Workshop ID.
     * @param submissionId If not editing, it will refer to timecreated.
     * @param editing If the submission is being edited or added otherwise.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the files.
     */
    getStoredSubmissionFiles(workshopId: number, submissionId: number, editing: boolean, siteId?: string): Promise<any[]> {
        return this.workshopOffline.getSubmissionFolder(workshopId, submissionId, editing, siteId).then((folderPath) => {
            return this.uploaderProvider.getStoredFiles(folderPath).catch(() => {
                // Ignore not found files.
                return [];
            });
        });
    }

    /**
     * Get a list of stored attachment files for a submission and online files also. See AddonModWorkshopHelperProvider#storeFiles.
     *
     * @param filesObject Files object combining offline and online information.
     * @param workshopId Workshop ID.
     * @param submissionId If not editing, it will refer to timecreated.
     * @param editing If the submission is being edited or added otherwise.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the files.
     */
    getSubmissionFilesFromOfflineFilesObject(filesObject: any, workshopId: number, submissionId: number, editing: boolean,
            siteId?: string): Promise<any[]> {
        return this.workshopOffline.getSubmissionFolder(workshopId, submissionId, editing, siteId).then((folderPath) => {
            return this.uploaderProvider.getStoredFilesFromOfflineFilesObject(filesObject, folderPath);
        });
    }

    /**
     * Delete stored attachment files for an assessment.
     *
     * @param workshopId Workshop ID.
     * @param assessmentId Assessment ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when deleted.
     */
    deleteAssessmentStoredFiles(workshopId: number, assessmentId: number, siteId?: string): Promise<any> {
        return this.workshopOffline.getAssessmentFolder(workshopId, assessmentId, siteId).then((folderPath) => {
            return this.fileProvider.removeDir(folderPath).catch(() => {
                // Ignore any errors, CoreFileProvider.removeDir fails if folder doesn't exists.
            });
        });
    }

    /**
     * Given a list of files (either online files or local files), store the local files in a local folder
     * to be submitted later.
     *
     * @param workshopId Workshop ID.
     * @param assessmentId Assessment ID.
     * @param files List of files.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if success, rejected otherwise.
     */
    storeAssessmentFiles(workshopId: number, assessmentId: number, files: any[], siteId?: string): Promise<any> {
        // Get the folder where to store the files.
        return this.workshopOffline.getAssessmentFolder(workshopId, assessmentId, siteId).then((folderPath) => {
            return this.uploaderProvider.storeFilesToUpload(folderPath, files);
        });
    }

    /**
     * Upload or store some files for an assessment, depending if the user is offline or not.
     *
     * @param workshopId Workshop ID.
     * @param assessmentId ID.
     * @param files List of files.
     * @param offline True if files sould be stored for offline, false to upload them.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if success.
     */
    uploadOrStoreAssessmentFiles(workshopId: number, assessmentId: number, files: any[], offline: boolean, siteId?: string):
            Promise<any> {
        if (offline) {
            return this.storeAssessmentFiles(workshopId, assessmentId, files, siteId);
        } else {
            return this.uploaderProvider.uploadOrReuploadFiles(files, AddonModWorkshopProvider.COMPONENT, workshopId, siteId);
        }
    }

    /**
     * Get a list of stored attachment files for an assessment. See AddonModWorkshopHelperProvider#storeFiles.
     *
     * @param workshopId Workshop ID.
     * @param assessmentId Assessment ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the files.
     */
    getStoredAssessmentFiles(workshopId: number, assessmentId: number, siteId?: string): Promise<any> {
        return this.workshopOffline.getAssessmentFolder(workshopId, assessmentId, siteId).then((folderPath) => {
            return this.uploaderProvider.getStoredFiles(folderPath).catch(() => {
                // Ignore not found files.
                return [];
            });
        });
    }

    /**
     * Get a list of stored attachment files for an assessment and online files also. See AddonModWorkshopHelperProvider#storeFiles.
     *
     * @param filesObject Files object combining offline and online information.
     * @param workshopId Workshop ID.
     * @param assessmentId Assessment ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the files.
     */
    getAssessmentFilesFromOfflineFilesObject(filesObject: any, workshopId: number, assessmentId: number, siteId?: string):
            Promise<any> {
        return this.workshopOffline.getAssessmentFolder(workshopId, assessmentId, siteId).then((folderPath) => {
            return this.uploaderProvider.getStoredFilesFromOfflineFilesObject(filesObject, folderPath);
        });
    }

    /**
     * Returns the action of a given submission.
     *
     * @param actions Offline actions to be applied to the given submission.
     * @param submissionId ID of the submission to filter by or false.
     * @return Promise resolved with the files.
     */
    filterSubmissionActions(actions: any[], submissionId: number): any[] {
        return actions.filter((action) => {
            if (submissionId) {
                return action.submissionid == submissionId;
            } else {
                return action.submissionid < 0;
            }
        });
    }

    /**
     * Applies offline data to submission.
     *
     * @param submission Submission object to be modified.
     * @param actions Offline actions to be applied to the given submission.
     * @return Promise resolved with the files.
     */
    applyOfflineData(submission: any, actions: any[]): Promise<any> {
        if (actions.length && !submission) {
            submission = {};
        }

        let editing = true,
            attachmentsid = false,
            workshopId;

        actions.forEach((action) => {
            switch (action.action) {
                case 'add':
                    submission.id = action.submissionid;
                    editing = false;
                case 'update':
                    submission.title = action.title;
                    submission.content = action.content;
                    submission.title = action.title;
                    submission.courseid = action.courseid;
                    submission.submissionmodified = parseInt(action.timemodified, 10) / 1000;
                    submission.offline = true;
                    attachmentsid = action.attachmentsid;
                    workshopId = action.workshopid;
                    break;
                case 'delete':
                    submission.deleted = true;
                    submission.submissionmodified = parseInt(action.timemodified, 10) / 1000;
                    break;
                default:
            }
        });

        // Check offline files for latest attachmentsid.
        if (actions.length) {
            if (attachmentsid) {
                return this.getSubmissionFilesFromOfflineFilesObject(attachmentsid, workshopId, submission.id, editing)
                        .then((files) => {
                    submission.attachmentfiles = files;

                    return submission;
                });
            } else {
                submission.attachmentfiles = [];
            }
        }

        return Promise.resolve(submission);
    }

    /**
     * Prepare assessment data to be sent to the server.
     *
     * @param workshop Workshop object.
     * @param selectedValues Assessment current values
     * @param feedbackText Feedback text.
     * @param feedbackFiles Feedback attachments.
     * @param form Assessment form original data.
     * @param attachmentsId The draft file area id for attachments.
     * @return Promise resolved with the data to be sent. Or rejected with the input errors object.
     */
    prepareAssessmentData(workshop: any, selectedValues: any[], feedbackText: string, feedbackFiles: any[], form: any,
            attachmentsId: number): Promise<any> {
        if (workshop.overallfeedbackmode == 2 && !feedbackText) {
            return Promise.reject({feedbackauthor: this.translate.instant('core.err_required')});
        }

        return this.strategyDelegate.prepareAssessmentData(workshop.strategy, selectedValues, form).then((data) => {
            data.feedbackauthor = feedbackText;
            data.feedbackauthorattachmentsid = attachmentsId || 0;
            data.nodims = form.dimenssionscount;

            return data;
        });
    }

    /**
     * Calculates the real value of a grade based on real_grade_value.
     *
     * @param value Percentual value from 0 to 100.
     * @param max The maximal grade.
     * @param decimals Decimals to show in the formatted grade.
     * @return Real grade formatted.
     */
    protected realGradeValueHelper(value: number, max: number, decimals: number): string {
        if (value == null) {
            return null;
        } else if (max == 0) {
            return '0';
        } else {
            value = this.textUtils.roundToDecimals(max * value / 100, decimals);

            return this.utils.formatFloat(value);
        }
    }

    /**
     * Calculates the real value of a grades of an assessment.
     *
     * @param workshop Workshop object.
     * @param assessment Assessment data.
     * @return Assessment with real grades.
     */
    realGradeValue(workshop: any, assessment: any): any {
        assessment.grade = this.realGradeValueHelper(assessment.grade, workshop.grade, workshop.gradedecimals);
        assessment.gradinggrade = this.realGradeValueHelper(assessment.gradinggrade, workshop.gradinggrade, workshop.gradedecimals);
        assessment.gradinggradeover = this.realGradeValueHelper(assessment.gradinggradeover, workshop.gradinggrade,
                workshop.gradedecimals);

        return assessment;
    }

    /**
     * Check grade should be shown
     *
     * @param grade Grade to be shown
     * @return If grade should be shown or not.
     */
    showGrade(grade: any): boolean {
        return typeof grade !== 'undefined' && grade !== null;
    }
}
