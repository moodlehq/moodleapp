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
import { CoreFileUploaderStoreFilesResult } from '@features/fileuploader/services/fileuploader';
import { CoreFile } from '@services/file';
import { CoreSites } from '@services/sites';
import { CoreText } from '@static/text';
import { CoreTime } from '@static/time';
import { makeSingleton } from '@singletons';
import { CoreFormFields } from '@static/form';
import { CorePath } from '@static/path';
import {
    AddonModWorkshopAssessmentDBRecord,
    AddonModWorkshopEvaluateAssessmentDBRecord,
    AddonModWorkshopEvaluateSubmissionDBRecord,
    AddonModWorkshopSubmissionDBRecord,
    ASSESSMENTS_TABLE,
    EVALUATE_ASSESSMENTS_TABLE,
    EVALUATE_SUBMISSIONS_TABLE,
    SUBMISSIONS_TABLE,
} from './database/workshop';
import { AddonModWorkshopAction } from '../constants';

/**
 * Service to handle offline workshop.
 */
@Injectable({ providedIn: 'root' })
export class AddonModWorkshopOfflineProvider {

    /**
     * Get all the workshops ids that have something to be synced.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with workshops id that have something to be synced.
     */
    async getAllWorkshops(siteId?: string): Promise<number[]> {
        const promiseResults = await Promise.all([
            this.getAllSubmissions(siteId),
            this.getAllAssessments(siteId),
            this.getAllEvaluateSubmissions(siteId),
            this.getAllEvaluateAssessments(siteId),
        ]);

        const workshopIds: Record<number, number> = {};

        // Get workshops from any offline object all should have workshopid.
        promiseResults.forEach((offlineObjects) => {
            offlineObjects.forEach((offlineObject: AddonModWorkshopOfflineSubmission | AddonModWorkshopOfflineAssessment |
            AddonModWorkshopOfflineEvaluateSubmission | AddonModWorkshopOfflineEvaluateAssessment) => {
                workshopIds[offlineObject.workshopid] = offlineObject.workshopid;
            });
        });

        return Object.values(workshopIds);
    }

    /**
     * Check if there is an offline data to be synced.
     *
     * @param workshopId Workshop ID to remove.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: true if has offline data, false otherwise.
     */
    async hasWorkshopOfflineData(workshopId: number, siteId?: string): Promise<boolean> {
        try {
            const results = await Promise.all([
                this.getSubmissions(workshopId, siteId),
                this.getAssessments(workshopId, siteId),
                this.getEvaluateSubmissions(workshopId, siteId),
                this.getEvaluateAssessments(workshopId, siteId),
            ]);

            return results.some((result) => result && result.length);
        } catch {
            // No offline data found.
            return false;
        }
    }

    /**
     * Delete workshop submission action.
     *
     * @param workshopId Workshop ID.
     * @param action Action to be done.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if stored, rejected if failure.
     */
    async deleteSubmissionAction(
        workshopId: number,
        action: AddonModWorkshopAction,
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const conditions: Partial<AddonModWorkshopSubmissionDBRecord> = {
            workshopid: workshopId,
            action: action,
        };

        await site.getDb().deleteRecords(SUBMISSIONS_TABLE, conditions);
    }

    /**
     * Delete all workshop submission actions.
     *
     * @param workshopId Workshop ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if stored, rejected if failure.
     */
    async deleteAllSubmissionActions(workshopId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const conditions: Partial<AddonModWorkshopSubmissionDBRecord> = {
            workshopid: workshopId,
        };

        await site.getDb().deleteRecords(SUBMISSIONS_TABLE, conditions);
    }

    /**
     * Get the all the submissions to be synced.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the objects to be synced.
     */
    async getAllSubmissions(siteId?: string): Promise<AddonModWorkshopOfflineSubmission[]> {
        const site = await CoreSites.getSite(siteId);

        const records = await site.getDb().getRecords<AddonModWorkshopSubmissionDBRecord>(SUBMISSIONS_TABLE);

        return records.map((record) => this.parseSubmissionRecord(record));
    }

