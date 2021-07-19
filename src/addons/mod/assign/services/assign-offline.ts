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
import { SQLiteDBRecordValues } from '@classes/sqlitedb';
import { CoreFile } from '@services/file';
import { CoreSites } from '@services/sites';
import { CoreTextUtils } from '@services/utils/text';
import { CoreTimeUtils } from '@services/utils/time';
import { makeSingleton } from '@singletons';
import { AddonModAssignOutcomes, AddonModAssignSavePluginData } from './assign';
import {
    AddonModAssignSubmissionsDBRecord,
    AddonModAssignSubmissionsGradingDBRecord,
    SUBMISSIONS_GRADES_TABLE,
    SUBMISSIONS_TABLE,
} from './database/assign';

/**
 * Service to handle offline assign.
 */
@Injectable({ providedIn: 'root' })
export class AddonModAssignOfflineProvider {

    /**
     * Delete a submission.
     *
     * @param assignId Assignment ID.
     * @param userId User ID. If not defined, site's current user.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if deleted, rejected if failure.
     */
    async deleteSubmission(assignId: number, userId?: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        await site.getDb().deleteRecords(
            SUBMISSIONS_TABLE,
            { assignid: assignId, userid: userId },
        );
    }

    /**
     * Delete a submission grade.
     *
     * @param assignId Assignment ID.
     * @param userId User ID. If not defined, site's current user.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if deleted, rejected if failure.
     */
    async deleteSubmissionGrade(assignId: number, userId?: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        await site.getDb().deleteRecords(
            SUBMISSIONS_GRADES_TABLE,
            { assignid: assignId, userid: userId },
        );
    }

    /**
     * Get all the assignments ids that have something to be synced.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with assignments id that have something to be synced.
     */
    async getAllAssigns(siteId?: string): Promise<number[]> {
        const promises:
        Promise<AddonModAssignSubmissionsDBRecordFormatted[] | AddonModAssignSubmissionsGradingDBRecordFormatted[]>[] = [];

        promises.push(this.getAllSubmissions(siteId));
        promises.push(this.getAllSubmissionsGrade(siteId));

        const results = await Promise.all(promises);
        // Flatten array.
        const flatten: (AddonModAssignSubmissionsDBRecord | AddonModAssignSubmissionsGradingDBRecord)[] =
            [].concat.apply([], results);

        // Get assign id.
        let assignIds: number[] = flatten.map((assign) => assign.assignid);
        // Get unique values.
        assignIds = assignIds.filter((id, pos) => assignIds.indexOf(id) == pos);

        return assignIds;
    }

    /**
     * Get all the stored submissions from all the assignments.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with submissions.
     */
    protected async getAllSubmissions(siteId?: string): Promise<AddonModAssignSubmissionsDBRecordFormatted[]> {
        return this.getAssignSubmissionsFormatted(undefined, siteId);
    }

    /**
     * Get all the stored submissions for a certain assignment.
     *
     * @param assignId Assignment ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with submissions.
     */
    async getAssignSubmissions(assignId: number, siteId?: string): Promise<AddonModAssignSubmissionsDBRecordFormatted[]> {
        return this.getAssignSubmissionsFormatted({ assignid: assignId }, siteId);
    }

    /**
     * Convenience helper function to get stored submissions formatted.
     *
     * @param conditions Query conditions.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with submissions.
     */
    protected async getAssignSubmissionsFormatted(
        conditions: SQLiteDBRecordValues = {},
        siteId?: string,
    ): Promise<AddonModAssignSubmissionsDBRecordFormatted[]> {
        const db = await CoreSites.getSiteDb(siteId);

        const submissions: AddonModAssignSubmissionsDBRecord[] = await db.getRecords(SUBMISSIONS_TABLE, conditions);

        // Parse the plugin data.
        return submissions.map((submission) => ({
            assignid: submission.assignid,
            userid: submission.userid,
            courseid: submission.courseid,
            plugindata: CoreTextUtils.parseJSON<AddonModAssignSavePluginData>(submission.plugindata, {}),
            onlinetimemodified: submission.onlinetimemodified,
            timecreated: submission.timecreated,
            timemodified: submission.timemodified,
            submitted: submission.submitted,
            submissionstatement: submission.submissionstatement,
        }));
    }

    /**
     * Get all the stored submissions grades from all the assignments.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with submissions grades.
     */
    protected async getAllSubmissionsGrade(siteId?: string): Promise<AddonModAssignSubmissionsGradingDBRecordFormatted[]> {
        return this.getAssignSubmissionsGradeFormatted(undefined, siteId);
    }

    /**
     * Get all the stored submissions grades for a certain assignment.
     *
     * @param assignId Assignment ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with submissions grades.
     */
    async getAssignSubmissionsGrade(
        assignId: number,
        siteId?: string,
    ): Promise<AddonModAssignSubmissionsGradingDBRecordFormatted[]> {
        return this.getAssignSubmissionsGradeFormatted({ assignid: assignId }, siteId);
    }

