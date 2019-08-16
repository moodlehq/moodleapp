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
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CorePushNotificationsProvider } from '@core/pushnotifications/providers/pushnotifications';
import { CoreSite } from '@classes/site';

/**
 * Service to handle caompetency learning plans.
 */
@Injectable()
export class AddonCompetencyProvider {

    // Learning plan status.
    static STATUS_DRAFT = 0;
    static STATUS_ACTIVE = 1;
    static STATUS_COMPLETE = 2;
    static STATUS_WAITING_FOR_REVIEW = 3;
    static STATUS_IN_REVIEW = 4;

    // Competency status.
    static REVIEW_STATUS_IDLE = 0;
    static REVIEW_STATUS_WAITING_FOR_REVIEW = 1;
    static REVIEW_STATUS_IN_REVIEW = 2;

    protected ROOT_CACHE_KEY = 'mmaCompetency:';

    protected logger;

    constructor(loggerProvider: CoreLoggerProvider, private sitesProvider: CoreSitesProvider,
            protected pushNotificationsProvider: CorePushNotificationsProvider) {
        this.logger = loggerProvider.getInstance('AddonCompetencyProvider');
    }

    /**
     * Check if all competencies features are disabled.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with boolean: whether all competency features are disabled.
     */
    allCompetenciesDisabled(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.isFeatureDisabled('CoreMainMenuDelegate_AddonCompetency') &&
                    site.isFeatureDisabled('CoreCourseOptionsDelegate_AddonCompetency') &&
                    site.isFeatureDisabled('CoreUserDelegate_AddonCompetency');
        });
    }

    /**
     * Get cache key for user learning plans data WS calls.
     *
     * @param {number} userId User ID.
     * @return {string}         Cache key.
     */
    protected getLearningPlansCacheKey(userId: number): string {
        return this.ROOT_CACHE_KEY + 'userplans:' + userId;
    }

    /**
     * Get cache key for learning plan data WS calls.
     *
     * @param {number} planId Plan ID.
     * @return {string}         Cache key.
     */
    protected getLearningPlanCacheKey(planId: number): string {
        return this.ROOT_CACHE_KEY + 'learningplan:' + planId;
    }

    /**
     * Get cache key for competency in plan data WS calls.
     *
     * @param {number} planId Plan ID.
     * @param {number} competencyId Competency ID.
     * @return {string}         Cache key.
     */
    protected getCompetencyInPlanCacheKey(planId: number, competencyId: number): string {
        return this.ROOT_CACHE_KEY + 'plancompetency:' + planId + ':' + competencyId;
    }

    /**
     * Get cache key for competency in course data WS calls.
     *
     * @param {number} courseId Course ID.
     * @param {number} competencyId Competency ID.
     * @param {number} userId User ID.
     * @return {string}         Cache key.
     */
    protected getCompetencyInCourseCacheKey(courseId: number, competencyId: number, userId: number): string {
        return this.ROOT_CACHE_KEY + 'coursecompetency:' + userId + ':' + courseId + ':' + competencyId;
    }

    /**
     * Get cache key for competency summary data WS calls.
     *
     * @param {number} competencyId Competency ID.
     * @param {number} userId User ID.
     * @return {string}         Cache key.
     */
    protected getCompetencySummaryCacheKey(competencyId: number, userId: number): string {
        return this.ROOT_CACHE_KEY + 'competencysummary:' + userId + ':' + competencyId;
    }

    /**
     * Get cache key for course competencies data WS calls.
     *
     * @param {number} courseId Course ID.
     * @return {string}         Cache key.
     */
    protected getCourseCompetenciesCacheKey(courseId: number): string {
        return this.ROOT_CACHE_KEY + 'coursecompetencies:' + courseId;
    }

    /**
     * Returns whether competencies are enabled.
     *
     * @param  {number} courseId Course ID.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} competencies if enabled for the given course, false otherwise.
     */
    isPluginForCourseEnabled(courseId: number, siteId?: string): Promise<any> {
        if (!this.sitesProvider.isLoggedIn()) {
            return Promise.resolve(false);
        }

        return this.getCourseCompetencies(courseId, 0, siteId).catch(() => {
            return false;
        });
    }

    /**
     * Get plans for a certain user.
     *
     * @param  {number} [userId]    ID of the user. If not defined, current user.
     * @param  {string} [siteId]    Site ID. If not defined, current site.
     * @return {Promise<any>}            Promise to be resolved when the plans are retrieved.
     */
    getLearningPlans(userId?: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            this.logger.debug('Get plans for user ' + userId);

            const params = {
                    userid: userId
                },
                preSets = {
                    cacheKey: this.getLearningPlansCacheKey(userId),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            return site.read('tool_lp_data_for_plans_page', params, preSets).then((response) => {
                if (response.plans) {
                    return response.plans;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get a certain plan.
     *
     * @param  {number} planId    ID of the plan.
     * @param  {string} [siteId]    Site ID. If not defined, current site.
     * @return {Promise<any>}            Promise to be resolved when the plans are retrieved.
     */
    getLearningPlan(planId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {

            this.logger.debug('Get plan ' + planId);

            const params = {
                    planid: planId
                },
                preSets = {
                    cacheKey: this.getLearningPlanCacheKey(planId),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            return site.read('tool_lp_data_for_plan_page', params, preSets).then((response) => {
                if (response.plan) {
                    return response;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get a certain competency in a plan.
     *
     * @param  {number} planId    ID of the plan.
     * @param  {number} competencyId    ID of the competency.
     * @param  {string} [siteId]    Site ID. If not defined, current site.
     * @return {Promise<any>}            Promise to be resolved when the plans are retrieved.
     */
    getCompetencyInPlan(planId: number, competencyId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {

            this.logger.debug('Get competency ' + competencyId + ' in plan ' + planId);

            const params = {
                    planid: planId,
                    competencyid: competencyId
                },
                preSets = {
                    cacheKey: this.getCompetencyInPlanCacheKey(planId, competencyId),
                    updateFrequency: CoreSite.FREQUENCY_SOMETIMES
                };

            return site.read('tool_lp_data_for_user_competency_summary_in_plan', params, preSets).then((response) => {
                if (response.usercompetencysummary) {
                    return response;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get a certain competency in a course.
     *
     * @param  {number} courseId    ID of the course.
     * @param  {number} competencyId    ID of the competency.
     * @param  {number} [userId]    ID of the user. If not defined, current user.
     * @param  {string} [siteId]    Site ID. If not defined, current site.
     * @param  {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @return {Promise<any>}            Promise to be resolved when the plans are retrieved.
     */
    getCompetencyInCourse(courseId: number, competencyId: number, userId?: number, siteId?: string, ignoreCache?: boolean)
            : Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            this.logger.debug('Get competency ' + competencyId + ' in course ' + courseId);

            const params = {
                    courseid: courseId,
                    competencyid: competencyId,
                    userid: userId
                },
                preSets: any = {
                    cacheKey: this.getCompetencyInCourseCacheKey(courseId, competencyId, userId),
                    updateFrequency: CoreSite.FREQUENCY_SOMETIMES
                };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('tool_lp_data_for_user_competency_summary_in_course', params, preSets).then((response) => {
                if (response.usercompetencysummary) {
                    return response;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get a certain competency summary.
     *
     * @param  {number} competencyId    ID of the competency.
     * @param  {number} [userId]    ID of the user. If not defined, current user.
     * @param  {string} [siteId]    Site ID. If not defined, current site.
     * @param  {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @return {Promise<any>}            Promise to be resolved when the plans are retrieved.
     */
    getCompetencySummary(competencyId: number, userId?: number, siteId?: string, ignoreCache?: boolean): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            this.logger.debug('Get competency ' + competencyId + ' summary for user' + userId);

            const params = {
                    competencyid: competencyId,
                    userid: userId
                },
                preSets: any = {
                    cacheKey: this.getCompetencySummaryCacheKey(competencyId, userId),
                    updateFrequency: CoreSite.FREQUENCY_SOMETIMES
                };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('tool_lp_data_for_user_competency_summary', params, preSets).then((response) => {
                if (response.competency) {
                    return response.competency;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get all competencies in a course.
     *
     * @param  {number} courseId    ID of the course.
     * @param  {number} [userId]    ID of the user.
     * @param  {string} [siteId]    Site ID. If not defined, current site.
     * @param  {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @return {Promise<any>}            Promise to be resolved when the course competencies are retrieved.
     */
    getCourseCompetencies(courseId: number, userId?: number, siteId?: string, ignoreCache?: boolean): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {

            this.logger.debug('Get course competencies for course ' + courseId);

            const params = {
                    courseid: courseId
                },
                preSets: any = {
                    cacheKey: this.getCourseCompetenciesCacheKey(courseId),
                    updateFrequency: CoreSite.FREQUENCY_SOMETIMES
                };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('tool_lp_data_for_course_competencies_page', params, preSets).then((response) => {
                if (response.competencies) {
                    return response;
                }

                return Promise.reject(null);
            });

        }).then((response) => {

            if (!userId || userId == this.sitesProvider.getCurrentSiteUserId()) {
                return response;
            }

            const promises = response.competencies.map((competency) =>
                this.getCompetencyInCourse(courseId, competency.competency.id, userId, siteId)
            );

            return Promise.all(promises).then((responses: any[]) => {
                responses.forEach((resp, index) => {
                    response.competencies[index].usercompetencycourse = resp.usercompetencysummary.usercompetencycourse;
                });

                return response;
            });
        });
    }

    /**
     * Invalidates User Learning Plans data.
     *
     * @param  {number} [userId]    ID of the user. If not defined, current user.
     * @param  {string} [siteId]    Site ID. If not defined, current site.
     * @return {Promise<any>}            Promise resolved when the data is invalidated.
     */
    invalidateLearningPlans(userId?: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return site.invalidateWsCacheForKey(this.getLearningPlansCacheKey(userId));
        });
    }

    /**
     * Invalidates Learning Plan data.
     *
     * @param  {number} planId    ID of the plan.
     * @param  {string} [siteId]    Site ID. If not defined, current site.
     * @return {Promise<any>}        Promise resolved when the data is invalidated.
     */
    invalidateLearningPlan(planId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getLearningPlanCacheKey(planId));
        });
    }

    /**
     * Invalidates Competency in Plan data.
     *
     * @param  {number} planId    ID of the plan.
     * @param  {number} competencyId    ID of the competency.
     * @param  {string} [siteId]    Site ID. If not defined, current site.
     * @return {Promise<any>}        Promise resolved when the data is invalidated.
     */
    invalidateCompetencyInPlan(planId: number, competencyId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getCompetencyInPlanCacheKey(planId, competencyId));
        });
    }

    /**
     * Invalidates Competency in Course data.
     *
     * @param  {number} courseId    ID of the course.
     * @param  {number} competencyId    ID of the competency.
     * @param  {number} [userId]    ID of the user. If not defined, current user.
     * @param  {string} [siteId]    Site ID. If not defined, current site.
     * @return {Promise<any>}        Promise resolved when the data is invalidated.
     */
    invalidateCompetencyInCourse(courseId: number, competencyId: number, userId?: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return site.invalidateWsCacheForKey(this.getCompetencyInCourseCacheKey(courseId, competencyId, userId));
        });
    }

    /**
     * Invalidates Competency Summary data.
     *
     * @param  {number} competencyId    ID of the competency.
     * @param  {number} [userId]    ID of the user. If not defined, current user.
     * @param  {string} [siteId]    Site ID. If not defined, current site.
     * @return {Promise<any>}        Promise resolved when the data is invalidated.
     */
    invalidateCompetencySummary(competencyId: number, userId?: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return site.invalidateWsCacheForKey(this.getCompetencySummaryCacheKey(competencyId, userId));
        });
    }

    /**
     * Invalidates Course Competencies data.
     *
     * @param  {number} courseId    ID of the course.
     * @param  {number} [userId]      ID of the user.
     * @param  {string} [siteId]    Site ID. If not defined, current site.
     * @return {Promise<any>}        Promise resolved when the data is invalidated.
     */
    invalidateCourseCompetencies(courseId: number, userId?: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getCourseCompetenciesCacheKey(courseId));
        }).then(() => {
            if (!userId || userId == this.sitesProvider.getCurrentSiteUserId()) {
                return;
            }

            /* Competencies for other users are fetched with getCompetencyInCourse (and saved in their own cache).
               We need to fecth the list of competencies to know which ones to invalidate. We can pass 0 as userId
               to getCourseCompetencies, we just need the competency IDs and this way we avid extra WS calls. */
            return this.getCourseCompetencies(courseId, 0, siteId).then((competencies) => {
                const promises = competencies.competencies.map((competency) => {
                    return this.invalidateCompetencyInCourse(courseId, competency.competency.id, userId, siteId);
                });

                return Promise.all(promises);
            });
        });
    }

    /**
     * Report the competency as being viewed in plan.
     *
     * @param  {number} planId    ID of the plan.
     * @param  {number} competencyId  ID of the competency.
     * @param  {number} planStatus    Current plan Status to decide what action should be logged.
     * @param  {string} [name] Name of the competency.
     * @param  {number} [userId] User ID. If not defined, current user.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}  Promise resolved when the WS call is successful.
     */
    logCompetencyInPlanView(planId: number, competencyId: number, planStatus: number, name?: string, userId?: number,
            siteId?: string): Promise<any> {
        if (planId && competencyId) {

            return this.sitesProvider.getSite(siteId).then((site) => {
                userId = userId || site.getUserId();

                const params = {
                        planid: planId,
                        competencyid: competencyId,
                        userid: userId
                    },
                    preSets = {
                        typeExpected: 'boolean'
                    },
                    wsName = planStatus == AddonCompetencyProvider.STATUS_COMPLETE ?
                                'core_competency_user_competency_plan_viewed' : 'core_competency_user_competency_viewed_in_plan';

                this.pushNotificationsProvider.logViewEvent(competencyId, name, 'competency', wsName, {
                    planid: planId,
                    planstatus: planStatus,
                    userid: userId
                }, siteId);

                return site.write(wsName, params, preSets);
            });
        }

        return Promise.reject(null);
    }

    /**
     * Report the competency as being viewed in course.
     *
     * @param  {number} courseId        ID of the course.
     * @param  {number} competencyId    ID of the competency.
     * @param  {string} [name] Name of the competency.
     * @param  {number} [userId] User ID. If not defined, current user.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}  Promise resolved when the WS call is successful.
     */
    logCompetencyInCourseView(courseId: number, competencyId: number, name?: string, userId?: number, siteId?: string)
            : Promise<any> {

        if (courseId && competencyId) {
            return this.sitesProvider.getSite(siteId).then((site) => {
                userId = userId || site.getUserId();

                const params = {
                    courseid: courseId,
                    competencyid: competencyId,
                    userid: userId
                };
                const preSets = {
                    typeExpected: 'boolean'
                };
                const wsName = 'core_competency_user_competency_viewed_in_course';

                this.pushNotificationsProvider.logViewEvent(competencyId, name, 'competency', wsName, {
                    courseid: courseId,
                    userid: userId
                }, siteId);

                return site.write(wsName, params, preSets);
            });
        }

        return Promise.reject(null);
    }

    /**
     * Report the competency as being viewed.
     *
     * @param  {number} competencyId    ID of the competency.
     * @param  {string} [name] Name of the competency.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}  Promise resolved when the WS call is successful.
     */
    logCompetencyView(competencyId: number, name?: string, siteId?: string): Promise<any> {
        if (competencyId) {
            return this.sitesProvider.getSite(siteId).then((site) => {
                const params = {
                    id: competencyId,
                };
                const preSets = {
                    typeExpected: 'boolean'
                };
                const wsName = 'core_competency_competency_viewed';

                this.pushNotificationsProvider.logViewEvent(competencyId, name, 'competency', wsName, {}, siteId);

                return site.write('core_competency_competency_viewed', params, preSets);
            });
        }

        return Promise.reject(null);
    }
}