    /**
     * Get the submissions of a workshop to be synced.
     *
     * @param workshopId ID of the workshop.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the object to be synced.
     */
    async getSubmissions(workshopId: number, siteId?: string): Promise<AddonModWorkshopOfflineSubmission[]> {
        const site = await CoreSites.getSite(siteId);

        const conditions: Partial<AddonModWorkshopSubmissionDBRecord> = {
            workshopid: workshopId,
        };

        const records = await site.getDb().getRecords<AddonModWorkshopSubmissionDBRecord>(SUBMISSIONS_TABLE, conditions);

        return records.map((record) => this.parseSubmissionRecord(record));
    }

    /**
     * Get an specific action of a submission of a workshop to be synced.
     *
     * @param workshopId ID of the workshop.
     * @param action Action to be done.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the object to be synced.
     */
    async getSubmissionAction(
        workshopId: number,
        action: AddonModWorkshopAction,
        siteId?: string,
    ): Promise<AddonModWorkshopOfflineSubmission> {
        const site = await CoreSites.getSite(siteId);

        const conditions: Partial<AddonModWorkshopSubmissionDBRecord> = {
            workshopid: workshopId,
            action: action,
        };

        const record = await site.getDb().getRecord<AddonModWorkshopSubmissionDBRecord>(SUBMISSIONS_TABLE, conditions);

        return this.parseSubmissionRecord(record);
    }

    /**
     * Offline version for adding a submission action to a workshop.
     *
     * @param workshopId Workshop ID.
     * @param courseId Course ID the workshop belongs to.
     * @param title The submission title.
     * @param content The submission text content.
     * @param attachmentsId Stored attachments.
     * @param submissionId Submission Id, if action is add, the time the submission was created.
     *                     If set to 0, current time is used.
     * @param action Action to be done. ['add', 'update', 'delete']
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when submission action is successfully saved.
     */
    async saveSubmission(
        workshopId: number,
        courseId: number,
        title: string,
        content: string,
        attachmentsId: CoreFileUploaderStoreFilesResult | undefined,
        submissionId = 0,
        action: AddonModWorkshopAction,
        siteId?: string,
    ): Promise<void> {

        const site = await CoreSites.getSite(siteId);

        const timemodified = CoreTime.timestamp();

        const submission: AddonModWorkshopSubmissionDBRecord = {
            workshopid: workshopId,
            courseid: courseId,
            title: title,
            content: content,
            attachmentsid: JSON.stringify(attachmentsId),
            action: action,
            submissionid: submissionId,
            timemodified: timemodified,
        };

        await site.getDb().insertRecord(SUBMISSIONS_TABLE, submission);
    }

    /**
     * Parse "attachments" column of a submission record.
     *
     * @param record Submission record, modified in place.
     * @returns The offline submission parsed.
     */
    protected parseSubmissionRecord(record: AddonModWorkshopSubmissionDBRecord): AddonModWorkshopOfflineSubmission {
        return {
            ...record,
            attachmentsid: CoreText.parseJSON(record.attachmentsid),
        };
    }

    /**
     * Delete workshop assessment.
     *
     * @param workshopId Workshop ID.
     * @param assessmentId Assessment ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if stored, rejected if failure.
     */
    async deleteAssessment(workshopId: number, assessmentId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const conditions: Partial<AddonModWorkshopAssessmentDBRecord> = {
            workshopid: workshopId,
            assessmentid: assessmentId,
        };

        await site.getDb().deleteRecords(ASSESSMENTS_TABLE, conditions);
    }

    /**
     * Get the all the assessments to be synced.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the objects to be synced.
     */
    async getAllAssessments(siteId?: string): Promise<AddonModWorkshopOfflineAssessment[]> {
        const site = await CoreSites.getSite(siteId);

        const records = await site.getDb().getRecords<AddonModWorkshopAssessmentDBRecord>(ASSESSMENTS_TABLE);

        return records.map((record) => this.parseAssessmentRecord(record));
    }

    /**
     * Get the assessments of a workshop to be synced.
     *
     * @param workshopId ID of the workshop.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the object to be synced.
     */
    async getAssessments(workshopId: number, siteId?: string): Promise<AddonModWorkshopOfflineAssessment[]> {
        const site = await CoreSites.getSite(siteId);

        const conditions: Partial<AddonModWorkshopAssessmentDBRecord> = {
            workshopid: workshopId,
        };

        const records = await site.getDb().getRecords<AddonModWorkshopAssessmentDBRecord>(ASSESSMENTS_TABLE, conditions);

        return records.map((record) => this.parseAssessmentRecord(record));
    }

