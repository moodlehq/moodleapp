// (C) Copyright 2015 Martin Dougiamas
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
import { CoreFileProvider } from '@providers/file';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider, CoreSiteSchema } from '@providers/sites';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';

/**
 * Service to handle offline assign.
 */
@Injectable()
export class AddonModAssignOfflineProvider {

    protected logger;

    // Variables for database.
    static SUBMISSIONS_TABLE = 'addon_mod_assign_submissions';
    static SUBMISSIONS_GRADES_TABLE = 'addon_mod_assign_submissions_grading';
    protected siteSchema: CoreSiteSchema = {
        name: 'AddonModAssignOfflineProvider',
        version: 1,
        tables: [
            {
                name: AddonModAssignOfflineProvider.SUBMISSIONS_TABLE,
                columns: [
                    {
                        name: 'assignid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'courseid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'userid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'plugindata',
                        type: 'TEXT'
                    },
                    {
                        name: 'onlinetimemodified',
                        type: 'INTEGER'
                    },
                    {
                        name: 'timecreated',
                        type: 'INTEGER'
                    },
                    {
                        name: 'timemodified',
                        type: 'INTEGER'
                    },
                    {
                        name: 'submitted',
                        type: 'INTEGER'
                    },
                    {
                        name: 'submissionstatement',
                        type: 'INTEGER'
                    }
                ],
                primaryKeys: ['assignid', 'userid']
            },
            {
                name: AddonModAssignOfflineProvider.SUBMISSIONS_GRADES_TABLE,
                columns: [
                    {
                        name: 'assignid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'courseid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'userid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'grade',
                        type: 'REAL'
                    },
                    {
                        name: 'attemptnumber',
                        type: 'INTEGER'
                    },
                    {
                        name: 'addattempt',
                        type: 'INTEGER'
                    },
                    {
                        name: 'workflowstate',
                        type: 'TEXT'
                    },
                    {
                        name: 'applytoall',
                        type: 'INTEGER'
                    },
                    {
                        name: 'outcomes',
                        type: 'TEXT'
                    },
                    {
                        name: 'plugindata',
                        type: 'TEXT'
                    },
                    {
                        name: 'timemodified',
                        type: 'INTEGER'
                    }
                ],
                primaryKeys: ['assignid', 'userid']
            }
        ]
    };

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private textUtils: CoreTextUtilsProvider,
            private fileProvider: CoreFileProvider, private timeUtils: CoreTimeUtilsProvider) {
        this.logger = logger.getInstance('AddonModAssignOfflineProvider');
        this.sitesProvider.registerSiteSchema(this.siteSchema);
    }

    /**
     * Delete a submission.
     *
     * @param {number} assignId Assignment ID.
     * @param {number} [userId] User ID. If not defined, site's current user.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved if deleted, rejected if failure.
     */
    deleteSubmission(assignId: number, userId?: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return site.getDb().deleteRecords(AddonModAssignOfflineProvider.SUBMISSIONS_TABLE,
                    {assignid: assignId, userid: userId});
        });
    }

    /**
     * Delete a submission grade.
     *
     * @param {number} assignId Assignment ID.
     * @param {number} [userId] User ID. If not defined, site's current user.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved if deleted, rejected if failure.
     */
    deleteSubmissionGrade(assignId: number, userId?: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return site.getDb().deleteRecords(AddonModAssignOfflineProvider.SUBMISSIONS_GRADES_TABLE,
                    {assignid: assignId, userid: userId});
        });
    }

    /**
     * Get all the assignments ids that have something to be synced.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<number[]>} Promise resolved with assignments id that have something to be synced.
     */
    getAllAssigns(siteId?: string): Promise<number[]> {
        const promises = [];

        promises.push(this.getAllSubmissions(siteId));
        promises.push(this.getAllSubmissionsGrade(siteId));

        return Promise.all(promises).then((results) => {
            // Flatten array.
            results = [].concat.apply([], results);

            // Get assign id.
            results = results.map((object) => {
                return object.assignid;
            });

            // Get unique values.
            results = results.filter((id, pos) => {
                return results.indexOf(id) == pos;
            });

            return results;
        });
    }

    /**
     * Get all the stored submissions from all the assignments.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]} Promise resolved with submissions.
     */
    protected getAllSubmissions(siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSiteDb(siteId).then((db) => {
            return db.getAllRecords(AddonModAssignOfflineProvider.SUBMISSIONS_TABLE);
        }).then((submissions) => {

            // Parse the plugin data.
            submissions.forEach((submission) => {
                submission.plugindata = this.textUtils.parseJSON(submission.plugindata, {});
            });

            return submissions;
        });
    }

    /**
     * Get all the stored submissions grades from all the assignments.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]>} Promise resolved with submissions grades.
     */
    protected getAllSubmissionsGrade(siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSiteDb(siteId).then((db) => {
            return db.getAllRecords(AddonModAssignOfflineProvider.SUBMISSIONS_GRADES_TABLE);
        }).then((submissions) => {

            // Parse the plugin data and outcomes.
            submissions.forEach((submission) => {
                submission.outcomes = this.textUtils.parseJSON(submission.outcomes, {});
                submission.plugindata = this.textUtils.parseJSON(submission.plugindata, {});
            });

            return submissions;
        });
    }

    /**
     * Get all the stored submissions for a certain assignment.
     *
     * @param {number} assignId Assignment ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]>} Promise resolved with submissions.
     */
    getAssignSubmissions(assignId: number, siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSiteDb(siteId).then((db) => {
            return db.getRecords(AddonModAssignOfflineProvider.SUBMISSIONS_TABLE, {assignid: assignId});
        }).then((submissions) => {

            // Parse the plugin data.
            submissions.forEach((submission) => {
                submission.plugindata = this.textUtils.parseJSON(submission.plugindata, {});
            });

            return submissions;
        });
    }

    /**
     * Get all the stored submissions grades for a certain assignment.
     *
     * @param {number} assignId Assignment ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]>} Promise resolved with submissions grades.
     */
    getAssignSubmissionsGrade(assignId: number, siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSiteDb(siteId).then((db) => {
            return db.getRecords(AddonModAssignOfflineProvider.SUBMISSIONS_GRADES_TABLE, {assignid: assignId});
        }).then((submissions) => {

            // Parse the plugin data and outcomes.
            submissions.forEach((submission) => {
                submission.outcomes = this.textUtils.parseJSON(submission.outcomes, {});
                submission.plugindata = this.textUtils.parseJSON(submission.plugindata, {});
            });

            return submissions;
        });
    }

    /**
     * Get a stored submission.
     *
     * @param {number} assignId Assignment ID.
     * @param {number} [userId] User ID. If not defined, site's current user.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved with submission.
     */
    getSubmission(assignId: number, userId?: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return site.getDb().getRecord(AddonModAssignOfflineProvider.SUBMISSIONS_TABLE, {assignid: assignId, userid: userId});
        }).then((submission) => {

            // Parse the plugin data.
            submission.plugindata = this.textUtils.parseJSON(submission.plugindata, {});

            return submission;
        });
    }

    /**
     * Get the path to the folder where to store files for an offline submission.
     *
     * @param {number} assignId Assignment ID.
     * @param {number} [userId] User ID. If not defined, site's current user.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<string>} Promise resolved with the path.
     */
    getSubmissionFolder(assignId: number, userId?: number, siteId?: string): Promise<string> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            const siteFolderPath = this.fileProvider.getSiteFolder(site.getId()),
                submissionFolderPath = 'offlineassign/' + assignId + '/' + userId;

            return this.textUtils.concatenatePaths(siteFolderPath, submissionFolderPath);
        });
    }

    /**
     * Get a stored submission grade.
     * Submission grades are not identified using attempt number so it can retrieve the feedback for a previous attempt.
     *
     * @param {number} assignId Assignment ID.
     * @param {number} [userId] User ID. If not defined, site's current user.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved with submission grade.
     */
    getSubmissionGrade(assignId: number, userId?: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return site.getDb().getRecord(AddonModAssignOfflineProvider.SUBMISSIONS_GRADES_TABLE,
                    {assignid: assignId, userid: userId});
        }).then((submission) => {

            // Parse the plugin data and outcomes.
            submission.outcomes = this.textUtils.parseJSON(submission.outcomes, {});
            submission.plugindata = this.textUtils.parseJSON(submission.plugindata, {});

            return submission;
        });
    }

    /**
     * Get the path to the folder where to store files for a certain plugin in an offline submission.
     *
     * @param {number} assignId Assignment ID.
     * @param {string} pluginName Name of the plugin. Must be unique (both in submission and feedback plugins).
     * @param {number} [userId] User ID. If not defined, site's current user.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<string>} Promise resolved with the path.
     */
    getSubmissionPluginFolder(assignId: number, pluginName: string, userId?: number, siteId?: string): Promise<string> {
        return this.getSubmissionFolder(assignId, userId, siteId).then((folderPath) => {
            return this.textUtils.concatenatePaths(folderPath, pluginName);
        });
    }

    /**
     * Check if the assignment has something to be synced.
     *
     * @param {number} assignId Assignment ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with boolean: whether the assignment has something to be synced.
     */
    hasAssignOfflineData(assignId: number, siteId?: string): Promise<boolean> {
        const promises = [];

        promises.push(this.getAssignSubmissions(assignId, siteId));
        promises.push(this.getAssignSubmissionsGrade(assignId, siteId));

        return Promise.all(promises).then((results) => {
            for (let i = 0; i < results.length; i++) {
                const result = results[i];

                if (result && result.length) {
                    return true;
                }
            }

            return false;
        }).catch(() => {
            // No offline data found.
            return false;
        });
    }

    /**
     * Mark/Unmark a submission as being submitted.
     *
     * @param {number} assignId Assignment ID.
     * @param {number} courseId Course ID the assign belongs to.
     * @param {boolean} submitted True to mark as submitted, false to mark as not submitted.
     * @param {boolean} acceptStatement True to accept the submission statement, false otherwise.
     * @param {number} timemodified The time the submission was last modified in online.
     * @param {number} [userId] User ID. If not defined, site's current user.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved if marked, rejected if failure.
     */
    markSubmitted(assignId: number, courseId: number, submitted: boolean, acceptStatement: boolean, timemodified: number,
            userId?: number, siteId?: string): Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            // Check if there's a submission stored.
            return this.getSubmission(assignId, userId, site.getId()).catch(() => {
                // No submission, create an empty one.
                const now = this.timeUtils.timestamp();

                return {
                    assignid: assignId,
                    courseid: courseId,
                    userid: userId,
                    onlinetimemodified: timemodified,
                    timecreated: now,
                    timemodified: now
                };
            }).then((submission) => {
                // Mark the submission.
                submission.submitted = submitted ? 1 : 0;
                submission.submissionstatement = acceptStatement ? 1 : 0;
                submission.plugindata = submission.plugindata ? JSON.stringify(submission.plugindata) : '{}';

                return site.getDb().insertRecord(AddonModAssignOfflineProvider.SUBMISSIONS_TABLE, submission);
            });
        });
    }

    /**
     * Save a submission to be sent later.
     *
     * @param {number} assignId Assignment ID.
     * @param {number} courseId Course ID the assign belongs to.
     * @param {any} pluginData Data to save.
     * @param {number} timemodified The time the submission was last modified in online.
     * @param {boolean} submitted True if submission has been submitted, false otherwise.
     * @param {number} [userId] User ID. If not defined, site's current user.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved if stored, rejected if failure.
     */
    saveSubmission(assignId: number, courseId: number, pluginData: any, timemodified: number, submitted: boolean, userId?: number,
            siteId?: string): Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            const now = this.timeUtils.timestamp(),
                entry = {
                    assignid: assignId,
                    courseid: courseId,
                    plugindata: pluginData ? JSON.stringify(pluginData) : '{}',
                    userid: userId,
                    submitted: submitted ? 1 : 0,
                    timecreated: now,
                    timemodified: now,
                    onlinetimemodified: timemodified
                };

            return site.getDb().insertRecord(AddonModAssignOfflineProvider.SUBMISSIONS_TABLE, entry);
        });
    }

    /**
     * Save a grading to be sent later.
     *
     * @param {number} assignId Assign ID.
     * @param {number} userId User ID.
     * @param {number} courseId Course ID the assign belongs to.
     * @param {number} grade Grade to submit.
     * @param {number} attemptNumber Number of the attempt being graded.
     * @param {boolean} addAttempt Admit the user to attempt again.
     * @param {string} workflowState Next workflow State.
     * @param {boolean} applyToAll If it's a team submission, whether the grade applies to all group members.
     * @param {any} outcomes Object including all outcomes values. If empty, any of them will be sent.
     * @param {any} pluginData Plugin data to save.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved if stored, rejected if failure.
     */
    submitGradingForm(assignId: number, userId: number, courseId: number, grade: number, attemptNumber: number, addAttempt: boolean,
            workflowState: string, applyToAll: boolean, outcomes: any, pluginData: any, siteId?: string): Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const now = this.timeUtils.timestamp(),
                entry = {
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
                    timemodified: now
                };

            return site.getDb().insertRecord(AddonModAssignOfflineProvider.SUBMISSIONS_GRADES_TABLE, entry);
        });
    }
}
