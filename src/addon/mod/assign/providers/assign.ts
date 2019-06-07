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
import { CoreGradesProvider } from '@core/grades/providers/grades';
import { CoreCourseLogHelperProvider } from '@core/course/providers/log-helper';
import { AddonModAssignSubmissionDelegate } from './submission-delegate';
import { AddonModAssignOfflineProvider } from './assign-offline';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
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
    static GRADED_FOLLOWUP_SUBMIT = 'gradedfollowupsubmit';

    // Events.
    static SUBMISSION_SAVED_EVENT = 'addon_mod_assign_submission_saved';
    static SUBMITTED_FOR_GRADING_EVENT = 'addon_mod_assign_submitted_for_grading';
    static GRADED_EVENT = 'addon_mod_assign_graded';

    protected ROOT_CACHE_KEY = 'mmaModAssign:';

    protected logger;
    protected gradingOfflineEnabled: {[siteId: string]: boolean}  = {};

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private textUtils: CoreTextUtilsProvider,
            private timeUtils: CoreTimeUtilsProvider, private appProvider: CoreAppProvider, private utils: CoreUtilsProvider,
            private submissionDelegate: AddonModAssignSubmissionDelegate,
            private gradesProvider: CoreGradesProvider, private filepoolProvider: CoreFilepoolProvider,
            private assignOffline: AddonModAssignOfflineProvider, private commentsProvider: CoreCommentsProvider,
            private logHelper: CoreCourseLogHelperProvider) {
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
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved with the assignment.
     */
    getAssignment(courseId: number, cmId: number, ignoreCache?: boolean, siteId?: string): Promise<any> {
        return this.getAssignmentByField(courseId, 'cmid', cmId, ignoreCache, siteId);
    }

    /**
     * Get an assigment with key=value. If more than one is found, only the first will be returned.
     *
     * @param {number} courseId Course ID.
     * @param {string} key Name of the property to check.
     * @param {any} value Value to search.
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the assignment is retrieved.
     */
    protected getAssignmentByField(courseId: number, key: string, value: any, ignoreCache?: boolean, siteId?: string)
            : Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    courseids: [courseId],
                    includenotenrolledcourses: 1
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getAssignmentCacheKey(courseId),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_assign_get_assignments', params, preSets).catch(() => {
                // In 3.6 we added a new parameter includenotenrolledcourses that could cause offline data not to be found.
                // Retry again without the param to check if the request is already cached.
                delete params.includenotenrolledcourses;

                return site.read('mod_assign_get_assignments', params, preSets);
            }).then((response) => {
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
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}  Promise resolved with the assignment.
     */
    getAssignmentById(courseId: number, id: number, ignoreCache?: boolean, siteId?: string): Promise<any> {
        return this.getAssignmentByField(courseId, 'id', id, ignoreCache, siteId);
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
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<number>} Promise resolved with the user blind id.
     */
    getAssignmentUserMappings(assignId: number, userId: number, ignoreCache?: boolean, siteId?: string): Promise<number> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    assignmentids: [assignId]
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getAssignmentUserMappingsCacheKey(assignId),
                    updateFrequency: CoreSite.FREQUENCY_OFTEN
                };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

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
     * Returns grade information from assign_grades for the requested assignment id
     *
     * @param {number} assignId Assignment Id.
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}   Resolved with requested info when done.
     */
    getAssignmentGrades(assignId: number, ignoreCache?: boolean, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    assignmentids: [assignId]
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getAssignmentGradesCacheKey(assignId)
                };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_assign_get_grades', params, preSets).then((response) => {
                // Search the assignment.
                if (response.assignments && response.assignments.length) {
                    const assignment = response.assignments[0];

                    if (assignment.assignmentid == assignId) {
                        return assignment.grades;
                    }
                } else if (response.warnings && response.warnings.length) {
                    if (response.warnings[0].warningcode == 3) {
                        // No grades found.
                        return [];
                    }

                    return Promise.reject(response.warnings[0]);
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get cache key for assignment grades data WS calls.
     *
     * @param {number} assignId Assignment ID.
     * @return {string} Cache key.
     */
    protected getAssignmentGradesCacheKey(assignId: number): string {
        return this.ROOT_CACHE_KEY + 'assigngrades:' + assignId;
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

        if (status == AddonModAssignProvider.GRADING_STATUS_GRADED || status == AddonModAssignProvider.GRADING_STATUS_NOT_GRADED
               || status == AddonModAssignProvider.GRADED_FOLLOWUP_SUBMIT) {
            return 'addon.mod_assign.' + status;
        }

        return 'addon.mod_assign.markingworkflowstate' + status;
    }

    /**
     * Get the submission object from an attempt.
     *
     * @param {any} assign Assign.
     * @param {any} attempt Attempt.
     * @return {any} Submission object or null.
     */
    getSubmissionObjectFromAttempt(assign: any, attempt: any): any {
        if (!attempt) {
            return null;
        }

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
                    if (!file.filename) {
                        // We don't have filename, extract it from the path.
                        file.filename = file.filepath[0] == '/' ? file.filepath.substr(1) : file.filepath;
                    }

                    files.push(file);
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
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<{canviewsubmissions: boolean, submissions?: any[]}>} Promise resolved when done.
     */
    getSubmissions(assignId: number, ignoreCache?: boolean, siteId?: string)
            : Promise<{canviewsubmissions: boolean, submissions?: any[]}> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    assignmentids: [assignId]
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getSubmissionsCacheKey(assignId),
                    updateFrequency: CoreSite.FREQUENCY_OFTEN
                };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

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
     * @param {number} [userId] User Id (empty for current user).
     * @param {number} [groupId] Group Id (empty for all participants).
     * @param {boolean} [isBlind] If blind marking is enabled or not.
     * @param {number} [filter=true] True to filter WS response and rewrite URLs, false otherwise.
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param {string} [siteId] Site id (empty for current site).
     * @return {Promise<any>} Promise always resolved with the user submission status.
     */
    getSubmissionStatus(assignId: number, userId?: number, groupId?: number, isBlind?: boolean, filter: boolean = true,
            ignoreCache?: boolean, siteId?: string): Promise<any> {

        userId = userId || 0;

        return this.sitesProvider.getSite(siteId).then((site) => {
            groupId = site.isVersionGreaterEqualThan('3.5') ? groupId || 0 : 0;

            const params = {
                    assignid: assignId,
                    userid: userId
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getSubmissionStatusCacheKey(assignId, userId, groupId, isBlind),
                    getCacheUsingCacheKey: true, // We use the cache key to take isBlind into account.
                    filter: filter,
                    rewriteurls: filter
                };

            if (groupId) {
                params['groupid'] = groupId;
            }

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
     * Get information about an assignment submission status for a given user.
     * If the data doesn't include the user submission, retry ignoring cache.
     *
     * @param {any} assign Assignment.
     * @param {number} [userId] User id (empty for current user).
     * @param {number} [groupId] Group Id (empty for all participants).
     * @param {boolean} [isBlind] If blind marking is enabled or not.
     * @param {number} [filter=true] True to filter WS response and rewrite URLs, false otherwise.
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param {string} [siteId] Site id (empty for current site).
     * @return {Promise<any>} Promise always resolved with the user submission status.
     */
    getSubmissionStatusWithRetry(assign: any, userId?: number, groupId?: number, isBlind?: boolean, filter: boolean = true,
            ignoreCache?: boolean, siteId?: string): Promise<any> {

        return this.getSubmissionStatus(assign.id, userId, groupId, isBlind, filter, ignoreCache, siteId).then((response) => {
            const userSubmission = this.getSubmissionObjectFromAttempt(assign, response.lastattempt);

            if (!userSubmission) {
                // Try again, ignoring cache.
                return this.getSubmissionStatus(assign.id, userId, groupId, isBlind, filter, true, siteId).catch(() => {
                    // Error, return the first result even if it doesn't have the user submission.
                    return response;
                });
            }

            return response;
        });
    }

    /**
     * Get cache key for get submission status data WS calls.
     *
     * @param {number} assignId Assignment instance id.
     * @param {number} [userId] User id (empty for current user).
     * @param {number} [groupId] Group Id (empty for all participants).
     * @param {number} [isBlind] If blind marking is enabled or not.
     * @return {string} Cache key.
     */
    protected getSubmissionStatusCacheKey(assignId: number, userId: number, groupId?: number, isBlind?: boolean): string {
        if (!userId) {
            isBlind = false;
            userId = this.sitesProvider.getCurrentSiteUserId();
        }

        return this.getSubmissionsCacheKey(assignId) + ':' + userId + ':' + (isBlind ? 1 : 0) + ':' + groupId;
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
            case 'gradedfollowupsubmit':
                return 'danger';
            default:
                return 'light';
        }
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
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]>} Promise resolved with the list of participants and summary of submissions.
     */
    listParticipants(assignId: number, groupId?: number, ignoreCache?: boolean, siteId?: string): Promise<any[]> {
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
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.listParticipantsCacheKey(assignId, groupId),
                    updateFrequency: CoreSite.FREQUENCY_OFTEN
                };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

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
     * Invalidates assignment grades data WS calls.
     *
     * @param {number} assignId Assignment ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateAssignmentGradesData(assignId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getAssignmentGradesCacheKey(assignId));
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

        return this.getAssignment(courseId, moduleId, false, siteId).then((assign) => {
            const promises = [];

            // Do not invalidate assignment data before getting assignment info, we need it!
            promises.push(this.invalidateAllSubmissionData(assign.id, siteId));
            promises.push(this.invalidateAssignmentUserMappingsData(assign.id, siteId));
            promises.push(this.invalidateAssignmentGradesData(assign.id, siteId));
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
     * @param {number} [groupId] Group Id (empty for all participants).
     * @param {boolean} [isBlind] Whether blind marking is enabled or not.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateSubmissionStatusData(assignId: number, userId?: number, groupId?: number, isBlind?: boolean, siteId?: string):
            Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getSubmissionStatusCacheKey(assignId, userId, groupId, isBlind));
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
     * @param {string} [name] Name of the assign.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the WS call is successful.
     */
    logSubmissionView(assignId: number, name?: string, siteId?: string): Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                assignid: assignId
            };

            return this.logHelper.logSingle('mod_assign_view_submission_status', params, AddonModAssignProvider.COMPONENT,
                    assignId, name, 'assign', {}, siteId);
        });
    }

    /**
     * Report an assignment grading table is being viewed.
     *
     * @param {number} assignId Assignment ID.
     * @param {string} [name] Name of the assign.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the WS call is successful.
     */
    logGradingView(assignId: number, name?: string, siteId?: string): Promise<any> {
        const params = {
            assignid: assignId
        };

        return this.logHelper.logSingle('mod_assign_view_grading_table', params, AddonModAssignProvider.COMPONENT, assignId,
                name, 'assign', {}, siteId);
    }

    /**
     * Report an assign as being viewed.
     *
     * @param {number} assignId Assignment ID.
     * @param {string} [name] Name of the assign.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the WS call is successful.
     */
    logView(assignId: number, name?: string, siteId?: string): Promise<any> {
        const params = {
            assignid: assignId
        };

        return this.logHelper.logSingle('mod_assign_view_assign', params, AddonModAssignProvider.COMPONENT, assignId, name,
                'assign', {}, siteId);
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
        return this.getSubmissionStatus(assignId, submission.submitid, undefined, submission.blindid).then((response) => {
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