    /**
     * Convenience helper function to get stored submissions grading formatted.
     *
     * @param conditions Query conditions.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with submissions grades.
     */
    protected async getAssignSubmissionsGradeFormatted(
        conditions: SQLiteDBRecordValues = {},
        siteId?: string,
    ): Promise<AddonModAssignSubmissionsGradingDBRecordFormatted[]> {
        const db = await CoreSites.getSiteDb(siteId);

        const submissions: AddonModAssignSubmissionsGradingDBRecord[] = await db.getRecords(SUBMISSIONS_GRADES_TABLE, conditions);

        // Parse the plugin data and outcomes.
        return submissions.map((submission) => ({
            assignid: submission.assignid,
            userid: submission.userid,
            courseid: submission.courseid,
            grade: submission.grade,
            attemptnumber: submission.attemptnumber,
            addattempt: submission.addattempt,
            workflowstate: submission.workflowstate,
            applytoall: submission.applytoall,
            outcomes: CoreTextUtils.parseJSON<AddonModAssignOutcomes>(submission.outcomes, {}),
            plugindata: CoreTextUtils.parseJSON<AddonModAssignSavePluginData>(submission.plugindata, {}),
            timemodified: submission.timemodified,
        }));
    }

    /**
     * Get a stored submission.
     *
     * @param assignId Assignment ID.
     * @param userId User ID. If not defined, site's current user.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with submission.
     */
    async getSubmission(assignId: number, userId?: number, siteId?: string): Promise<AddonModAssignSubmissionsDBRecordFormatted> {
        userId = userId || CoreSites.getCurrentSiteUserId();

        const submissions = await this.getAssignSubmissionsFormatted({ assignid: assignId, userid: userId }, siteId);

        if (submissions.length) {
            return submissions[0];
        }

        throw new CoreError('No records found.');
    }

    /**
     * Get the path to the folder where to store files for an offline submission.
     *
     * @param assignId Assignment ID.
     * @param userId User ID. If not defined, site's current user.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the path.
     */
    async getSubmissionFolder(assignId: number, userId?: number, siteId?: string): Promise<string> {
        const site = await CoreSites.getSite(siteId);

        userId = userId || site.getUserId();
        const siteFolderPath = CoreFile.getSiteFolder(site.getId());
        const submissionFolderPath = 'offlineassign/' + assignId + '/' + userId;

        return CoreTextUtils.concatenatePaths(siteFolderPath, submissionFolderPath);
    }

    /**
     * Get a stored submission grade.
     * Submission grades are not identified using attempt number so it can retrieve the feedback for a previous attempt.
     *
     * @param assignId Assignment ID.
     * @param userId User ID. If not defined, site's current user.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with submission grade.
     */
    async getSubmissionGrade(
        assignId: number,
        userId?: number,
        siteId?: string,
    ): Promise<AddonModAssignSubmissionsGradingDBRecordFormatted> {
        userId = userId || CoreSites.getCurrentSiteUserId();

        const submissions = await this.getAssignSubmissionsGradeFormatted({ assignid: assignId, userid: userId }, siteId);

        if (submissions.length) {
            return submissions[0];
        }

        throw new CoreError('No records found.');
    }

    /**
     * Get the path to the folder where to store files for a certain plugin in an offline submission.
     *
     * @param assignId Assignment ID.
     * @param pluginName Name of the plugin. Must be unique (both in submission and feedback plugins).
     * @param userId User ID. If not defined, site's current user.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the path.
     */
    async getSubmissionPluginFolder(assignId: number, pluginName: string, userId?: number, siteId?: string): Promise<string> {
        const folderPath = await this.getSubmissionFolder(assignId, userId, siteId);

        return CoreTextUtils.concatenatePaths(folderPath, pluginName);
    }

    /**
     * Check if the assignment has something to be synced.
     *
     * @param assignId Assignment ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with boolean: whether the assignment has something to be synced.
     */
    async hasAssignOfflineData(assignId: number, siteId?: string): Promise<boolean> {
        const promises:
        Promise<AddonModAssignSubmissionsDBRecordFormatted[] | AddonModAssignSubmissionsGradingDBRecordFormatted[]>[] = [];

        promises.push(this.getAssignSubmissions(assignId, siteId));
        promises.push(this.getAssignSubmissionsGrade(assignId, siteId));

        try {
            const results = await Promise.all(promises);

            return results.some((result) => result.length);
        } catch {
            // No offline data found.
            return false;
        }
    }

