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

import { CoreCacheUpdateFrequency } from '@/core/constants';
import { Injectable } from '@angular/core';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CoreSite } from '@classes/sites/site';
import { CoreCommentsArea } from '@features/comments/services/comments';
import { CoreUserSummary } from '@features/user/services/user';
import { CoreSites } from '@services/sites';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { makeSingleton } from '@singletons';
import { CoreTextFormat } from '@singletons/text';
import { AddonCompetencyLearningPlanStatus, AddonCompetencyReviewStatus } from '../constants';
import { CoreCourseSummaryExporterData } from '@features/courses/services/courses';

/**
 * Service to handle caompetency learning plans.
 */
@Injectable( { providedIn: 'root' })
export class AddonCompetencyProvider {

    protected static readonly ROOT_CACHE_KEY = 'mmaCompetency:';

    /**
     * Check if competencies are enabled in a certain site.
     *
     * @param options Site ID or site object.
     * @returns Whether competencies are enabled.
     */
    async areCompetenciesEnabled(options?: {siteId?: string; site?: CoreSite}): Promise<boolean> {
        const site = options?.site ? options.site : await CoreSites.getSite(options?.siteId);

        if (!site) {
            return false;
        }

        return site.canUseAdvancedFeature('enablecompetencies') &&
            !(site.isFeatureDisabled('CoreUserDelegate_AddonCompetency') &&
            site.isFeatureDisabled('CoreCourseOptionsDelegate_AddonCompetency'));
    }

