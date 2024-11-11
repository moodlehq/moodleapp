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
import { CoreCourseCommonModWSOptions } from '@features/course/services/course';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreGradesMenuItem } from '@features/grades/services/grades-helper';
import { CoreNetwork } from '@services/network';
import { CoreSites, CoreSitesCommonWSOptions, CoreSitesReadingStrategy } from '@services/sites';
import { CoreTextFormat, defaultTextFormat } from '@singletons/text';
import { CoreUtils } from '@services/utils/utils';
import { CoreStatusWithWarningsWSResponse, CoreWS, CoreWSExternalFile, CoreWSExternalWarning } from '@services/ws';
import { makeSingleton, Translate } from '@singletons';
import { CoreFormFields } from '@singletons/form';
import { AddonModWorkshopOffline } from './workshop-offline';
import {
    ADDON_MOD_WORKSHOP_ASSESSMENT_INVALIDATED,
    ADDON_MOD_WORKSHOP_ASSESSMENT_SAVED,
    ADDON_MOD_WORKSHOP_COMPONENT,
    ADDON_MOD_WORKSHOP_PER_PAGE,
    ADDON_MOD_WORKSHOP_SUBMISSION_CHANGED,
    AddonModWorkshopAction,
    AddonModWorkshopAssessmentMode,
    AddonModWorkshopExampleMode,
    AddonModWorkshopOverallFeedbackMode,
    AddonModWorkshopPhase,
    AddonModWorkshopSubmissionType,
} from '@addons/mod/workshop/constants';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CoreCacheUpdateFrequency } from '@/core/constants';
import { CoreWSError } from '@classes/errors/wserror';

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [ADDON_MOD_WORKSHOP_SUBMISSION_CHANGED]: AddonModWorkshopSubmissionChangedEventData;
        [ADDON_MOD_WORKSHOP_ASSESSMENT_SAVED]: AddonModWorkshopAssessmentSavedChangedEventData;
        [ADDON_MOD_WORKSHOP_ASSESSMENT_INVALIDATED]: AddonModWorkshopAssessmentInvalidatedChangedEventData;
    }
}

/**
 * Service that provides some features for workshops.
 */
@Injectable({ providedIn: 'root' })
export class AddonModWorkshopProvider {

    protected static readonly ROOT_CACHE_KEY = 'mmaModWorkshop:';

    /**
     * Get cache key for workshop data WS calls.
     *
     * @param courseId Course ID.
     * @returns Cache key.
     */
    protected getWorkshopDataCacheKey(courseId: number): string {
        return AddonModWorkshopProvider.ROOT_CACHE_KEY + 'workshop:' + courseId;
    }

    /**
     * Get prefix cache key for all workshop activity data WS calls.
     *
     * @param workshopId Workshop ID.
     * @returns Cache key.
     */
    protected getWorkshopDataPrefixCacheKey(workshopId: number): string {
        return AddonModWorkshopProvider.ROOT_CACHE_KEY + workshopId;
    }

    /**
     * Get cache key for workshop access information data WS calls.
     *
     * @param workshopId Workshop ID.
     * @returns Cache key.
     */
    protected getWorkshopAccessInformationDataCacheKey(workshopId: number): string {
        return this.getWorkshopDataPrefixCacheKey(workshopId) + ':access';
    }

    /**
     * Get cache key for workshop user plan data WS calls.
     *
     * @param workshopId Workshop ID.
     * @returns Cache key.
     */
    protected getUserPlanDataCacheKey(workshopId: number): string {
        return this.getWorkshopDataPrefixCacheKey(workshopId) + ':userplan';
    }

    /**
     * Get cache key for workshop submissions data WS calls.
     *
     * @param workshopId Workshop ID.
     * @param userId User ID.
     * @param groupId Group ID.
     * @returns Cache key.
     */
    protected getSubmissionsDataCacheKey(workshopId: number, userId: number = 0, groupId: number = 0): string {
        return this.getWorkshopDataPrefixCacheKey(workshopId) + ':submissions:' + userId + ':' + groupId;
    }

    /**
     * Get cache key for a workshop submission data WS calls.
     *
     * @param workshopId Workshop ID.
     * @param submissionId Submission ID.
     * @returns Cache key.
     */
    protected getSubmissionDataCacheKey(workshopId: number, submissionId: number): string {
        return this.getWorkshopDataPrefixCacheKey(workshopId) + ':submission:' + submissionId;
    }

    /**
     * Get cache key for workshop grades data WS calls.
     *
     * @param workshopId Workshop ID.
     * @returns Cache key.
     */
    protected getGradesDataCacheKey(workshopId: number): string {
        return this.getWorkshopDataPrefixCacheKey(workshopId) + ':grades';
    }

    /**
     * Get cache key for workshop grade report data WS calls.
     *
     * @param workshopId Workshop ID.
     * @param groupId Group ID.
     * @returns Cache key.
     */
    protected getGradesReportDataCacheKey(workshopId: number, groupId: number = 0): string {
        return this.getWorkshopDataPrefixCacheKey(workshopId) + ':report:' + groupId;
    }

    /**
     * Get cache key for workshop submission assessments data WS calls.
     *
     * @param workshopId Workshop ID.
     * @param submissionId Submission ID.
     * @returns Cache key.
     */
    protected getSubmissionAssessmentsDataCacheKey(workshopId: number, submissionId: number): string {
        return this.getWorkshopDataPrefixCacheKey(workshopId) + ':assessments:' + submissionId;
    }

    /**
     * Get cache key for workshop reviewer assessments data WS calls.
     *
     * @param workshopId Workshop ID.
     * @param userId User ID or current user.
     * @returns Cache key.
     */
    protected getReviewerAssessmentsDataCacheKey(workshopId: number, userId: number = 0): string {
        return this.getWorkshopDataPrefixCacheKey(workshopId) + ':reviewerassessments:' + userId;
    }

    /**
     * Get cache key for a workshop assessment data WS calls.
     *
     * @param workshopId Workshop ID.
     * @param assessmentId Assessment ID.
     * @returns Cache key.
     */
    protected getAssessmentDataCacheKey(workshopId: number, assessmentId: number): string {
        return this.getWorkshopDataPrefixCacheKey(workshopId) + ':assessment:' + assessmentId;
    }

    /**
     * Get cache key for workshop assessment form data WS calls.
     *
     * @param workshopId Workshop ID.
     * @param assessmentId Assessment ID.
     * @param mode Mode assessment (default) or preview.
     * @returns Cache key.
     */
    protected getAssessmentFormDataCacheKey(workshopId: number, assessmentId: number, mode: string = 'assessment'): string {
        return this.getWorkshopDataPrefixCacheKey(workshopId) + ':assessmentsform:' + assessmentId + ':' + mode;
    }

    /**
     * Get a workshop with key=value. If more than one is found, only the first will be returned.
     *
     * @param courseId Course ID.
     * @param key Name of the property to check.
     * @param value Value to search.
     * @param options Other options.
     * @returns Promise resolved when the workshop is retrieved.
     */
    protected async getWorkshopByKey(
        courseId: number,
        key: string,
        value: number,
        options: CoreSitesCommonWSOptions = {},
    ): Promise<AddonModWorkshopData> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModWorkshopGetWorkshopsByCoursesWSParams = {
            courseids: [courseId],
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getWorkshopDataCacheKey(courseId),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            component: ADDON_MOD_WORKSHOP_COMPONENT,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };
        const response = await site.read<AddonModWorkshopGetWorkshopsByCoursesWSResponse>(
            'mod_workshop_get_workshops_by_courses',
            params,
            preSets,
        );

        const workshop = response.workshops.find((workshop) => workshop[key] == value);
        if (!workshop) {
            throw new CoreError(Translate.instant('core.course.modulenotfound'));
        }

