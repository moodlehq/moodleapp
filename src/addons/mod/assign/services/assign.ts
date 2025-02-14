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
import { CoreSite } from '@classes/sites/site';
import { CoreInterceptor } from '@classes/interceptor';
import { CoreWSExternalWarning, CoreWSExternalFile, CoreWSFile } from '@services/ws';
import { makeSingleton, Translate } from '@singletons';
import { CoreCourseCommonModWSOptions } from '@features/course/services/course';
import { CoreGrades } from '@features/grades/services/grades';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreError } from '@classes/errors/error';
import { CoreNetwork } from '@services/network';
import { AddonModAssignOffline } from './assign-offline';
import { AddonModAssignSubmissionDelegate } from './submission-delegate';
import { CoreComments } from '@features/comments/services/comments';
import { AddonModAssignSubmissionFormatted } from './assign-helper';
import { CoreWSError } from '@classes/errors/wserror';
import { CoreFormFields } from '@singletons/form';
import { CoreFileHelper } from '@services/file-helper';
import { CoreIonicColorNames } from '@singletons/colors';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { ContextLevel, CoreCacheUpdateFrequency } from '@/core/constants';
import {
    ADDON_MOD_ASSIGN_COMPONENT,
    ADDON_MOD_ASSIGN_GRADED_EVENT,
    ADDON_MOD_ASSIGN_STARTED_EVENT,
    ADDON_MOD_ASSIGN_SUBMISSION_REMOVED_EVENT,
    ADDON_MOD_ASSIGN_SUBMISSION_SAVED_EVENT,
    ADDON_MOD_ASSIGN_SUBMITTED_FOR_GRADING_EVENT,
} from '../constants';

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [ADDON_MOD_ASSIGN_SUBMISSION_SAVED_EVENT]: AddonModAssignSubmissionSavedEventData;
        [ADDON_MOD_ASSIGN_SUBMISSION_REMOVED_EVENT]: AddonModAssignSubmissionRemovedEventData;
        [ADDON_MOD_ASSIGN_SUBMITTED_FOR_GRADING_EVENT]: AddonModAssignSubmittedForGradingEventData;
        [ADDON_MOD_ASSIGN_GRADED_EVENT]: AddonModAssignGradedEventData;
        [ADDON_MOD_ASSIGN_STARTED_EVENT]: AddonModAssignStartedEventData;
    }

}

/**
 * Service that provides some functions for assign.
 */
@Injectable({ providedIn: 'root' })
export class AddonModAssignProvider {

    protected static readonly ROOT_CACHE_KEY = 'mmaModAssign:';

