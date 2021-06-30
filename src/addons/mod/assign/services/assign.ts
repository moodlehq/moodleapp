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
import { CoreSites, CoreSitesCommonWSOptions, CoreSitesReadingStrategy } from '@services/sites';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
import { CoreInterceptor } from '@classes/interceptor';
import { CoreWSExternalWarning, CoreWSExternalFile, CoreWSFile } from '@services/ws';
import { makeSingleton } from '@singletons';
import { CoreCourseCommonModWSOptions } from '@features/course/services/course';
import { CoreTextUtils } from '@services/utils/text';
import { CoreGrades } from '@features/grades/services/grades';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreError } from '@classes/errors/error';
import { CoreApp } from '@services/app';
import { CoreUtils } from '@services/utils/utils';
import { AddonModAssignOffline } from './assign-offline';
import { AddonModAssignSubmissionDelegate } from './submission-delegate';
import { CoreComments } from '@features/comments/services/comments';
import { AddonModAssignSubmissionFormatted } from './assign-helper';
import { CoreWSError } from '@classes/errors/wserror';
import { AddonModAssignAutoSyncData, AddonModAssignManualSyncData, AddonModAssignSyncProvider } from './assign-sync';
import { CoreFormFields } from '@singletons/form';
import { CoreFileHelper } from '@services/file-helper';

const ROOT_CACHE_KEY = 'mmaModAssign:';

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [AddonModAssignProvider.SUBMISSION_SAVED_EVENT]: AddonModAssignSubmissionSavedEventData;
        [AddonModAssignProvider.SUBMITTED_FOR_GRADING_EVENT]: AddonModAssignSubmittedForGradingEventData;
        [AddonModAssignProvider.GRADED_EVENT]: AddonModAssignGradedEventData;
        [AddonModAssignSyncProvider.MANUAL_SYNCED]: AddonModAssignManualSyncData;
        [AddonModAssignSyncProvider.AUTO_SYNCED]: AddonModAssignAutoSyncData;
    }

}

/**
 * Service that provides some functions for assign.
 */
@Injectable({ providedIn: 'root' })
export class AddonModAssignProvider {

    static readonly COMPONENT = 'mmaModAssign';
    static readonly SUBMISSION_COMPONENT = 'mmaModAssignSubmission';
    static readonly UNLIMITED_ATTEMPTS = -1;

    // Submission status.
    static readonly SUBMISSION_STATUS_NEW = 'new';
    static readonly SUBMISSION_STATUS_REOPENED = 'reopened';
    static readonly SUBMISSION_STATUS_DRAFT = 'draft';
    static readonly SUBMISSION_STATUS_SUBMITTED = 'submitted';

    // "Re-open" methods (to retry the assign).
    static readonly ATTEMPT_REOPEN_METHOD_NONE = 'none';
    static readonly ATTEMPT_REOPEN_METHOD_MANUAL = 'manual';

    // Grading status.
    static readonly GRADING_STATUS_GRADED = 'graded';
    static readonly GRADING_STATUS_NOT_GRADED = 'notgraded';
    static readonly MARKING_WORKFLOW_STATE_RELEASED = 'released';
    static readonly NEED_GRADING = 'needgrading';
    static readonly GRADED_FOLLOWUP_SUBMIT = 'gradedfollowupsubmit';

    // Group submissions warnings.
    static readonly WARN_GROUPS_REQUIRED = 'warnrequired';
    static readonly WARN_GROUPS_OPTIONAL = 'warnoptional';

    // Events.
    static readonly SUBMISSION_SAVED_EVENT = 'addon_mod_assign_submission_saved';
    static readonly SUBMITTED_FOR_GRADING_EVENT = 'addon_mod_assign_submitted_for_grading';
    static readonly GRADED_EVENT = 'addon_mod_assign_graded';

    protected gradingOfflineEnabled: {[siteId: string]: boolean} = {};