        // Set submission types for Moodle 3.5.
        if (workshop.submissiontypetext === undefined) {
            if (workshop.nattachments !== undefined && workshop.nattachments > 0) {
                workshop.submissiontypetext = AddonModWorkshopSubmissionType.SUBMISSION_TYPE_AVAILABLE;
                workshop.submissiontypefile = AddonModWorkshopSubmissionType.SUBMISSION_TYPE_AVAILABLE;
            } else {
                workshop.submissiontypetext = AddonModWorkshopSubmissionType.SUBMISSION_TYPE_REQUIRED;
                workshop.submissiontypefile = AddonModWorkshopSubmissionType.SUBMISSION_TYPE_DISABLED;
            }
        }

        return workshop;
    }

    /**
     * Get a workshop by course module ID.
     *
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param options Other options.
     * @returns Promise resolved when the workshop is retrieved.
     */
    getWorkshop(courseId: number, cmId: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModWorkshopData> {
        return this.getWorkshopByKey(courseId, 'coursemodule', cmId, options);
    }

    /**
     * Get a workshop by ID.
     *
     * @param courseId Course ID.
     * @param id Workshop ID.
     * @param options Other options.
     * @returns Promise resolved when the workshop is retrieved.
     */
    getWorkshopById(courseId: number, id: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModWorkshopData> {
        return this.getWorkshopByKey(courseId, 'id', id, options);
    }

    /**
     * Invalidates workshop data.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the workshop is invalidated.
     */
    async invalidateWorkshopData(courseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getWorkshopDataCacheKey(courseId));
    }

    /**
     * Invalidates workshop data except files and module info.
     *
     * @param workshopId Workshop ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the workshop is invalidated.
     */
    async invalidateWorkshopWSData(workshopId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getWorkshopDataPrefixCacheKey(workshopId));
    }

    /**
     * Get access information for a given workshop.
     *
     * @param workshopId Workshop ID.
     * @param options Other options.
     * @returns Promise resolved when the workshop is retrieved.
     */
    async getWorkshopAccessInformation(
        workshopId: number,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModWorkshopGetWorkshopAccessInformationWSResponse> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModWorkshopGetWorkshopAccessInformationWSParams = {
            workshopid: workshopId,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getWorkshopAccessInformationDataCacheKey(workshopId),
            component: ADDON_MOD_WORKSHOP_COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        return site.read<AddonModWorkshopGetWorkshopAccessInformationWSResponse>(
            'mod_workshop_get_workshop_access_information',
            params,
            preSets,
        );
    }

    /**
     * Invalidates workshop access information data.
     *
     * @param workshopId Workshop ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateWorkshopAccessInformationData(workshopId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getWorkshopAccessInformationDataCacheKey(workshopId));
    }

    /**
     * Return the planner information for the given user.
     *
     * @param workshopId Workshop ID.
     * @param options Other options.
     * @returns Promise resolved when the workshop data is retrieved.
     */
    async getUserPlanPhases(
        workshopId: number,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<Record<string, AddonModWorkshopPhaseData>> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModWorkshopGetUserPlanWSParams = {
            workshopid: workshopId,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getUserPlanDataCacheKey(workshopId),
            updateFrequency: CoreCacheUpdateFrequency.OFTEN,
            component: ADDON_MOD_WORKSHOP_COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModWorkshopGetUserPlanWSResponse>('mod_workshop_get_user_plan', params, preSets);

        return CoreUtils.arrayToObject(response.userplan.phases, 'code');
    }

    /**
     * Invalidates workshop user plan data.
     *
     * @param workshopId Workshop ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateUserPlanPhasesData(workshopId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        await site.invalidateWsCacheForKey(this.getUserPlanDataCacheKey(workshopId));
    }

    /**
     * Retrieves all the workshop submissions visible by the current user or the one done by the given user.
     *
     * @param workshopId Workshop ID.
     * @param options Other options.
     * @returns Promise resolved when the workshop submissions are retrieved.
     */
    async getSubmissions(
        workshopId: number,
        options: AddonModWorkshopGetSubmissionsOptions = {},
    ): Promise<AddonModWorkshopSubmissionData[]> {
        const userId = options.userId || 0;
        const groupId = options.groupId || 0;

        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModWorkshopGetSubmissionsWSParams = {
            workshopid: workshopId,
            userid: userId,
            groupid: groupId,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getSubmissionsDataCacheKey(workshopId, userId, groupId),
            updateFrequency: CoreCacheUpdateFrequency.OFTEN,
            component: ADDON_MOD_WORKSHOP_COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModWorkshopGetSubmissionsWSResponse>('mod_workshop_get_submissions', params, preSets);

        return response.submissions;
    }

    /**
     * Invalidates workshop submissions data.
     *
     * @param workshopId Workshop ID.
     * @param userId User ID.
     * @param groupId Group ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateSubmissionsData(workshopId: number, userId: number = 0, groupId: number = 0, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getSubmissionsDataCacheKey(workshopId, userId, groupId));
    }

    /**
     * Retrieves the given submission.
     *
     * @param workshopId Workshop ID.
     * @param submissionId Submission ID.
     * @param options Other options.
     * @returns Promise resolved when the workshop submission data is retrieved.
     */
    async getSubmission(
        workshopId: number,
        submissionId: number,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModWorkshopSubmissionData> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModWorkshopGetSubmissionWSParams = {
            submissionid: submissionId,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getSubmissionDataCacheKey(workshopId, submissionId),
            component: ADDON_MOD_WORKSHOP_COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModWorkshopGetSubmissionWSResponse>('mod_workshop_get_submission', params, preSets);

        return response.submission;
    }

    /**
     * Invalidates workshop submission data.
     *
     * @param workshopId Workshop ID.
     * @param submissionId Submission ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateSubmissionData(workshopId: number, submissionId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getSubmissionDataCacheKey(workshopId, submissionId));
    }

    /**
     * Returns the grades information for the given workshop and user.
     *
     * @param workshopId Workshop ID.
     * @param options Other options.
     * @returns Promise resolved when the workshop grades data is retrieved.
     */
    async getGrades(workshopId: number, options: CoreCourseCommonModWSOptions = {}): Promise<AddonModWorkshopGetGradesWSResponse> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModWorkshopGetGradesWSParams = {
            workshopid: workshopId,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getGradesDataCacheKey(workshopId),
            component: ADDON_MOD_WORKSHOP_COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        return site.read<AddonModWorkshopGetGradesWSResponse>('mod_workshop_get_grades', params, preSets);
    }

    /**
     * Invalidates workshop grades data.
     *
     * @param workshopId Workshop ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateGradesData(workshopId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getGradesDataCacheKey(workshopId));
    }

    /**
     * Retrieves the assessment grades report.
     *
     * @param workshopId Workshop ID.
     * @param options Other options.
     * @returns Promise resolved when the workshop data is retrieved.
     */
    async getGradesReport(
        workshopId: number,
        options: AddonModWorkshopGetGradesReportOptions = {},
    ): Promise<AddonModWorkshoGradesReportData> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModWorkshopGetGradesReportWSParams = {
            workshopid: workshopId,
            groupid: options.groupId,
            page: options.page || 0,
            perpage: options.perPage || ADDON_MOD_WORKSHOP_PER_PAGE,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getGradesReportDataCacheKey(workshopId, options.groupId),
            updateFrequency: CoreCacheUpdateFrequency.OFTEN,
            component: ADDON_MOD_WORKSHOP_COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response =
            await site.read<AddonModWorkshopGetGradesReportWSResponse>('mod_workshop_get_grades_report', params, preSets);

        return response.report;
    }

    /**
     * Performs the whole fetch of the grade reports in the workshop.
     *
     * @param workshopId Workshop ID.
     * @param options Other options.
     * @returns Promise resolved when done.
     */
    fetchAllGradeReports(
        workshopId: number,
        options: AddonModWorkshopFetchAllGradesReportOptions = {},
    ): Promise<AddonModWorkshopGradesData[]> {
        return this.fetchGradeReportsRecursive(workshopId, [], {
            ...options, // Include all options.
            page: 0,
            perPage: options.perPage || ADDON_MOD_WORKSHOP_PER_PAGE,
            siteId: options.siteId || CoreSites.getCurrentSiteId(),
        });
    }

    /**
     * Recursive call on fetch all grade reports.
     *
     * @param workshopId Workshop ID.
     * @param grades Grades already fetched (just to concatenate them).
     * @param options Other options.
     * @returns Promise resolved when done.
     */
    protected async fetchGradeReportsRecursive(
        workshopId: number,
        grades: AddonModWorkshopGradesData[],
        options: AddonModWorkshopGetGradesReportOptions = {},
    ): Promise<AddonModWorkshopGradesData[]> {
        options.page = options.page ?? 0;
        options.perPage = options.perPage ?? ADDON_MOD_WORKSHOP_PER_PAGE;

        const report = await this.getGradesReport(workshopId, options);

        Array.prototype.push.apply(grades, report.grades);
        const canLoadMore = ((options.page + 1) * options.perPage) < report.totalcount;

        if (canLoadMore) {
            options.page++;

            return this.fetchGradeReportsRecursive(workshopId, grades, options);
        }

        return grades;
    }

    /**
     * Invalidates workshop grade report data.
     *
     * @param workshopId Workshop ID.
     * @param groupId Group ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateGradeReportData(workshopId: number, groupId: number = 0, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getGradesReportDataCacheKey(workshopId, groupId));
    }

    /**
     * Retrieves the given submission assessment.
     *
     * @param workshopId Workshop ID.
     * @param submissionId Submission ID.
     * @param options Other options.
     * @returns Promise resolved when the workshop data is retrieved.
     */
    async getSubmissionAssessments(
        workshopId: number,
        submissionId: number,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModWorkshopSubmissionAssessmentData[]> {

        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModWorkshopGetSubmissionAssessmentsWSParams = {
            submissionid: submissionId,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getSubmissionAssessmentsDataCacheKey(workshopId, submissionId),
            component: ADDON_MOD_WORKSHOP_COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };
        const response = await site.read<AddonModWorkshopGetAssessmentsWSResponse>(
            'mod_workshop_get_submission_assessments',
            params,
            preSets,
        );

        return response.assessments;
    }

    /**
     * Invalidates workshop submission assessments data.
     *
     * @param workshopId Workshop ID.
     * @param submissionId Submission ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateSubmissionAssesmentsData(workshopId: number, submissionId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getSubmissionAssessmentsDataCacheKey(workshopId, submissionId));
    }

    /**
     * Add a new submission to a given workshop.
     *
     * @param workshopId Workshop ID.
     * @param courseId Course ID the workshop belongs to.
     * @param title The submission title.
     * @param content The submission text content.
     * @param attachmentsId The draft file area id for attachments.
     * @param siteId Site ID. If not defined, current site.
     * @param allowOffline True if it can be stored in offline, false otherwise.
     * @returns Promise resolved with submission ID if sent online or false if stored offline.
     */
    async addSubmission(
        workshopId: number,
        courseId: number,
        title: string,
        content: string,
        attachmentsId?: number,
        siteId?: string,
        allowOffline: boolean = false,
    ): Promise<number | false> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        // Convenience function to store a message to be synchronized later.
        const storeOffline = async (): Promise<false> => {
            await AddonModWorkshopOffline.saveSubmission(
                workshopId,
                courseId,
                title,
                content,
                undefined,
                undefined,
                AddonModWorkshopAction.ADD,
                siteId,
            );

            return false;
        };

        // If we are editing an offline submission, discard previous first.
        await AddonModWorkshopOffline.deleteSubmissionAction(workshopId, AddonModWorkshopAction.ADD, siteId);

        if (!CoreNetwork.isOnline() && allowOffline) {
            // App is offline, store the action.
            return storeOffline();
        }

        try {
            return await this.addSubmissionOnline(workshopId, title, content, attachmentsId as number, siteId);
        } catch (error) {
            if (allowOffline && !CoreWSError.isWebServiceError(error)) {
                // Couldn't connect to server, store in offline.
                return storeOffline();
            }

            // The WebService has thrown an error or offline not supported, reject.
            throw error;
        }
    }

    /**
     * Add a new submission to a given workshop. It will fail if offline or cannot connect.
     *
     * @param workshopId Workshop ID.
     * @param title The submission title.
     * @param content The submission text content.
     * @param attachmentsId The draft file area id for attachments.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the submission is created.
     */
    async addSubmissionOnline(
        workshopId: number,
        title: string,
        content: string,
        attachmentsId?: number,
        siteId?: string,
    ): Promise<number> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonModWorkshopAddSubmissionWSParams = {
            workshopid: workshopId,
            title: title,
            content: content,
            attachmentsid: attachmentsId,
        };

        const response = await site.write<AddonModWorkshopAddSubmissionWSResponse>('mod_workshop_add_submission', params);

        // Other errors ocurring.
        CoreWS.throwOnFailedStatus(response, 'Add submission failed');

        if (!response.submissionid) {
            throw new CoreError('Add submission failed, no submission id was returned');
        }

        return response.submissionid;
    }

    /**
     * Updates the given submission.
     *
     * @param workshopId Workshop ID.
     * @param submissionId Submission ID.
     * @param courseId Course ID the workshop belongs to.
     * @param title The submission title.
     * @param content The submission text content.
     * @param attachmentsId The draft file area id for attachments.
     * @param siteId Site ID. If not defined, current site.
     * @param allowOffline True if it can be stored in offline, false otherwise.
     * @returns Promise resolved with submission ID if sent online or false if stored offline.
     */
    async updateSubmission(
        workshopId: number,
        submissionId: number,
        courseId: number,
        title: string,
        content: string,
        attachmentsId?: number | undefined,
        siteId?: string,
        allowOffline: boolean = false,
    ): Promise<number | false> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        // Convenience function to store a message to be synchronized later.
        const storeOffline = async (): Promise<false> => {
            await AddonModWorkshopOffline.saveSubmission(
                workshopId,
                courseId,
                title,
                content,
                undefined,
                submissionId,
                AddonModWorkshopAction.UPDATE,
                siteId,
            );

            return false;
        };

        // If we are editing an offline discussion, discard previous first.
        await AddonModWorkshopOffline.deleteSubmissionAction(workshopId, AddonModWorkshopAction.UPDATE, siteId);

        if (!CoreNetwork.isOnline() && allowOffline) {
            // App is offline, store the action.
            return storeOffline();
        }

        try {
            return await this.updateSubmissionOnline(submissionId, title, content, attachmentsId as number, siteId);
        } catch (error) {
            if (allowOffline && !CoreWSError.isWebServiceError(error)) {
                // Couldn't connect to server, store in offline.
                return storeOffline();
            }

            // The WebService has thrown an error or offline not supported, reject.
            throw error;
        }
    }

    /**
     * Updates the given submission. It will fail if offline or cannot connect.
     *
     * @param submissionId Submission ID.
     * @param title The submission title.
     * @param content The submission text content.
     * @param attachmentsId The draft file area id for attachments.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the submission is updated.
     */
    async updateSubmissionOnline(
        submissionId: number,
        title: string,
        content: string,
        attachmentsId?: number,
        siteId?: string,
    ): Promise<number> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonModWorkshopUpdateSubmissionWSParams = {
            submissionid: submissionId,
            title: title,
            content: content,
            attachmentsid: attachmentsId || 0,
        };

        const response = await site.write<CoreStatusWithWarningsWSResponse>('mod_workshop_update_submission', params);

        // Other errors ocurring.
        CoreWS.throwOnFailedStatus(response, 'Update submission failed');

        return submissionId;
    }

    /**
     * Deletes the given submission.
     *
     * @param workshopId Workshop ID.
     * @param submissionId Submission ID.
     * @param courseId Course ID the workshop belongs to.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with submission ID if sent online, resolved with false if stored offline.
     */
    async deleteSubmission(workshopId: number, submissionId: number, courseId: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        // Convenience function to store a message to be synchronized later.
        const storeOffline = (): Promise<void> => AddonModWorkshopOffline.saveSubmission(
            workshopId,
            courseId,
            '',
            '',
            undefined,
            submissionId,
            AddonModWorkshopAction.DELETE,
            siteId,
        );

        // If we are editing an offline discussion, discard previous first.
        await AddonModWorkshopOffline.deleteSubmissionAction(workshopId, AddonModWorkshopAction.DELETE, siteId);

        if (!CoreNetwork.isOnline()) {
            // App is offline, store the action.
            return storeOffline();
        }

        try {
            return await this.deleteSubmissionOnline(submissionId, siteId);
        } catch (error) {
            if (!CoreWSError.isWebServiceError(error)) {
                // Couldn't connect to server, store in offline.
                return storeOffline();
            }

            // The WebService has thrown an error or offline not supported, reject.
            throw error;
        }
    }

    /**
     * Deletes the given submission. It will fail if offline or cannot connect.
     *
     * @param submissionId Submission ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the submission is deleted.
     */
    async deleteSubmissionOnline(submissionId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        const params: AddonModWorkshopDeleteSubmissionWSParams = {
            submissionid: submissionId,
        };

        const response = await site.write<CoreStatusWithWarningsWSResponse>('mod_workshop_delete_submission', params);

        // Other errors ocurring.
        CoreWS.throwOnFailedStatus(response, 'Delete submission failed');
    }

    /**
     * Retrieves all the assessments reviewed by the given user.
     *
     * @param workshopId Workshop ID.
     * @param options Other options.
     * @returns Promise resolved when the workshop data is retrieved.
     */
    async getReviewerAssessments(
        workshopId: number,
        options: AddonModWorkshopUserOptions = {},
    ): Promise<AddonModWorkshopSubmissionAssessmentData[]> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModWorkshopGetReviewerAssessmentsWSParams = {
            workshopid: workshopId,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getReviewerAssessmentsDataCacheKey(workshopId, options.userId),
            component: ADDON_MOD_WORKSHOP_COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        if (options.userId) {
            params.userid = options.userId;
        }

        const response =
            await site.read<AddonModWorkshopGetAssessmentsWSResponse>('mod_workshop_get_reviewer_assessments', params, preSets);

        return response.assessments;
    }

    /**
     * Invalidates workshop user assessments data.
     *
     * @param workshopId Workshop ID.
     * @param userId User ID. If not defined, current user.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateReviewerAssesmentsData(workshopId: number, userId?: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getReviewerAssessmentsDataCacheKey(workshopId, userId));
    }

    /**
     * Retrieves the given assessment.
     *
     * @param workshopId Workshop ID.
     * @param assessmentId Assessment ID.
     * @param options Other options.
     * @returns Promise resolved when the workshop data is retrieved.
     */
    async getAssessment(
        workshopId: number,
        assessmentId: number,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModWorkshopSubmissionAssessmentData> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModWorkshopGetAssessmentWSParams = {
            assessmentid: assessmentId,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getAssessmentDataCacheKey(workshopId, assessmentId),
            component: ADDON_MOD_WORKSHOP_COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };
        const response = await site.read<AddonModWorkshopGetAssessmentWSResponse>('mod_workshop_get_assessment', params, preSets);

        return response.assessment;
    }

    /**
     * Invalidates workshop assessment data.
     *
     * @param workshopId Workshop ID.
     * @param assessmentId Assessment ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateAssessmentData(workshopId: number, assessmentId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getAssessmentDataCacheKey(workshopId, assessmentId));
    }

    /**
     * Retrieves the assessment form definition (data required to be able to display the assessment form).
     *
     * @param workshopId Workshop ID.
     * @param assessmentId Assessment ID.
     * @param options Other options.
     * @returns Promise resolved when the workshop data is retrieved.
     */
    async getAssessmentForm(
        workshopId: number,
        assessmentId: number,
        options: AddonModWorkshopGetAssessmentFormOptions = {},
    ): Promise<AddonModWorkshopGetAssessmentFormDefinitionData> {
        const mode = options.mode || AddonModWorkshopAssessmentMode.ASSESSMENT;

        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModWorkshopGetAssessmentFormDefinitionWSParams = {
            assessmentid: assessmentId,
            mode: mode,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getAssessmentFormDataCacheKey(workshopId, assessmentId, mode),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            component: ADDON_MOD_WORKSHOP_COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModWorkshopGetAssessmentFormDefinitionWSResponse>(
            'mod_workshop_get_assessment_form_definition',
            params,
            preSets,
        );

        return {
            dimenssionscount: response.dimenssionscount,
            descriptionfiles: response.descriptionfiles,
            dimensionsinfo: response.dimensionsinfo,
            warnings: response.warnings,
            fields: this.parseFields(response.fields),
            current: this.parseFields(response.current),
            options: CoreUtils.objectToKeyValueMap<string>(response.options, 'name', 'value'),
        };
    }

    /**
     * Parse fieldes into a more handful format.
     *
     * @param fields Fields to parse
     * @returns Parsed fields
     */
    parseFields(fields: AddonModWorkshopGetAssessmentFormFieldData[]): AddonModWorkshopGetAssessmentFormFieldsParsedData[] {
        const parsedFields: AddonModWorkshopGetAssessmentFormFieldsParsedData[] = [];

        fields.forEach((field) => {
            const args: string[] = field.name.split('_');
            const name = args[0];
            const idx = args[3];
            const idy = args[6];
            const idxNumber = parseInt(args[3], 10);
            const idyNumber = parseInt(args[6], 10);

            if (!isNaN(idxNumber)) {
                if (!parsedFields[idx]) {
                    parsedFields[idx] = {
                        number: idxNumber + 1, // eslint-disable-line id-blacklist
                    };
                }

                if (!isNaN(idyNumber)) {
                    if (!parsedFields[idx].fields) {
                        parsedFields[idx].fields = [];
                    }

                    if (!parsedFields[idx].fields[idy]) {
                        parsedFields[idx].fields[idy] = {
                            number: idyNumber + 1, // eslint-disable-line id-blacklist
                        };
                    }
                    parsedFields[idx].fields[idy][name] = field.value;
                } else {
                    parsedFields[idx][name] = field.value;
                }
            }
        });

        return parsedFields;
    }

    /**
     * Invalidates workshop assessments form data.
     *
     * @param workshopId Workshop ID.
     * @param assessmentId Assessment ID.
     * @param mode Mode assessment (default) or preview.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateAssessmentFormData(
        workshopId: number,
        assessmentId: number,
        mode: string = 'assessment',
        siteId?: string,
    ):
        Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getAssessmentFormDataCacheKey(workshopId, assessmentId, mode));
    }

    /**
     * Updates the given assessment.
     *
     * @param workshopId Workshop ID.
     * @param assessmentId Assessment ID.
     * @param courseId Course ID the workshop belongs to.
     * @param inputData Assessment data.
     * @param siteId Site ID. If not defined, current site.
     * @param allowOffline True if it can be stored in offline, false otherwise.
     * @returns Promise resolved with true if sent online, or false if stored offline.
     */
    async updateAssessment(
        workshopId: number,
        assessmentId: number,
        courseId: number,
        inputData: CoreFormFields,
        siteId?: string,
        allowOffline = false,
    ): Promise<boolean> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        // Convenience function to store a message to be synchronized later.
        const storeOffline = async (): Promise<boolean> => {
            await AddonModWorkshopOffline.saveAssessment(workshopId, assessmentId, courseId, inputData, siteId);

            return false;
        };

        // If we are editing an offline discussion, discard previous first.
        await AddonModWorkshopOffline.deleteAssessment(workshopId, assessmentId, siteId);
        if (!CoreNetwork.isOnline() && allowOffline) {
            // App is offline, store the action.
            return storeOffline();
        }
        try {
            await this.updateAssessmentOnline(assessmentId, inputData, siteId);

            return true;
        } catch (error) {
            if (allowOffline && !CoreWSError.isWebServiceError(error)) {
                // Couldn't connect to server, store in offline.
                return storeOffline();
            }

            // The WebService has thrown an error or offline not supported, reject.
            throw error;
        }
    }

    /**
     * Updates the given assessment. It will fail if offline or cannot connect.
     *
     * @param assessmentId Assessment ID.
     * @param inputData Assessment data.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the grade of the submission.
     */
    async updateAssessmentOnline(assessmentId: number, inputData: CoreFormFields, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonModWorkshopUpdateAssessmentWSParams = {
            assessmentid: assessmentId,
            data: CoreUtils.objectToArrayOfObjects(inputData, 'name', 'value'),
        };

        const response = await site.write<AddonModWorkshopUpdateAssessmentWSResponse>('mod_workshop_update_assessment', params);

        // Other errors ocurring.
        CoreWS.throwOnFailedStatus(response, 'Update assessment failed');
    }

    /**
     * Evaluates a submission (used by teachers for provide feedback or override the submission grade).
     *
     * @param workshopId Workshop ID.
     * @param submissionId The submission id.
     * @param courseId Course ID the workshop belongs to.
     * @param feedbackText The feedback for the author.
     * @param published Whether to publish the submission for other users.
     * @param gradeOver The new submission grade (empty for no overriding the grade).
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when submission is evaluated if sent online,
     *         resolved with false if stored offline.
     */
    async evaluateSubmission(
        workshopId: number,
        submissionId: number,
        courseId: number,
        feedbackText?: string,
        published?: boolean,
        gradeOver?: string,
        siteId?: string,
    ): Promise<boolean> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        // Convenience function to store a message to be synchronized later.
        const storeOffline = (): Promise<boolean> => AddonModWorkshopOffline.saveEvaluateSubmission(
            workshopId,
            submissionId,
            courseId,
            feedbackText,
            published,
            gradeOver,
            siteId,
        ).then(() => false);

        // If we are editing an offline discussion, discard previous first.
        await AddonModWorkshopOffline.deleteEvaluateSubmission(workshopId, submissionId, siteId);
        if (!CoreNetwork.isOnline()) {
            // App is offline, store the action.
            return storeOffline();
        }

        try {
            return await this.evaluateSubmissionOnline(submissionId, feedbackText, published, gradeOver, siteId);
        } catch (error) {
            if (CoreWSError.isWebServiceError(error)) {
                // The WebService has thrown an error or offline not supported, reject.
                throw error;
            }

            // Couldn't connect to server, store in offline.
            return storeOffline();
        }
    }

    /**
     * Evaluates a submission (used by teachers for provide feedback or override the submission grade).
     * It will fail if offline or cannot connect.
     *
     * @param submissionId The submission id.
     * @param feedbackText The feedback for the author.
     * @param published Whether to publish the submission for other users.
     * @param gradeOver The new submission grade (empty for no overriding the grade).
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the submission is evaluated.
     */
    async evaluateSubmissionOnline(
        submissionId: number,
        feedbackText?: string,
        published?: boolean,
        gradeOver?: string,
        siteId?: string,
    ): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonModWorkshopEvaluateSubmissionWSParams = {
            submissionid: submissionId,
            feedbacktext: feedbackText || '',
            feedbackformat: defaultTextFormat,
            published: published,
            gradeover: gradeOver,
        };

        const response = await site.write<CoreStatusWithWarningsWSResponse>('mod_workshop_evaluate_submission', params);

        // Other errors ocurring.
        CoreWS.throwOnFailedStatus(response, 'Evaluate submission failed');

        return true;
    }

    /**
     * Evaluates an assessment (used by teachers for provide feedback to the reviewer).
     *
     * @param workshopId Workshop ID.
     * @param assessmentId The assessment id.
     * @param courseId Course ID the workshop belongs to.
     * @param feedbackText The feedback for the reviewer.
     * @param weight The new weight for the assessment.
     * @param gradingGradeOver The new grading grade (empty for no overriding the grade).
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when assessment is evaluated if sent online,
     *         resolved with false if stored offline.
     */
    async evaluateAssessment(
        workshopId: number,
        assessmentId: number,
        courseId: number,
        feedbackText?: string,
        weight = 0,
        gradingGradeOver?: string,
        siteId?: string,
    ): Promise<boolean> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        // Convenience function to store a message to be synchronized later.
        const storeOffline = (): Promise<boolean> => AddonModWorkshopOffline.saveEvaluateAssessment(
            workshopId,
            assessmentId,
            courseId,
            feedbackText,
            weight,
            gradingGradeOver,
            siteId,
        ).then(() => false);

        // If we are editing an offline discussion, discard previous first.
        await AddonModWorkshopOffline.deleteEvaluateAssessment(workshopId, assessmentId, siteId);
        if (!CoreNetwork.isOnline()) {
            // App is offline, store the action.
            return storeOffline();
        }
        try {
            return await this.evaluateAssessmentOnline(assessmentId, feedbackText, weight, gradingGradeOver, siteId);
        } catch (error) {
            if (!CoreWSError.isWebServiceError(error)) {
                // Couldn't connect to server, store in offline.
                return storeOffline();
            }
            // The WebService has thrown an error or offline not supported, reject.
            throw error;
        }
    }

    /**
     * Evaluates an assessment (used by teachers for provide feedback to the reviewer). It will fail if offline or cannot connect.
     *
     * @param assessmentId The assessment id.
     * @param feedbackText The feedback for the reviewer.
     * @param weight The new weight for the assessment.
     * @param gradingGradeOver The new grading grade (empty for no overriding the grade).
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the assessment is evaluated.
     */
    async evaluateAssessmentOnline(
        assessmentId: number,
        feedbackText?: string,
        weight?: number,
        gradingGradeOver?: string,
        siteId?: string,
    ): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonModWorkshopEvaluateAssessmentWSParams = {
            assessmentid: assessmentId,
            feedbacktext: feedbackText || '',
            feedbackformat: defaultTextFormat,
            weight: weight,
            gradinggradeover: gradingGradeOver,
        };

        const response = await site.write<CoreStatusWithWarningsWSResponse>('mod_workshop_evaluate_assessment', params);

        // Other errors ocurring.
        CoreWS.throwOnFailedStatus(response, 'Evaluate assessment failed');

        return true;
    }

    /**
     * Invalidate the prefetched content except files.
     *
     * @param moduleId The module ID.
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promised resolved when content is invalidated.
     */
    async invalidateContent(moduleId: number, courseId: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const workshop = await this.getWorkshop(courseId, moduleId, {
            readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE,
            siteId,
        });

        await this.invalidateContentById(workshop.id, courseId, siteId);
    }

    /**
     * Invalidate the prefetched content except files using the activityId.
     *
     * @param workshopId Workshop ID.
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when content is invalidated.
     */
    async invalidateContentById(workshopId: number, courseId: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const promises = [
            // Do not invalidate workshop data before getting workshop info, we need it!
            this.invalidateWorkshopData(courseId, siteId),
            this.invalidateWorkshopWSData(workshopId, siteId),
        ];

        await Promise.all(promises);
    }

    /**
     * Report the workshop as being viewed.
     *
     * @param id Workshop ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    async logView(id: number, siteId?: string): Promise<void> {
        const params: AddonModWorkshopViewWorkshopWSParams = {
            workshopid: id,
        };

        await CoreCourseLogHelper.log(
            'mod_workshop_view_workshop',
            params,
            ADDON_MOD_WORKSHOP_COMPONENT,
            id,
            siteId,
        );
    }

    /**
     * Report the workshop submission as being viewed.
     *
     * @param id Submission ID.
     * @param workshopId Workshop ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    async logViewSubmission(id: number, workshopId: number, siteId?: string): Promise<void> {
        const params: AddonModWorkshopViewSubmissionWSParams = {
            submissionid: id,
        };

        await CoreCourseLogHelper.log(
            'mod_workshop_view_submission',
            params,
            ADDON_MOD_WORKSHOP_COMPONENT,
            workshopId,
            siteId,
        );
    }

}
export const AddonModWorkshop = makeSingleton(AddonModWorkshopProvider);

/**
 * Params of mod_workshop_view_workshop WS.
 */
