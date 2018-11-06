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
import { CoreAppProvider } from '@providers/app';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCommentsProvider } from '@core/comments/providers/comments';
import { CoreUserProvider } from '@core/user/providers/user';
import { CoreGradesProvider } from '@core/grades/providers/grades';
import { AddonModAssignSubmissionDelegate } from './submission-delegate';
import { AddonModAssignOfflineProvider } from './assign-offline';
import { CoreSiteWSPreSets } from '@classes/site';
import { CoreInterceptor } from '@classes/interceptor';

/**
 * Service that provides some functions for assign.
 */
@Injectable()
export class AddonModAssignProvider {
    static COMPONENT = 'mmaModAssign';
    static SUBMISSION_COMPONENT = 'mmaModAssignSubmission';
    static UNLIMITED_ATTEMPTS = -1;

    // Submission status.
    static SUBMISSION_STATUS_NEW = 'new';
    static SUBMISSION_STATUS_REOPENED = 'reopened';
    static SUBMISSION_STATUS_DRAFT = 'draft';
    static SUBMISSION_STATUS_SUBMITTED = 'submitted';

    // "Re-open" methods (to retry the assign).
    static ATTEMPT_REOPEN_METHOD_NONE = 'none';
    static ATTEMPT_REOPEN_METHOD_MANUAL = 'manual';

    // Grading status.
    static GRADING_STATUS_GRADED = 'graded';
    static GRADING_STATUS_NOT_GRADED = 'notgraded';
    static MARKING_WORKFLOW_STATE_RELEASED = 'released';
    static NEED_GRADING = 'needgrading';

    // Events.
    static SUBMISSION_SAVED_EVENT = 'addon_mod_assign_submission_saved';
    static SUBMITTED_FOR_GRADING_EVENT = 'addon_mod_assign_submitted_for_grading';
    static GRADED_EVENT = 'addon_mod_assign_graded';

    protected ROOT_CACHE_KEY = 'mmaModAssign:';