    /**
     * Check if the user can submit in offline. This should only be used if submissionStatus.lastattempt.cansubmit cannot
     * be used (offline usage).
     * This function doesn't check if the submission is empty, it should be checked before calling this function.
     *
     * @param assign Assignment instance.
     * @param submissionStatus Submission status returned by getSubmissionStatus.
     * @return Whether it can submit.
     */
    canSubmitOffline(assign: AddonModAssignAssign, submissionStatus: AddonModAssignGetSubmissionStatusWSResponse): boolean {
        if (!this.isSubmissionOpen(assign, submissionStatus)) {
            return false;
        }

        const userSubmission = submissionStatus.lastattempt?.submission;
        const teamSubmission = submissionStatus.lastattempt?.teamsubmission;

        if (teamSubmission) {
            if (teamSubmission.status === AddonModAssignProvider.SUBMISSION_STATUS_SUBMITTED) {
                // The assignment submission has been completed.
                return false;
            } else if (userSubmission && userSubmission.status === AddonModAssignProvider.SUBMISSION_STATUS_SUBMITTED) {
                // The user has already clicked the submit button on the team submission.
                return false;
            } else if (assign.preventsubmissionnotingroup && !submissionStatus.lastattempt?.submissiongroup) {
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
        return !!assign.submissiondrafts;
    }

    /**
     * Fix some submission status params.
     *
     * @param site Site to use.
     * @param userId User Id (empty for current user).
     * @param groupId Group Id (empty for all participants).
     * @param isBlind If blind marking is enabled or not.
     * @return Object with fixed params.
     */
    protected fixSubmissionStatusParams(
        site: CoreSite,
        userId?: number,
        groupId?: number,
        isBlind = false,
    ): AddonModAssignFixedSubmissionParams {

        return {
            isBlind: !userId ? false : !!isBlind,
            groupId: site.isVersionGreaterEqualThan('3.5') ? groupId || 0 : 0,
            userId: userId || site.getUserId(),
        };
    }

    /**
     * Get an assignment by course module ID.
     *
     * @param courseId Course ID the assignment belongs to.
     * @param cmId Assignment module ID.
     * @param options Other options.
     * @return Promise resolved with the assignment.
     */
    getAssignment(courseId: number, cmId: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModAssignAssign> {
        return this.getAssignmentByField(courseId, 'cmid', cmId, options);
    }

    /**
     * Get an assigment with key=value. If more than one is found, only the first will be returned.
     *
     * @param courseId Course ID.
     * @param key Name of the property to check.
     * @param value Value to search.
     * @param options Other options.
     * @return Promise resolved when the assignment is retrieved.
     */
    protected async getAssignmentByField(
        courseId: number,
        key: string,
        value: number,
        options: CoreSitesCommonWSOptions = {},
    ): Promise<AddonModAssignAssign> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModAssignGetAssignmentsWSParams = {
            courseids: [courseId],
            includenotenrolledcourses: true,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getAssignmentCacheKey(courseId),
            updateFrequency: CoreSite.FREQUENCY_RARELY,
            component: AddonModAssignProvider.COMPONENT,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        let response: AddonModAssignGetAssignmentsWSResponse;

        try {
            response = await site.read<AddonModAssignGetAssignmentsWSResponse>('mod_assign_get_assignments', params, preSets);
        } catch {
            // In 3.6 we added a new parameter includenotenrolledcourses that could cause offline data not to be found.
            // Retry again without the param to check if the request is already cached.
            delete params.includenotenrolledcourses;

            response = await site.read('mod_assign_get_assignments', params, preSets);
        }

        // Search the assignment to return.
        if (response.courses.length) {
            const assignment = response.courses[0].assignments.find((assignment) => assignment[key] == value);

            if (assignment) {
                return assignment;
            }
        }

        throw new CoreError('Assignment not found');
    }

    /**
     * Get an assignment by instance ID.
     *
     * @param courseId Course ID the assignment belongs to.
     * @param id Assignment instance ID.
     * @param options Other options.
     * @return Promise resolved with the assignment.
     */
    getAssignmentById(courseId: number, id: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModAssignAssign> {
        return this.getAssignmentByField(courseId, 'id', id, options);
    }

    /**
     * Get cache key for assignment data WS calls.
     *
     * @param courseId Course ID.
     * @return Cache key.
     */
    protected getAssignmentCacheKey(courseId: number): string {
        return ROOT_CACHE_KEY + 'assignment:' + courseId;
    }

    /**
     * Get an assignment user mapping for blind marking.
     *
     * @param assignId Assignment Id.
     * @param userId User Id to be blinded.
     * @param options Other options.
     * @return Promise resolved with the user blind id.
     */
    async getAssignmentUserMappings(assignId: number, userId: number, options: CoreCourseCommonModWSOptions = {}): Promise<number> {
        if (!userId || userId < 0) {
            // User not valid, stop.
            return -1;
        }

        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModAssignGetUserMappingsWSParams = {
            assignmentids: [assignId],
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getAssignmentUserMappingsCacheKey(assignId),
            updateFrequency: CoreSite.FREQUENCY_OFTEN,
            component: AddonModAssignProvider.COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy),
        };

        const response = await site.read<AddonModAssignGetUserMappingsWSResponse>('mod_assign_get_user_mappings', params, preSets);

        // Search the user.
        if (response.assignments.length && response.assignments[0].assignmentid == assignId) {
            const mapping = response.assignments[0].mappings.find((mapping) => mapping.userid == userId);

            if (mapping) {
                return mapping.id;
            }
        } else if (response.warnings && response.warnings.length) {
            throw response.warnings[0];
        }

        throw new CoreError('Assignment user mappings not found');
    }

    /**
     * Get cache key for assignment user mappings data WS calls.
     *
     * @param assignId Assignment ID.
     * @return Cache key.
     */
    protected getAssignmentUserMappingsCacheKey(assignId: number): string {
        return ROOT_CACHE_KEY + 'usermappings:' + assignId;
    }

    /**
     * Returns grade information from assign_grades for the requested assignment id
     *
     * @param assignId Assignment Id.
     * @param options Other options.
     * @return Resolved with requested info when done.
     */
    async getAssignmentGrades(assignId: number, options: CoreCourseCommonModWSOptions = {}): Promise<AddonModAssignGrade[]> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModAssignGetGradesWSParams = {
            assignmentids: [assignId],
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getAssignmentGradesCacheKey(assignId),
            component: AddonModAssignProvider.COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy),
        };

        const response = await site.read<AddonModAssignGetGradesWSResponse>('mod_assign_get_grades', params, preSets);

        // Search the assignment.
        if (response.assignments.length && response.assignments[0].assignmentid == assignId) {
            return response.assignments[0].grades;
        } else if (response.warnings && response.warnings.length) {
            if (response.warnings[0].warningcode == '3') {
                // No grades found.
                return [];
            }

            throw response.warnings[0];
        }

        throw new CoreError('Assignment grades not found.');
    }

    /**
     * Get cache key for assignment grades data WS calls.
     *
     * @param assignId Assignment ID.
     * @return Cache key.
     */
    protected getAssignmentGradesCacheKey(assignId: number): string {
        return ROOT_CACHE_KEY + 'assigngrades:' + assignId;
    }

    /**
     * Returns the color name for a given grading status name.
     *
     * @param status Grading status name
     * @return The color name.
     */
    getSubmissionGradingStatusColor(status?: string): string {
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
     * @param status Grading Status name
     * @return The status translation identifier.
     */
    getSubmissionGradingStatusTranslationId(status?: string): string | undefined {
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
     * @param assign Assign.
     * @param attempt Attempt.
     * @return Submission object or null.
     */
    getSubmissionObjectFromAttempt(
        assign: AddonModAssignAssign,
        attempt: AddonModAssignSubmissionAttempt | undefined,
    ): AddonModAssignSubmission | undefined {
        if (!attempt) {
            return;
        }

        return assign.teamsubmission ? attempt.teamsubmission : attempt.submission;
    }

    /**
     * Get attachments of a submission plugin.
     *
     * @param submissionPlugin Submission plugin.
     * @return Submission plugin attachments.
     */
    getSubmissionPluginAttachments(submissionPlugin: AddonModAssignPlugin): CoreWSFile[] {
        if (!submissionPlugin.fileareas) {
            return [];
        }

        const files: CoreWSFile[] = [];

        submissionPlugin.fileareas.forEach((filearea) => {
            if (!filearea || !filearea.files) {
                // No files to get.
                return;
            }

            filearea.files.forEach((file) => {
                if (!file.filename) {
                    // We don't have filename, extract it from the path.
                    file.filename = CoreFileHelper.getFilenameFromPath(file);
                }

                files.push(file);
            });
        });

        return files;
    }

    /**
     * Get text of a submission plugin.
     *
     * @param submissionPlugin Submission plugin.
     * @param keepUrls True if it should keep original URLs, false if they should be replaced.
     * @return Submission text.
     */
    getSubmissionPluginText(submissionPlugin: AddonModAssignPlugin, keepUrls = false): string {
        if (!submissionPlugin.editorfields) {
            return '';
        }
        let text = '';

        submissionPlugin.editorfields.forEach((field) => {
            text += field.text;
        });

        if (!keepUrls && submissionPlugin.fileareas && submissionPlugin.fileareas[0]) {
            text = CoreTextUtils.replacePluginfileUrls(text, submissionPlugin.fileareas[0].files || []);
        }

        return text;
    }

    /**
     * Get an assignment submissions.
     *
     * @param assignId Assignment id.
     * @param options Other options.
     * @return Promise resolved when done.
     */
    async getSubmissions(
        assignId: number,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<{ canviewsubmissions: boolean; submissions?: AddonModAssignSubmission[] }> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModAssignGetSubmissionsWSParams = {
            assignmentids: [assignId],
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getSubmissionsCacheKey(assignId),
            updateFrequency: CoreSite.FREQUENCY_OFTEN,
            component: AddonModAssignProvider.COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy),
        };
        const response = await site.read<AddonModAssignGetSubmissionsWSResponse>('mod_assign_get_submissions', params, preSets);

        // Check if we can view submissions, with enough permissions.
        if (response.warnings?.length && response.warnings[0].warningcode == '1') {
            return { canviewsubmissions: false };
        }

        if (response.assignments && response.assignments.length) {
            return {
                canviewsubmissions: true,
                submissions: response.assignments[0].submissions,
            };
        }

        throw new CoreError('Assignment submissions not found');
    }

    /**
     * Get cache key for assignment submissions data WS calls.
     *
     * @param assignId Assignment id.
     * @return Cache key.
     */
    protected getSubmissionsCacheKey(assignId: number): string {
        return ROOT_CACHE_KEY + 'submissions:' + assignId;
    }

    /**
     * Get information about an assignment submission status for a given user.
     *
     * @param assignId Assignment instance id.
     * @param options Other options.
     * @return Promise always resolved with the user submission status.
     */
    async getSubmissionStatus(
        assignId: number,
        options: AddonModAssignSubmissionStatusOptions = {},
    ): Promise<AddonModAssignGetSubmissionStatusWSResponse> {
        const site = await CoreSites.getSite(options.siteId);

        options = {
            filter: true,
            ...options,
        };

        const fixedParams = this.fixSubmissionStatusParams(site, options.userId, options.groupId, options.isBlind);
        const params: AddonModAssignGetSubmissionStatusWSParams = {
            assignid: assignId,
            userid: fixedParams.userId,
        };
        if (fixedParams.groupId) {
            params.groupid = fixedParams.groupId;
        }

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getSubmissionStatusCacheKey(
                assignId,
                fixedParams.userId,
                fixedParams.groupId,
                fixedParams.isBlind,
            ),
            getCacheUsingCacheKey: true,
            filter: options.filter,
            rewriteurls: options.filter,
            component: AddonModAssignProvider.COMPONENT,
            componentId: options.cmId,
            // Don't cache when getting text without filters.
            // @todo Change this to support offline editing.
            saveToCache: options.filter,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy),
        };

        return site.read<AddonModAssignGetSubmissionStatusWSResponse>('mod_assign_get_submission_status', params, preSets);
    }