    /**
     * Get an specific assessment of a workshop to be synced.
     *
     * @param workshopId ID of the workshop.
     * @param assessmentId Assessment ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the object to be synced.
     */
    async getAssessment(workshopId: number, assessmentId: number, siteId?: string): Promise<AddonModWorkshopOfflineAssessment> {
        const site = await CoreSites.getSite(siteId);

        const conditions: Partial<AddonModWorkshopAssessmentDBRecord> = {
            workshopid: workshopId,
            assessmentid: assessmentId,
        };

        const record = await site.getDb().getRecord<AddonModWorkshopAssessmentDBRecord>(ASSESSMENTS_TABLE, conditions);

        return this.parseAssessmentRecord(record);
    }

    /**
     * Offline version for adding an assessment to a workshop.
     *
     * @param workshopId Workshop ID.
     * @param assessmentId Assessment ID.
     * @param courseId Course ID the workshop belongs to.
     * @param inputData Assessment data.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when assessment is successfully saved.
     */
    async saveAssessment(
        workshopId: number,
        assessmentId: number,
        courseId: number,
        inputData: CoreFormFields,
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const assessment: AddonModWorkshopAssessmentDBRecord = {
            workshopid: workshopId,
            courseid: courseId,
            inputdata: JSON.stringify(inputData),
            assessmentid: assessmentId,
            timemodified: CoreTime.timestamp(),
        };

        await site.getDb().insertRecord(ASSESSMENTS_TABLE, assessment);
    }

    /**
     * Parse "inpudata" column of an assessment record.
     *
     * @param record Assessnent record, modified in place.
     * @returns The offline assessment parsed.
     */
    protected parseAssessmentRecord(record: AddonModWorkshopAssessmentDBRecord): AddonModWorkshopOfflineAssessment {
        return {
            ...record,
            inputdata: CoreText.parseJSON(record.inputdata),
        };
    }

    /**
     * Delete workshop evaluate submission.
     *
     * @param workshopId Workshop ID.
     * @param submissionId Submission ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if stored, rejected if failure.
     */
    async deleteEvaluateSubmission(workshopId: number, submissionId: number, siteId?: string): Promise<void> {
        const conditions: Partial<AddonModWorkshopEvaluateSubmissionDBRecord> = {
            workshopid: workshopId,
            submissionid: submissionId,
        };

        const site = await CoreSites.getSite(siteId);

        await site.getDb().deleteRecords(EVALUATE_SUBMISSIONS_TABLE, conditions);
    }

    /**
     * Get the all the evaluate submissions to be synced.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the objects to be synced.
     */
    async getAllEvaluateSubmissions(siteId?: string): Promise<AddonModWorkshopOfflineEvaluateSubmission[]> {
        const site = await CoreSites.getSite(siteId);

        const records = await site.getDb().getRecords<AddonModWorkshopEvaluateSubmissionDBRecord>(EVALUATE_SUBMISSIONS_TABLE);

        return records.map((record) => this.parseEvaluateSubmissionRecord(record));
    }

    /**
     * Get the evaluate submissions of a workshop to be synced.
     *
     * @param workshopId ID of the workshop.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the object to be synced.
     */
    async getEvaluateSubmissions(workshopId: number, siteId?: string): Promise<AddonModWorkshopOfflineEvaluateSubmission[]> {
        const site = await CoreSites.getSite(siteId);

        const conditions: Partial<AddonModWorkshopEvaluateSubmissionDBRecord> = {
            workshopid: workshopId,
        };

        const records =
            await site.getDb().getRecords<AddonModWorkshopEvaluateSubmissionDBRecord>(EVALUATE_SUBMISSIONS_TABLE, conditions);

        return records.map((record) => this.parseEvaluateSubmissionRecord(record));
    }

