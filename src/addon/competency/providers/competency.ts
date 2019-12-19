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
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CorePushNotificationsProvider } from '@core/pushnotifications/providers/pushnotifications';
import { CoreSite } from '@classes/site';
import { CoreCommentsArea } from '@core/comments/providers/comments';
import { CoreUserSummary } from '@core/user/providers/user';
import { CoreCourseSummary, CoreCourseModuleSummary } from '@core/course/providers/course';

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
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with boolean: whether all competency features are disabled.
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
     * @param userId User ID.
     * @return Cache key.
     */
    protected getLearningPlansCacheKey(userId: number): string {
        return this.ROOT_CACHE_KEY + 'userplans:' + userId;
    }

    /**
     * Get cache key for learning plan data WS calls.
     *
     * @param planId Plan ID.
     * @return Cache key.
     */
    protected getLearningPlanCacheKey(planId: number): string {
        return this.ROOT_CACHE_KEY + 'learningplan:' + planId;
    }

    /**
     * Get cache key for competency in plan data WS calls.
     *
     * @param planId Plan ID.
     * @param competencyId Competency ID.
     * @return Cache key.
     */
    protected getCompetencyInPlanCacheKey(planId: number, competencyId: number): string {
        return this.ROOT_CACHE_KEY + 'plancompetency:' + planId + ':' + competencyId;
    }

    /**
     * Get cache key for competency in course data WS calls.
     *
     * @param courseId Course ID.
     * @param competencyId Competency ID.
     * @param userId User ID.
     * @return Cache key.
     */
    protected getCompetencyInCourseCacheKey(courseId: number, competencyId: number, userId: number): string {
        return this.ROOT_CACHE_KEY + 'coursecompetency:' + userId + ':' + courseId + ':' + competencyId;
    }

    /**
     * Get cache key for competency summary data WS calls.
     *
     * @param competencyId Competency ID.
     * @param userId User ID.
     * @return Cache key.
     */
    protected getCompetencySummaryCacheKey(competencyId: number, userId: number): string {
        return this.ROOT_CACHE_KEY + 'competencysummary:' + userId + ':' + competencyId;
    }

    /**
     * Get cache key for course competencies data WS calls.
     *
     * @param courseId Course ID.
     * @return Cache key.
     */
    protected getCourseCompetenciesCacheKey(courseId: number): string {
        return this.ROOT_CACHE_KEY + 'coursecompetencies:' + courseId;
    }

    /**
     * Returns whether competencies are enabled.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return competencies if enabled for the given course, false otherwise.
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
     * @param userId ID of the user. If not defined, current user.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise to be resolved when the plans are retrieved.
     */
    getLearningPlans(userId?: number, siteId?: string): Promise<AddonCompetencyPlan[]> {
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

            return site.read('tool_lp_data_for_plans_page', params, preSets)
                    .then((response: AddonCompetencyDataForPlansPageResult): any => {

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
     * @param planId ID of the plan.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise to be resolved when the plan is retrieved.
     */
    getLearningPlan(planId: number, siteId?: string): Promise<AddonCompetencyDataForPlanPageResult> {
        return this.sitesProvider.getSite(siteId).then((site) => {

            this.logger.debug('Get plan ' + planId);

            const params = {
                    planid: planId
                },
                preSets = {
                    cacheKey: this.getLearningPlanCacheKey(planId),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            return site.read('tool_lp_data_for_plan_page', params, preSets)
                    .then((response: AddonCompetencyDataForPlanPageResult): any => {

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
     * @param planId ID of the plan.
     * @param competencyId ID of the competency.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise to be resolved when the competency is retrieved.
     */
    getCompetencyInPlan(planId: number, competencyId: number, siteId?: string)
            : Promise<AddonCompetencyUserCompetencySummaryInPlan> {

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

            return site.read('tool_lp_data_for_user_competency_summary_in_plan', params, preSets)
                    .then((response: AddonCompetencyUserCompetencySummaryInPlan): any => {

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
     * @param courseId ID of the course.
     * @param competencyId ID of the competency.
     * @param userId ID of the user. If not defined, current user.
     * @param siteId Site ID. If not defined, current site.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @return Promise to be resolved when the competency is retrieved.
     */
    getCompetencyInCourse(courseId: number, competencyId: number, userId?: number, siteId?: string, ignoreCache?: boolean)
            : Promise<AddonCompetencyUserCompetencySummaryInCourse> {

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

            return site.read('tool_lp_data_for_user_competency_summary_in_course', params, preSets)
                    .then((response: AddonCompetencyUserCompetencySummaryInCourse): any => {

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
     * @param competencyId ID of the competency.
     * @param userId ID of the user. If not defined, current user.
     * @param siteId Site ID. If not defined, current site.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @return Promise to be resolved when the competency summary is retrieved.
     */
    getCompetencySummary(competencyId: number, userId?: number, siteId?: string, ignoreCache?: boolean)
            : Promise<AddonCompetencyUserCompetencySummary> {

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

            return site.read('tool_lp_data_for_user_competency_summary', params, preSets)
                    .then((response: AddonCompetencyUserCompetencySummary): any => {

                if (response.competency) {
                    return response;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get all competencies in a course.
     *
     * @param courseId ID of the course.
     * @param userId ID of the user.
     * @param siteId Site ID. If not defined, current site.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @return Promise to be resolved when the course competencies are retrieved.
     */
    getCourseCompetencies(courseId: number, userId?: number, siteId?: string, ignoreCache?: boolean)
            : Promise<AddonCompetencyDataForCourseCompetenciesPageResult> {

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

            return site.read('tool_lp_data_for_course_competencies_page', params, preSets)
                    .then((response: AddonCompetencyDataForCourseCompetenciesPageResult): any => {

                if (response.competencies) {
                    return response;
                }

                return Promise.reject(null);
            });

        }).then((response) => {

            if (!userId || userId == this.sitesProvider.getCurrentSiteUserId()) {
                return response;
            }

            let promises: Promise<AddonCompetencyUserCompetencySummaryInCourse>[];

            promises = response.competencies.map((competency) =>
                this.getCompetencyInCourse(courseId, competency.competency.id, userId, siteId)
            );

            return Promise.all(promises).then((responses: AddonCompetencyUserCompetencySummaryInCourse[]) => {
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
     * @param userId ID of the user. If not defined, current user.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
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
     * @param planId ID of the plan.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateLearningPlan(planId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getLearningPlanCacheKey(planId));
        });
    }

    /**
     * Invalidates Competency in Plan data.
     *
     * @param planId ID of the plan.
     * @param competencyId ID of the competency.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateCompetencyInPlan(planId: number, competencyId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getCompetencyInPlanCacheKey(planId, competencyId));
        });
    }

    /**
     * Invalidates Competency in Course data.
     *
     * @param courseId ID of the course.
     * @param competencyId ID of the competency.
     * @param userId ID of the user. If not defined, current user.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
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
     * @param competencyId ID of the competency.
     * @param userId ID of the user. If not defined, current user.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
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
     * @param courseId ID of the course.
     * @param userId ID of the user.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
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
     * @param planId ID of the plan.
     * @param competencyId ID of the competency.
     * @param planStatus Current plan Status to decide what action should be logged.
     * @param name Name of the competency.
     * @param userId User ID. If not defined, current user.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the WS call is successful.
     */
    logCompetencyInPlanView(planId: number, competencyId: number, planStatus: number, name?: string, userId?: number,
            siteId?: string): Promise<void> {
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

                return site.write(wsName, params, preSets).then((success: boolean) => {
                    if (!success) {
                        return Promise.reject(null);
                    }
                });
            });
        }

        return Promise.reject(null);
    }

    /**
     * Report the competency as being viewed in course.
     *
     * @param courseId ID of the course.
     * @param competencyId ID of the competency.
     * @param name Name of the competency.
     * @param userId User ID. If not defined, current user.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the WS call is successful.
     */
    logCompetencyInCourseView(courseId: number, competencyId: number, name?: string, userId?: number, siteId?: string)
            : Promise<void> {

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

                return site.write(wsName, params, preSets).then((success: boolean) => {
                    if (!success) {
                        return Promise.reject(null);
                    }
                });
            });
        }

        return Promise.reject(null);
    }

    /**
     * Report the competency as being viewed.
     *
     * @param competencyId ID of the competency.
     * @param name Name of the competency.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the WS call is successful.
     */
    logCompetencyView(competencyId: number, name?: string, siteId?: string): Promise<void> {
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

                return site.write(wsName, params, preSets).then((success: boolean) => {
                    if (!success) {
                        return Promise.reject(null);
                    }
                });
            });
        }

        return Promise.reject(null);
    }
}

/**
 * Data returned by competency's plan_exporter.
 */
export type AddonCompetencyPlan = {
    name: string; // Name.
    description: string; // Description.
    descriptionformat: number; // Description format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    userid: number; // Userid.
    templateid: number; // Templateid.
    origtemplateid: number; // Origtemplateid.
    status: number; // Status.
    duedate: number; // Duedate.
    reviewerid: number; // Reviewerid.
    id: number; // Id.
    timecreated: number; // Timecreated.
    timemodified: number; // Timemodified.
    usermodified: number; // Usermodified.
    statusname: string; // Statusname.
    isbasedontemplate: boolean; // Isbasedontemplate.
    canmanage: boolean; // Canmanage.
    canrequestreview: boolean; // Canrequestreview.
    canreview: boolean; // Canreview.
    canbeedited: boolean; // Canbeedited.
    isactive: boolean; // Isactive.
    isdraft: boolean; // Isdraft.
    iscompleted: boolean; // Iscompleted.
    isinreview: boolean; // Isinreview.
    iswaitingforreview: boolean; // Iswaitingforreview.
    isreopenallowed: boolean; // Isreopenallowed.
    iscompleteallowed: boolean; // Iscompleteallowed.
    isunlinkallowed: boolean; // Isunlinkallowed.
    isrequestreviewallowed: boolean; // Isrequestreviewallowed.
    iscancelreviewrequestallowed: boolean; // Iscancelreviewrequestallowed.
    isstartreviewallowed: boolean; // Isstartreviewallowed.
    isstopreviewallowed: boolean; // Isstopreviewallowed.
    isapproveallowed: boolean; // Isapproveallowed.
    isunapproveallowed: boolean; // Isunapproveallowed.
    duedateformatted: string; // Duedateformatted.
    commentarea: CoreCommentsArea;
    reviewer?: CoreUserSummary;
    template?: AddonCompetencyTemplate;
    url: string; // Url.
};

/**
 * Data returned by competency's template_exporter.
 */
export type AddonCompetencyTemplate = {
    shortname: string; // Shortname.
    description: string; // Description.
    descriptionformat: number; // Description format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    duedate: number; // Duedate.
    visible: boolean; // Visible.
    contextid: number; // Contextid.
    id: number; // Id.
    timecreated: number; // Timecreated.
    timemodified: number; // Timemodified.
    usermodified: number; // Usermodified.
    duedateformatted: string; // Duedateformatted.
    cohortscount: number; // Cohortscount.
    planscount: number; // Planscount.
    canmanage: boolean; // Canmanage.
    canread: boolean; // Canread.
    contextname: string; // Contextname.
    contextnamenoprefix: string; // Contextnamenoprefix.
};

/**
 * Data returned by competency's competency_exporter.
 */
export type AddonCompetencyCompetency = {
    shortname: string; // Shortname.
    idnumber: string; // Idnumber.
    description: string; // Description.
    descriptionformat: number; // Description format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    sortorder: number; // Sortorder.
    parentid: number; // Parentid.
    path: string; // Path.
    ruleoutcome: number; // Ruleoutcome.
    ruletype: string; // Ruletype.
    ruleconfig: string; // Ruleconfig.
    scaleid: number; // Scaleid.
    scaleconfiguration: string; // Scaleconfiguration.
    competencyframeworkid: number; // Competencyframeworkid.
    id: number; // Id.
    timecreated: number; // Timecreated.
    timemodified: number; // Timemodified.
    usermodified: number; // Usermodified.
};

/**
 * Data returned by competency's competency_path_exporter.
 */
export type AddonCompetencyPath = {
    ancestors: AddonCompetencyPathNode[]; // Ancestors.
    framework: AddonCompetencyPathNode;
    pluginbaseurl: string; // Pluginbaseurl.
    pagecontextid: number; // Pagecontextid.
    showlinks: boolean; // @since 3.7. Showlinks.
};

/**
 * Data returned by competency's path_node_exporter.
 */
export type AddonCompetencyPathNode = {
    id: number; // Id.
    name: string; // Name.
    first: boolean; // First.
    last: boolean; // Last.
    position: number; // Position.
};

/**
 * Data returned by competency's user_competency_exporter.
 */
export type AddonCompetencyUserCompetency = {
    userid: number; // Userid.
    competencyid: number; // Competencyid.
    status: number; // Status.
    reviewerid: number; // Reviewerid.
    proficiency: boolean; // Proficiency.
    grade: number; // Grade.
    id: number; // Id.
    timecreated: number; // Timecreated.
    timemodified: number; // Timemodified.
    usermodified: number; // Usermodified.
    canrequestreview: boolean; // Canrequestreview.
    canreview: boolean; // Canreview.
    gradename: string; // Gradename.
    isrequestreviewallowed: boolean; // Isrequestreviewallowed.
    iscancelreviewrequestallowed: boolean; // Iscancelreviewrequestallowed.
    isstartreviewallowed: boolean; // Isstartreviewallowed.
    isstopreviewallowed: boolean; // Isstopreviewallowed.
    isstatusidle: boolean; // Isstatusidle.
    isstatusinreview: boolean; // Isstatusinreview.
    isstatuswaitingforreview: boolean; // Isstatuswaitingforreview.
    proficiencyname: string; // Proficiencyname.
    reviewer?: CoreUserSummary;
    statusname: string; // Statusname.
    url: string; // Url.
};

/**
 * Data returned by competency's user_competency_plan_exporter.
 */
export type AddonCompetencyUserCompetencyPlan = {
    userid: number; // Userid.
    competencyid: number; // Competencyid.
    proficiency: boolean; // Proficiency.
    grade: number; // Grade.
    planid: number; // Planid.
    sortorder: number; // Sortorder.
    id: number; // Id.
    timecreated: number; // Timecreated.
    timemodified: number; // Timemodified.
    usermodified: number; // Usermodified.
    gradename: string; // Gradename.
    proficiencyname: string; // Proficiencyname.
};

/**
 * Data returned by competency's user_competency_summary_in_plan_exporter.
 */
export type AddonCompetencyUserCompetencySummaryInPlan = {
    usercompetencysummary: AddonCompetencyUserCompetencySummary;
    plan: AddonCompetencyPlan;
};

/**
 * Data returned by competency's user_competency_summary_exporter.
 */
export type AddonCompetencyUserCompetencySummary = {
    showrelatedcompetencies: boolean; // Showrelatedcompetencies.
    cangrade: boolean; // Cangrade.
    competency: AddonCompetencySummary;
    user: CoreUserSummary;
    usercompetency?: AddonCompetencyUserCompetency;
    usercompetencyplan?: AddonCompetencyUserCompetencyPlan;
    usercompetencycourse?: AddonCompetencyUserCompetencyCourse;
    evidence: AddonCompetencyEvidence[]; // Evidence.
    commentarea?: CoreCommentsArea;
};

/**
 * Data returned by competency's competency_summary_exporter.
 */
export type AddonCompetencySummary = {
    linkedcourses: CoreCourseSummary; // Linkedcourses.
    relatedcompetencies: AddonCompetencyCompetency[]; // Relatedcompetencies.
    competency: AddonCompetencyCompetency;
    framework: AddonCompetencyFramework;
    hascourses: boolean; // Hascourses.
    hasrelatedcompetencies: boolean; // Hasrelatedcompetencies.
    scaleid: number; // Scaleid.
    scaleconfiguration: string; // Scaleconfiguration.
    taxonomyterm: string; // Taxonomyterm.
    comppath: AddonCompetencyPath;
    pluginbaseurl: string; // @since 3.7. Pluginbaseurl.
};

/**
 * Data returned by competency's competency_framework_exporter.
 */
export type AddonCompetencyFramework = {
    shortname: string; // Shortname.
    idnumber: string; // Idnumber.
    description: string; // Description.
    descriptionformat: number; // Description format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    visible: boolean; // Visible.
    scaleid: number; // Scaleid.
    scaleconfiguration: string; // Scaleconfiguration.
    contextid: number; // Contextid.
    taxonomies: string; // Taxonomies.
    id: number; // Id.
    timecreated: number; // Timecreated.
    timemodified: number; // Timemodified.
    usermodified: number; // Usermodified.
    canmanage: boolean; // Canmanage.
    competenciescount: number; // Competenciescount.
    contextname: string; // Contextname.
    contextnamenoprefix: string; // Contextnamenoprefix.
};

/**
 * Data returned by competency's user_competency_course_exporter.
 */
export type AddonCompetencyUserCompetencyCourse = {
    userid: number; // Userid.
    courseid: number; // Courseid.
    competencyid: number; // Competencyid.
    proficiency: boolean; // Proficiency.
    grade: number; // Grade.
    id: number; // Id.
    timecreated: number; // Timecreated.
    timemodified: number; // Timemodified.
    usermodified: number; // Usermodified.
    gradename: string; // Gradename.
    proficiencyname: string; // Proficiencyname.
};

/**
 * Data returned by competency's evidence_exporter.
 */
export type AddonCompetencyEvidence = {
    usercompetencyid: number; // Usercompetencyid.
    contextid: number; // Contextid.
    action: number; // Action.
    actionuserid: number; // Actionuserid.
    descidentifier: string; // Descidentifier.
    desccomponent: string; // Desccomponent.
    desca: string; // Desca.
    url: string; // Url.
    grade: number; // Grade.
    note: string; // Note.
    id: number; // Id.
    timecreated: number; // Timecreated.
    timemodified: number; // Timemodified.
    usermodified: number; // Usermodified.
    actionuser?: CoreUserSummary;
    description: string; // Description.
    gradename: string; // Gradename.
    userdate: string; // Userdate.
    candelete: boolean; // Candelete.
};

/**
 * Data returned by competency's user_competency_summary_in_course_exporter.
 */
export type AddonCompetencyUserCompetencySummaryInCourse = {
    usercompetencysummary: AddonCompetencyUserCompetencySummary;
    course: CoreCourseSummary;
    coursemodules: CoreCourseModuleSummary[]; // Coursemodules.
    plans: AddonCompetencyPlan[]; // @since 3.7. Plans.
    pluginbaseurl: string; // @since 3.7. Pluginbaseurl.
};

/**
 * Data returned by competency's course_competency_settings_exporter.
 */
export type AddonCompetencyCourseCompetencySettings = {
    courseid: number; // Courseid.
    pushratingstouserplans: boolean; // Pushratingstouserplans.
    id: number; // Id.
    timecreated: number; // Timecreated.
    timemodified: number; // Timemodified.
    usermodified: number; // Usermodified.
};

/**
 * Data returned by competency's course_competency_statistics_exporter.
 */
export type AddonCompetencyCourseCompetencyStatistics = {
    competencycount: number; // Competencycount.
    proficientcompetencycount: number; // Proficientcompetencycount.
    proficientcompetencypercentage: number; // Proficientcompetencypercentage.
    proficientcompetencypercentageformatted: string; // Proficientcompetencypercentageformatted.
    leastproficient: AddonCompetencyCompetency[]; // Leastproficient.
    leastproficientcount: number; // Leastproficientcount.
    canbegradedincourse: boolean; // Canbegradedincourse.
    canmanagecoursecompetencies: boolean; // Canmanagecoursecompetencies.
};

/**
 * Data returned by competency's course_competency_exporter.
 */
export type AddonCompetencyCourseCompetency = {
    courseid: number; // Courseid.
    competencyid: number; // Competencyid.
    sortorder: number; // Sortorder.
    ruleoutcome: number; // Ruleoutcome.
    id: number; // Id.
    timecreated: number; // Timecreated.
    timemodified: number; // Timemodified.
    usermodified: number; // Usermodified.
};

/**
 * Result of WS tool_lp_data_for_plans_page.
 */
export type AddonCompetencyDataForPlansPageResult = {
    userid: number; // The learning plan user id.
    plans: AddonCompetencyPlan[];
    pluginbaseurl: string; // Url to the tool_lp plugin folder on this Moodle site.
    navigation: string[];
    canreaduserevidence: boolean; // Can the current user view the user's evidence.
    canmanageuserplans: boolean; // Can the current user manage the user's plans.
};

/**
 * Result of WS tool_lp_data_for_plan_page.
 */
export type AddonCompetencyDataForPlanPageResult = {
    plan: AddonCompetencyPlan;
    contextid: number; // Context ID.
    pluginbaseurl: string; // Plugin base URL.
    competencies: AddonCompetencyDataForPlanPageCompetency[];
    competencycount: number; // Count of competencies.
    proficientcompetencycount: number; // Count of proficientcompetencies.
    proficientcompetencypercentage: number; // Percentage of competencies proficient.
    proficientcompetencypercentageformatted: string; // Displayable percentage.
};

/**
 * Competency data returned by tool_lp_data_for_plan_page.
 */
export type AddonCompetencyDataForPlanPageCompetency = {
    competency: AddonCompetencyCompetency;
    comppath: AddonCompetencyPath;
    usercompetency?: AddonCompetencyUserCompetency;
    usercompetencyplan?: AddonCompetencyUserCompetencyPlan;
};

/**
 * Result of WS tool_lp_data_for_course_competencies_page.
 */
export type AddonCompetencyDataForCourseCompetenciesPageResult = {
    courseid: number; // The current course id.
    pagecontextid: number; // The current page context ID.
    gradableuserid?: number; // Current user id, if the user is a gradable user.
    canmanagecompetencyframeworks: boolean; // User can manage competency frameworks.
    canmanagecoursecompetencies: boolean; // User can manage linked course competencies.
    canconfigurecoursecompetencies: boolean; // User can configure course competency settings.
    cangradecompetencies: boolean; // User can grade competencies.
    settings: AddonCompetencyCourseCompetencySettings;
    statistics: AddonCompetencyCourseCompetencyStatistics;
    competencies: AddonCompetencyDataForCourseCompetenciesPageCompetency[];
    manageurl: string; // Url to the manage competencies page.
    pluginbaseurl: string; // @since 3.6. Url to the course competencies page.
};

/**
 * Competency data returned by tool_lp_data_for_course_competencies_page.
 */
export type AddonCompetencyDataForCourseCompetenciesPageCompetency = {
    competency: AddonCompetencyCompetency;
    coursecompetency: AddonCompetencyCourseCompetency;
    coursemodules: CoreCourseModuleSummary[];
    usercompetencycourse?: AddonCompetencyUserCompetencyCourse;
    ruleoutcomeoptions: {
        value: number; // The option value.
        text: string; // The name of the option.
        selected: boolean; // If this is the currently selected option.
    }[];
    comppath: AddonCompetencyPath;
    plans: AddonCompetencyPlan[]; // @since 3.7.
};