    /**
     * Returns whether current user can see another user competencies in a course.
     *
     * @param courseId Course ID.
     * @param userId User ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: whether the user can view the competencies.
     */
    async canViewUserCompetenciesInCourse(courseId: number, userId?: number, siteId?: string): Promise<boolean> {
        if (!CoreSites.isLoggedIn()) {
            return false;
        }

        const enabled = await this.areCompetenciesEnabled({ siteId });
        if (!enabled) {
            return false;
        }

        try {
            const response = await this.getCourseCompetenciesPage(courseId, siteId);

            if (!response.competencies.length) {
                // No competencies.
                return false;
            }

            if (!userId || userId == CoreSites.getCurrentSiteUserId()) {
                // Current user.
                return true;
            }

            // Check if current user can view any competency of the user.
            await this.getCompetencyInCourse(courseId, response.competencies[0].competency.id, userId, siteId);

            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get cache key for user learning plans data WS calls.
     *
     * @param userId User ID.
     * @returns Cache key.
     */
    protected getLearningPlansCacheKey(userId: number): string {
        return `${AddonCompetencyProvider.ROOT_CACHE_KEY}userplans:${userId}`;
    }

    /**
     * Get cache key for learning plan data WS calls.
     *
     * @param planId Plan ID.
     * @returns Cache key.
     */
    protected getLearningPlanCacheKey(planId: number): string {
        return `${AddonCompetencyProvider.ROOT_CACHE_KEY}learningplan:${planId}`;
    }

    /**
     * Get cache key for competency in plan data WS calls.
     *
     * @param planId Plan ID.
     * @param competencyId Competency ID.
     * @returns Cache key.
     */
    protected getCompetencyInPlanCacheKey(planId: number, competencyId: number): string {
        return `${AddonCompetencyProvider.ROOT_CACHE_KEY}plancompetency:${planId}:${competencyId}`;
    }

    /**
     * Get cache key for competency in course data WS calls.
     *
     * @param courseId Course ID.
     * @param competencyId Competency ID.
     * @param userId User ID.
     * @returns Cache key.
     */
    protected getCompetencyInCourseCacheKey(courseId: number, competencyId: number, userId: number): string {
        return `${AddonCompetencyProvider.ROOT_CACHE_KEY}coursecompetency:${userId}:${courseId}:${competencyId}`;
    }

    /**
     * Get cache key for competency summary data WS calls.
     *
     * @param competencyId Competency ID.
     * @param userId User ID.
     * @returns Cache key.
     */
    protected getCompetencySummaryCacheKey(competencyId: number, userId: number): string {
        return `${AddonCompetencyProvider.ROOT_CACHE_KEY}competencysummary:${userId}:${competencyId}`;
    }

    /**
     * Get cache key for course competencies data WS calls.
     *
     * @param courseId Course ID.
     * @returns Cache key.
     */
    protected getCourseCompetenciesCacheKey(courseId: number): string {
        return `${AddonCompetencyProvider.ROOT_CACHE_KEY}coursecompetencies:${courseId}`;
    }

    /**
     * Returns whether competencies are enabled.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns competencies if enabled for the given course, false otherwise.
     */
    async isPluginForCourseEnabled(courseId: number, siteId?: string): Promise<boolean> {
        if (!CoreSites.isLoggedIn()) {
            return false;
        }

        return CorePromiseUtils.promiseWorks(this.getCourseCompetencies(courseId, undefined, siteId));
    }

    /**
     * Get plans for a certain user.
     *
     * @param userId ID of the user. If not defined, current user.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise to be resolved when the plans are retrieved.
     */
    async getLearningPlans(userId?: number, siteId?: string): Promise<AddonCompetencyPlan[]> {
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        const params: AddonCompetencyDataForPlansPageWSParams = {
            userid: userId,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getLearningPlansCacheKey(userId),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
        };

        const response = await site.read<AddonCompetencyDataForPlansPageWSResponse>('tool_lp_data_for_plans_page', params, preSets);

        return response.plans;
    }

    /**
     * Get a certain plan.
     *
     * @param planId ID of the plan.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise to be resolved when the plan is retrieved.
     */
    async getLearningPlan(planId: number, siteId?: string): Promise<AddonCompetencyDataForPlanPageWSResponse> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonCompetencyDataForPlanPageWSParams = {
            planid: planId,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getLearningPlanCacheKey(planId),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
        };

        return site.read('tool_lp_data_for_plan_page', params, preSets);
    }

    /**
     * Get a certain competency in a plan.
     *
     * @param planId ID of the plan.
     * @param competencyId ID of the competency.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise to be resolved when the competency is retrieved.
     */
    async getCompetencyInPlan(
        planId: number,
        competencyId: number,
        siteId?: string,
    ): Promise<AddonCompetencyDataForUserCompetencySummaryInPlanWSResponse> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonCompetencyDataForUserCompetencySummaryInPlanWSParams = {
            planid: planId,
            competencyid: competencyId,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCompetencyInPlanCacheKey(planId, competencyId),
            updateFrequency: CoreCacheUpdateFrequency.SOMETIMES,
        };

        return site.read(
            'tool_lp_data_for_user_competency_summary_in_plan',
            params,
            preSets,
        );
    }

    /**
     * Get a certain competency in a course.
     *
     * @param courseId ID of the course.
     * @param competencyId ID of the competency.
     * @param userId ID of the user. If not defined, current user.
     * @param siteId Site ID. If not defined, current site.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @returns Promise to be resolved when the competency is retrieved.
     */
    async getCompetencyInCourse(
        courseId: number,
        competencyId: number,
        userId?: number,
        siteId?: string,
        ignoreCache = false,
    ): Promise<AddonCompetencyDataForUserCompetencySummaryInCourseWSResponse> {
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        const params: AddonCompetencyDataForUserCompetencySummaryInCourseWSParams = {
            courseid: courseId,
            competencyid: competencyId,
            userid: userId,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCompetencyInCourseCacheKey(courseId, competencyId, userId),
            updateFrequency: CoreCacheUpdateFrequency.SOMETIMES,
        };

        if (ignoreCache) {
            preSets.getFromCache = false;
            preSets.emergencyCache = false;
        }

        return site.read('tool_lp_data_for_user_competency_summary_in_course', params, preSets);
    }