    /**
     * Get information about an assignment submission status for a given user.
     * If the data doesn't include the user submission, retry ignoring cache.
     *
     * @param assign Assignment.
     * @param options Other options.
     * @return Promise always resolved with the user submission status.
     */
    async getSubmissionStatusWithRetry(
        assign: AddonModAssignAssign,
        options: AddonModAssignSubmissionStatusOptions = {},
    ): Promise<AddonModAssignGetSubmissionStatusWSResponse> {
        options.cmId = options.cmId || assign.cmid;

        const response = await this.getSubmissionStatus(assign.id, options);

        const userSubmission = this.getSubmissionObjectFromAttempt(assign, response.lastattempt);
        if (userSubmission) {
            return response;
        }
        // Try again, ignoring cache.
        const newOptions = {
            ...options,
            readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
        };

        try {
            return this.getSubmissionStatus(assign.id, newOptions);
        } catch {
            // Error, return the first result even if it doesn't have the user submission.
            return response;
        }
    }

    /**
     * Get cache key for get submission status data WS calls.
     *
     * @param assignId Assignment instance id.
     * @param userId User id (empty for current user).
     * @param groupId Group Id (empty for all participants).
     * @param isBlind If blind marking is enabled or not.
     * @return Cache key.
     */
    protected getSubmissionStatusCacheKey(assignId: number, userId: number, groupId?: number, isBlind = false): string {
        return this.getSubmissionsCacheKey(assignId) + ':' + userId + ':' + (isBlind ? 1 : 0) + ':' + groupId;
    }

    /**
     * Returns the color name for a given status name.
     *
     * @param status Status name
     * @return The color name.
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
     * @param plugins Plugins to check.
     * @return Promise resolved with unsupported plugin names.
     */
    async getUnsupportedEditPlugins(plugins: AddonModAssignPlugin[]): Promise<string[]> {
        const notSupported: string[] = [];
        const promises = plugins.map((plugin) =>
            AddonModAssignSubmissionDelegate.isPluginSupportedForEdit(plugin.type).then((enabled) => {
                if (!enabled) {
                    notSupported.push(plugin.name);
                }

                return;
            }));

        await Promise.all(promises);

        return notSupported;
    }

    /**
     * List the participants for a single assignment, with some summary info about their submissions.
     *
     * @param assignId Assignment id.
     * @param groupId Group id. If not defined, 0.
     * @param options Other options.
     * @return Promise resolved with the list of participants and summary of submissions.
     */
    async listParticipants(
        assignId: number,
        groupId?: number,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModAssignParticipant[]> {

        groupId = groupId || 0;

        const site = await CoreSites.getSite(options.siteId);
        if (!site.wsAvailable('mod_assign_list_participants')) {
            // Silently fail if is not available. (needs Moodle version >= 3.2)
            throw new CoreError('mod_assign_list_participants WS is only available 3.2 onwards');
        }

        const params: AddonModAssignListParticipantsWSParams = {
            assignid: assignId,
            groupid: groupId,
            filter: '',
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.listParticipantsCacheKey(assignId, groupId),
            updateFrequency: CoreSite.FREQUENCY_OFTEN,
            component: AddonModAssignProvider.COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy),
        };

        return site.read<AddonModAssignListParticipantsWSResponse>('mod_assign_list_participants', params, preSets);
    }

    /**
     * Get cache key for assignment list participants data WS calls.
     *
     * @param assignId Assignment id.
     * @param groupId Group id.
     * @return Cache key.
     */
    protected listParticipantsCacheKey(assignId: number, groupId: number): string {
        return this.listParticipantsPrefixCacheKey(assignId) + ':' + groupId;
    }

