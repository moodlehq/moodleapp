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
import { CoreSitesProvider } from '@providers/sites';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseLogHelperProvider } from '@core/course/providers/log-helper';
import { AddonModWorkshopOfflineProvider } from './offline';
import { CoreSite } from '@classes/site';

/**
 * Service that provides some features for workshops.
 */
@Injectable()
export class AddonModWorkshopProvider {
    static COMPONENT = 'mmaModWorkshop';
    static PER_PAGE = 10;
    static PHASE_SETUP = 10;
    static PHASE_SUBMISSION = 20;
    static PHASE_ASSESSMENT = 30;
    static PHASE_EVALUATION = 40;
    static PHASE_CLOSED = 50;
    static EXAMPLES_VOLUNTARY: 0;
    static EXAMPLES_BEFORE_SUBMISSION: 1;
    static EXAMPLES_BEFORE_ASSESSMENT: 2;
    static SUBMISSION_TYPE_DISABLED = 0;
    static SUBMISSION_TYPE_AVAILABLE = 1;
    static SUBMISSION_TYPE_REQUIRED = 2;

    static SUBMISSION_CHANGED = 'addon_mod_workshop_submission_changed';
    static ASSESSMENT_SAVED = 'addon_mod_workshop_assessment_saved';
    static ASSESSMENT_INVALIDATED = 'addon_mod_workshop_assessment_invalidated';

    protected ROOT_CACHE_KEY = 'mmaModWorkshop:';

    constructor(
            private appProvider: CoreAppProvider,
            private filepoolProvider: CoreFilepoolProvider,
            private sitesProvider: CoreSitesProvider,
            private utils: CoreUtilsProvider,
            private workshopOffline: AddonModWorkshopOfflineProvider,
            private logHelper: CoreCourseLogHelperProvider) {}

    /**
     * Get cache key for workshop data WS calls.
     *
     * @param  {number} courseId Course ID.
     * @return {string}          Cache key.
     */
    protected getWorkshopDataCacheKey(courseId: number): string {
        return this.ROOT_CACHE_KEY + 'workshop:' + courseId;
    }

    /**
     * Get prefix cache key for all workshop activity data WS calls.
     *
     * @param  {number} workshopId Workshop ID.
     * @return {string}            Cache key.
     */
    protected getWorkshopDataPrefixCacheKey(workshopId: number): string {
        return this.ROOT_CACHE_KEY + workshopId;
    }

    /**
     * Get cache key for workshop access information data WS calls.
     *
     * @param  {number} workshopId Workshop ID.
     * @return {string}            Cache key.
     */
    protected getWorkshopAccessInformationDataCacheKey(workshopId: number): string {
        return this.getWorkshopDataPrefixCacheKey(workshopId) + ':access';
    }

    /**
     * Get cache key for workshop user plan data WS calls.
     *
     * @param  {number} workshopId Workshop ID.
     * @return {string}            Cache key.
     */
    protected getUserPlanDataCacheKey(workshopId: number): string {
        return this.getWorkshopDataPrefixCacheKey(workshopId) + ':userplan';
    }

    /**
     * Get cache key for workshop submissions data WS calls.
     *
     * @param  {number} workshopId  Workshop ID.
     * @param  {number} [userId=0]  User ID.
     * @param  {number} [groupId=0] Group ID.
     * @return {string}             Cache key.
     */
    protected getSubmissionsDataCacheKey(workshopId: number, userId: number = 0, groupId: number = 0): string {
        return this.getWorkshopDataPrefixCacheKey(workshopId) + ':submissions:' + userId + ':' + groupId;
    }

    /**
     * Get cache key for a workshop submission data WS calls.
     *
     * @param  {number} workshopId   Workshop ID.
     * @param  {number} submissionId Submission ID.
     * @return {string}              Cache key.
     */
    protected getSubmissionDataCacheKey(workshopId: number, submissionId: number): string {
        return this.getWorkshopDataPrefixCacheKey(workshopId) + ':submission:' + submissionId;
    }

    /**
     * Get cache key for workshop grades data WS calls.
     *
     * @param  {number} workshopId Workshop ID.
     * @return {string}            Cache key.
     */
    protected getGradesDataCacheKey(workshopId: number): string {
        return this.getWorkshopDataPrefixCacheKey(workshopId) + ':grades';
    }

    /**
     * Get cache key for workshop grade report data WS calls.
     *
     * @param  {number} workshopId  Workshop ID.
     * @param  {number} [groupId=0] Group ID.
     * @return {string}             Cache key.
     */
    protected getGradesReportDataCacheKey(workshopId: number, groupId: number = 0): string {
        return this.getWorkshopDataPrefixCacheKey(workshopId) + ':report:' + groupId;
    }

    /**
     * Get cache key for workshop submission assessments data WS calls.
     *
     * @param  {number} workshopId   Workshop ID.
     * @param  {number} submissionId Submission ID.
     * @return {string}              Cache key.
     */
    protected getSubmissionAssessmentsDataCacheKey(workshopId: number, submissionId: number): string {
        return this.getWorkshopDataPrefixCacheKey(workshopId) + ':assessments:' + submissionId;
    }

    /**
     * Get cache key for workshop reviewer assessments data WS calls.
     *
     * @param  {number} workshopId Workshop ID.
     * @param  {number} [userId=0] User ID or current user.
     * @return {string}            Cache key.
     */
    protected getReviewerAssessmentsDataCacheKey(workshopId: number, userId: number = 0): string {
        return this.getWorkshopDataPrefixCacheKey(workshopId) + ':reviewerassessments:' + userId;
    }