    /**
     * Get an specific evaluate submission of a workshop to be synced.
     *
     * @param workshopId ID of the workshop.
     * @param submissionId Submission ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the object to be synced.
     */
    async getEvaluateSubmission(
        workshopId: number,
        submissionId: number,
        siteId?: string,
    ): Promise<AddonModWorkshopOfflineEvaluateSubmission> {
        const site = await CoreSites.getSite(siteId);

        const conditions: Partial<AddonModWorkshopEvaluateSubmissionDBRecord> = {
            workshopid: workshopId,
            submissionid: submissionId,
        };

        const record =
            await site.getDb().getRecord<AddonModWorkshopEvaluateSubmissionDBRecord>(EVALUATE_SUBMISSIONS_TABLE, conditions);

        return this.parseEvaluateSubmissionRecord(record);
    }

    /**
     * Offline version for evaluation a submission to a workshop.
     *
     * @param workshopId Workshop ID.
     * @param submissionId Submission ID.
     * @param courseId Course ID the workshop belongs to.
     * @param feedbackText The feedback for the author.
     * @param published Whether to publish the submission for other users.
     * @param gradeOver The new submission grade (empty for no overriding the grade).
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when submission evaluation is successfully saved.
     */
    async saveEvaluateSubmission(
        workshopId: number,
        submissionId: number,
        courseId: number,
        feedbackText = '',
        published?: boolean,
        gradeOver?: string,
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const submission: AddonModWorkshopEvaluateSubmissionDBRecord = {
            workshopid: workshopId,
            courseid: courseId,
            submissionid: submissionId,
            timemodified: CoreTime.timestamp(),
            feedbacktext: feedbackText,
            published: Number(published),
            gradeover: JSON.stringify(gradeOver),
        };

        await site.getDb().insertRecord(EVALUATE_SUBMISSIONS_TABLE, submission);
    }

    /**
     * Parse "published" and "gradeover" columns of an evaluate submission record.
     *
     * @param record Evaluate submission record, modified in place.
     * @returns The offline evaluate submission parsed.
     */
    protected parseEvaluateSubmissionRecord(
        record: AddonModWorkshopEvaluateSubmissionDBRecord,
    ): AddonModWorkshopOfflineEvaluateSubmission {
        return {
            ...record,
            published: Boolean(record.published),
            gradeover: CoreText.parseJSON(record.gradeover),
        };
    }

    /**
     * Delete workshop evaluate assessment.
     *
     * @param workshopId Workshop ID.
     * @param assessmentId Assessment ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if stored, rejected if failure.
     */
    async deleteEvaluateAssessment(workshopId: number, assessmentId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const conditions: Partial<AddonModWorkshopEvaluateAssessmentDBRecord> = {
            workshopid: workshopId,
            assessmentid: assessmentId,
        };

        await site.getDb().deleteRecords(EVALUATE_ASSESSMENTS_TABLE, conditions);
    }

    /**
     * Get the all the evaluate assessments to be synced.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the objects to be synced.
     */
    async getAllEvaluateAssessments(siteId?: string): Promise<AddonModWorkshopOfflineEvaluateAssessment[]> {
        const site = await CoreSites.getSite(siteId);

        const records = await site.getDb().getRecords<AddonModWorkshopEvaluateAssessmentDBRecord>(EVALUATE_ASSESSMENTS_TABLE);

        return records.map((record) => this.parseEvaluateAssessmentRecord(record));
    }

    /**
     * Get the evaluate assessments of a workshop to be synced.
     *
     * @param workshopId ID of the workshop.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the object to be synced.
     */
    async getEvaluateAssessments(workshopId: number, siteId?: string): Promise<AddonModWorkshopOfflineEvaluateAssessment[]> {
        const site = await CoreSites.getSite(siteId);

        const conditions: Partial<AddonModWorkshopEvaluateAssessmentDBRecord> = {
            workshopid: workshopId,
        };

        const records =
            await site.getDb().getRecords<AddonModWorkshopEvaluateAssessmentDBRecord>(EVALUATE_ASSESSMENTS_TABLE, conditions);

        return records.map((record) => this.parseEvaluateAssessmentRecord(record));
    }

    /**
     * Get an specific evaluate assessment of a workshop to be synced.
     *
     * @param workshopId ID of the workshop.
     * @param assessmentId Assessment ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the object to be synced.
     */
    async getEvaluateAssessment(
        workshopId: number,
        assessmentId: number,
        siteId?: string,
    ): Promise<AddonModWorkshopOfflineEvaluateAssessment> {
        const site = await CoreSites.getSite(siteId);

        const conditions: Partial<AddonModWorkshopEvaluateAssessmentDBRecord> = {
            workshopid: workshopId,
            assessmentid: assessmentId,
        };

        const record =
            await site.getDb().getRecord<AddonModWorkshopEvaluateAssessmentDBRecord>(EVALUATE_ASSESSMENTS_TABLE, conditions);

        return this.parseEvaluateAssessmentRecord(record);
    }