    /**
     * Get prefix cache key for assignment list participants data WS calls.
     *
     * @param assignId Assignment id.
     * @return Cache key.
     */
    protected listParticipantsPrefixCacheKey(assignId: number): string {
        return ROOT_CACHE_KEY + 'participants:' + assignId;
    }

    /**
     * Invalidates all submission status data.
     *
     * @param assignId Assignment instance id.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    async invalidateAllSubmissionData(assignId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getSubmissionsCacheKey(assignId));
    }

    /**
     * Invalidates assignment data WS calls.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    async invalidateAssignmentData(courseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getAssignmentCacheKey(courseId));
    }

    /**
     * Invalidates assignment user mappings data WS calls.
     *
     * @param assignId Assignment ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    async invalidateAssignmentUserMappingsData(assignId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getAssignmentUserMappingsCacheKey(assignId));
    }

    /**
     * Invalidates assignment grades data WS calls.
     *
     * @param assignId Assignment ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    async invalidateAssignmentGradesData(assignId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getAssignmentGradesCacheKey(assignId));
    }

    /**
     * Invalidate the prefetched content except files.
     *
     * @param moduleId The module ID.
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    async invalidateContent(moduleId: number, courseId: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const assign = await this.getAssignment(courseId, moduleId, { siteId });
        const promises: Promise<void>[] = [];
        // Do not invalidate assignment data before getting assignment info, we need it!
        promises.push(this.invalidateAllSubmissionData(assign.id, siteId));
        promises.push(this.invalidateAssignmentUserMappingsData(assign.id, siteId));
        promises.push(this.invalidateAssignmentGradesData(assign.id, siteId));
        promises.push(this.invalidateListParticipantsData(assign.id, siteId));
        promises.push(CoreComments.invalidateCommentsByInstance('module', assign.id, siteId));
        promises.push(this.invalidateAssignmentData(courseId, siteId));
        promises.push(CoreGrades.invalidateAllCourseGradesData(courseId));

        await Promise.all(promises);
    }

    /**
     * Invalidates assignment submissions data WS calls.
     *
     * @param assignId Assignment instance id.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    async invalidateSubmissionData(assignId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getSubmissionsCacheKey(assignId));
    }

    /**
     * Invalidates submission status data.
     *
     * @param assignId Assignment instance id.
     * @param userId User id (empty for current user).
     * @param groupId Group Id (empty for all participants).
     * @param isBlind Whether blind marking is enabled or not.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    async invalidateSubmissionStatusData(
        assignId: number,
        userId?: number,
        groupId?: number,
        isBlind = false,
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        const fixedParams = this.fixSubmissionStatusParams(site, userId, groupId, isBlind);

        await site.invalidateWsCacheForKey(this.getSubmissionStatusCacheKey(
            assignId,
            fixedParams.userId,
            fixedParams.groupId,
            fixedParams.isBlind,
        ));
    }

    /**
     * Invalidates assignment participants data.
     *
     * @param assignId Assignment instance id.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    async invalidateListParticipantsData(assignId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.listParticipantsPrefixCacheKey(assignId));
    }

    /**
     * Convenience function to check if grading offline is enabled.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with boolean: whether grading offline is enabled.
     */
    protected async isGradingOfflineEnabled(siteId?: string): Promise<boolean> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        if (typeof this.gradingOfflineEnabled[siteId] != 'undefined') {
            return this.gradingOfflineEnabled[siteId];
        }

        this.gradingOfflineEnabled[siteId] = await CoreGrades.isGradeItemsAvailable(siteId);