    /**
     * Get cache key for a workshop assessment data WS calls.
     *
     * @param  {number} workshopId   Workshop ID.
     * @param  {number} assessmentId Assessment ID.
     * @return {string}              Cache key.
     */
    protected getAssessmentDataCacheKey(workshopId: number, assessmentId: number): string {
        return this.getWorkshopDataPrefixCacheKey(workshopId) + ':assessment:' + assessmentId;
    }

    /**
     * Get cache key for workshop assessment form data WS calls.
     *
     * @param  {number} workshopId          Workshop ID.
     * @param  {number} assessmentId        Assessment ID.
     * @param  {string} [mode='assessment'] Mode assessment (default) or preview.
     * @return {string}                     Cache key.
     */
    protected getAssessmentFormDataCacheKey(workshopId: number, assessmentId: number, mode: string = 'assessment'): string {
        return this.getWorkshopDataPrefixCacheKey(workshopId) + ':assessmentsform:' + assessmentId + ':' + mode;
    }

    /**
     * Return whether or not the plugin is enabled in a certain site. Plugin is enabled if the workshop WS are available.
     *
     * @param  {string} [siteId]  Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    isPluginEnabled(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return  site.wsAvailable('mod_workshop_get_workshops_by_courses') &&
                site.wsAvailable('mod_workshop_get_workshop_access_information');
        });
    }

    /**
     * Get a workshop with key=value. If more than one is found, only the first will be returned.
     *
     * @param  {number}  courseId           Course ID.
     * @param  {string}  key                Name of the property to check.
     * @param  {any}     value              Value to search.
     * @param  {string}  [siteId]           Site ID. If not defined, current site.
     * @param  {boolean} [forceCache=false] True to always get the value from cache, false otherwise. Default false.
     * @return {Promise<any>}               Promise resolved when the workshop is retrieved.
     */
    protected getWorkshopByKey(courseId: number, key: string, value: any, siteId?: string, forceCache: boolean = false):
            Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                courseids: [courseId]
            };
            const preSets: any = {
                cacheKey: this.getWorkshopDataCacheKey(courseId),
                updateFrequency: CoreSite.FREQUENCY_RARELY
            };

            if (forceCache) {
                preSets.omitExpires = true;
            }

            return site.read('mod_workshop_get_workshops_by_courses', params, preSets).then((response) => {
                if (response && response.workshops) {
                    const workshopFound = response.workshops.find((workshop) => workshop[key] == value);
                    if (workshopFound) {
                        return workshopFound;
                    }
                }

                return Promise.reject(null);
            }).then((workshop) => {
                // Set submission types for Moodle 3.5 and older.
                if (typeof workshop.submissiontypetext == 'undefined') {
                    if (workshop.nattachments > 0) {
                        workshop.submissiontypetext = AddonModWorkshopProvider.SUBMISSION_TYPE_AVAILABLE;
                        workshop.submissiontypefile = AddonModWorkshopProvider.SUBMISSION_TYPE_AVAILABLE;
                    } else {
                        workshop.submissiontypetext = AddonModWorkshopProvider.SUBMISSION_TYPE_REQUIRED;
                        workshop.submissiontypefile = AddonModWorkshopProvider.SUBMISSION_TYPE_DISABLED;
                    }
                }

                return workshop;
            });
        });
    }

    /**
     * Get a workshop by course module ID.
     *
     * @param  {number}  courseId           Course ID.
     * @param  {number}  cmId               Course module ID.
     * @param  {string}  [siteId]           Site ID. If not defined, current site.
     * @param  {boolean} [forceCache=false] True to always get the value from cache, false otherwise. Default false.
     * @return {Promise<any>}               Promise resolved when the workshop is retrieved.
     */
    getWorkshop(courseId: number, cmId: number, siteId?: string, forceCache: boolean = false): Promise<any> {
        return this.getWorkshopByKey(courseId, 'coursemodule', cmId, siteId, forceCache);
    }

    /**
     * Get a workshop by ID.
     *
     * @param  {number}  courseId           Course ID.
     * @param  {number}  id                 Workshop ID.
     * @param  {string}  [siteId]           Site ID. If not defined, current site.
     * @param  {boolean} [forceCache=false] True to always get the value from cache, false otherwise. Default false.
     * @return {Promise<any>}               Promise resolved when the workshop is retrieved.
     */
    getWorkshopById(courseId: number, id: number, siteId?: string, forceCache: boolean = false): Promise<any> {
        return this.getWorkshopByKey(courseId, 'id', id, siteId, forceCache);
    }

    /**
     * Invalidates workshop data.
     *
     * @param  {number} courseId Course ID.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}    Promise resolved when the workshop is invalidated.
     */
    invalidateWorkshopData(courseId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getWorkshopDataCacheKey(courseId));
        });
    }

    /**
     * Invalidates workshop data except files and module info.
     *
     * @param  {number} workshopId Workshop ID.
     * @param  {string} [siteId]   Site ID. If not defined, current site.
     * @return {Promise<any>}      Promise resolved when the workshop is invalidated.
     */
    invalidateWorkshopWSData(workshopId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getWorkshopDataPrefixCacheKey(workshopId));
        });
    }

    /**
     * Get access information for a given workshop.
     *
     * @param  {number}  workshopId          Workshop ID.
     * @param  {boolean} [offline=false]     True if it should return cached data. Has priority over ignoreCache.
     * @param  {boolean} [ignoreCache=false] True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {string}  [siteId]             Site ID. If not defined, current site.
     * @return {Promise<any>}                 Promise resolved when the workshop is retrieved.
     */
    getWorkshopAccessInformation(workshopId: number, offline: boolean = false, ignoreCache: boolean = false, siteId?: string):
            Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                workshopid: workshopId
            };
            const preSets: any = {
                cacheKey: this.getWorkshopAccessInformationDataCacheKey(workshopId)
            };

            if (offline) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_workshop_get_workshop_access_information', params, preSets);
        });
    }

    /**
     * Invalidates workshop access information data.
     *
     * @param  {number} workshopId Workshop ID.
     * @param  {string} [siteId]   Site ID. If not defined, current site.
     * @return {Promise<any>}      Promise resolved when the data is invalidated.
     */
    invalidateWorkshopAccessInformationData(workshopId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getWorkshopAccessInformationDataCacheKey(workshopId));
        });
    }

    /**
     * Return the planner information for the given user.
     *
     * @param  {number}  workshopId          Workshop ID.
     * @param  {boolean} [offline=false]     True if it should return cached data. Has priority over ignoreCache.
     * @param  {boolean} [ignoreCache=false] True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {string}  [siteId]            Site ID. If not defined, current site.
     * @return {Promise<any>}                Promise resolved when the workshop data is retrieved.
     */
    getUserPlanPhases(workshopId: number, offline: boolean = false, ignoreCache: boolean = false, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                workshopid: workshopId
            };
            const preSets: any = {
                cacheKey: this.getUserPlanDataCacheKey(workshopId),
                updateFrequency: CoreSite.FREQUENCY_OFTEN
            };

            if (offline) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_workshop_get_user_plan', params, preSets).then((response) => {
                if (response && response.userplan && response.userplan.phases) {
                    return this.utils.arrayToObject(response.userplan.phases, 'code');
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Invalidates workshop user plan data.
     *
     * @param  {number} workshopId Workshop ID.
     * @param  {string} [siteId]   Site ID. If not defined, current site.
     * @return {Promise<any>}      Promise resolved when the data is invalidated.
     */
    invalidateUserPlanPhasesData(workshopId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getUserPlanDataCacheKey(workshopId));
        });
    }

    /**
     * Retrieves all the workshop submissions visible by the current user or the one done by the given user.
     *
     * @param  {number}  workshopId          Workshop ID.
     * @param  {number}  [userId=0]          User ID, 0 means the current user.
     * @param  {number}  [groupId=0]         Group id, 0 means that the function will determine the user group.
     * @param  {boolean} [offline=false]     True if it should return cached data. Has priority over ignoreCache.
     * @param  {boolean} [ignoreCache=false] True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {string}  [siteId]            Site ID. If not defined, current site.
     * @return {Promise<any[]>}              Promise resolved when the workshop submissions are retrieved.
     */
    getSubmissions(workshopId: number, userId: number = 0, groupId: number = 0, offline: boolean = false,
            ignoreCache: boolean = false, siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                workshopid: workshopId,
                userid: userId,
                groupid: groupId
            };
            const preSets: any = {
                cacheKey: this.getSubmissionsDataCacheKey(workshopId, userId, groupId),
                updateFrequency: CoreSite.FREQUENCY_OFTEN
            };

            if (offline) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_workshop_get_submissions', params, preSets).then((response) => {
                if (response && response.submissions) {
                    return response.submissions;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Invalidates workshop submissions data.
     *
     * @param  {number} workshopId  Workshop ID.
     * @param  {number} [userId=0]  User ID.
     * @param  {number} [groupId=0] Group ID.
     * @param  {string} [siteId]    Site ID. If not defined, current site.
     * @return {Promise<any>}       Promise resolved when the data is invalidated.
     */
    invalidateSubmissionsData(workshopId: number, userId: number = 0, groupId: number = 0, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getSubmissionsDataCacheKey(workshopId, userId, groupId));
        });
    }

    /**
     * Retrieves the given submission.
     *
     * @param  {number} workshopId   Workshop ID.
     * @param  {number} submissionId Submission ID.
     * @param  {string} [siteId]     Site ID. If not defined, current site.
     * @return {Promise<any>}        Promise resolved when the workshop submission data is retrieved.
     */
    getSubmission(workshopId: number, submissionId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                submissionid: submissionId
            };
            const preSets = {
                cacheKey: this.getSubmissionDataCacheKey(workshopId, submissionId)
            };

            return site.read('mod_workshop_get_submission', params, preSets).then((response) => {
                if (response && response.submission) {
                    return response.submission;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Invalidates workshop submission data.
     *
     * @param  {number} workshopId   Workshop ID.
     * @param  {number} submissionId Submission ID.
     * @param  {string} [siteId]     Site ID. If not defined, current site.
     * @return {Promise<any>}        Promise resolved when the data is invalidated.
     */
    invalidateSubmissionData(workshopId: number, submissionId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getSubmissionDataCacheKey(workshopId, submissionId));
        });
    }

    /**
     * Returns the grades information for the given workshop and user.
     *
     * @param  {number} workshopId Workshop ID.
     * @param  {string} [siteId]   Site ID. If not defined, current site.
     * @return {Promise<any>}      Promise resolved when the workshop grades data is retrieved.
     */
    getGrades(workshopId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                workshopid: workshopId
            };
            const preSets = {
                cacheKey: this.getGradesDataCacheKey(workshopId)
            };

            return site.read('mod_workshop_get_grades', params, preSets);
        });
    }

    /**
     * Invalidates workshop grades data.
     *
     * @param  {number} workshopId Workshop ID.
     * @param  {string} [siteId]   Site ID. If not defined, current site.
     * @return {Promise<any>}      Promise resolved when the data is invalidated.
     */
    invalidateGradesData(workshopId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getGradesDataCacheKey(workshopId));
        });
    }

    /**
     * Retrieves the assessment grades report.
     *
     * @param  {number}  workshopId          Workshop ID.
     * @param  {number}  [groupId]           Group id, 0 means that the function will determine the user group.
     * @param  {number}  [page=0]            Page of records to return. Default 0.
     * @param  {number}  [perPage=0]         Records per page to return. Default AddonModWorkshopProvider.PER_PAGE.
     * @param  {boolean} [offline=false]     True if it should return cached data. Has priority over ignoreCache.
     * @param  {boolean} [ignoreCache=false] True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {string}  [siteId]            Site ID. If not defined, current site.
     * @return {Promise<any>}                Promise resolved when the workshop data is retrieved.
     */
    getGradesReport(workshopId: number, groupId: number = 0, page: number = 0, perPage: number = 0, offline: boolean = false,
            ignoreCache: boolean = false, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                workshopid: workshopId,
                groupid: groupId,
                page: page,
                perpage: perPage || AddonModWorkshopProvider.PER_PAGE
            };
            const preSets: any = {
                cacheKey: this.getGradesReportDataCacheKey(workshopId, groupId),
                updateFrequency: CoreSite.FREQUENCY_OFTEN
            };

            if (offline) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_workshop_get_grades_report', params, preSets).then((response) => {
                if (response && response.report) {
                    return response.report;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Performs the whole fetch of the grade reports in the workshop.
     *
     * @param  {number}  workshopId          Workshop ID.
     * @param  {number}  [groupId=0]         Group ID.
     * @param  {number}  [perPage=0]         Records per page to fetch. It has to match with the prefetch.
     *                                       Default on AddonModWorkshopProvider.PER_PAGE.
     * @param  {boolean} [forceCache=false]  True to always get the value from cache, false otherwise. Default false.
     * @param  {boolean} [ignoreCache=false] True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {string}  [siteId]            Site ID. If not defined, current site.
     * @return {Promise<any[]>}              Promise resolved when done.
     */
    fetchAllGradeReports(workshopId: number, groupId: number = 0, perPage: number = 0, forceCache: boolean = false,
            ignoreCache: boolean = false, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();
        perPage = perPage || AddonModWorkshopProvider.PER_PAGE;

        return this.fetchGradeReportsRecursive(workshopId, groupId, perPage, forceCache, ignoreCache, [], 0, siteId);
    }

    /**
     * Recursive call on fetch all grade reports.
     *
     * @param  {number}  workshopId  Workshop ID.
     * @param  {number}  groupId     Group ID.
     * @param  {number}  perPage     Records per page to fetch. It has to match with the prefetch.
     * @param  {boolean} forceCache  True to always get the value from cache, false otherwise. Default false.
     * @param  {boolean} ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {any[]}   grades      Grades already fetched (just to concatenate them).
     * @param  {number}  page        Page of records to return.
     * @param  {string}  siteId      Site ID.
     * @return {Promise<any[]>}      Promise resolved when done.
     */
    protected fetchGradeReportsRecursive(workshopId: number, groupId: number, perPage: number, forceCache: boolean,
            ignoreCache: boolean, grades: any[], page: number, siteId: string): Promise<any[]> {
        return this.getGradesReport(workshopId, groupId, page, perPage, forceCache, ignoreCache, siteId).then((report) => {
            Array.prototype.push.apply(grades, report.grades);

            const canLoadMore = ((page + 1) * perPage) < report.totalcount;
            if (canLoadMore) {
                return this.fetchGradeReportsRecursive(
                        workshopId, groupId, perPage, forceCache, ignoreCache, grades, page + 1, siteId);
            }

            return grades;
        });
    }

    /**
     * Invalidates workshop grade report data.
     *
     * @param  {number} workshopId  Workshop ID.
     * @param  {number} [groupId=0] Group ID.
     * @param  {string} [siteId]    Site ID. If not defined, current site.
     * @return {Promise<any>}       Promise resolved when the data is invalidated.
     */
    invalidateGradeReportData(workshopId: number, groupId: number = 0, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getGradesReportDataCacheKey(workshopId, groupId));
        });
    }

    /**
     * Retrieves the given submission assessment.
     *
     * @param  {number}  workshopId          Workshop ID.
     * @param  {number}  submissionId        Submission ID.
     * @param  {boolean} [offline=false]     True if it should return cached data. Has priority over ignoreCache.
     * @param  {boolean} [ignoreCache=false] True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {string}  [siteId]            Site ID. If not defined, current site.
     * @return {Promise<any[]>}              Promise resolved when the workshop data is retrieved.
     */
    getSubmissionAssessments(workshopId: number, submissionId: number, offline: boolean = false, ignoreCache: boolean = false,
            siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                submissionid: submissionId
            };
            const preSets: any = {
                cacheKey: this.getSubmissionAssessmentsDataCacheKey(workshopId, submissionId)
            };

            if (offline) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_workshop_get_submission_assessments', params, preSets).then((response) => {
                if (response && response.assessments) {
                    return response.assessments;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Invalidates workshop submission assessments data.
     *
     * @param  {number} workshopId   Workshop ID.
     * @param  {number} submissionId Submission ID.
     * @param  {string} [siteId]     Site ID. If not defined, current site.
     * @return {Promise<any>}        Promise resolved when the data is invalidated.
     */
    invalidateSubmissionAssesmentsData(workshopId: number, submissionId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getSubmissionAssessmentsDataCacheKey(workshopId, submissionId));
        });
    }

    /**
     * Add a new submission to a given workshop.
     *
     * @param  {number}  workshopId           Workshop ID.
     * @param  {number}  courseId             Course ID the workshop belongs to.
     * @param  {string}  title                The submission title.
     * @param  {string}  content              The submission text content.
     * @param  {number}  [attachmentsId]      The draft file area id for attachments.
     * @param  {string}  [siteId]             Site ID. If not defined, current site.
     * @param  {number}  [timecreated]        The time the submission was created. Only used when editing an offline discussion.
     * @param  {boolean} [allowOffline=false] True if it can be stored in offline, false otherwise.
     * @return {Promise<any>}                 Promise resolved with submission ID if sent online or false if stored offline.
     */
    addSubmission(workshopId: number, courseId: number, title: string, content: string, attachmentsId?: number, siteId?: string,
            timecreated?: number, allowOffline: boolean = false): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Convenience function to store a message to be synchronized later.
        const storeOffline = (): Promise<any> => {
            return this.workshopOffline.saveSubmission(workshopId, courseId, title, content, {}, timecreated, 'add',
                    siteId).then(() => {
                return false;
            });
        };

        // If we are editing an offline discussion, discard previous first.
        const discardPromise =
            timecreated ? this.workshopOffline.deleteSubmissionAction(workshopId, timecreated, 'add', siteId) : Promise.resolve();

        return discardPromise.then(() => {
            if (!this.appProvider.isOnline() && allowOffline) {
                // App is offline, store the action.
                return storeOffline();
            }

            return this.addSubmissionOnline(workshopId, title, content, attachmentsId, siteId).catch((error) => {
                if (allowOffline && !this.utils.isWebServiceError(error)) {
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
     * Add a new submission to a given workshop. It will fail if offline or cannot connect.
     *
     * @param  {number} workshopId      Workshop ID.
     * @param  {string} title           The submission title.
     * @param  {string} content         The submission text content.
     * @param  {number} [attachmentsId] The draft file area id for attachments.
     * @param  {string} [siteId]        Site ID. If not defined, current site.
     * @return {Promise<any>}           Promise resolved when the submission is created.
     */
    addSubmissionOnline(workshopId: number, title: string, content: string, attachmentsId: number, siteId?: string):
            Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                workshopid: workshopId,
                title: title,
                content: content,
                attachmentsid: attachmentsId || 0
            };

            return site.write('mod_workshop_add_submission', params).then((response) => {
                // Other errors ocurring.
                if (!response || !response.submissionid) {
                    return Promise.reject(this.utils.createFakeWSError(''));
                }

                return response.submissionid;
            });
        });
    }

    /**
     * Updates the given submission.
     *
     * @param  {number}  workshopId           Workshop ID.
     * @param  {number}  submissionId         Submission ID.
     * @param  {number}  courseId             Course ID the workshop belongs to.
     * @param  {string}  title                The submission title.
     * @param  {string}  content              The submission text content.
     * @param  {number}  [attachmentsId]      The draft file area id for attachments.
     * @param  {string}  [siteId]             Site ID. If not defined, current site.
     * @param  {boolean} [allowOffline=false] True if it can be stored in offline, false otherwise.
     * @return {Promise<any>}                 Promise resolved with submission ID if sent online or false if stored offline.
     */
    updateSubmission(workshopId: number, submissionId: number, courseId: number, title: string, content: string,
            attachmentsId?: number, siteId?: string, allowOffline: boolean = false): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Convenience function to store a message to be synchronized later.
        const storeOffline = (): Promise<any> => {
            return this.workshopOffline.saveSubmission(workshopId, courseId, title, content, attachmentsId, submissionId, 'update',
                    siteId).then(() => {
                return false;
            });
        };

        // If we are editing an offline discussion, discard previous first.
        return this.workshopOffline.deleteSubmissionAction(workshopId, submissionId, 'update', siteId).then(() => {
            if (!this.appProvider.isOnline() && allowOffline) {
                // App is offline, store the action.
                return storeOffline();
            }

            return this.updateSubmissionOnline(submissionId, title, content, attachmentsId, siteId).catch((error) => {
                if (allowOffline && !this.utils.isWebServiceError(error)) {
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
     * Updates the given submission. It will fail if offline or cannot connect.
     *
     * @param  {number} submissionId    Submission ID.
     * @param  {string} title           The submission title.
     * @param  {string} content         The submission text content.
     * @param  {number} [attachmentsId] The draft file area id for attachments.
     * @param  {string} [siteId]        Site ID. If not defined, current site.
     * @return {Promise<any>}           Promise resolved when the submission is updated.
     */
    updateSubmissionOnline(submissionId: number, title: string, content: string, attachmentsId?: number, siteId?: string):
            Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                submissionid: submissionId,
                title: title,
                content: content,
                attachmentsid: attachmentsId || 0
            };

            return site.write('mod_workshop_update_submission', params).then((response) => {
                // Other errors ocurring.
                if (!response || !response.status) {
                    return Promise.reject(this.utils.createFakeWSError(''));
                }

                // Return submissionId to be consistent with addSubmission.
                return Promise.resolve(submissionId);
            });
        });
    }

    /**
     * Deletes the given submission.
     *
     * @param  {number}  workshopId  Workshop ID.
     * @param  {number} submissionId Submission ID.
     * @param  {number} courseId     Course ID the workshop belongs to.
     * @param  {string} [siteId]     Site ID. If not defined, current site.
     * @return {Promise<any>}        Promise resolved with submission ID if sent online, resolved with false if stored offline.
     */
    deleteSubmission(workshopId: number, submissionId: number, courseId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Convenience function to store a message to be synchronized later.
        const storeOffline = (): Promise<any> => {
            return this.workshopOffline.saveSubmission(workshopId, courseId, '', '', 0, submissionId, 'delete', siteId).then(() => {
                return false;
            });
        };

        // If we are editing an offline discussion, discard previous first.
        return this.workshopOffline.deleteSubmissionAction(workshopId, submissionId, 'delete', siteId).then(() => {
            if (!this.appProvider.isOnline()) {
                // App is offline, store the action.
                return storeOffline();
            }

            return this.deleteSubmissionOnline(submissionId, siteId).catch((error) => {
                if (!this.utils.isWebServiceError(error)) {
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
     * Deletes the given submission. It will fail if offline or cannot connect.
     *
     * @param  {number} submissionId Submission ID.
     * @param  {string} [siteId]     Site ID. If not defined, current site.
     * @return {Promise<any>}        Promise resolved when the submission is deleted.
     */
    deleteSubmissionOnline(submissionId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                submissionid: submissionId
            };

            return site.write('mod_workshop_delete_submission', params).then((response) => {
                // Other errors ocurring.
                if (!response || !response.status) {
                    return Promise.reject(this.utils.createFakeWSError(''));
                }

                // Return submissionId to be consistent with addSubmission.
                return Promise.resolve(submissionId);
            });
        });
    }

    /**
     * Retrieves all the assessments reviewed by the given user.
     *
     * @param  {number}  workshopId          Workshop ID.
     * @param  {number}  [userId]            User ID. If not defined, current user.
     * @param  {boolean} [offline=false]     True if it should return cached data. Has priority over ignoreCache.
     * @param  {boolean} [ignoreCache=false] True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {string}  [siteId]            Site ID. If not defined, current site.
     * @return {Promise<any[]>}              Promise resolved when the workshop data is retrieved.
     */
    getReviewerAssessments(workshopId: number, userId?: number, offline: boolean = false, ignoreCache: boolean = false,
            siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params: any = {
                workshopid: workshopId
            };
            const preSets: any = {
                cacheKey: this.getReviewerAssessmentsDataCacheKey(workshopId, userId)
            };

            if (userId) {
                params.userid = userId;
            }

            if (offline) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_workshop_get_reviewer_assessments', params, preSets).then((response) => {
                if (response && response.assessments) {
                    return response.assessments;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Invalidates workshop user assessments data.
     *
     * @param  {number} workshopId Workshop ID.
     * @param  {number} [userId]   User ID. If not defined, current user.
     * @param  {string} [siteId]   Site ID. If not defined, current site.
     * @return {Promise<any>}      Promise resolved when the data is invalidated.
     */
    invalidateReviewerAssesmentsData(workshopId: number, userId?: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getReviewerAssessmentsDataCacheKey(workshopId, userId));
        });
    }

    /**
     * Retrieves the given assessment.
     *
     * @param  {number} workshopId   Workshop ID.
     * @param  {number} assessmentId Assessment ID.
     * @param  {string} [siteId]     Site ID. If not defined, current site.
     * @return {Promise<any>}        Promise resolved when the workshop data is retrieved.
     */
    getAssessment(workshopId: number, assessmentId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                assessmentid: assessmentId
            };
            const preSets = {
                cacheKey: this.getAssessmentDataCacheKey(workshopId, assessmentId)
            };

            return site.read('mod_workshop_get_assessment', params, preSets).then((response) => {
                if (response && response.assessment) {
                    return response.assessment;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Invalidates workshop assessment data.
     *
     * @param  {number} workshopId   Workshop ID.
     * @param  {number} assessmentId Assessment ID.
     * @param  {string} [siteId]     Site ID. If not defined, current site.
     * @return {Promise<any>}        Promise resolved when the data is invalidated.
     */
    invalidateAssessmentData(workshopId: number, assessmentId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getAssessmentDataCacheKey(workshopId, assessmentId));
        });
    }

    /**
     * Retrieves the assessment form definition (data required to be able to display the assessment form).
     *
     * @param  {number}    workshopId          Workshop ID.
     * @param  {number}    assessmentId        Assessment ID.
     * @param  {string}    [mode='assessment'] Mode assessment (default) or preview.
     * @param  {boolean}   [offline=false]     True if it should return cached data. Has priority over ignoreCache.
     * @param  {boolean}   [ignoreCache=false] True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {string}    [siteId]            Site ID. If not defined, current site.
     * @return {Promise<any>}                  Promise resolved when the workshop data is retrieved.
     */
    getAssessmentForm(workshopId: number, assessmentId: number, mode: string = 'assessment', offline: boolean = false,
            ignoreCache: boolean = false, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                assessmentid: assessmentId,
                mode: mode || 'assessment'
            };
            const preSets: any = {
                cacheKey: this.getAssessmentFormDataCacheKey(workshopId, assessmentId, mode),
                updateFrequency: CoreSite.FREQUENCY_RARELY
            };

            if (offline) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_workshop_get_assessment_form_definition', params, preSets).then((response) => {
                if (response) {
                    response.fields = this.parseFields(response.fields);
                    response.options = this.utils.objectToKeyValueMap(response.options, 'name', 'value');
                    response.current = this.parseFields(response.current);

                    return response;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Parse fieldes into a more handful format.
     *
     * @param  {any[]} fields Fields to parse
     * @return {any[]}        Parsed fields
     */
    parseFields(fields: any[]): any[] {
        const parsedFields = [];

        fields.forEach((field) => {
            const args = field.name.split('_');
            const name = args[0];
            const idx = args[3];
            const idy = args[6] || false;

            if (parseInt(idx, 10) == idx) {
                if (!parsedFields[idx]) {
                    parsedFields[idx] = {
                        number: parseInt(idx, 10) + 1
                    };
                }

                if (idy && parseInt(idy, 10) == idy) {
                    if (!parsedFields[idx].fields) {
                        parsedFields[idx].fields = [];
                    }
                    if (!parsedFields[idx].fields[idy]) {
                        parsedFields[idx].fields[idy] = {
                            number: parseInt(idy, 10) + 1
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
     * @param  {number} workshopId          Workshop ID.
     * @param  {number} assessmentId        Assessment ID.
     * @param  {string} [mode='assessment'] Mode assessment (default) or preview.
     * @param  {string} [siteId]            Site ID. If not defined, current site.
     * @return {Promise<any>}               Promise resolved when the data is invalidated.
     */
    invalidateAssessmentFormData(workshopId: number, assessmentId: number, mode: string = 'assessment', siteId?: string):
            Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getAssessmentFormDataCacheKey(workshopId, assessmentId, mode));
        });
    }

    /**
     * Updates the given assessment.
     *
     * @param {number}  workshopId           Workshop ID.
     * @param {number}  assessmentId         Assessment ID.
     * @param {number}  courseId             Course ID the workshop belongs to.
     * @param {any}     inputData            Assessment data.
     * @param {string}  [siteId]             Site ID. If not defined, current site.
     * @param {boolean} [allowOffline=false] True if it can be stored in offline, false otherwise.
     * @return {Promise<any>}                Promise resolved with the grade of the submission if sent online,
     *                                       resolved with false if stored offline.
     */
    updateAssessment(workshopId: number, assessmentId: number, courseId: number, inputData: any, siteId?: any,
            allowOffline: boolean = false): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Convenience function to store a message to be synchronized later.
        const storeOffline = (): Promise<any> => {
            return this.workshopOffline.saveAssessment(workshopId, assessmentId, courseId, inputData, siteId).then(() => {
                return false;
            });
        };

        // If we are editing an offline discussion, discard previous first.
        return this.workshopOffline.deleteAssessment(workshopId, assessmentId, siteId).then(() => {
            if (!this.appProvider.isOnline() && allowOffline) {
                // App is offline, store the action.
                return storeOffline();
            }

            return this.updateAssessmentOnline(assessmentId, inputData, siteId).catch((error) => {
                if (allowOffline && !this.utils.isWebServiceError(error)) {
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
     * Updates the given assessment. It will fail if offline or cannot connect.
     *
     * @param  {number} assessmentId Assessment ID.
     * @param  {any}    inputData    Assessment data.
     * @param  {string} [siteId]     Site ID. If not defined, current site.
     * @return {Promise<any>}        Promise resolved with the grade of the submission.
     */
    updateAssessmentOnline(assessmentId: number, inputData: any, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                assessmentid: assessmentId,
                data: this.utils.objectToArrayOfObjects(inputData, 'name', 'value')
            };

            return site.write('mod_workshop_update_assessment', params).then((response) => {
                // Other errors ocurring.
                if (!response || !response.status) {
                    return Promise.reject(this.utils.createFakeWSError(''));
                }

                // Return rawgrade for submission
                return response.rawgrade;
            });
        });
    }

    /**
     * Evaluates a submission (used by teachers for provide feedback or override the submission grade).
     *
     * @param  {number}  workshopId   Workshop ID.
     * @param  {number}  submissionId The submission id.
     * @param  {number}  courseId     Course ID the workshop belongs to.
     * @param  {string}  feedbackText The feedback for the author.
     * @param  {boolean} published    Whether to publish the submission for other users.
     * @param  {any}     gradeOver    The new submission grade (empty for no overriding the grade).
     * @param  {string}  [siteId]     Site ID. If not defined, current site.
     * @return {Promise<any>}         Promise resolved when submission is evaluated if sent online,
     *                                resolved with false if stored offline.
     */
    evaluateSubmission(workshopId: number, submissionId: number, courseId: number, feedbackText: string, published: boolean,
            gradeOver: any, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Convenience function to store a message to be synchronized later.
        const storeOffline = (): Promise<any> => {
            return this.workshopOffline.saveEvaluateSubmission(workshopId, submissionId, courseId, feedbackText, published,
                    gradeOver, siteId).then(() => {
                return false;
            });
        };

        // If we are editing an offline discussion, discard previous first.
        return this.workshopOffline.deleteEvaluateSubmission(workshopId, submissionId, siteId).then(() => {
            if (!this.appProvider.isOnline()) {
                // App is offline, store the action.
                return storeOffline();
            }

            return this.evaluateSubmissionOnline(submissionId, feedbackText, published, gradeOver, siteId).catch((error) => {
                if (!this.utils.isWebServiceError(error)) {
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
     * Evaluates a submission (used by teachers for provide feedback or override the submission grade).
     * It will fail if offline or cannot connect.
     *
     * @param  {number}  submissionId The submission id.
     * @param  {string}  feedbackText The feedback for the author.
     * @param  {boolean} published    Whether to publish the submission for other users.
     * @param  {any}     gradeOver    The new submission grade (empty for no overriding the grade).
     * @param  {string}  [siteId]     Site ID. If not defined, current site.
     * @return {Promise<any>}         Promise resolved when the submission is evaluated.
     */
    evaluateSubmissionOnline(submissionId: number, feedbackText: string, published: boolean, gradeOver: any,
            siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                submissionid: submissionId,
                feedbacktext: feedbackText || '',
                feedbackformat: 1,
                published: published ? 1 : 0,
                gradeover: gradeOver
            };

            return site.write('mod_workshop_evaluate_submission', params).then((response) => {
                // Other errors ocurring.
                if (!response || !response.status) {
                    return Promise.reject(this.utils.createFakeWSError(''));
                }

                // Return if worked.
                return Promise.resolve(true);
            });
        });
    }

    /**
     * Evaluates an assessment (used by teachers for provide feedback to the reviewer).
     *
     * @param  {number}  workshopId       Workshop ID.
     * @param  {number}  assessmentId     The assessment id.
     * @param  {number}  courseId         Course ID the workshop belongs to.
     * @param  {string}  feedbackText     The feedback for the reviewer.
     * @param  {boolean} weight           The new weight for the assessment.
     * @param  {any}     gradingGradeOver The new grading grade (empty for no overriding the grade).
     * @param  {string}  [siteId]         Site ID. If not defined, current site.
     * @return {Promise<any>}             Promise resolved when assessment is evaluated if sent online,
     *                                    resolved with false if stored offline.
     */
    evaluateAssessment(workshopId: number, assessmentId: number, courseId: number, feedbackText: string, weight: number,
            gradingGradeOver: any, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Convenience function to store a message to be synchronized later.
        const storeOffline = (): Promise<any> => {
            return this.workshopOffline.saveEvaluateAssessment(workshopId, assessmentId, courseId, feedbackText, weight,
                    gradingGradeOver, siteId).then(() => {
                return false;
            });
        };

        // If we are editing an offline discussion, discard previous first.
        return this.workshopOffline.deleteEvaluateAssessment(workshopId, assessmentId, siteId).then(() => {
            if (!this.appProvider.isOnline()) {
                // App is offline, store the action.
                return storeOffline();
            }

            return this.evaluateAssessmentOnline(assessmentId, feedbackText, weight, gradingGradeOver, siteId).catch((error) => {
                if (!this.utils.isWebServiceError(error)) {
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
     * Evaluates an assessment (used by teachers for provide feedback to the reviewer). It will fail if offline or cannot connect.
     *
     * @param  {number}  assessmentId     The assessment id.
     * @param  {string}  feedbackText     The feedback for the reviewer.
     * @param  {number}  weight           The new weight for the assessment.
     * @param  {any}     gradingGradeOver The new grading grade (empty for no overriding the grade).
     * @param  {string}  [siteId]         Site ID. If not defined, current site.
     * @return {Promise<any>}             Promise resolved when the assessment is evaluated.
     */
    evaluateAssessmentOnline(assessmentId: number, feedbackText: string, weight: number, gradingGradeOver: any, siteId?: string):
            Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                assessmentid: assessmentId,
                feedbacktext: feedbackText || '',
                feedbackformat: 1,
                weight: weight,
                gradinggradeover: gradingGradeOver
            };

            return site.write('mod_workshop_evaluate_assessment', params).then((response) => {
                // Other errors ocurring.
                if (!response || !response.status) {
                    return Promise.reject(this.utils.createFakeWSError(''));
                }

                // Return if worked.
                return Promise.resolve(true);
            });
        });
    }

    /**
     * Invalidate the prefetched content except files.
     * To invalidate files, use AddonModWorkshopProvider#invalidateFiles.
     *
     * @param  {number} moduleId The module ID.
     * @param  {number} courseId Course ID.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}    Promised resolved when content is invalidated.
     */
    invalidateContent(moduleId: number, courseId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.getWorkshop(courseId, moduleId, siteId, true).then((workshop) => {
            return this.invalidateContentById(workshop.id, courseId, siteId);
        });
    }

    /**
     * Invalidate the prefetched content except files using the activityId.
     * To invalidate files, use AdddonModWorkshop#invalidateFiles.
     *
     * @param  {number} workshopId Workshop ID.
     * @param  {number} courseId   Course ID.
     * @param  {string} [siteId]   Site ID. If not defined, current site.
     * @return {Promise<any>}      Promise resolved when content is invalidated.
     */
    invalidateContentById(workshopId: number, courseId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const promises = [
            // Do not invalidate workshop data before getting workshop info, we need it!
            this.invalidateWorkshopData(courseId, siteId),
            this.invalidateWorkshopWSData(workshopId, siteId),
        ];

        return Promise.all(promises);
    }

    /**
     * Invalidate the prefetched files.
     *
     * @param  {number} moduleId The module ID.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}    Promise resolved when the files are invalidated.
     */
    invalidateFiles(moduleId: number, siteId?: string): Promise<any> {
        return this.filepoolProvider.invalidateFilesByComponent(siteId, AddonModWorkshopProvider.COMPONENT, moduleId);
    }

    /**
     * Report the workshop as being viewed.
     *
     * @param  {number} id       Workshop ID.
     * @param {string} [name] Name of the workshop.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}    Promise resolved when the WS call is successful.
     */
    logView(id: number, name?: string, siteId?: string): Promise<any> {
        const params = {
            workshopid: id
        };

        return this.logHelper.logSingle('mod_workshop_view_workshop', params, AddonModWorkshopProvider.COMPONENT, id, name,
                'workshop', siteId);
    }

    /**
     * Report the workshop submission as being viewed.
     *
     * @param  {number} id          Submission ID.
     * @param  {number} workshopId  Workshop ID.
     * @param {string} [name] Name of the workshop.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}    Promise resolved when the WS call is successful.
     */
    logViewSubmission(id: number, workshopId: number, name?: string, siteId?: string): Promise<any> {
        const params = {
            submissionid: id
        };

        return this.logHelper.logSingle('mod_workshop_view_submission', params, AddonModWorkshopProvider.COMPONENT, workshopId,
                name, 'workshop', params, siteId);
    }
}