    /**
     * Check if the user can submit in offline. This should only be used if submissionStatus.lastattempt.cansubmit cannot
     * be used (offline usage).
     * This function doesn't check if the submission is empty, it should be checked before calling this function.
     *
     * @param assign Assignment instance.
     * @param lastAttempt Last Attempt of the submission.
     * @returns Whether it can submit.
     */
    canSubmitOffline(assign: AddonModAssignAssign, lastAttempt: AddonModAssignSubmissionAttempt): boolean {
        if (!this.isSubmissionOpen(assign, lastAttempt)) {
            return false;
        }

        const userSubmission = lastAttempt?.submission;
        const teamSubmission = lastAttempt?.teamsubmission;

        if (teamSubmission) {
            if (teamSubmission.status === AddonModAssignSubmissionStatusValues.SUBMITTED) {
                // The assignment submission has been completed.
                return false;
            } else if (userSubmission && userSubmission.status === AddonModAssignSubmissionStatusValues.SUBMITTED) {
                // The user has already clicked the submit button on the team submission.
                return false;
            } else if (assign.preventsubmissionnotingroup && !lastAttempt?.submissiongroup) {
                return false;
            }
        } else if (userSubmission) {
            if (userSubmission.status === AddonModAssignSubmissionStatusValues.SUBMITTED) {
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
     * @returns Object with fixed params.
     */
    protected fixSubmissionStatusParams(
        site: CoreSite,
        userId?: number,
        groupId?: number,
        isBlind = false,
    ): AddonModAssignFixedSubmissionParams {

        return {
            isBlind: !userId ? false : !!isBlind,
            groupId: groupId || 0,
            userId: userId || site.getUserId(),
        };
    }

    /**
     * Get an assignment by course module ID.
     *
     * @param courseId Course ID the assignment belongs to.
     * @param cmId Assignment module ID.
     * @param options Other options.
     * @returns Promise resolved with the assignment.
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
     * @returns Promise resolved when the assignment is retrieved.
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
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            component: ADDON_MOD_ASSIGN_COMPONENT,
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

        throw new CoreError(Translate.instant('core.course.modulenotfound'));
    }

    /**
     * Get an assignment by instance ID.
     *
     * @param courseId Course ID the assignment belongs to.
     * @param id Assignment instance ID.
     * @param options Other options.
     * @returns Promise resolved with the assignment.
     */
    getAssignmentById(courseId: number, id: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModAssignAssign> {
        return this.getAssignmentByField(courseId, 'id', id, options);
    }

    /**
     * Get cache key for assignment data WS calls.
     *
     * @param courseId Course ID.
     * @returns Cache key.
     */
    protected getAssignmentCacheKey(courseId: number): string {
        return AddonModAssignProvider.ROOT_CACHE_KEY + 'assignment:' + courseId;
    }

    /**
     * Get an assignment user mapping for blind marking.
     *
     * @param assignId Assignment Id.
     * @param userId User Id to be blinded.
     * @param options Other options.
     * @returns Promise resolved with the user blind id.
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
            updateFrequency: CoreCacheUpdateFrequency.OFTEN,
            component: ADDON_MOD_ASSIGN_COMPONENT,
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
     * @returns Cache key.
     */
    protected getAssignmentUserMappingsCacheKey(assignId: number): string {
        return AddonModAssignProvider.ROOT_CACHE_KEY + 'usermappings:' + assignId;
    }

    /**
     * Returns grade information from assign_grades for the requested assignment id
     *
     * @param assignId Assignment Id.
     * @param options Other options.
     * @returns Resolved with requested info when done.
     */
    async getAssignmentGrades(assignId: number, options: CoreCourseCommonModWSOptions = {}): Promise<AddonModAssignGrade[]> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModAssignGetGradesWSParams = {
            assignmentids: [assignId],
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getAssignmentGradesCacheKey(assignId),
            component: ADDON_MOD_ASSIGN_COMPONENT,
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
     * @returns Cache key.
     */
    protected getAssignmentGradesCacheKey(assignId: number): string {
        return AddonModAssignProvider.ROOT_CACHE_KEY + 'assigngrades:' + assignId;
    }

    /**
     * Returns the color name for a given grading status name.
     *
     * @param status Grading status name
     * @returns The color name.
     */
    getSubmissionGradingStatusColor(status?: AddonModAssignGradingStates): CoreIonicColorNames {
        if (!status) {
            return CoreIonicColorNames.NONE;
        }

        if (status == AddonModAssignGradingStates.GRADED
                || status == AddonModAssignGradingStates.MARKING_WORKFLOW_STATE_RELEASED) {
            return CoreIonicColorNames.SUCCESS;
        }

        return CoreIonicColorNames.DANGER;
    }

    /**
     * Returns the translation id for a given grading status name.
     *
     * @param status Grading Status name
     * @returns The status translation identifier.
     */
    getSubmissionGradingStatusTranslationId(status?: AddonModAssignGradingStates): string | undefined {
        if (!status) {
            return;
        }

        if (status === AddonModAssignGradingStates.GRADED
                || status === AddonModAssignGradingStates.NOT_GRADED
                || status === AddonModAssignGradingStates.GRADED_FOLLOWUP_SUBMIT) {
            return 'addon.mod_assign.' + status;
        }

        return 'addon.mod_assign.markingworkflowstate' + status;
    }

    /**
     * Get the submission object from an attempt.
     *
     * @param assign Assign.
     * @param attempt Attempt.
     * @returns Submission object or null.
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
     * @returns Submission plugin attachments.
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
     * @returns Submission text.
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
            text = CoreFileHelper.replacePluginfileUrls(text, submissionPlugin.fileareas[0].files || []);
        }

        return text;
    }

    /**
     * Get an assignment submissions.
     *
     * @param assignId Assignment id.
     * @param options Other options.
     * @returns Promise resolved when done.
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
            updateFrequency: CoreCacheUpdateFrequency.OFTEN,
            component: ADDON_MOD_ASSIGN_COMPONENT,
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
     * @returns Cache key.
     */
    protected getSubmissionsCacheKey(assignId: number): string {
        return AddonModAssignProvider.ROOT_CACHE_KEY + 'submissions:' + assignId;
    }

    /**
     * Get information about an assignment submission status for a given user.
     *
     * @param assignId Assignment instance id.
     * @param options Other options.
     * @returns Promise always resolved with the user submission status.
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
            component: ADDON_MOD_ASSIGN_COMPONENT,
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
     * @returns Promise always resolved with the user submission status.
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
            return await this.getSubmissionStatus(assign.id, newOptions);
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
     * @returns Cache key.
     */
    protected getSubmissionStatusCacheKey(assignId: number, userId: number, groupId?: number, isBlind = false): string {
        return this.getSubmissionsCacheKey(assignId) + ':' + userId + ':' + (isBlind ? 1 : 0) + ':' + groupId;
    }

    /**
     * Returns the color name for a given status name.
     *
     * @param status Status name
     * @returns The color name.
     */
    getSubmissionStatusColor(status: AddonModAssignSubmissionStatusValues): CoreIonicColorNames {
        switch (status) {
            case AddonModAssignSubmissionStatusValues.SUBMITTED:
                return CoreIonicColorNames.SUCCESS;
            case AddonModAssignSubmissionStatusValues.DRAFT:
                return CoreIonicColorNames.INFO;
            case AddonModAssignSubmissionStatusValues.NEW:
            case AddonModAssignSubmissionStatusValues.NO_ATTEMPT:
            case AddonModAssignSubmissionStatusValues.NO_ONLINE_SUBMISSIONS:
            case AddonModAssignSubmissionStatusValues.NO_SUBMISSION:
            case AddonModAssignSubmissionStatusValues.GRADED_FOLLOWUP_SUBMIT:
                return CoreIonicColorNames.DANGER;
            default:
                return CoreIonicColorNames.LIGHT;
        }
    }

    /**
     * Given a list of plugins, returns the plugin names that aren't supported for editing.
     *
     * @param plugins Plugins to check.
     * @returns Promise resolved with unsupported plugin names.
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
     * @returns Promise resolved with the list of participants and summary of submissions.
     */
    async listParticipants(
        assignId: number,
        groupId?: number,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModAssignParticipant[]> {

        groupId = groupId || 0;

        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModAssignListParticipantsWSParams = {
            assignid: assignId,
            groupid: groupId,
            filter: '',
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.listParticipantsCacheKey(assignId, groupId),
            updateFrequency: CoreCacheUpdateFrequency.OFTEN,
            component: ADDON_MOD_ASSIGN_COMPONENT,
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
     * @returns Cache key.
     */
    protected listParticipantsCacheKey(assignId: number, groupId: number): string {
        return this.listParticipantsPrefixCacheKey(assignId) + ':' + groupId;
    }

    /**
     * Get prefix cache key for assignment list participants data WS calls.
     *
     * @param assignId Assignment id.
     * @returns Cache key.
     */
    protected listParticipantsPrefixCacheKey(assignId: number): string {
        return AddonModAssignProvider.ROOT_CACHE_KEY + 'participants:' + assignId;
    }

    /**
     * Invalidates all submission status data.
     *
     * @param assignId Assignment instance id.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
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
     * @returns Promise resolved when the data is invalidated.
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
     * @returns Promise resolved when the data is invalidated.
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
     * @returns Promise resolved when the data is invalidated.
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
     * @returns Promise resolved when the data is invalidated.
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
        promises.push(CoreComments.invalidateCommentsByInstance(ContextLevel.MODULE, assign.id, siteId));
        promises.push(this.invalidateAssignmentData(courseId, siteId));
        promises.push(CoreGrades.invalidateAllCourseGradesData(courseId));

        await Promise.all(promises);
    }

    /**
     * Invalidates assignment submissions data WS calls.
     *
     * @param assignId Assignment instance id.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
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
     * @returns Promise resolved when the data is invalidated.
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
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateListParticipantsData(assignId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.listParticipantsPrefixCacheKey(assignId));
    }

    /**
     * Check if a submission is open. This function is based on Moodle's submissions_open.
     *
     * @param assign Assignment instance.
     * @param lastAttempt Last Attempt fot he submission.
     * @returns Whether submission is open.
     */
    isSubmissionOpen(assign: AddonModAssignAssign, lastAttempt?: AddonModAssignSubmissionAttempt): boolean {
        if (!assign || !lastAttempt) {
            return false;
        }

        const time = CoreTimeUtils.timestamp();
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
            if (assign.submissiondrafts && submission.status == AddonModAssignSubmissionStatusValues.SUBMITTED) {
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
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    async logSubmissionView(assignid: number, siteId?: string): Promise<void> {
        const params: AddonModAssignViewSubmissionStatusWSParams = {
            assignid,
        };

        await CoreCourseLogHelper.log(
            'mod_assign_view_submission_status',
            params,
            ADDON_MOD_ASSIGN_COMPONENT,
            assignid,
            siteId,
        );
    }

    /**
     * Report an assignment grading table is being viewed.
     *
     * @param assignid Assignment ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    async logGradingView(assignid: number, siteId?: string): Promise<void> {
        const params: AddonModAssignViewGradingTableWSParams = {
            assignid,
        };

        await CoreCourseLogHelper.log(
            'mod_assign_view_grading_table',
            params,
            ADDON_MOD_ASSIGN_COMPONENT,
            assignid,
            siteId,
        );
    }

    /**
     * Report an assign as being viewed.
     *
     * @param assignid Assignment ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    async logView(assignid: number, siteId?: string): Promise<void> {
        const params: AddonModAssignViewAssignWSParams = {
            assignid,
        };

        await CoreCourseLogHelper.log(
            'mod_assign_view_assign',
            params,
            ADDON_MOD_ASSIGN_COMPONENT,
            assignid,
            siteId,
        );
    }

    /**
     * Returns if a submissions needs to be graded.
     *
     * @param submission Submission.
     * @param assignId Assignment ID.
     * @returns Promise resolved with boolean: whether it needs to be graded or not.
     */
    async needsSubmissionToBeGraded(submission: AddonModAssignSubmissionFormatted, assignId: number): Promise<boolean> {
        if (submission.status != AddonModAssignSubmissionStatusValues.SUBMITTED) {
            return false;
        }

        if (!submission.gradingstatus) {
            // This should not happen, but it's better to show rather than not showing any of the submissions.
            return true;
        }

        if (submission.gradingstatus != AddonModAssignGradingStates.GRADED &&
                submission.gradingstatus != AddonModAssignGradingStates.MARKING_WORKFLOW_STATE_RELEASED) {
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
     * @returns Promise resolved with true if sent to server, resolved with false if stored in offline.
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

        if (allowOffline && !CoreNetwork.isOnline()) {
            // App is offline, store the action.
            return storeOffline();
        }

        try {
            // If there's already a submission to be sent to the server, discard it first.
            await AddonModAssignOffline.deleteSubmission(assignId, userId, siteId);
            await this.saveSubmissionOnline(assignId, pluginData, siteId);

            return true;
        } catch (error) {
            if (allowOffline && error && !CoreWSError.isWebServiceError(error)) {
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
     * @returns Promise resolved when saved, rejected otherwise.
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
     * Start a submission.
     *
     * @param assignId Assign ID.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved when done.
     */
    async startSubmission(assignId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonModAssignStartSubmissionWSParams = {
            assignid: assignId,
        };

        const result = await site.write<AddonModAssignStartSubmissionWSResponse>('mod_assign_start_submission', params);

        if (!result.warnings?.length) {
            return;
        }

        // Ignore some warnings.
        const warning = result.warnings.find(warning =>
            warning.warningcode !== 'timelimitnotenabled' && warning.warningcode !== 'opensubmissionexists');

        if (warning) {
            throw new CoreWSError(warning);
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
     * @returns Promise resolved with true if sent to server, resolved with false if stored in offline.
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

        if (forceOffline || !CoreNetwork.isOnline()) {
            // App is offline, store the action.
            return storeOffline();
        }

        try {
            // If there's already a submission to be sent to the server, discard it first.
            await AddonModAssignOffline.deleteSubmission(assignId, undefined, siteId);
            await this.submitForGradingOnline(assignId, acceptStatement, siteId);

            return true;
        } catch (error) {
            if (error && !CoreWSError.isWebServiceError(error)) {
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
     * @returns Promise resolved when submitted, rejected otherwise.
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
     * @returns Promise resolved with true if sent to server, resolved with false if stored offline.
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

        if (!CoreNetwork.isOnline()) {
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
            if (error && !CoreWSError.isWebServiceError(error)) {
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
     * @returns Promise resolved when submitted, rejected otherwise.
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
    }

    /**
     * Remove the assignment submission of a user.
     *
     * @param assign Assign.
     * @param submission Last online submission.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with true if sent to server, resolved with false if stored in offline.
     * @since 4.5
     */
    async removeSubmission(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        siteId?: string,
    ): Promise<boolean> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        // Function to store the submission to be synchronized later.
        const storeOffline = async (): Promise<boolean> => {
            await AddonModAssignOffline.saveSubmission(
                assign.id,
                assign.course,
                {},
                submission.timemodified,
                !!assign.submissiondrafts,
                submission.userid,
                siteId,
            );

            return false;
        };

        if (submission.status === AddonModAssignSubmissionStatusValues.NEW ||
                submission.status == AddonModAssignSubmissionStatusValues.REOPENED) {
            // The submission was created offline and not synced, just delete the offline submission.
            await AddonModAssignOffline.deleteSubmission(assign.id, submission.userid, siteId);

            return false;
        }

        if (!CoreNetwork.isOnline()) {
            // App is offline, store the action.
            return storeOffline();
        }

        try {
            // If there's an offline submission, discard it first.
            const offlineData = await AddonModAssignOffline.getSubmission(assign.id, submission.userid, siteId);

            if (offlineData) {
                if (submission.plugins) {
                    // Delete all plugin data.
                    await Promise.all(submission.plugins.map((plugin) =>
                        AddonModAssignSubmissionDelegate.deletePluginOfflineData(
                            assign,
                            submission,
                            plugin,
                            offlineData,
                            siteId,
                        )));
                }

                await AddonModAssignOffline.deleteSubmission(assign.id, submission.userid, siteId);
            }

            await this.removeSubmissionOnline(assign.id, submission.userid, siteId);

            return true;
        } catch (error) {
            if (error && !CoreWSError.isWebServiceError(error)) {
                // Couldn't connect to server, store in offline.
                return storeOffline();
            } else {
                // The WebService has thrown an error or offline not supported, reject.
                throw error;
            }
        }
    }

    /**
     * Remove the assignment submission of a user.
     *
     * @param assignId Assign ID.
     * @param userId User ID. If not defined, current user.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when submitted, rejected otherwise.
     * @since 4.5
     */
    async removeSubmissionOnline(assignId: number, userId?: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        const params: AddonModAssignRemoveSubmissionWSParams = {
            assignid: assignId,
            userid: userId,
        };
        const result = await site.write<AddonModAssignRemoveSubmissionWSResponse>('mod_assign_remove_submission', params);

        if (!result.status) {
            if (result.warnings?.length) {
                throw new CoreWSError(result.warnings[0]);
            } else {
                throw new CoreError('Error removing assignment submission.');
            }
        }
    }

    /**
     * Returns whether or not remove submission WS available or not.
     *
     * @param site Site. If not defined, current site.
     * @returns If WS is available.
     * @since 4.5
     */
    isRemoveSubmissionAvailable(site?: CoreSite): boolean {
        site = site ?? CoreSites.getRequiredCurrentSite();

        return site.wsAvailable('mod_assign_remove_submission');
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
    gradingduedate?: number; // The expected date for marking the submissions.
    teamsubmission: number; // If enabled, students submit as a team.
    requireallteammemberssubmit: number; // If enabled, all team members must submit.
    teamsubmissiongroupingid: number; // The grouping id for the team submission groups.
    blindmarking: number; // If enabled, hide identities until reveal identities actioned.
    hidegrader?: number; // @since 3.7. If enabled, hide grader to student.
    revealidentities: number; // Show identities for a blind marking assignment.
    attemptreopenmethod: AddonModAssignAttemptReopenMethodValues; // Method used to control opening new attempts.
    maxattempts: number; // Maximum number of attempts allowed.
    markingworkflow: number; // Enable marking workflow.
    markingallocation: number; // Enable marking allocation.
    requiresubmissionstatement: number; // Student must accept submission statement.
    preventsubmissionnotingroup?: number; // Prevent submission not in group.
    submissionstatement?: string; // Submission statement formatted.
    submissionstatementformat?: number; // Submissionstatement format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    configs: AddonModAssignConfig[]; // Configuration settings.
    intro?: string; // Assignment intro, not allways returned because it deppends on the activity configuration.
    introformat?: number; // Intro format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    introfiles?: CoreWSExternalFile[];
    introattachments?: CoreWSExternalFile[];
    activity?: string; // @since 4.0. Description of activity.
    activityformat?: number; // @since 4.0. Format of activity.
    activityattachments?: CoreWSExternalFile[]; // @since 4.0. Files from activity field.
    timelimit?: number; // @since 4.0. Time limit to complete assigment.
    submissionattachments?: number; // @since 4.0. Flag to only show files during submission.
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
    status: AddonModAssignSubmissionStatusValues; // Submission status.
    groupid: number; // Group id.
    assignment?: number; // Assignment id.
    latest?: number; // Latest attempt.
    plugins?: AddonModAssignPlugin[]; // Plugins.
    gradingstatus?: AddonModAssignGradingStates; // Grading status.
    timestarted?: number; // @since 4.0. Submission start time.
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
    caneditowner?: boolean; // Whether the owner of the submission can edit it.
    cansubmit: boolean; // Whether the user can submit.
    extensionduedate: number; // Extension due date.
    blindmarking: boolean; // Whether blind marking is enabled.
    gradingstatus: AddonModAssignGradingStates; // Grading status.
    usergroups: number[]; // User groups in the course.
    timelimit?: number; // @since 4.0. Time limit for submission.
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
    suspended?: boolean; // Suspend user account, either false to enable user login or true to disable it.
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
        displayvalue: string; // @since 4.2.Formatted value of the custom field.
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
    grantedextension?: boolean; // Have they been granted an extension.
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
    assignmentdata?: { // @since 4.0. Extra information about assignment.
        attachments?: { // Intro and activity attachments.
            intro?: CoreWSExternalFile[]; // Intro attachments files.
            activity?: CoreWSExternalFile[]; // Activity attachments files.
        };
        activity?: string; // Text of activity.
        activityformat?: number; // Format of activity.
    };
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
 * Params of mod_assign_start_submission WS.
 *
 * @since 4.0
 */
type AddonModAssignStartSubmissionWSParams = {
    assignid: number; // Assignment instance id.
};

/**
 * Params of mod_assign_remove_submission WS.
 */
type AddonModAssignRemoveSubmissionWSParams = {
    userid: number; // User id.
    assignid: number; // Assignment instance id.
};

/**
 * Data returned by mod_assign_remove_submission WS.
 */
export type AddonModAssignRemoveSubmissionWSResponse = {
    status: boolean;
    warnings?: CoreWSExternalWarning[];
};

/**
 * Data returned by mod_assign_start_submission WS.
 *
 * @since 4.0
 */
export type AddonModAssignStartSubmissionWSResponse = {
    submissionid: number; // New submission ID.
    warnings?: CoreWSExternalWarning[];
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
 * Data sent by SUBMISSION_REMOVED_EVENT event.
 */
export type AddonModAssignSubmissionRemovedEventData = AddonModAssignSubmittedForGradingEventData;

/**
 * Data sent by GRADED_EVENT event.
 */
export type AddonModAssignGradedEventData = AddonModAssignSubmittedForGradingEventData;

/**
 * Data sent by STARTED_EVENT event.
 */
export type AddonModAssignStartedEventData = {
    assignmentId: number;
};

/**
 * Submission status.
 * Constants on LMS starting with ASSIGN_SUBMISSION_STATUS_
 */
export enum AddonModAssignSubmissionStatusValues {
    SUBMITTED = 'submitted',
    DRAFT = 'draft',
    NEW = 'new',
    REOPENED = 'reopened',
    // Added by App Statuses.
    NO_ATTEMPT = 'noattempt',
    NO_ONLINE_SUBMISSIONS = 'noonlinesubmissions',
    NO_SUBMISSION = 'nosubmission',
    GRADED_FOLLOWUP_SUBMIT = 'gradedfollowupsubmit',
}

/**
 * Grading status.
 * Constants on LMS starting with ASSIGN_GRADING_STATUS_
 */
export enum AddonModAssignGradingStates {
    GRADED = 'graded',
    NOT_GRADED = 'notgraded',
    // Added by App Statuses.
    MARKING_WORKFLOW_STATE_RELEASED = 'released', // with ASSIGN_MARKING_WORKFLOW_STATE_RELEASED
    GRADED_FOLLOWUP_SUBMIT = 'gradedfollowupsubmit',
}

/**
 * Reopen attempt methods.
 * Constants on LMS starting with ASSIGN_ATTEMPT_REOPEN_METHOD_
 */
export enum AddonModAssignAttemptReopenMethodValues {
    NONE = 'none',
    MANUAL = 'manual',
    UNTILPASS = 'untilpass',
}