    protected logger;
    protected gradingOfflineEnabled: {[siteId: string]: boolean}  = {};

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private textUtils: CoreTextUtilsProvider,
            private timeUtils: CoreTimeUtilsProvider, private appProvider: CoreAppProvider, private utils: CoreUtilsProvider,
            private userProvider: CoreUserProvider, private submissionDelegate: AddonModAssignSubmissionDelegate,
            private gradesProvider: CoreGradesProvider, private filepoolProvider: CoreFilepoolProvider,
            private assignOffline: AddonModAssignOfflineProvider, private commentsProvider: CoreCommentsProvider) {
        this.logger = logger.getInstance('AddonModAssignProvider');
    }

    /**
     * Check if the user can submit in offline. This should only be used if submissionStatus.lastattempt.cansubmit cannot
     * be used (offline usage).
     * This function doesn't check if the submission is empty, it should be checked before calling this function.
     *
     * @param {any} assign  Assignment instance.
     * @param {any} submissionStatus Submission status returned by getSubmissionStatus.
     * @return {boolean} Whether it can submit.
     */
    canSubmitOffline(assign: any, submissionStatus: any): boolean {
        if (!this.isSubmissionOpen(assign, submissionStatus)) {
            return false;
        }

        const userSubmission = submissionStatus.lastattempt.submission,
            teamSubmission = submissionStatus.lastattempt.teamsubmission;

        if (teamSubmission) {
            if (teamSubmission.status === AddonModAssignProvider.SUBMISSION_STATUS_SUBMITTED) {
                // The assignment submission has been completed.
                return false;
            } else if (userSubmission && userSubmission.status === AddonModAssignProvider.SUBMISSION_STATUS_SUBMITTED) {
                // The user has already clicked the submit button on the team submission.
                return false;
            } else if (assign.preventsubmissionnotingroup && !submissionStatus.lastattempt.submissiongroup) {
                return false;
            }
        } else if (userSubmission) {
            if (userSubmission.status === AddonModAssignProvider.SUBMISSION_STATUS_SUBMITTED) {
                // The assignment submission has been completed.
                return false;
            }
        } else {
            // No valid submission or team submission.
            return false;
        }

        // Last check is that this instance allows drafts.
        return assign.submissiondrafts;
    }

    /**
     * Get an assignment by course module ID.
     *
     * @param {number} courseId Course ID the assignment belongs to.
     * @param {number} cmId Assignment module ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved with the assignment.
     */
    getAssignment(courseId: number, cmId: number, siteId?: string): Promise<any> {
        return this.getAssignmentByField(courseId, 'cmid', cmId, siteId);
    }

    /**
     * Get an assigment with key=value. If more than one is found, only the first will be returned.
     *
     * @param {number} courseId Course ID.
     * @param {string} key Name of the property to check.
     * @param {any} value Value to search.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the assignment is retrieved.
     */
    protected getAssignmentByField(courseId: number, key: string, value: any, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    courseids: [courseId]
                },
                preSets = {
                    cacheKey: this.getAssignmentCacheKey(courseId)
                };

            return site.read('mod_assign_get_assignments', params, preSets).then((response) => {
                // Search the assignment to return.
                if (response.courses && response.courses.length) {
                    const assignments = response.courses[0].assignments;

                    for (let i = 0; i < assignments.length; i++) {
                        if (assignments[i][key] == value) {
                            return assignments[i];
                        }
                    }
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get an assignment by instance ID.
     *
     * @param {number} courseId Course ID the assignment belongs to.
     * @param {number} cmId Assignment instance ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}  Promise resolved with the assignment.
     */
    getAssignmentById(courseId: number, id: number, siteId?: string): Promise<any> {
        return this.getAssignmentByField(courseId, 'id', id, siteId);
    }

    /**
     * Get cache key for assignment data WS calls.
     *
     * @param {number} courseId Course ID.
     * @return {string} Cache key.
     */
    protected getAssignmentCacheKey(courseId: number): string {
        return this.ROOT_CACHE_KEY + 'assignment:' + courseId;
    }

    /**
     * Get an assignment user mapping for blind marking.
     *
     * @param {number} assignId Assignment Id.
     * @param {number} userId User Id to be blinded.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<number>} Promise resolved with the user blind id.
     */
    getAssignmentUserMappings(assignId: number, userId: number, siteId?: string): Promise<number> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    assignmentids: [assignId]
                },
                preSets = {
                    cacheKey: this.getAssignmentUserMappingsCacheKey(assignId)
                };

            return site.read('mod_assign_get_user_mappings', params, preSets).then((response) => {
                // Search the user.
                if (response.assignments && response.assignments.length) {
                    if (!userId || userId < 0) {
                        // User not valid, stop.
                        return -1;
                    }

                    const assignment = response.assignments[0];

                    if (assignment.assignmentid == assignId) {
                        const mappings = assignment.mappings;

                        for (let i = 0; i < mappings.length; i++) {
                            if (mappings[i].userid == userId) {
                                return mappings[i].id;
                            }
                        }
                    }
                } else if (response.warnings && response.warnings.length) {
                    return Promise.reject(response.warnings[0]);
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get cache key for assignment user mappings data WS calls.
     *
     * @param {number} assignId Assignment ID.
     * @return {string} Cache key.
     */
    protected getAssignmentUserMappingsCacheKey(assignId: number): string {
        return this.ROOT_CACHE_KEY + 'usermappings:' + assignId;
    }

    /**
     * Find participant on a list.
     *
     * @param {any[]} participants List of participants.
     * @param {number} id ID of the participant to get.
     * @return {any} Participant, undefined if not found.
     */
    protected getParticipantFromUserId(participants: any[], id: number): any {
        if (participants) {
            for (const i in participants) {
                if (participants[i].id == id) {
                    // Remove the participant from the list and return it.
                    const participant = participants[i];
                    delete participants[i];

                    return participant;
                }
            }
        }
    }

    /**
     * Returns the color name for a given grading status name.
     *
     * @param {string} status Grading status name
     * @return {string} The color name.
     */
    getSubmissionGradingStatusColor(status: string): string {
        if (!status) {
            return '';
        }

        if (status == AddonModAssignProvider.GRADING_STATUS_GRADED ||
                status == AddonModAssignProvider.MARKING_WORKFLOW_STATE_RELEASED) {
            return 'success';
        }

        return 'danger';
    }

    /**
     * Returns the translation id for a given grading status name.
     *
     * @param {string} status Grading Status name
     * @return {string} The status translation identifier.
     */
    getSubmissionGradingStatusTranslationId(status: string): string {
        if (!status) {
            return;
        }

        if (status == AddonModAssignProvider.GRADING_STATUS_GRADED || status == AddonModAssignProvider.GRADING_STATUS_NOT_GRADED) {
            return 'addon.mod_assign.' + status;
        }

        return 'addon.mod_assign.markingworkflowstate' + status;
    }

    /**
     * Get the submission object from an attempt.
     *
     * @param {any} assign Assign.
     * @param {any} attempt Attempt.
     * @return {any} Submission object.
     */
    getSubmissionObjectFromAttempt(assign: any, attempt: any): any {
        return assign.teamsubmission ? attempt.teamsubmission : attempt.submission;
    }

    /**
     * Get attachments of a submission plugin.
     *
     * @param {any} submissionPlugin Submission plugin.
     * @return {any[]} Submission plugin attachments.
     */
    getSubmissionPluginAttachments(submissionPlugin: any): any[] {
        const files = [];

        if (submissionPlugin.fileareas) {
            submissionPlugin.fileareas.forEach((filearea) => {
                if (!filearea || !filearea.files) {
                    // No files to get.
                    return;
                }

                filearea.files.forEach((file) => {
                    let filename;

                    if (file.filename) {
                        filename = file.filename;
                    } else {
                        // We don't have filename, extract it from the path.
                        filename = file.filepath[0] == '/' ? file.filepath.substr(1) : file.filepath;
                    }

                    files.push({
                        filename: filename,
                        fileurl: file.fileurl
                    });
                });
            });
        }

        return files;
    }

    /**
     * Get text of a submission plugin.
     *
     * @param {any} submissionPlugin Submission plugin.
     * @param {boolean} [keepUrls] True if it should keep original URLs, false if they should be replaced.
     * @return {string} Submission text.
     */
    getSubmissionPluginText(submissionPlugin: any, keepUrls?: boolean): string {
        let text = '';

        if (submissionPlugin.editorfields) {
            submissionPlugin.editorfields.forEach((field) => {
                text += field.text;
            });

            if (!keepUrls && submissionPlugin.fileareas && submissionPlugin.fileareas[0]) {
                text = this.textUtils.replacePluginfileUrls(text, submissionPlugin.fileareas[0].files);
            }
        }

        return text;
    }

    /**
     * Get an assignment submissions.
     *
     * @param {number} assignId Assignment id.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<{canviewsubmissions: boolean, submissions?: any[]}>} Promise resolved when done.
     */
    getSubmissions(assignId: number, siteId?: string): Promise<{canviewsubmissions: boolean, submissions?: any[]}> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    assignmentids: [assignId]
                },
                preSets = {
                    cacheKey: this.getSubmissionsCacheKey(assignId)
                };

            return site.read('mod_assign_get_submissions', params, preSets).then((response): any => {
                // Check if we can view submissions, with enough permissions.
                if (response.warnings.length > 0 && response.warnings[0].warningcode == 1) {
                    return {canviewsubmissions: false};
                }

                if (response.assignments && response.assignments.length) {
                    return {
                        canviewsubmissions: true,
                        submissions: response.assignments[0].submissions
                    };
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get cache key for assignment submissions data WS calls.
     *
     * @param {number} assignId Assignment id.
     * @return {string} Cache key.
     */
    protected getSubmissionsCacheKey(assignId: number): string {
        return this.ROOT_CACHE_KEY + 'submissions:' + assignId;
    }

    /**
     * Get information about an assignment submission status for a given user.
     *
     * @param {number} assignId Assignment instance id.
     * @param {number} [userId] User id (empty for current user).
     * @param {boolean} [isBlind] If blind marking is enabled or not.
     * @param {number} [filter=true] True to filter WS response and rewrite URLs, false otherwise.
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param {string} [siteId] Site id (empty for current site).
     * @return {Promise<any>} Promise always resolved with the user submission status.
     */
    getSubmissionStatus(assignId: number, userId?: number, isBlind?: boolean, filter: boolean = true, ignoreCache?: boolean,
            siteId?: string): Promise<any> {

        userId = userId || 0;

        return this.sitesProvider.getSite(siteId).then((site) => {

            const params = {
                    assignid: assignId,
                    userid: userId
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getSubmissionStatusCacheKey(assignId, userId, isBlind),
                    getCacheUsingCacheKey: true, // We use the cache key to take isBlind into account.
                    filter: filter,
                    rewriteurls: filter
                };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            if (!filter) {
                // Don't cache when getting text without filters.
                // @todo Change this to support offline editing.
                preSets.saveToCache = false;
            }

            return site.read('mod_assign_get_submission_status', params, preSets);
        });
    }

    /**
     * Get cache key for get submission status data WS calls.
     *
     * @param {number} assignId Assignment instance id.
     * @param {number} [userId] User id (empty for current user).
     * @param {number} [isBlind] If blind marking is enabled or not.
     * @return {string} Cache key.
     */
    protected getSubmissionStatusCacheKey(assignId: number, userId: number, isBlind?: boolean): string {
        if (!userId) {
            isBlind = false;
            userId = this.sitesProvider.getCurrentSiteUserId();
        }

        return this.getSubmissionsCacheKey(assignId) + ':' + userId + ':' + (isBlind ? 1 : 0);
    }

    /**
     * Returns the color name for a given status name.
     *
     * @param {string} status Status name
     * @return {string} The color name.
     */
    getSubmissionStatusColor(status: string): string {
        switch (status) {
            case 'submitted':
                return 'success';
            case 'draft':
                return 'info';
            case 'new':
            case 'noattempt':
            case 'noonlinesubmissions':
            case 'nosubmission':
                return 'danger';
            default:
                return 'light';
        }
    }

    /**
     * Get user data for submissions since they only have userid.
     *
     * @param {any[]} submissions Submissions to get the data for.
     * @param {number} courseId ID of the course the submissions belong to.
     * @param {number} assignId ID of the assignment the submissions belong to.
     * @param {boolean} [blind] Whether the user data need to be blinded.
     * @param {any[]} [participants] List of participants in the assignment.
     * @param {string} [siteId] Site id (empty for current site).
     * @return {Promise<any[]>} Promise always resolved. Resolve param is the formatted submissions.
     */
    getSubmissionsUserData(submissions: any[], courseId: number, assignId: number, blind?: boolean, participants?: any[],
            siteId?: string): Promise<any[]> {

        const promises = [],
            subs = [],
            hasParticipants = participants && participants.length > 0;

        submissions.forEach((submission) => {
            submission.submitid = submission.userid > 0 ? submission.userid : submission.blindid;
            if (submission.submitid <= 0) {
                return;
            }

            const participant = this.getParticipantFromUserId(participants, submission.submitid);
            if (hasParticipants && !participant) {
                // Avoid permission denied error. Participant not found on list.
                return;
            }

            if (participant) {
                if (!blind) {
                    submission.userfullname = participant.fullname;
                    submission.userprofileimageurl = participant.profileimageurl;
                }

                submission.manyGroups = !!participant.groups && participant.groups.length > 1;
                if (participant.groupname) {
                    submission.groupid = participant.groupid;
                    submission.groupname = participant.groupname;
                }
            }

            let promise;
            if (submission.userid > 0) {
                if (blind) {
                    // Blind but not blinded! (Moodle < 3.1.1, 3.2).
                    delete submission.userid;

                    promise = this.getAssignmentUserMappings(assignId, submission.submitid, siteId).then((blindId) => {
                        submission.blindid = blindId;
                    });
                } else if (!participant) {
                    // No blind, no participant.
                    promise = this.userProvider.getProfile(submission.userid, courseId, true).then((user) => {
                        submission.userfullname = user.fullname;
                        submission.userprofileimageurl = user.profileimageurl;
                    }).catch(() => {
                        // Error getting profile, resolve promise without adding any extra data.
                    });
                }
            }

            promise = promise || Promise.resolve();

            promises.push(promise.then(() => {
                // Add to the list.
                if (submission.userfullname || submission.blindid) {
                    subs.push(submission);
                }
            }));
        });

        return Promise.all(promises).then(() => {
            if (hasParticipants) {
                // Create a submission for each participant left in the list (the participants already treated were removed).
                participants.forEach((participant) => {
                    const submission: any = {
                        submitid: participant.id
                    };

                    if (!blind) {
                        submission.userid = participant.id;
                        submission.userfullname = participant.fullname;
                        submission.userprofileimageurl = participant.profileimageurl;
                    } else {
                        submission.blindid = participant.id;
                    }

                    if (participant.groupname) {
                        submission.groupid = participant.groupid;
                        submission.groupname = participant.groupname;
                    }
                    submission.status = participant.submitted ? AddonModAssignProvider.SUBMISSION_STATUS_SUBMITTED :
                            AddonModAssignProvider.SUBMISSION_STATUS_NEW;

                    subs.push(submission);
                });
            }

            return subs;
        });
    }

    /**
     * Given a list of plugins, returns the plugin names that aren't supported for editing.
     *
     * @param {any[]} plugins Plugins to check.
     * @return {Promise<string[]>} Promise resolved with unsupported plugin names.
     */
    getUnsupportedEditPlugins(plugins: any[]): Promise<string[]> {
        const notSupported = [],
            promises = [];

        plugins.forEach((plugin) => {
            promises.push(this.submissionDelegate.isPluginSupportedForEdit(plugin.type).then((enabled) => {
                if (!enabled) {
                    notSupported.push(plugin.name);
                }
            }));
        });

        return Promise.all(promises).then(() => {
            return notSupported;
        });
    }

    /**
     * List the participants for a single assignment, with some summary info about their submissions.
     *
     * @param {number} assignId Assignment id.
     * @param {number} [groupId] Group id. If not defined, 0.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]>} Promise resolved with the list of participants and summary of submissions.
     */
    listParticipants(assignId: number, groupId?: number, siteId?: string): Promise<any[]> {
        groupId = groupId || 0;

        return this.sitesProvider.getSite(siteId).then((site) => {
            if (!site.wsAvailable('mod_assign_list_participants')) {
                // Silently fail if is not available. (needs Moodle version >= 3.2)
                return Promise.reject(null);
            }

            const params = {
                    assignid: assignId,
                    groupid: groupId,
                    filter: ''
                },
                preSets = {
                    cacheKey: this.listParticipantsCacheKey(assignId, groupId)
                };

            return site.read('mod_assign_list_participants', params, preSets);
        });
    }

    /**
     * Get cache key for assignment list participants data WS calls.
     *
     * @param {number} assignId Assignment id.
     * @param {number} groupId Group id.
     * @return {string} Cache key.
     */
    protected listParticipantsCacheKey(assignId: number, groupId: number): string {
        return this.listParticipantsPrefixCacheKey(assignId) + ':' + groupId;
    }

    /**
     * Get prefix cache key for assignment list participants data WS calls.
     *
     * @param {number} assignId Assignment id.
     * @return {string} Cache key.
     */
    protected listParticipantsPrefixCacheKey(assignId: number): string {
        return this.ROOT_CACHE_KEY + 'participants:' + assignId;
    }

    /**
     * Invalidates all submission status data.
     *
     * @param {number} assignId Assignment instance id.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateAllSubmissionData(assignId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getSubmissionsCacheKey(assignId));
        });
    }

    /**
     * Invalidates assignment data WS calls.
     *
     * @param {number} courseId Course ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateAssignmentData(courseId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getAssignmentCacheKey(courseId));
        });
    }

    /**
     * Invalidates assignment user mappings data WS calls.
     *
     * @param {number} assignId Assignment ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateAssignmentUserMappingsData(assignId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getAssignmentUserMappingsCacheKey(assignId));
        });
    }

    /**
     * Invalidate the prefetched content except files.
     * To invalidate files, use AddonModAssignProvider.invalidateFiles.
     *
     * @param {number} moduleId The module ID.
     * @param {number} courseId Course ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateContent(moduleId: number, courseId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.getAssignment(courseId, moduleId, siteId).then((assign) => {
            const promises = [];

            // Do not invalidate assignment data before getting assignment info, we need it!
            promises.push(this.invalidateAllSubmissionData(assign.id, siteId));
            promises.push(this.invalidateAssignmentUserMappingsData(assign.id, siteId));
            promises.push(this.invalidateListParticipantsData(assign.id, siteId));
            promises.push(this.commentsProvider.invalidateCommentsByInstance('module', assign.id, siteId));
            promises.push(this.invalidateAssignmentData(courseId, siteId));
            promises.push(this.gradesProvider.invalidateAllCourseGradesData(courseId));

            return Promise.all(promises);
        });
    }

    /**
     * Invalidate the prefetched files.
     *
     * @param {number} moduleId The module ID.
     * @return {Promise<any>} Promise resolved when the files are invalidated.
     */
     invalidateFiles(moduleId: number): Promise<any> {
         return this.filepoolProvider.invalidateFilesByComponent(this.sitesProvider.getCurrentSiteId(),
                 AddonModAssignProvider.COMPONENT, moduleId);
     }

    /**
     * Invalidates assignment submissions data WS calls.
     *
     * @param {number} assignId Assignment instance id.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateSubmissionData(assignId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getSubmissionsCacheKey(assignId));
        });
    }

    /**
     * Invalidates submission status data.
     *
     * @param {number} assignId Assignment instance id.
     * @param {number} [userId] User id (empty for current user).
     * @param {boolean} [isBlind] Whether blind marking is enabled or not.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateSubmissionStatusData(assignId: number, userId?: number, isBlind?: boolean, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getSubmissionStatusCacheKey(assignId, userId, isBlind));
        });
    }

    /**
     * Invalidates assignment participants data.
     *
     * @param {number} assignId Assignment instance id.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateListParticipantsData(assignId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.listParticipantsPrefixCacheKey(assignId));
        });
    }

    /**
     * Convenience function to check if grading offline is enabled.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with boolean: whether grading offline is enabled.
     */
    protected isGradingOfflineEnabled(siteId?: string): Promise<boolean> {
        if (typeof this.gradingOfflineEnabled[siteId] != 'undefined') {
            return Promise.resolve(this.gradingOfflineEnabled[siteId]);
        }

        return this.gradesProvider.isGradeItemsAvalaible(siteId).then((enabled) => {
            this.gradingOfflineEnabled[siteId] = enabled;

            return enabled;
        });
    }

    /**
     * Outcomes only can be edited if mod_assign_submit_grading_form is avalaible.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with true if outcomes edit is enabled, rejected or resolved with false otherwise.
     * @since 3.2
     */
    isOutcomesEditEnabled(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.wsAvailable('mod_assign_submit_grading_form');
        });
    }

    /**
     * Check if assignments plugin is enabled in a certain site.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {boolean} Whether the plugin is enabled.
     */
    isPluginEnabled(siteId?: string): boolean {
        return true;
    }

    /**
     * Check if a submission is open. This function is based on Moodle's submissions_open.
     *
     * @param {any} assign Assignment instance.
     * @param {any} submissionStatus Submission status returned by getSubmissionStatus.
     * @return {boolean} Whether submission is open.
     */
    isSubmissionOpen(assign: any, submissionStatus: any): boolean {
        if (!assign || !submissionStatus) {
            return false;
        }

        const time = this.timeUtils.timestamp(),
            lastAttempt = submissionStatus.lastattempt,
            submission = this.getSubmissionObjectFromAttempt(assign, lastAttempt);

        let dateOpen = true,
            finalDate;

        if (assign.cutoffdate) {
            finalDate = assign.cutoffdate;
        }

        if (lastAttempt && lastAttempt.locked) {
            return false;
        }

        // User extensions.
        if (finalDate) {
            if (lastAttempt && lastAttempt.extensionduedate) {
                // Extension can be before cut off date.
                if (lastAttempt.extensionduedate > finalDate) {
                    finalDate = lastAttempt.extensionduedate;
                }
            }
        }

        if (finalDate) {
            dateOpen = assign.allowsubmissionsfromdate <= time && time <= finalDate;
        } else {
            dateOpen = assign.allowsubmissionsfromdate <= time;
        }

        if (!dateOpen) {
            return false;
        }

        if (submission) {
            if (assign.submissiondrafts && submission.status == AddonModAssignProvider.SUBMISSION_STATUS_SUBMITTED) {
                // Drafts are tracked and the student has submitted the assignment.
                return false;
            }
        }

        return true;
    }

    /**
     * Report an assignment submission as being viewed.
     *
     * @param {number} assignId Assignment ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the WS call is successful.
     */
    logSubmissionView(assignId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                assignid: assignId
            };

            return site.write('mod_assign_view_submission_status', params);
        });
    }

    /**
     * Report an assignment grading table is being viewed.
     *
     * @param {number} assignId Assignment ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the WS call is successful.
     */
    logGradingView(assignId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                assignid: assignId
            };

            return site.write('mod_assign_view_grading_table', params);
        });
    }

    /**
     * Report an assign as being viewed.
     *
     * @param {number} assignId Assignment ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the WS call is successful.
     */
    logView(assignId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                assignid: assignId
            };

            return site.write('mod_assign_view_assign', params);
        });
    }

    /**
     * Returns if a submissions needs to be graded.
     *
     * @param {any} submission Submission.
     * @param {number} assignId Assignment ID.
     * @return {Promise<boolean>} Promise resolved with boolean: whether it needs to be graded or not.
     */
    needsSubmissionToBeGraded(submission: any, assignId: number): Promise<boolean> {
        if (!submission.gradingstatus) {
            // This should not happen, but it's better to show rather than not showing any of the submissions.
            return Promise.resolve(true);
        }

        if (submission.gradingstatus != AddonModAssignProvider.GRADING_STATUS_GRADED &&
                submission.gradingstatus != AddonModAssignProvider.MARKING_WORKFLOW_STATE_RELEASED) {
            // Not graded.
            return Promise.resolve(true);
        }

        // We need more data to decide that.
        return this.getSubmissionStatus(assignId, submission.submitid, submission.blindid).then((response) => {
            if (!response.feedback || !response.feedback.gradeddate) {
                // Not graded.
                return true;
            }

            // Submitted after grading?
            return response.feedback.gradeddate < submission.timemodified;
        });
    }

    /**
     * Save current user submission for a certain assignment.
     *
     * @param {number} assignId Assign ID.
     * @param {number} courseId Course ID the assign belongs to.
     * @param {any} pluginData Data to save.
     * @param {boolean} allowOffline Whether to allow offline usage.
     * @param {number} timemodified The time the submission was last modified in online.
     * @param {boolean} [allowsDrafts] Whether the assignment allows submission drafts.
     * @param {number} [userId] User ID. If not defined, site's current user.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with true if sent to server, resolved with false if stored in offline.
     */
    saveSubmission(assignId: number, courseId: number, pluginData: any, allowOffline: boolean, timemodified: number,
            allowsDrafts?: boolean, userId?: number, siteId?: string): Promise<boolean> {

        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Function to store the submission to be synchronized later.
        const storeOffline = (): Promise<boolean> => {
            return this.assignOffline.saveSubmission(assignId, courseId, pluginData, timemodified, !allowsDrafts, userId, siteId)
                    .then(() => {
                return false;
            });
        };

        if (allowOffline && !this.appProvider.isOnline()) {
            // App is offline, store the action.
            return storeOffline();
        }

        // If there's already a submission to be sent to the server, discard it first.
        return this.assignOffline.deleteSubmission(assignId, userId, siteId).then(() => {
            return this.saveSubmissionOnline(assignId, pluginData, siteId).then(() => {
                return true;
            }).catch((error) => {
                if (allowOffline && error && !this.utils.isWebServiceError(error)) {
                    // Couldn't connect to server, store in offline.
                    return storeOffline();
                } else {
                    // The WebService has thrown an error or offline not supported, reject.
                    return Promise.reject(error);
                }
            });
        });
    }

    /**
     * Save current user submission for a certain assignment. It will fail if offline or cannot connect.
     *
     * @param {number} assignId Assign ID.
     * @param {any} pluginData Data to save.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when saved, rejected otherwise.
     */
    saveSubmissionOnline(assignId: number, pluginData: any, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                assignmentid: assignId,
                plugindata: pluginData
            };

            return site.write('mod_assign_save_submission', params).then((warnings) => {
                if (warnings && warnings.length) {
                    // The WebService returned warnings, reject.
                    return Promise.reject(warnings[0]);
                }
            });
        });
    }

    /**
     * Submit the current user assignment for grading.
     *
     * @param {number} assignId Assign ID.
     * @param {number} courseId Course ID the assign belongs to.
     * @param {boolean} acceptStatement True if submission statement is accepted, false otherwise.
     * @param {number} timemodified The time the submission was last modified in online.
     * @param {boolean} [forceOffline] True to always mark it in offline.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with true if sent to server, resolved with false if stored in offline.
     */
    submitForGrading(assignId: number, courseId: number, acceptStatement: boolean, timemodified: number, forceOffline?: boolean,
            siteId?: string): Promise<boolean> {

        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Function to store the submission to be synchronized later.
        const storeOffline = (): Promise<boolean> => {
            return this.assignOffline.markSubmitted(assignId, courseId, true, acceptStatement, timemodified, undefined, siteId)
                    .then(() => {
                return false;
            });
        };

        if (forceOffline || !this.appProvider.isOnline()) {
            // App is offline, store the action.
            return storeOffline();
        }

        // If there's already a submission to be sent to the server, discard it first.
        return this.assignOffline.deleteSubmission(assignId, undefined, siteId).then(() => {
            return this.submitForGradingOnline(assignId, acceptStatement, siteId).then(() => {
                return true;
            }).catch((error) => {
                if (error && !this.utils.isWebServiceError(error)) {
                    // Couldn't connect to server, store in offline.
                    return storeOffline();
                } else {
                    // The WebService has thrown an error, reject.
                    return Promise.reject(error);
                }
            });
        });
    }

    /**
     * Submit the current user assignment for grading. It will fail if offline or cannot connect.
     *
     * @param {number} assignId Assign ID.
     * @param {boolean} acceptStatement True if submission statement is accepted, false otherwise.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when submitted, rejected otherwise.
     */
    submitForGradingOnline(assignId: number, acceptStatement: boolean, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                assignmentid: assignId,
                acceptsubmissionstatement: acceptStatement ? 1 : 0
            };

            return site.write('mod_assign_submit_for_grading', params).then((warnings) => {
                if (warnings && warnings.length) {
                    // The WebService returned warnings, reject.
                    return Promise.reject(warnings[0]);
                }
            });
        });
    }

    /**
     * Submit the grading for the current user and assignment. It will use old or new WS depending on availability.
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
     * @param {any} pluginData Feedback plugin data to save.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with true if sent to server, resolved with false if stored offline.
     */
    submitGradingForm(assignId: number, userId: number, courseId: number, grade: number, attemptNumber: number, addAttempt: boolean,
            workflowState: string, applyToAll: boolean, outcomes: any, pluginData: any, siteId?: string): Promise<boolean> {

        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Function to store the grading to be synchronized later.
        const storeOffline = (): Promise<boolean> => {
            return this.assignOffline.submitGradingForm(assignId, userId, courseId, grade, attemptNumber, addAttempt, workflowState,
                    applyToAll, outcomes, pluginData, siteId).then(() => {
                return false;
            });
        };

        // Grading offline is only allowed if WS of grade items is enabled to avoid inconsistency.
        return this.isGradingOfflineEnabled(siteId).then((enabled) => {
            if (!enabled) {
                return this.submitGradingFormOnline(assignId, userId, grade, attemptNumber, addAttempt, workflowState,
                        applyToAll, outcomes, pluginData, siteId);
            }

            if (!this.appProvider.isOnline()) {
                // App is offline, store the action.
                return storeOffline();
            }

            // If there's already a grade to be sent to the server, discard it first.
            return this.assignOffline.deleteSubmissionGrade(assignId, userId, siteId).then(() => {
                return this.submitGradingFormOnline(assignId, userId, grade, attemptNumber, addAttempt, workflowState, applyToAll,
                        outcomes, pluginData, siteId).then(() => {
                    return true;
                }).catch((error) => {
                    if (error && !this.utils.isWebServiceError(error)) {
                        // Couldn't connect to server, store in offline.
                        return storeOffline();
                    } else {
                        // The WebService has thrown an error, reject.
                        return Promise.reject(error);
                    }
                });
            });
        });
    }

    /**
     * Submit the grading for the current user and assignment. It will use old or new WS depending on availability.
     * It will fail if offline or cannot connect.
     *
     * @param {number} assignId Assign ID.
     * @param {number} userId User ID.
     * @param {number} grade Grade to submit.
     * @param {number} attemptNumber Number of the attempt being graded.
     * @param {number} addAttempt Allow the user to attempt again.
     * @param {string} workflowState Next workflow State.
     * @param {boolean} applyToAll If it's a team submission, if the grade applies to all group members.
     * @param {any} outcomes Object including all outcomes values. If empty, any of them will be sent.
     * @param {any} pluginData Feedback plugin data to save.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when submitted, rejected otherwise.
     */
    submitGradingFormOnline(assignId: number, userId: number, grade: number, attemptNumber: number, addAttempt: boolean,
            workflowState: string, applyToAll: boolean, outcomes: any, pluginData: any, siteId?: string): Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            if (site.wsAvailable('mod_assign_submit_grading_form')) {
                // WS available @since 3.2.

                const jsonData = {
                        grade: grade,
                        attemptnumber: attemptNumber,
                        addattempt: addAttempt ? 1 : 0,
                        workflowstate: workflowState,
                        applytoall: applyToAll ? 1 : 0
                    };

                for (const index in outcomes) {
                    jsonData['outcome_' + index + '[' + userId + ']'] = outcomes[index];
                }

                for (const index in pluginData) {
                    jsonData[index] = pluginData[index];
                }

                const serialized = CoreInterceptor.serialize(jsonData, true),
                    params = {
                        assignmentid: assignId,
                        userid: userId,
                        jsonformdata: JSON.stringify(serialized)
                    };

                return site.write('mod_assign_submit_grading_form', params).then((warnings) => {
                    if (warnings && warnings.length) {
                        // The WebService returned warnings, reject.
                        return Promise.reject(warnings[0]);
                    }
                });
            } else {
                // WS not available, fallback to save_grade.

                const params = {
                        assignmentid: assignId,
                        userid: userId,
                        grade: grade,
                        attemptnumber: attemptNumber,
                        addattempt: addAttempt ? 1 : 0,
                        workflowstate: workflowState,
                        applytoall: applyToAll ? 1 : 0,
                        plugindata: pluginData
                    },
                    preSets = {
                        responseExpected: false
                    };

                return site.write('mod_assign_save_grade', params, preSets);
            }
        });
    }
}