type AddonModWorkshopViewWorkshopWSParams = {
    workshopid: number; // Workshop instance id.
};

/**
 * Params of mod_workshop_view_submission WS.
 */
type AddonModWorkshopViewSubmissionWSParams = {
    submissionid: number; // Submission id.
};

/**
 * Params of mod_workshop_get_workshops_by_courses WS.
 */
type AddonModWorkshopGetWorkshopsByCoursesWSParams = {
    courseids?: number[]; // Array of course ids.
};

/**
 * Data returned by mod_workshop_get_workshops_by_courses WS.
 */
type AddonModWorkshopGetWorkshopsByCoursesWSResponse = {
    workshops: AddonModWorkshopData[];
    warnings?: CoreWSExternalWarning[];
};

export type AddonModWorkshopData = {
    id: number; // The primary key of the record.
    course: number; // Course id this workshop is part of.
    name: string; // Workshop name.
    intro: string; // Workshop introduction text.
    introformat?: CoreTextFormat; // Intro format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    instructauthors?: string; // Instructions for the submission phase.
    instructauthorsformat?: CoreTextFormat; // Instructauthors format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    instructreviewers?: string; // Instructions for the assessment phase.
    instructreviewersformat?: CoreTextFormat; // Instructreviewers format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    timemodified?: number; // The timestamp when the module was modified.
    phase: AddonModWorkshopPhase; // The current phase of workshop.
    useexamples?: boolean; // Optional feature: students practise evaluating on example submissions from teacher.
    usepeerassessment?: boolean; // Optional feature: students perform peer assessment of others' work.
    useselfassessment?: boolean; // Optional feature: students perform self assessment of their own work.
    grade?: number; // The maximum grade for submission.
    gradinggrade?: number; // The maximum grade for assessment.
    strategy?: string; // The type of the current grading strategy used in this workshop.
    evaluation?: string; // The recently used grading evaluation method.
    gradedecimals?: number; // Number of digits that should be shown after the decimal point when displaying grades.
    submissiontypetext?: AddonModWorkshopSubmissionType; // Indicates whether text is required as part of each submission.
    // 0 for no, 1 for optional, 2 for required.
    submissiontypefile?: AddonModWorkshopSubmissionType; // Indicates whether a file upload is required as part of each submission.
    // 0 for no, 1 for optional, 2 for required.
    nattachments?: number; // Maximum number of submission attachments.
    submissionfiletypes?: string; // Comma separated list of file extensions.
    latesubmissions?: boolean; // Allow submitting the work after the deadline.
    maxbytes?: number; // Maximum size of the one attached file.
    examplesmode?: AddonModWorkshopExampleMode; // 0 = example assessments are voluntary,
    // 1 = examples must be assessed before submission,
    // 2 = examples are available after own submission and must be assessed before peer/self assessment phase.
    submissionstart?: number; // 0 = will be started manually, greater than 0 the timestamp of the start of the submission phase.
    submissionend?: number; // 0 = will be closed manually, greater than 0 the timestamp of the end of the submission phase.
    assessmentstart?: number; // 0 = will be started manually, greater than 0 the timestamp of the start of the assessment phase.
    assessmentend?: number; // 0 = will be closed manually, greater than 0 the timestamp of the end of the assessment phase.
    phaseswitchassessment?: boolean; // Automatically switch to the assessment phase after the submissions deadline.
    conclusion?: string; // A text to be displayed at the end of the workshop.
    conclusionformat?: CoreTextFormat; // Conclusion format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    overallfeedbackmode?: AddonModWorkshopOverallFeedbackMode; // Mode of the overall feedback support.
    overallfeedbackfiles?: number; // Number of allowed attachments to the overall feedback.
    overallfeedbackfiletypes?: string; // Comma separated list of file extensions.
    overallfeedbackmaxbytes?: number; // Maximum size of one file attached to the overall feedback.
    coursemodule: number; // Coursemodule.
    introfiles: CoreWSExternalFile[]; // Introfiles.
    instructauthorsfiles?: CoreWSExternalFile[]; // Instructauthorsfiles.
    instructreviewersfiles?: CoreWSExternalFile[]; // Instructreviewersfiles.
    conclusionfiles?: CoreWSExternalFile[]; // Conclusionfiles.
};