    /**
     * Get a certain competency summary.
     *
     * @param competencyId ID of the competency.
     * @param userId ID of the user. If not defined, current user.
     * @param siteId Site ID. If not defined, current site.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @returns Promise to be resolved when the competency summary is retrieved.
     */
    async getCompetencySummary(
        competencyId: number,
        userId?: number,
        siteId?: string,
        ignoreCache = false,
    ): Promise<AddonCompetencyDataForUserCompetencySummaryWSResponse> {
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        const params: AddonCompetencyDataForUserCompetencySummaryWSParams = {
            competencyid: competencyId,
            userid: userId,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCompetencySummaryCacheKey(competencyId, userId),
            updateFrequency: CoreCacheUpdateFrequency.SOMETIMES,
        };

        if (ignoreCache) {
            preSets.getFromCache = false;
            preSets.emergencyCache = false;
        }

        return site.read('tool_lp_data_for_user_competency_summary', params, preSets);
    }

    /**
     * Get all competencies in a course for a certain user.
     *
     * @param courseId ID of the course.
     * @param userId ID of the user.
     * @param siteId Site ID. If not defined, current site.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @returns Promise to be resolved when the course competencies are retrieved.
     */
    async getCourseCompetencies(
        courseId: number,
        userId?: number,
        siteId?: string,
        ignoreCache = false,
    ): Promise<AddonCompetencyDataForCourseCompetenciesPageWSResponse> {

        const courseCompetencies = await this.getCourseCompetenciesPage(courseId, siteId, ignoreCache);

        if (!userId || userId == CoreSites.getCurrentSiteUserId()) {
            return courseCompetencies;
        }

        const userCompetenciesSumaries: AddonCompetencyDataForUserCompetencySummaryInCourseWSResponse[] =
            await Promise.all(courseCompetencies.competencies.map((competency) =>
                this.getCompetencyInCourse(courseId, competency.competency.id, userId, siteId)));

        userCompetenciesSumaries.forEach((userCompetenciesSumary, index) => {
            courseCompetencies.competencies[index].usercompetencycourse =
                userCompetenciesSumary.usercompetencysummary.usercompetencycourse;
        });

        return courseCompetencies;
    }

    /**
     * Get all competencies in a course.
     *
     * @param courseId ID of the course.
     * @param siteId Site ID. If not defined, current site.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @returns Promise to be resolved when the course competencies are retrieved.
     */
    async getCourseCompetenciesPage(
        courseId: number,
        siteId?: string,
        ignoreCache = false,
    ): Promise<AddonCompetencyDataForCourseCompetenciesPageWSResponse> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonCompetencyDataForCourseCompetenciesPageWSParams = {
            courseid: courseId,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCourseCompetenciesCacheKey(courseId),
            updateFrequency: CoreCacheUpdateFrequency.SOMETIMES,
        };

        if (ignoreCache) {
            preSets.getFromCache = false;
            preSets.emergencyCache = false;
        }