        return this.gradingOfflineEnabled[siteId];
    }

    /**
     * Outcomes only can be edited if mod_assign_submit_grading_form is available.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with true if outcomes edit is enabled, rejected or resolved with false otherwise.
     * @since 3.2
     */
    async isOutcomesEditEnabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return site.wsAvailable('mod_assign_submit_grading_form');
    }

    /**
     * Check if assignments plugin is enabled in a certain site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Whether the plugin is enabled.
     */
    isPluginEnabled(): boolean {
        return true;
    }

    /**
     * Check if a submission is open. This function is based on Moodle's submissions_open.
     *
     * @param assign Assignment instance.
     * @param submissionStatus Submission status returned by getSubmissionStatus.
     * @return Whether submission is open.
     */
    isSubmissionOpen(assign: AddonModAssignAssign, submissionStatus?: AddonModAssignGetSubmissionStatusWSResponse): boolean {
        if (!assign || !submissionStatus) {
            return false;
        }

        const time = CoreTimeUtils.timestamp();
        const lastAttempt = submissionStatus.lastattempt;
        const submission = this.getSubmissionObjectFromAttempt(assign, lastAttempt);

        let dateOpen = true;
        let finalDate: number | undefined;

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
     * @param assignid Assignment ID.
     * @param name Name of the assign.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the WS call is successful.
     */
    async logSubmissionView(assignid: number, name?: string, siteId?: string): Promise<void> {
        const params: AddonModAssignViewSubmissionStatusWSParams = {
            assignid,
        };

        await CoreCourseLogHelper.logSingle(
            'mod_assign_view_submission_status',
            params,
            AddonModAssignProvider.COMPONENT,
            assignid,
            name,
            'assign',
            {},
            siteId,
        );
    }

    /**
     * Report an assignment grading table is being viewed.
     *
     * @param assignid Assignment ID.
     * @param name Name of the assign.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the WS call is successful.
     */
    async logGradingView(assignid: number, name?: string, siteId?: string): Promise<void> {
        const params: AddonModAssignViewGradingTableWSParams = {
            assignid,
        };

        await CoreCourseLogHelper.logSingle(
            'mod_assign_view_grading_table',
            params,
            AddonModAssignProvider.COMPONENT,
            assignid,
            name,
            'assign',
            {},
            siteId,
        );
    }

    /**
     * Report an assign as being viewed.
     *
     * @param assignid Assignment ID.
     * @param name Name of the assign.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the WS call is successful.
     */
    async logView(assignid: number, name?: string, siteId?: string): Promise<void> {
        const params: AddonModAssignViewAssignWSParams = {
            assignid,
        };

        await CoreCourseLogHelper.logSingle(
            'mod_assign_view_assign',
            params,
            AddonModAssignProvider.COMPONENT,
            assignid,
            name,
            'assign',
            {},
            siteId,
        );
    }

    /**
     * Returns if a submissions needs to be graded.
     *
     * @param submission Submission.
     * @param assignId Assignment ID.
     * @return Promise resolved with boolean: whether it needs to be graded or not.
     */
    async needsSubmissionToBeGraded(submission: AddonModAssignSubmissionFormatted, assignId: number): Promise<boolean> {
        if (!submission.gradingstatus) {
            // This should not happen, but it's better to show rather than not showing any of the submissions.
            return true;
        }

        if (submission.gradingstatus != AddonModAssignProvider.GRADING_STATUS_GRADED &&
                submission.gradingstatus != AddonModAssignProvider.MARKING_WORKFLOW_STATE_RELEASED) {
            // Not graded.
            return true;
        }

        // We need more data to decide that.
        const response = await this.getSubmissionStatus(assignId, {
            userId: submission.submitid,
            isBlind: !!submission.blindid,
        });

        if (!response.feedback || !response.feedback.gradeddate) {
            // Not graded.
            return true;
        }

        return response.feedback.gradeddate < submission.timemodified;
    }

    /**
     * Save current user submission for a certain assignment.
     *
     * @param assignId Assign ID.
     * @param courseId Course ID the assign belongs to.
     * @param pluginData Data to save.
     * @param allowOffline Whether to allow offline usage.
     * @param timemodified The time the submission was last modified in online.
     * @param allowsDrafts Whether the assignment allows submission drafts.
     * @param userId User ID. If not defined, site's current user.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with true if sent to server, resolved with false if stored in offline.
     */
    async saveSubmission(
        assignId: number,
        courseId: number,
        pluginData: AddonModAssignSavePluginData,
        allowOffline: boolean,
        timemodified: number,
        allowsDrafts = false,
        userId?: number,
        siteId?: string,
    ): Promise<boolean> {

        siteId = siteId || CoreSites.getCurrentSiteId();

        // Function to store the submission to be synchronized later.
        const storeOffline = async (): Promise<boolean> => {
            await AddonModAssignOffline.saveSubmission(
                assignId,
                courseId,
                pluginData,
                timemodified,
                !allowsDrafts,
                userId,
                siteId,
            );

            return false;
        };

        if (allowOffline && !CoreApp.isOnline()) {
            // App is offline, store the action.
            return storeOffline();
        }

        try {
            // If there's already a submission to be sent to the server, discard it first.
            await AddonModAssignOffline.deleteSubmission(assignId, userId, siteId);
            await this.saveSubmissionOnline(assignId, pluginData, siteId);

            return true;
        } catch (error) {
            if (allowOffline && error && !CoreUtils.isWebServiceError(error)) {
                // Couldn't connect to server, store in offline.
                return storeOffline();
            } else {
                // The WebService has thrown an error or offline not supported, reject.
                throw error;
            }
        }
    }

    /**
     * Save current user submission for a certain assignment. It will fail if offline or cannot connect.
     *
     * @param assignId Assign ID.
     * @param pluginData Data to save.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when saved, rejected otherwise.
     */
    async saveSubmissionOnline(assignId: number, pluginData: AddonModAssignSavePluginData, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        const params: AddonModAssignSaveSubmissionWSParams = {
            assignmentid: assignId,
            plugindata: pluginData,
        };
        const warnings = await site.write<CoreWSExternalWarning[]>('mod_assign_save_submission', params);

        if (warnings.length) {
            // The WebService returned warnings, reject.
            throw new CoreWSError(warnings[0]);
        }
    }

    /**
     * Submit the current user assignment for grading.
     *
     * @param assignId Assign ID.
     * @param courseId Course ID the assign belongs to.
     * @param acceptStatement True if submission statement is accepted, false otherwise.
     * @param timemodified The time the submission was last modified in online.
     * @param forceOffline True to always mark it in offline.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with true if sent to server, resolved with false if stored in offline.
     */
    async submitForGrading(
        assignId: number,
        courseId: number,
        acceptStatement: boolean,
        timemodified: number,
        forceOffline = false,
        siteId?: string,
    ): Promise<boolean> {

        siteId = siteId || CoreSites.getCurrentSiteId();

        // Function to store the submission to be synchronized later.
        const storeOffline = async (): Promise<boolean> => {
            await AddonModAssignOffline.markSubmitted(
                assignId,
                courseId,
                true,
                acceptStatement,
                timemodified,
                undefined,
                siteId,
            );

            return false;
        };

        if (forceOffline || !CoreApp.isOnline()) {
            // App is offline, store the action.
            return storeOffline();
        }

        try {
            // If there's already a submission to be sent to the server, discard it first.
            await AddonModAssignOffline.deleteSubmission(assignId, undefined, siteId);
            await this.submitForGradingOnline(assignId, acceptStatement, siteId);

            return true;
        } catch (error) {
            if (error && !CoreUtils.isWebServiceError(error)) {
                // Couldn't connect to server, store in offline.
                return storeOffline();
            } else {
                // The WebService has thrown an error, reject.
                throw error;
            }
        }
    }

    /**
     * Submit the current user assignment for grading. It will fail if offline or cannot connect.
     *
     * @param assignId Assign ID.
     * @param acceptStatement True if submission statement is accepted, false otherwise.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when submitted, rejected otherwise.
     */
    async submitForGradingOnline(assignId: number, acceptStatement: boolean, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonModAssignSubmitForGradingWSParams = {
            assignmentid: assignId,
            acceptsubmissionstatement: acceptStatement,
        };

        const warnings = await site.write<CoreWSExternalWarning[]>('mod_assign_submit_for_grading', params);

        if (warnings.length) {
            // The WebService returned warnings, reject.
            throw new CoreWSError(warnings[0]);
        }
    }

    /**
     * Submit the grading for the current user and assignment. It will use old or new WS depending on availability.
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
     * @param pluginData Feedback plugin data to save.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with true if sent to server, resolved with false if stored offline.
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
    ): Promise<boolean> {

        siteId = siteId || CoreSites.getCurrentSiteId();

        // Function to store the grading to be synchronized later.
        const storeOffline = async (): Promise<boolean> => {
            await AddonModAssignOffline.submitGradingForm(
                assignId,
                userId,
                courseId,
                grade,
                attemptNumber,
                addAttempt,
                workflowState,
                applyToAll,
                outcomes,
                pluginData,
                siteId,
            );

            return false;
        };

        // Grading offline is only allowed if WS of grade items is enabled to avoid inconsistency.
        const enabled = await this.isGradingOfflineEnabled(siteId);
        if (!enabled) {
            await this.submitGradingFormOnline(
                assignId,
                userId,
                grade,
                attemptNumber,
                addAttempt,
                workflowState,
                applyToAll,
                outcomes,
                pluginData,
                siteId,
            );

            return true;
        }

        if (!CoreApp.isOnline()) {
            // App is offline, store the action.
            return storeOffline();
        }

        try {
            // If there's already a grade to be sent to the server, discard it first.
            await AddonModAssignOffline.deleteSubmissionGrade(assignId, userId, siteId);
            await this.submitGradingFormOnline(
                assignId,
                userId,
                grade,
                attemptNumber,
                addAttempt,
                workflowState,
                applyToAll,
                outcomes,
                pluginData,
                siteId,
            );

            return true;
        } catch (error) {
            if (error && !CoreUtils.isWebServiceError(error)) {
                // Couldn't connect to server, store in offline.
                return storeOffline();
            } else {
                // The WebService has thrown an error, reject.
                throw error;
            }
        }
    }

    /**
     * Submit the grading for the current user and assignment. It will use old or new WS depending on availability.
     * It will fail if offline or cannot connect.
     *
     * @param assignId Assign ID.
     * @param userId User ID.
     * @param grade Grade to submit.
     * @param attemptNumber Number of the attempt being graded.
     * @param addAttempt Allow the user to attempt again.
     * @param workflowState Next workflow State.
     * @param applyToAll If it's a team submission, if the grade applies to all group members.
     * @param outcomes Object including all outcomes values. If empty, any of them will be sent.
     * @param pluginData Feedback plugin data to save.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when submitted, rejected otherwise.
     */
    async submitGradingFormOnline(
        assignId: number,
        userId: number,
        grade: number,
        attemptNumber: number,
        addAttempt: boolean,
        workflowState: string,
        applyToAll: boolean,
        outcomes: AddonModAssignOutcomes,
        pluginData: AddonModAssignSavePluginData,
        siteId?: string,
    ): Promise<void> {

        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        if (site.wsAvailable('mod_assign_submit_grading_form')) {
            // WS available @since 3.2.

            const jsonData = {
                grade,
                attemptnumber: attemptNumber,
                addattempt: addAttempt ? 1 : 0,
                workflowstate: workflowState,
                applytoall: applyToAll ? 1 : 0,
            };

            for (const index in outcomes) {
                jsonData['outcome_' + index + '[' + userId + ']'] = outcomes[index];
            }

            for (const index in pluginData) {
                jsonData[index] = pluginData[index];
            }

            const serialized = CoreInterceptor.serialize(jsonData, true);
            const params: AddonModAssignSubmitGradingFormWSParams = {
                assignmentid: assignId,
                userid: userId,
                jsonformdata: JSON.stringify(serialized),
            };

            const warnings = await site.write<CoreWSExternalWarning[]>('mod_assign_submit_grading_form', params);

            if (warnings.length) {
                // The WebService returned warnings, reject.
                throw new CoreWSError(warnings[0]);
            }

            return;
        }

        // WS not available, fallback to save_grade.
        const params: AddonModAssignSaveGradeWSParams = {
            assignmentid: assignId,
            userid: userId,
            grade: grade,
            attemptnumber: attemptNumber,
            addattempt: addAttempt,
            workflowstate: workflowState,
            applytoall: applyToAll,
            plugindata: pluginData,
        };
        const preSets: CoreSiteWSPreSets = {
            responseExpected: false,
        };

        await site.write('mod_assign_save_grade', params, preSets);
    }

}
export const AddonModAssign = makeSingleton(AddonModAssignProvider);