/**
 * Params of mod_workshop_get_workshop_access_information WS.
 */
type AddonModWorkshopGetWorkshopAccessInformationWSParams = {
    workshopid: number; // Workshop instance id.
};

/**
 * Data returned by mod_workshop_get_workshop_access_information WS.
 */
export type AddonModWorkshopGetWorkshopAccessInformationWSResponse = {
    creatingsubmissionallowed: boolean; // Is the given user allowed to create their submission?.
    modifyingsubmissionallowed: boolean; // Is the user allowed to modify his existing submission?.
    assessingallowed: boolean; // Is the user allowed to create/edit his assessments?.
    assessingexamplesallowed: boolean; // Are reviewers allowed to create/edit their assessments of the example submissions?.
    examplesassessedbeforesubmission: boolean; // Whether the given user has assessed all his required examples before submission
    // (always true if there are not examples to assess or not configured to check before submission).
    examplesassessedbeforeassessment: boolean; // Whether the given user has assessed all his required examples before assessment
    // (always true if there are not examples to assessor not configured to check before assessment).
    canview: boolean; // Whether the user has the capability mod/workshop:view allowed.
    canaddinstance: boolean; // Whether the user has the capability mod/workshop:addinstance allowed.
    canswitchphase: boolean; // Whether the user has the capability mod/workshop:switchphase allowed.
    caneditdimensions: boolean; // Whether the user has the capability mod/workshop:editdimensions allowed.
    cansubmit: boolean; // Whether the user has the capability mod/workshop:submit allowed.
    canpeerassess: boolean; // Whether the user has the capability mod/workshop:peerassess allowed.
    canmanageexamples: boolean; // Whether the user has the capability mod/workshop:manageexamples allowed.
    canallocate: boolean; // Whether the user has the capability mod/workshop:allocate allowed.
    canpublishsubmissions: boolean; // Whether the user has the capability mod/workshop:publishsubmissions allowed.
    canviewauthornames: boolean; // Whether the user has the capability mod/workshop:viewauthornames allowed.
    canviewreviewernames: boolean; // Whether the user has the capability mod/workshop:viewreviewernames allowed.
    canviewallsubmissions: boolean; // Whether the user has the capability mod/workshop:viewallsubmissions allowed.
    canviewpublishedsubmissions: boolean; // Whether the user has the capability mod/workshop:viewpublishedsubmissions allowed.
    canviewauthorpublished: boolean; // Whether the user has the capability mod/workshop:viewauthorpublished allowed.
    canviewallassessments: boolean; // Whether the user has the capability mod/workshop:viewallassessments allowed.
    canoverridegrades: boolean; // Whether the user has the capability mod/workshop:overridegrades allowed.
    canignoredeadlines: boolean; // Whether the user has the capability mod/workshop:ignoredeadlines allowed.
    candeletesubmissions: boolean; // Whether the user has the capability mod/workshop:deletesubmissions allowed.
    canexportsubmissions: boolean; // Whether the user has the capability mod/workshop:exportsubmissions allowed.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_workshop_get_user_plan WS.
 */
type AddonModWorkshopGetUserPlanWSParams = {
    workshopid: number; // Workshop instance id.
    userid?: number; // User id (empty or 0 for current user).
};

/**
 * Data returned by mod_workshop_get_user_plan WS.
 */
type AddonModWorkshopGetUserPlanWSResponse = {
    userplan: {
        phases: AddonModWorkshopPhaseData[];
        examples: {
            id: number; // Example submission id.
            title: string; // Example submission title.
            assessmentid: number; // Example submission assessment id.
            grade: number; // The submission grade.
            gradinggrade: number; // The assessment grade.
        }[];
    };
    warnings?: CoreWSExternalWarning[];
};

export type AddonModWorkshopPhaseData = {
    code: AddonModWorkshopPhase; // Phase code.
    title: string; // Phase title.
    active: boolean; // Whether is the active task.
    tasks: AddonModWorkshopPhaseTaskData[];
    actions: AddonModWorkshopPhaseActionData[];
};

export type AddonModWorkshopPhaseTaskData = {
    code: string; // Task code.
    title: string; // Task title.
    link: string; // Link to task.
    details?: string; // Task details.
    completed: string; // Completion information (maybe empty, maybe a boolean or generic info).
};

export type AddonModWorkshopPhaseActionData = {
    type?: string; // Action type.
    label?: string; // Action label.
    url: string; // Link to action.
    method?: string; // Get or post.
};

/**
 * Params of mod_workshop_get_submissions WS.
 */
type AddonModWorkshopGetSubmissionsWSParams = {
    workshopid: number; // Workshop instance id.
    userid?: number; // Get submissions done by this user. Use 0 or empty for the current user.
    groupid?: number; // Group id, 0 means that the function will determine the user group.
    // It will return submissions done by users in the given group.
    page?: number; // The page of records to return.
    perpage?: number; // The number of records to return per page.
};

/**
 * Data returned by mod_workshop_get_submissions WS.
 */
type AddonModWorkshopGetSubmissionsWSResponse = {
    submissions: AddonModWorkshopSubmissionData[];
    totalcount: number; // Total count of submissions.
    totalfilesize: number; // Total size (bytes) of the files attached to all the submissions (even the ones not returned due
    // to pagination).
    warnings?: CoreWSExternalWarning[];
};

export type AddonModWorkshopSubmissionData = {
    id: number; // The primary key of the record.
    workshopid: number; // The id of the workshop instance.
    example: boolean; // Is this submission an example from teacher.
    authorid: number; // The author of the submission.
    timecreated: number; // Timestamp when the work was submitted for the first time.
    timemodified: number; // Timestamp when the submission has been updated.
    title: string; // The submission title.
    content: string; // Submission text.
    contentformat?: CoreTextFormat; // Content format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    contenttrust: number; // The trust mode of the data.
    attachment: number; // Used by File API file_postupdate_standard_filemanager.
    grade?: number; // Aggregated grade for the submission. The grade is a decimal number from interval 0..100.
    // If NULL then the grade for submission has not been aggregated yet.
    gradeover?: number; // Grade for the submission manually overridden by a teacher. Grade is always from interval 0..100.
    // If NULL then the grade is not overriden.
    gradeoverby?: number; // The id of the user who has overridden the grade for submission.
    feedbackauthor?: string; // Teacher comment/feedback for the author of the submission, for example describing the reasons
    // for the grade overriding.
    feedbackauthorformat?: CoreTextFormat; // Feedbackauthor format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    timegraded?: number; // The timestamp when grade or gradeover was recently modified.
    published: boolean; // Shall the submission be available to other when the workshop is closed.
    late: number; // Has this submission been submitted after the deadline or during the assessment phase?.
    contentfiles?: CoreWSExternalFile[]; // Contentfiles.
    attachmentfiles?: CoreWSExternalFile[]; // Attachmentfiles.
};

/**
 * Params of mod_workshop_get_submission WS.
 */
type AddonModWorkshopGetSubmissionWSParams = {
    submissionid: number; // Submission id.
};

/**
 * Data returned by mod_workshop_get_submission WS.
 */
type AddonModWorkshopGetSubmissionWSResponse = {
    submission: AddonModWorkshopSubmissionData;
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_workshop_get_grades WS.
 */
type AddonModWorkshopGetGradesWSParams = {
    workshopid: number; // Workshop instance id.
    userid?: number; // User id (empty or 0 for current user).
};

/**
 * Data returned by mod_workshop_get_grades WS.
 */
export type AddonModWorkshopGetGradesWSResponse = {
    assessmentrawgrade?: number; // The assessment raw (numeric) grade.
    assessmentlongstrgrade?: string; // The assessment string grade.
    assessmentgradehidden?: boolean; // Whether the grade is hidden or not.
    submissionrawgrade?: number; // The submission raw (numeric) grade.
    submissionlongstrgrade?: string; // The submission string grade.
    submissiongradehidden?: boolean; // Whether the grade is hidden or not.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_workshop_get_grades_report WS.
 */
type AddonModWorkshopGetGradesReportWSParams = {
    workshopid: number; // Workshop instance id.
    groupid?: number; // Group id, 0 means that the function will determine the user group.
    sortby?: string; // Sort by this element:
    // lastname, firstname, submissiontitle, submissionmodified, submissiongrade, gradinggrade.
    sortdirection?: string; // Sort direction: ASC or DESC.
    page?: number; // The page of records to return.
    perpage?: number; // The number of records to return per page.
};

/**
 * Data returned by mod_workshop_get_grades_report WS.
 */
type AddonModWorkshopGetGradesReportWSResponse = {
    report: AddonModWorkshoGradesReportData;
    warnings?: CoreWSExternalWarning[];
};

export type AddonModWorkshoGradesReportData = {
    grades: AddonModWorkshopGradesData[];
    totalcount: number; // Number of total submissions.
};

export type AddonModWorkshopGradesData = {
    userid: number; // The id of the user being displayed in the report.
    submissionid?: number; // Submission id.
    submissiontitle?: string; // Submission title.
    submissionmodified?: number; // Timestamp submission was updated.
    submissiongrade?: number; // Aggregated grade for the submission.
    gradinggrade?: number; // Computed grade for the assessment.
    submissiongradeover?: number; // Grade for the assessment overrided by the teacher.
    submissiongradeoverby?: number; // The id of the user who overrided the grade.
    submissionpublished?: number; // Whether is a submission published.
    reviewedby?: AddonModWorkshopReviewer[]; // The users who reviewed the user submission.
    reviewerof?: AddonModWorkshopReviewer[]; // The assessments the user reviewed.
};

export type AddonModWorkshopReviewer = {
    userid: number; // The id of the user (0 when is configured to do not display names).
    assessmentid: number; // The id of the assessment.
    submissionid: number; // The id of the submission assessed.
    grade: number; // The grade for submission.
    gradinggrade: number; // The grade for assessment.
    gradinggradeover: number; // The aggregated grade overrided.
    weight: number; // The weight of the assessment for aggregation.
};

/**
 * Params of mod_workshop_get_submission_assessments WS.
 */
type AddonModWorkshopGetSubmissionAssessmentsWSParams = {
    submissionid: number; // Submission id.
};

/**
 * Data returned by mod_workshop_get_submission_assessments and mod_workshop_get_reviewer_assessments WS.
 */
type AddonModWorkshopGetAssessmentsWSResponse = {
    assessments: AddonModWorkshopSubmissionAssessmentData[];
    warnings?: CoreWSExternalWarning[];
};

export type AddonModWorkshopSubmissionAssessmentData = {
    id: number; // The primary key of the record.
    submissionid: number; // The id of the assessed submission.
    reviewerid: number; // The id of the reviewer who makes this assessment.
    weight: number; // The weight of the assessment for the purposes of aggregation.
    timecreated: number; // If 0 then the assessment was allocated but the reviewer has not assessed yet.
    // If greater than 0 then the timestamp of when the reviewer assessed for the first time.
    timemodified: number; // If 0 then the assessment was allocated but the reviewer has not assessed yet.
    // If greater than 0 then the timestamp of when the reviewer assessed for the last time.
    grade?: number; // The aggregated grade for submission suggested by the reviewer.
    // The grade 0..100 is computed from the values assigned to the assessment dimensions fields.
    // If NULL then it has not been aggregated yet.
    gradinggrade?: number; // The computed grade 0..100 for this assessment. If NULL then it has not been computed yet.
    gradinggradeover?: number; // Grade for the assessment manually overridden by a teacher.
    // Grade is always from interval 0..100. If NULL then the grade is not overriden.
    gradinggradeoverby: number; // The id of the user who has overridden the grade for submission.
    feedbackauthor: string; // The comment/feedback from the reviewer for the author.
    feedbackauthorformat?: CoreTextFormat; // Feedbackauthor format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    feedbackauthorattachment: number; // Are there some files attached to the feedbackauthor field?
    // Sets to 1 by file_postupdate_standard_filemanager().
    feedbackreviewer?: string; // The comment/feedback from the teacher for the reviewer.
    // For example the reason why the grade for assessment was overridden.
    feedbackreviewerformat?: CoreTextFormat; // Feedbackreviewer format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    feedbackcontentfiles: CoreWSExternalFile[]; // Feedbackcontentfiles.
    feedbackattachmentfiles: CoreWSExternalFile[]; // Feedbackattachmentfiles.
};

/**
 * Params of mod_workshop_get_reviewer_assessments WS.
 */
type AddonModWorkshopGetReviewerAssessmentsWSParams = {
    workshopid: number; // Workshop instance id.
    userid?: number; // User id who did the assessment review (empty or 0 for current user).
};

/**
 * Params of mod_workshop_get_assessment WS.
 */
type AddonModWorkshopGetAssessmentWSParams = {
    assessmentid: number; // Assessment id.
};

/**
 * Data returned by mod_workshop_get_assessment WS.
 */
type AddonModWorkshopGetAssessmentWSResponse = {
    assessment: AddonModWorkshopSubmissionAssessmentData;
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_workshop_get_assessment_form_definition WS.
 */
type AddonModWorkshopGetAssessmentFormDefinitionWSParams = {
    assessmentid: number; // Assessment id.
    mode?: AddonModWorkshopAssessmentMode; // The form mode (assessment or preview).
};

/**
 * Data returned by mod_workshop_get_assessment_form_definition WS.
 */
type AddonModWorkshopGetAssessmentFormDefinitionWSResponse = {
    dimenssionscount: number; // The number of dimenssions used by the form.
    descriptionfiles: CoreWSExternalFile[];
    options: { // The form options.
        name: string; // Option name.
        value: string; // Option value.
    }[];
    fields: AddonModWorkshopGetAssessmentFormFieldData[]; // The form fields.
    current: AddonModWorkshopGetAssessmentFormFieldData[]; // The current field values.
    dimensionsinfo: { // The dimensions general information.
        id: number; // Dimension id.
        min: number; // Minimum grade for the dimension.
        max: number; // Maximum grade for the dimension.
        weight: string; // The weight of the dimension.
        scale?: string; // Scale items (if used).
    }[];
    warnings?: CoreWSExternalWarning[];
};

export type AddonModWorkshopGetAssessmentFormDefinitionData =
    Omit<AddonModWorkshopGetAssessmentFormDefinitionWSResponse, 'fields'|'options'|'current'> & {
        options?: {[name: string]: string} ;
        fields: AddonModWorkshopGetAssessmentFormFieldsParsedData[]; // The form fields.
        current: AddonModWorkshopGetAssessmentFormFieldsParsedData[]; // The current field values.
    };

export type AddonModWorkshopGetAssessmentFormFieldData = {
    name: string; // Field name.
    value: string; // Field default value.
};

export type AddonModWorkshopGetAssessmentFormFieldsParsedData = (
    Record<string, string> &
    {
        number?: number; // eslint-disable-line id-blacklist
        grades?: CoreGradesMenuItem[];
        grade?: number | string;
        fields?: (Record<string, string> & {
            number: number; // eslint-disable-line id-blacklist
        })[];
    }
);

/**
 * Common options with a user ID.
 */
export type AddonModWorkshopUserOptions = CoreCourseCommonModWSOptions & {
    userId?: number; // User ID. If not defined, current user.
};

/**
 * Common options with a group ID.
 */
export type AddonModWorkshopGroupOptions = CoreCourseCommonModWSOptions & {
    groupId?: number; // Group id, 0 or not defined means that the function will determine the user group.
};

/**
 * Options to pass to getSubmissions.
 */
export type AddonModWorkshopGetSubmissionsOptions = AddonModWorkshopUserOptions & AddonModWorkshopGroupOptions;

/**
 * Options to pass to fetchAllGradeReports.
 */
export type AddonModWorkshopFetchAllGradesReportOptions = AddonModWorkshopGroupOptions & {
    perPage?: number; // Records per page to return. Default ADDON_MOD_WORKSHOP_PER_PAGE.
};

/**
 * Options to pass to getGradesReport.
 */
export type AddonModWorkshopGetGradesReportOptions = AddonModWorkshopFetchAllGradesReportOptions & {
    page?: number; // Page of records to return. Default 0.
};

/**
 * Options to pass to getAssessmentForm.
 */
export type AddonModWorkshopGetAssessmentFormOptions = CoreCourseCommonModWSOptions & {
    mode?: AddonModWorkshopAssessmentMode; // Mode assessment (default) or preview. Defaults to 'assessment'.
};

/**
 * Params of mod_workshop_update_assessment WS.
 */
type AddonModWorkshopUpdateAssessmentWSParams = {
    assessmentid: number; // Assessment id.
    data: AddonModWorkshopAssessmentFieldData[]; // Assessment data.
};

export type AddonModWorkshopAssessmentFieldData = {
    name: string; // The assessment data (use WS get_assessment_form_definition for obtaining the data to sent).
    // Apart from that data, you can optionally send:
    // feedbackauthor (str); the feedback for the submission author
    // feedbackauthorformat (int); the format of the feedbackauthor
    // feedbackauthorinlineattachmentsid (int); the draft file area for the editor attachments
    // feedbackauthorattachmentsid (int); the draft file area id for the feedback attachments.
    value: string; // The value of the option.
};

/**
 * Data returned by mod_workshop_update_assessment WS.
 */
type AddonModWorkshopUpdateAssessmentWSResponse = {
    status: boolean; // Status: true if the assessment was added or updated false otherwise.
    rawgrade?: number; // Raw percentual grade (0.00000 to 100.00000) for submission.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_workshop_evaluate_submission WS.
 */
type AddonModWorkshopEvaluateSubmissionWSParams = {
    submissionid: number; // Submission id.
    feedbacktext?: string; // The feedback for the author.
    feedbackformat?: CoreTextFormat; // The feedback format for text.
    published?: boolean; // Publish the submission for others?.
    gradeover?: string; // The new submission grade.
};

/**
 * Params of mod_workshop_evaluate_assessment WS.
 */
type AddonModWorkshopEvaluateAssessmentWSParams = {
    assessmentid: number; // Assessment id.
    feedbacktext?: string; // The feedback for the reviewer.
    feedbackformat?: CoreTextFormat; // The feedback format for text.
    weight?: number; // The new weight for the assessment.
    gradinggradeover?: string; // The new grading grade.
};

/**
 * Params of mod_workshop_delete_submission WS.
 */
type AddonModWorkshopDeleteSubmissionWSParams = {
    submissionid: number; // Submission id.
};

/**
 * Params of mod_workshop_add_submission WS.
 */
type AddonModWorkshopAddSubmissionWSParams = {
    workshopid: number; // Workshop id.
    title: string; // Submission title.
    content?: string; // Submission text content.
    contentformat?: number; // The format used for the content.
    inlineattachmentsid?: number; // The draft file area id for inline attachments in the content.
    attachmentsid?: number; // The draft file area id for attachments.
};

/**
 * Data returned by mod_workshop_add_submission WS.
 */
type AddonModWorkshopAddSubmissionWSResponse = {
    status: boolean; // True if the submission was created false otherwise.
    submissionid?: number; // New workshop submission id.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_workshop_update_submission WS.
 */
type AddonModWorkshopUpdateSubmissionWSParams = {
    submissionid: number; // Submission id.
    title: string; // Submission title.
    content?: string; // Submission text content.
    contentformat?: number; // The format used for the content.
    inlineattachmentsid?: number; // The draft file area id for inline attachments in the content.
    attachmentsid?: number; // The draft file area id for attachments.
};

export type AddonModWorkshopSubmissionChangedEventData = {
    workshopId: number;
    submissionId?: number;
};

export type AddonModWorkshopAssessmentSavedChangedEventData = {
    workshopId: number;
    assessmentId: number;
    userId: number;
};

export type AddonModWorkshopAssessmentInvalidatedChangedEventData = null;