        return site.read<AddonCompetencyDataForCourseCompetenciesPageWSResponse>(
            'tool_lp_data_for_course_competencies_page',
            params,
            preSets,
        );
    }

    /**
     * Invalidates User Learning Plans data.
     *
     * @param userId ID of the user. If not defined, current user.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateLearningPlans(userId?: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        await site.invalidateWsCacheForKey(this.getLearningPlansCacheKey(userId));
    }

    /**
     * Invalidates Learning Plan data.
     *
     * @param planId ID of the plan.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateLearningPlan(planId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getLearningPlanCacheKey(planId));
    }

    /**
     * Invalidates Competency in Plan data.
     *
     * @param planId ID of the plan.
     * @param competencyId ID of the competency.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateCompetencyInPlan(planId: number, competencyId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getCompetencyInPlanCacheKey(planId, competencyId));
    }

    /**
     * Invalidates Competency in Course data.
     *
     * @param courseId ID of the course.
     * @param competencyId ID of the competency.
     * @param userId ID of the user. If not defined, current user.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateCompetencyInCourse(courseId: number, competencyId: number, userId?: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        await site.invalidateWsCacheForKey(this.getCompetencyInCourseCacheKey(courseId, competencyId, userId));
    }

    /**
     * Invalidates Competency Summary data.
     *
     * @param competencyId ID of the competency.
     * @param userId ID of the user. If not defined, current user.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateCompetencySummary(competencyId: number, userId?: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        await site.invalidateWsCacheForKey(this.getCompetencySummaryCacheKey(competencyId, userId));
    }

    /**
     * Invalidates Course Competencies data.
     *
     * @param courseId ID of the course.
     * @param userId ID of the user.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateCourseCompetencies(courseId: number, userId?: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        await site.invalidateWsCacheForKey(this.getCourseCompetenciesCacheKey(courseId));

        if (!userId || userId == CoreSites.getCurrentSiteUserId()) {
            return;
        }

        const competencies = await this.getCourseCompetencies(courseId, 0, siteId);
        const promises = competencies.competencies.map((competency) =>
            this.invalidateCompetencyInCourse(courseId, competency.competency.id, userId, siteId));

        await Promise.all(promises);
    }

    /**
     * Report the competency as being viewed in plan.
     *
     * @param planId ID of the plan.
     * @param competencyId ID of the competency.
     * @param planStatus Current plan Status to decide what action should be logged.
     * @param name Deprecated, not used anymore.
     * @param userId User ID. If not defined, current user.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    async logCompetencyInPlanView(
        planId: number,
        competencyId: number,
        planStatus: AddonCompetencyLearningPlanStatus,
        name?: string,
        userId?: number,
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        const params: AddonCompetencyUserCompetencyPlanViewedWSParams = {
            planid: planId,
            competencyid: competencyId,
            userid: userId,
        };

        const preSets: CoreSiteWSPreSets = {
            typeExpected: 'boolean',
        };

        const wsName = planStatus === AddonCompetencyLearningPlanStatus.COMPLETE
            ? 'core_competency_user_competency_plan_viewed'
            : 'core_competency_user_competency_viewed_in_plan';

        await site.write(wsName, params, preSets);
    }

    /**
     * Report the competency as being viewed in course.
     *
     * @param courseId ID of the course.
     * @param competencyId ID of the competency.
     * @param name Deprecated, not used anymore.
     * @param userId User ID. If not defined, current user.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    async logCompetencyInCourseView(
        courseId: number,
        competencyId: number,
        name?: string,
        userId?: number,
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        const params: AddonCompetencyUserCompetencyViewedInCourseWSParams = {
            courseid: courseId,
            competencyid: competencyId,
            userid: userId,
        };

        const preSets: CoreSiteWSPreSets = {
            typeExpected: 'boolean',
        };

        await site.write('core_competency_user_competency_viewed_in_course', params, preSets);
    }

    /**
     * Report the competency as being viewed.
     *
     * @param competencyId ID of the competency.
     * @param name Name of the competency.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    async logCompetencyView(competencyId: number, name?: string, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonCompetencyCompetencyViewedWSParams = {
            id: competencyId,
        };

        const preSets: CoreSiteWSPreSets = {
            typeExpected: 'boolean',
        };

        await site.write('core_competency_competency_viewed', params, preSets);
    }

}
export const AddonCompetency = makeSingleton(AddonCompetencyProvider);

/**
 * Data returned by competency's plan_exporter.
 */