/**
 * Options to pass to get submission status.
 */
export type AddonModAssignSubmissionStatusOptions = CoreCourseCommonModWSOptions & {
    userId?: number; // User Id (empty for current user).
    groupId?: number; // Group Id (empty for all participants).
    isBlind?: boolean; // If blind marking is enabled or not.
    filter?: boolean; // True to filter WS response and rewrite URLs, false otherwise. Defaults to true.
};

/**
 * Assign data returned by mod_assign_get_assignments.
 */
export type AddonModAssignAssign = {
    id: number; // Assignment id.
    cmid: number; // Course module id.
    course: number; // Course id.
    name: string; // Assignment name.
    nosubmissions: number; // No submissions.
    submissiondrafts: number; // Submissions drafts.
    sendnotifications: number; // Send notifications.
    sendlatenotifications: number; // Send notifications.
    sendstudentnotifications: number; // Send student notifications (default).
    duedate: number; // Assignment due date.
    allowsubmissionsfromdate: number; // Allow submissions from date.
    grade: number; // Grade type.
    timemodified: number; // Last time assignment was modified.
    completionsubmit: number; // If enabled, set activity as complete following submission.
    cutoffdate: number; // Date after which submission is not accepted without an extension.
    gradingduedate?: number; // @since 3.3. The expected date for marking the submissions.
    teamsubmission: number; // If enabled, students submit as a team.
    requireallteammemberssubmit: number; // If enabled, all team members must submit.
    teamsubmissiongroupingid: number; // The grouping id for the team submission groups.
    blindmarking: number; // If enabled, hide identities until reveal identities actioned.
    hidegrader?: number; // @since 3.7. If enabled, hide grader to student.
    revealidentities: number; // Show identities for a blind marking assignment.
    attemptreopenmethod: string; // Method used to control opening new attempts.
    maxattempts: number; // Maximum number of attempts allowed.
    markingworkflow: number; // Enable marking workflow.
    markingallocation: number; // Enable marking allocation.
    requiresubmissionstatement: number; // Student must accept submission statement.
    preventsubmissionnotingroup?: number; // @since 3.2. Prevent submission not in group.
    submissionstatement?: string; // @since 3.2. Submission statement formatted.
    submissionstatementformat?: number; // @since 3.2. Submissionstatement format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    configs: AddonModAssignConfig[]; // Configuration settings.
    intro?: string; // Assignment intro, not allways returned because it deppends on the activity configuration.
    introformat?: number; // Intro format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    introfiles?: CoreWSExternalFile[]; // @since 3.2.
    introattachments?: CoreWSExternalFile[];
};

/**
 * Config setting in an assign.
 */
export type AddonModAssignConfig = {
    id?: number; // Assign_plugin_config id.
    assignment?: number; // Assignment id.
    plugin: string; // Plugin.
    subtype: string; // Subtype.
    name: string; // Name.
    value: string; // Value.
};

/**
 * Grade of an assign, returned by mod_assign_get_grades.
 */
export type AddonModAssignGrade = {
    id: number; // Grade id.
    assignment?: number; // Assignment id.
    userid: number; // Student id.
    attemptnumber: number; // Attempt number.
    timecreated: number; // Grade creation time.
    timemodified: number; // Grade last modified time.
    grader: number; // Grader, -1 if grader is hidden.
    grade: string; // Grade.
    gradefordisplay?: string; // Grade rendered into a format suitable for display.
};