    /**
     * Mark/Unmark a submission as being submitted.
     *
     * @param assignId Assignment ID.
     * @param courseId Course ID the assign belongs to.
     * @param submitted True to mark as submitted, false to mark as not submitted.
     * @param acceptStatement True to accept the submission statement, false otherwise.
     * @param timemodified The time the submission was last modified in online.
     * @param userId User ID. If not defined, site's current user.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if marked, rejected if failure.
     */
    async markSubmitted(
        assignId: number,
        courseId: number,
        submitted: boolean,
        acceptStatement: boolean,
        timemodified: number,
        userId?: number,
        siteId?: string,
    ): Promise<number> {
        const site = await CoreSites.getSite(siteId);

        userId = userId || site.getUserId();
        let submission: AddonModAssignSubmissionsDBRecord;
        try {
            const savedSubmission: AddonModAssignSubmissionsDBRecordFormatted =
                await this.getSubmission(assignId, userId, site.getId());
            submission = Object.assign(savedSubmission, {
                plugindata: savedSubmission.plugindata ? JSON.stringify(savedSubmission.plugindata) : '{}',
                submitted: submitted ? 1 : 0, // Mark the submission.
                submissionstatement: acceptStatement ? 1 : 0, // Mark the submission.
            });
        } catch {
            // No submission, create an empty one.
            const now = CoreTimeUtils.timestamp();
            submission = {
                assignid: assignId,
                courseid: courseId,
                userid: userId,
                onlinetimemodified: timemodified,
                timecreated: now,
                timemodified: now,
                plugindata: '{}',
                submitted: submitted ? 1 : 0, // Mark the submission.
                submissionstatement: acceptStatement ? 1 : 0, // Mark the submission.
            };
        }

        return await site.getDb().insertRecord(SUBMISSIONS_TABLE, submission);
    }

    /**
     * Save a submission to be sent later.
     *
     * @param assignId Assignment ID.
     * @param courseId Course ID the assign belongs to.
     * @param pluginData Data to save.
     * @param timemodified The time the submission was last modified in online.
     * @param submitted True if submission has been submitted, false otherwise.
     * @param userId User ID. If not defined, site's current user.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if stored, rejected if failure.
     */
    async saveSubmission(
        assignId: number,
        courseId: number,
        pluginData: AddonModAssignSavePluginData,
        timemodified: number,
        submitted: boolean,
        userId?: number,
        siteId?: string,
    ): Promise<number> {
        const site = await CoreSites.getSite(siteId);

        userId = userId || site.getUserId();

        const now = CoreTimeUtils.timestamp();
        const entry: AddonModAssignSubmissionsDBRecord = {
            assignid: assignId,
            courseid: courseId,
            plugindata: pluginData ? JSON.stringify(pluginData) : '{}',
            userid: userId,
            submitted: submitted ? 1 : 0,
            timecreated: now,
            timemodified: now,
            onlinetimemodified: timemodified,
        };

        return await site.getDb().insertRecord(SUBMISSIONS_TABLE, entry);
    }

    /**
     * Save a grading to be sent later.
     *
     * @param assignId Assign ID.
     * @param userId User ID.
     * @param courseId Course ID the assign belongs to.
     * @param grade Grade to submit.
     * @param attemptNumber Number of the attempt being graded.
     * @param addAttempt Admit the user to attempt again.
     * @param workflowState Next workflow State.
     * @param applyToAll If it's a team submission, whether the grade applies to all group members.
     * @param outcomes Object including all outcomes values. If empty, any of them will be sent.
     * @param pluginData Plugin data to save.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if stored, rejected if failure.
     */
    async submitGradingForm(
        assignId: number,
        userId: number,
        courseId: number,
        grade: number,
        attemptNumber: number,
        addAttempt: boolean,
        workflowState: string,
        applyToAll: boolean,
        outcomes: AddonModAssignOutcomes,
        pluginData: AddonModAssignSavePluginData,
        siteId?: string,
    ): Promise<number> {
        const site = await CoreSites.getSite(siteId);

        const now = CoreTimeUtils.timestamp();
        const entry: AddonModAssignSubmissionsGradingDBRecord = {
            assignid: assignId,
            userid: userId,
            courseid: courseId,
            grade: grade,
            attemptnumber: attemptNumber,
            addattempt: addAttempt ? 1 : 0,
            workflowstate: workflowState,
            applytoall: applyToAll ? 1 : 0,
            outcomes: outcomes ? JSON.stringify(outcomes) : '{}',
            plugindata: pluginData ? JSON.stringify(pluginData) : '{}',
            timemodified: now,
        };

        return await site.getDb().insertRecord(SUBMISSIONS_GRADES_TABLE, entry);
    }

}
export const AddonModAssignOffline = makeSingleton(AddonModAssignOfflineProvider);

export type AddonModAssignSubmissionsDBRecordFormatted = Omit<AddonModAssignSubmissionsDBRecord, 'plugindata'> & {
    plugindata: AddonModAssignSavePluginData;
};

export type AddonModAssignSubmissionsGradingDBRecordFormatted =
    Omit<AddonModAssignSubmissionsGradingDBRecord, 'plugindata'|'outcomes'> & {
        plugindata: AddonModAssignSavePluginData;
        outcomes: AddonModAssignOutcomes;
    };