export type AddonCompetencyPlan = {
    name: string; // Name.
    description: string; // Description.
    descriptionformat?: CoreTextFormat; // Description format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    userid: number; // Userid.
    templateid: number; // Templateid.
    origtemplateid: number; // Origtemplateid.
    status: AddonCompetencyLearningPlanStatus; // Status.
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
    descriptionformat?: CoreTextFormat; // Description format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
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
    descriptionformat: CoreTextFormat; // Description format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
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
    status: AddonCompetencyReviewStatus; // Status.
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
 * Params of tool_lp_data_for_user_competency_summary_in_plan WS.
 */
type AddonCompetencyDataForUserCompetencySummaryInPlanWSParams = {
    competencyid: number; // Data base record id for the competency.
    planid: number; // Data base record id for the plan.
};

/**
 * Data returned by competency's user_competency_summary_in_plan_exporter.
 */
export type AddonCompetencyDataForUserCompetencySummaryInPlanWSResponse = {
    usercompetencysummary: AddonCompetencyDataForUserCompetencySummaryWSResponse;
    plan: AddonCompetencyPlan;
};

/**
 * Params of tool_lp_data_for_user_competency_summary WS.
 */
type AddonCompetencyDataForUserCompetencySummaryWSParams = {
    userid: number; // Data base record id for the user.
    competencyid: number; // Data base record id for the competency.
};

/**
 * Data returned by competency's user_competency_summary_exporter.
 */
export type AddonCompetencyDataForUserCompetencySummaryWSResponse = {
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
    linkedcourses: CoreCourseSummaryExporterData[]; // Linkedcourses.
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
    descriptionformat: CoreTextFormat; // Description format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
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
 * Params of tool_lp_data_for_user_competency_summary_in_course WS.
 */
type AddonCompetencyDataForUserCompetencySummaryInCourseWSParams = {
    userid: number; // Data base record id for the user.
    competencyid: number; // Data base record id for the competency.
    courseid: number; // Data base record id for the course.
};

/**
 * Data returned by tool_lp_data_for_user_competency_summary_in_course WS.
 *
 * WS Description: Load a summary of a user competency.
 */
export type AddonCompetencyDataForUserCompetencySummaryInCourseWSResponse = {
    usercompetencysummary: AddonCompetencyDataForUserCompetencySummaryWSResponse;
    course: CoreCourseSummaryExporterData;
    coursemodules: AddonCompetencyCourseModuleInfo[]; // Coursemodules.
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
 * Params of tool_lp_data_for_plans_page WS.
 */
type AddonCompetencyDataForPlansPageWSParams = {
    userid: number; // The user id.
};

/**
 * Data returned by tool_lp_data_for_plans_page WS.
 */
export type AddonCompetencyDataForPlansPageWSResponse = {
    userid: number; // The learning plan user id.
    plans: AddonCompetencyPlan[];
    pluginbaseurl: string; // Url to the tool_lp plugin folder on this Moodle site.
    navigation: string[];
    canreaduserevidence: boolean; // Can the current user view the user's evidence.
    canmanageuserplans: boolean; // Can the current user manage the user's plans.
};

/**
 * Params of tool_lp_data_for_plan_page WS.
 */
type AddonCompetencyDataForPlanPageWSParams = {
    planid: number; // The plan id.
};

/**
 * Data returned by tool_lp_data_for_plan_page WS.
 */
export type AddonCompetencyDataForPlanPageWSResponse = {
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
 * Params of tool_lp_data_for_course_competencies_page WS.
 */
type AddonCompetencyDataForCourseCompetenciesPageWSParams = {
    courseid: number; // The course id.
    moduleid?: number; // The module id.
};

/**
 * Data returned by tool_lp_data_for_course_competencies_page WS.
 */
export type AddonCompetencyDataForCourseCompetenciesPageWSResponse = {
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
    coursemodules: AddonCompetencyCourseModuleInfo[];
    usercompetencycourse?: AddonCompetencyUserCompetencyCourse;
    ruleoutcomeoptions: {
        value: number; // The option value.
        text: string; // The name of the option.
        selected: boolean; // If this is the currently selected option.
    }[];
    comppath: AddonCompetencyPath;
    plans: AddonCompetencyPlan[]; // @since 3.7.
};

type AddonCompetencyCourseModuleInfo = {
    id: number; // Id.
    name: string; // Name.
    url?: string; // Url.
    iconurl: string; // Iconurl.
};

/**
 * Params of core_competency_user_competency_plan_viewed and core_competency_user_competency_viewed_in_plan WS.
 */
type AddonCompetencyUserCompetencyPlanViewedWSParams = {
    competencyid: number; // The competency id.
    userid: number; // The user id.
    planid: number; // The plan id.
};

/**
 * Params of core_competency_user_competency_viewed_in_course WS.
 */
type AddonCompetencyUserCompetencyViewedInCourseWSParams = {
    competencyid: number; // The competency id.
    userid: number; // The user id.
    courseid: number; // The course id.
};

/**
 * Params of core_competency_competency_viewed WS.
 */
type AddonCompetencyCompetencyViewedWSParams = {
    id: number; // The competency id.
};