    /**
     * Offline version for evaluating an assessment to a workshop.
     *
     * @param workshopId Workshop ID.
     * @param assessmentId Assessment ID.
     * @param courseId Course ID the workshop belongs to.
     * @param feedbackText The feedback for the reviewer.
     * @param weight The new weight for the assessment.
     * @param gradingGradeOver The new grading grade (empty for no overriding the grade).
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when assessment evaluation is successfully saved.
     */
    async saveEvaluateAssessment(
        workshopId: number,
        assessmentId: number,
        courseId: number,
        feedbackText?: string,
        weight = 0,
        gradingGradeOver?: string,
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const assessment: AddonModWorkshopEvaluateAssessmentDBRecord = {
            workshopid: workshopId,
            courseid: courseId,
            assessmentid: assessmentId,
            timemodified: CoreTime.timestamp(),
            feedbacktext: feedbackText || '',
            weight: weight,
            gradinggradeover: JSON.stringify(gradingGradeOver),
        };

        await site.getDb().insertRecord(EVALUATE_ASSESSMENTS_TABLE, assessment);
    }

    /**
     * Parse "gradinggradeover" column of an evaluate assessment record.
     *
     * @param record Evaluate assessment record, modified in place.
     * @returns The offline evaluate assessment parsed.
     */
    protected parseEvaluateAssessmentRecord(
        record: AddonModWorkshopEvaluateAssessmentDBRecord,
    ): AddonModWorkshopOfflineEvaluateAssessment {
        return {
            ...record,
            gradinggradeover: CoreText.parseJSON(record.gradinggradeover),
        };
    }

    /**
     * Get the path to the folder where to store files for offline attachments in a workshop.
     *
     * @param workshopId Workshop ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the path.
     */
    async getWorkshopFolder(workshopId: number, siteId?: string): Promise<string> {
        const site = await CoreSites.getSite(siteId);

        const siteFolderPath = CoreFile.getSiteFolder(site.getId());
        const workshopFolderPath = `offlineworkshop/${workshopId}/`;

        return CorePath.concatenatePaths(siteFolderPath, workshopFolderPath);
    }

    /**
     * Get the path to the folder where to store files for offline submissions.
     *
     * @param workshopId Workshop ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the path.
     */
    async getSubmissionFolder(workshopId: number, siteId?: string): Promise<string> {
        const folderPath = await this.getWorkshopFolder(workshopId, siteId);

        return CorePath.concatenatePaths(folderPath, 'submission');
    }

    /**
     * Get the path to the folder where to store files for offline assessment.
     *
     * @param workshopId Workshop ID.
     * @param assessmentId Assessment ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the path.
     */
    async getAssessmentFolder(workshopId: number, assessmentId: number, siteId?: string): Promise<string> {
        let folderPath = await this.getWorkshopFolder(workshopId, siteId);

        folderPath += 'assessment/';

        return CorePath.concatenatePaths(folderPath, String(assessmentId));
    }

}
export const AddonModWorkshopOffline = makeSingleton(AddonModWorkshopOfflineProvider);

export type AddonModWorkshopOfflineSubmission = Omit<AddonModWorkshopSubmissionDBRecord, 'attachmentsid'> & {
    attachmentsid?: CoreFileUploaderStoreFilesResult;
};

export type AddonModWorkshopOfflineAssessment = Omit<AddonModWorkshopAssessmentDBRecord, 'inputdata'> & {
    inputdata: CoreFormFields;
};

export type AddonModWorkshopOfflineEvaluateSubmission =
    Omit<AddonModWorkshopEvaluateSubmissionDBRecord, 'published' | 'gradeover'> & {
        published: boolean;
        gradeover: string;
    };

export type AddonModWorkshopOfflineEvaluateAssessment =
    Omit<AddonModWorkshopEvaluateAssessmentDBRecord, 'gradinggradeover'> & {
        gradinggradeover: string;
    };