/**
 * Assign submission returned by mod_assign_get_submissions.
 */
export type AddonModAssignSubmission = {
    id: number; // Submission id.
    userid: number; // Student id.
    attemptnumber: number; // Attempt number.
    timecreated: number; // Submission creation time.
    timemodified: number; // Submission last modified time.
    status: string; // Submission status.
    groupid: number; // Group id.
    assignment?: number; // Assignment id.
    latest?: number; // Latest attempt.
    plugins?: AddonModAssignPlugin[]; // Plugins.
    gradingstatus?: string; // @since 3.2. Grading status.
};

/**
 * Assign plugin.
 */
export type AddonModAssignPlugin = {
    type: string; // Submission plugin type.
    name: string; // Submission plugin name.
    fileareas?: { // Fileareas.
        area: string; // File area.
        files?: CoreWSExternalFile[];
    }[];
    editorfields?: { // Editorfields.
        name: string; // Field name.
        description: string; // Field description.
        text: string; // Field value.
        format: number; // Text format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    }[];
};

/**
 * Grading summary of an assign submission.
 */
export type AddonModAssignSubmissionGradingSummary = {
    participantcount: number; // Number of users who can submit.
    submissiondraftscount: number; // Number of submissions in draft status.
    submissionsenabled: boolean; // Whether submissions are enabled or not.
    submissionssubmittedcount: number; // Number of submissions in submitted status.
    submissionsneedgradingcount: number; // Number of submissions that need grading.
    warnofungroupedusers: string | boolean; // Whether we need to warn people about groups.
};

/**
 * Attempt of an assign submission.
 */
export type AddonModAssignSubmissionAttempt = {
    submission?: AddonModAssignSubmission; // Submission info.
    teamsubmission?: AddonModAssignSubmission; // Submission info.
    submissiongroup?: number; // The submission group id (for group submissions only).
    submissiongroupmemberswhoneedtosubmit?: number[]; // List of users who still need to submit (for group submissions only).
    submissionsenabled: boolean; // Whether submissions are enabled or not.
    locked: boolean; // Whether new submissions are locked.
    graded: boolean; // Whether the submission is graded.
    canedit: boolean; // Whether the user can edit the current submission.
    caneditowner?: boolean; // @since 3.2. Whether the owner of the submission can edit it.
    cansubmit: boolean; // Whether the user can submit.
    extensionduedate: number; // Extension due date.
    blindmarking: boolean; // Whether blind marking is enabled.
    gradingstatus: string; // Grading status.
    usergroups: number[]; // User groups in the course.
};

/**
 * Previous attempt of an assign submission.
 */
export type AddonModAssignSubmissionPreviousAttempt = {
    attemptnumber: number; // Attempt number.
    submission?: AddonModAssignSubmission; // Submission info.
    grade?: AddonModAssignGrade; // Grade information.
    feedbackplugins?: AddonModAssignPlugin[]; // Feedback info.
};

/**
 * Feedback of an assign submission.
 */
export type AddonModAssignSubmissionFeedback = {
    grade?: AddonModAssignGrade; // Grade information.
    gradefordisplay: string; // Grade rendered into a format suitable for display.
    gradeddate: number; // The date the user was graded.
    plugins?: AddonModAssignPlugin[]; // Plugins info.
};

/**
 * Params of mod_assign_list_participants WS.
 */
type AddonModAssignListParticipantsWSParams = {
    assignid: number; // Assign instance id.
    groupid: number; // Group id.
    filter: string; // Search string to filter the results.
    skip?: number; // Number of records to skip.
    limit?: number; // Maximum number of records to return.
    onlyids?: boolean; // Do not return all user fields.
    includeenrolments?: boolean; // Do return courses where the user is enrolled.
    tablesort?: boolean; // Apply current user table sorting preferences.
};

/**
 * Data returned by mod_assign_list_participants WS.
 */
type AddonModAssignListParticipantsWSResponse = AddonModAssignParticipant[];

/**
 * Participant returned by mod_assign_list_participants.
 */
export type AddonModAssignParticipant = {
    id: number; // ID of the user.
    username?: string; // The username.
    firstname?: string; // The first name(s) of the user.
    lastname?: string; // The family name of the user.
    fullname: string; // The fullname of the user.
    email?: string; // Email address.
    address?: string; // Postal address.
    phone1?: string; // Phone 1.
    phone2?: string; // Phone 2.
    icq?: string; // Icq number.
    skype?: string; // Skype id.
    yahoo?: string; // Yahoo id.
    aim?: string; // Aim id.
    msn?: string; // Msn number.
    department?: string; // Department.
    institution?: string; // Institution.
    idnumber?: string; // The idnumber of the user.
    interests?: string; // User interests (separated by commas).
    firstaccess?: number; // First access to the site (0 if never).
    lastaccess?: number; // Last access to the site (0 if never).
    suspended?: boolean; // @since 3.2. Suspend user account, either false to enable user login or true to disable it.
    description?: string; // User profile description.
    descriptionformat?: number; // Int format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    city?: string; // Home city of the user.
    url?: string; // URL of the user.
    country?: string; // Home country code of the user, such as AU or CZ.
    profileimageurlsmall?: string; // User image profile URL - small version.
    profileimageurl?: string; // User image profile URL - big version.
    customfields?: { // User custom fields (also known as user profile fields).
        type: string; // The type of the custom field - text field, checkbox...
        value: string; // The value of the custom field.
        name: string; // The name of the custom field.
        shortname: string; // The shortname of the custom field - to be able to build the field class in the code.
    }[];
    preferences?: { // Users preferences.
        name: string; // The name of the preferences.
        value: string; // The value of the preference.
    }[];
    recordid?: number; // @since 3.7. Record id.
    groups?: { // User groups.
        id: number; // Group id.
        name: string; // Group name.
        description: string; // Group description.
    }[];
    roles?: { // User roles.
        roleid: number; // Role id.
        name: string; // Role name.
        shortname: string; // Role shortname.
        sortorder: number; // Role sortorder.
    }[];
    enrolledcourses?: { // Courses where the user is enrolled - limited by which courses the user is able to see.
        id: number; // Id of the course.
        fullname: string; // Fullname of the course.
        shortname: string; // Shortname of the course.
    }[];
    submitted: boolean; // Have they submitted their assignment.
    requiregrading: boolean; // Is their submission waiting for grading.
    grantedextension?: boolean; // @since 3.3. Have they been granted an extension.
    groupid?: number; // For group assignments this is the group id.
    groupname?: string; // For group assignments this is the group name.
};

/**
 * Result of WS mod_assign_get_assignments.
 */
export type AddonModAssignGetAssignmentsWSResponse = {
    courses: { // List of courses.
        id: number; // Course id.
        fullname: string; // Course full name.
        shortname: string; // Course short name.
        timemodified: number; // Last time modified.
        assignments: AddonModAssignAssign[]; // Assignment info.
    }[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_assign_get_submissions WS.
 */
type AddonModAssignGetSubmissionsWSParams = {
    assignmentids: number[]; // 1 or more assignment ids.
    status?: string; // Status.
    since?: number; // Submitted since.
    before?: number; // Submitted before.
};

/**
 * Data returned by mod_assign_get_submissions WS.
 */
export type AddonModAssignGetSubmissionsWSResponse = {
    assignments: { // Assignment submissions.
        assignmentid: number; // Assignment id.
        submissions: AddonModAssignSubmission[];
    }[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_assign_get_submission_status WS.
 */
type AddonModAssignGetSubmissionStatusWSParams = {
    assignid: number; // Assignment instance id.
    userid?: number; // User id (empty for current user).
    groupid?: number; // Filter by users in group (used for generating the grading summary). Empty or 0 for all groups information.
};

/**
 * Result of WS mod_assign_get_submission_status.
 */
export type AddonModAssignGetSubmissionStatusWSResponse = {
    gradingsummary?: AddonModAssignSubmissionGradingSummary; // Grading information.
    lastattempt?: AddonModAssignSubmissionAttempt; // Last attempt information.
    feedback?: AddonModAssignSubmissionFeedback; // Feedback for the last attempt.
    previousattempts?: AddonModAssignSubmissionPreviousAttempt[]; // List all the previous attempts did by the user.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_assign_view_submission_status WS.
 */
type AddonModAssignViewSubmissionStatusWSParams = {
    assignid: number; // Assign instance id.
};

/**
 * Params of mod_assign_view_grading_table WS.
 */
type AddonModAssignViewGradingTableWSParams = {
    assignid: number; // Assign instance id.
};

/**
 * Params of mod_assign_view_assign WS.
 */
type AddonModAssignViewAssignWSParams = {
    assignid: number; // Assign instance id.
};

type AddonModAssignFixedSubmissionParams = {
    userId: number;
    groupId: number;
    isBlind: boolean;
};

/**
 * Params of mod_assign_get_assignments WS.
 */
type AddonModAssignGetAssignmentsWSParams = {
    courseids?: number[]; // 0 or more course ids.
    capabilities?: string[]; // List of capabilities used to filter courses.
    includenotenrolledcourses?: boolean; // Whether to return courses that the user can see even if is not enroled in.
    // This requires the parameter courseids to not be empty.

};

/**
 * Params of mod_assign_get_user_mappings WS.
 */
type AddonModAssignGetUserMappingsWSParams = {
    assignmentids: number[]; // 1 or more assignment ids.
};

/**
 * Data returned by mod_assign_get_user_mappings WS.
 */
export type AddonModAssignGetUserMappingsWSResponse = {
    assignments: { // List of assign user mapping data.
        assignmentid: number; // Assignment id.
        mappings: {
            id: number; // User mapping id.
            userid: number; // Student id.
        }[];
    }[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_assign_get_grades WS.
 */
type AddonModAssignGetGradesWSParams = {
    assignmentids: number[]; // 1 or more assignment ids.
    since?: number; // Timestamp, only return records where timemodified >= since.
};

/**
 * Data returned by mod_assign_get_grades WS.
 */
export type AddonModAssignGetGradesWSResponse = {
    assignments: { // List of assignment grade information.
        assignmentid: number; // Assignment id.
        grades: AddonModAssignGrade[];
    }[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_assign_save_submission WS.
 */
type AddonModAssignSaveSubmissionWSParams = {
    assignmentid: number; // The assignment id to operate on.
    plugindata: AddonModAssignSavePluginData;
};

/**
 * All subplugins will decide what to add here.
 */
export type AddonModAssignSavePluginData = CoreFormFields;

/**
 * Params of mod_assign_submit_for_grading WS.
 */
type AddonModAssignSubmitForGradingWSParams = {
    assignmentid: number; // The assignment id to operate on.
    acceptsubmissionstatement: boolean; // Accept the assignment submission statement.
};

/**
 * Params of mod_assign_submit_grading_form WS.
 */
type AddonModAssignSubmitGradingFormWSParams = {
    assignmentid: number; // The assignment id to operate on.
    userid: number; // The user id the submission belongs to.
    jsonformdata: string; // The data from the grading form, encoded as a json array.
};

/**
 * Params of mod_assign_save_grade WS.
 */
type AddonModAssignSaveGradeWSParams = {
    assignmentid: number; // The assignment id to operate on.
    userid: number; // The student id to operate on.
    grade: number; // The new grade for this user. Ignored if advanced grading used.
    attemptnumber: number; // The attempt number (-1 means latest attempt).
    addattempt: boolean; // Allow another attempt if the attempt reopen method is manual.
    workflowstate: string; // The next marking workflow state.
    applytoall: boolean; // If true, this grade will be applied to all members of the group (for group assignments).
    plugindata?: AddonModAssignSavePluginData; // Plugin data.
    advancedgradingdata?: {
        guide?: {
            criteria: {
                criterionid: number; // Criterion id.
                fillings?: { // Filling.
                    criterionid: number; // Criterion id.
                    levelid?: number; // Level id.
                    remark?: string; // Remark.
                    remarkformat?: number; // Remark format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
                    score: number; // Maximum score.
                }[];
            }[];
        }; // Items.
        rubric?: {
            criteria: {
                criterionid: number; // Criterion id.
                fillings?: { // Filling.
                    criterionid: number; // Criterion id.
                    levelid?: number; // Level id.
                    remark?: string; // Remark.
                    remarkformat?: number; // Remark format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
                }[];
            }[];
        }; // Items.
    }; // Advanced grading data.
};

/**
 * Assignment grade outcomes.
 */
export type AddonModAssignOutcomes = { [itemNumber: number]: number };

/**
 * Data sent by SUBMITTED_FOR_GRADING_EVENT event.
 */
export type AddonModAssignSubmittedForGradingEventData = {
    assignmentId: number;
    submissionId: number;
    userId: number;
};

/**
 * Data sent by SUBMISSION_SAVED_EVENT event.
 */
export type AddonModAssignSubmissionSavedEventData = AddonModAssignSubmittedForGradingEventData;

/**
 * Data sent by GRADED_EVENT event.
 */
export type AddonModAssignGradedEventData = AddonModAssignSubmittedForGradingEventData;
