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

angular.module('mm.addons.competency')

/**
 * Service to handle caompetency learning plans.
 *
 * @module mm.addons.competency
 * @ngdoc service
 * @name $mmaCompetency
 */
.factory('$mmaCompetency', function($log, $mmSite, $mmSitesManager, $q, mmaCompetencyStatusComplete) {

    $log = $log.getInstance('$mmaCompetency');

    var self = {};

    /**
     * Get cache key for user learning plans data WS calls.
     *
     * @param {Number} userId User ID.
     * @return {String}         Cache key.
     */
    function getLearningPlansCacheKey(userId) {
        return 'mmaCompetency:userplans:' + userId;
    }

    /**
     * Get cache key for learning plan data WS calls.
     *
     * @param {Number} planId Plan ID.
     * @return {String}         Cache key.
     */
    function getLearningPlanCacheKey(planId) {
        return 'mmaCompetency:learningplan:' + planId;
    }

    /**
     * Get cache key for competency in plan data WS calls.
     *
     * @param {Number} planId Plan ID.
     * @param {Number} competencyId Competency ID.
     * @return {String}         Cache key.
     */
    function getCompetencyInPlanCacheKey(planId, competencyId) {
        return 'mmaCompetency:plancompetency:' + planId + ':' + competencyId;
    }

    /**
     * Get cache key for competency in course data WS calls.
     *
     * @param {Number} courseId Course ID.
     * @param {Number} competencyId Competency ID.
     * @param {Number} userId User ID.
     * @return {String}         Cache key.
     */
    function getCompetencyInCourseCacheKey(courseId, competencyId, userId) {
        return 'mmaCompetency:coursecompetency:' + userId + ':' + courseId + ':' + competencyId;
    }

    /**
     * Get cache key for competency summary data WS calls.
     *
     * @param {Number} competencyId Competency ID.
     * @param {Number} userId User ID.
     * @return {String}         Cache key.
     */
    function getCompetencySummaryCacheKey(competencyId, userId) {
        return 'mmaCompetency:competencysummary:' + userId + ':' + competencyId;
    }

    /**
     * Get cache key for course competencies data WS calls.
     *
     * @param {Number} courseId Course ID.
     * @return {String}         Cache key.
     */
    function getCourseCompetenciesCacheKey(courseId) {
        return 'mmaCompetency:coursecompetencies:' + courseId;
    }

    /**
     * Check if competency learning plans WS is available.
     *
     * @module mm.addons.competency
     * @ngdoc method
     * @name $mmaCompetency#isPluginEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise} True if competency learning plans WS is available, false otherwise.
     */
    self.isPluginEnabled = function(siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            if (site.wsAvailable('core_competency_list_course_competencies') && site.wsAvailable('tool_lp_data_for_plans_page')) {
                return self.getLearningPlans(false, siteId);
            }
            return false;
        });
    };

    /**
     * Returns whether competencies are enabled.
     *
     * @module mm.addons.competency
     * @ngdoc method
     * @name $mmaCompetency#isPluginForCourseEnabled
     * @param  {Number} courseId Course ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise} competencies if enabled for the given course, false otherwise.
     */
    self.isPluginForCourseEnabled = function(courseId, siteId) {
        if (!$mmSite.isLoggedIn()) {
            return $q.when(false);
        }

        if (!self.isPluginEnabled(siteId)) {
            return $q.when(false);
        }

        return self.getCourseCompetencies(courseId, siteId).catch(function() {
            return false;
        });
    };

    /**
     * Get plans for a certain user.
     *
     * @module mm.addons.competency
     * @ngdoc method
     * @name $mmaCompetency#getLearningPlans
     * @param  {Number} [userId]    ID of the user. If not defined, current user.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise to be resolved when the plans are retrieved.
     */
    self.getLearningPlans = function(userId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();

            $log.debug('Get plans for user ' + userId);

            var params = {
                    userid: userId
                },
                preSets = {
                    cacheKey: getLearningPlansCacheKey(userId)
                };

            return site.read('tool_lp_data_for_plans_page', params, preSets).then(function(response) {
                if (response.plans) {
                    return response.plans;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Get a certain plan.
     *
     * @module mm.addons.competency
     * @ngdoc method
     * @name $mmaCompetency#getLearningPlan
     * @param  {Number} planId    ID of the plan.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise to be resolved when the plans are retrieved.
     */
    self.getLearningPlan = function(planId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {

            $log.debug('Get plan ' + planId);

            var params = {
                    planid: planId
                },
                preSets = {
                    cacheKey: getLearningPlanCacheKey(planId)
                };

            return site.read('tool_lp_data_for_plan_page', params, preSets).then(function(response) {
                if (response.plan) {
                    return response;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Get a certain competency in a plan.
     *
     * @module mm.addons.competency
     * @ngdoc method
     * @name $mmaCompetency#getCompetencyInPlan
     * @param  {Number} planId    ID of the plan.
     * @param  {Number} competencyId    ID of the competency.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise to be resolved when the plans are retrieved.
     */
    self.getCompetencyInPlan = function(planId, competencyId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {

            $log.debug('Get competency ' + competencyId + ' in plan ' + planId);

            var params = {
                    planid: planId,
                    competencyid: competencyId
                },
                preSets = {
                    cacheKey: getCompetencyInPlanCacheKey(planId, competencyId)
                };

            return site.read('tool_lp_data_for_user_competency_summary_in_plan', params, preSets).then(function(response) {
                if (response.usercompetencysummary) {
                    return response;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Get a certain competency in a course.
     *
     * @module mm.addons.competency
     * @ngdoc method
     * @name $mmaCompetency#getCompetencyInCourse
     * @param  {Number} courseId    ID of the course.
     * @param  {Number} competencyId    ID of the competency.
     * @param  {Number} [userId]    ID of the user. If not defined, current user.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise to be resolved when the plans are retrieved.
     */
    self.getCompetencyInCourse = function(courseId, competencyId, userId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();

            $log.debug('Get competency ' + competencyId + ' in course ' + courseId);

            var params = {
                    courseid: courseId,
                    competencyid: competencyId,
                    userid: userId
                },
                preSets = {
                    cacheKey: getCompetencyInCourseCacheKey(courseId, competencyId, userId)
                };

            return site.read('tool_lp_data_for_user_competency_summary_in_course', params, preSets).then(function(response) {
                if (response.usercompetencysummary) {
                    return response;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Get a certain competency summary.
     *
     * @module mm.addons.competency
     * @ngdoc method
     * @name $mmaCompetency#getCompetencySummary
     * @param  {Number} competencyId    ID of the competency.
     * @param  {Number} [userId]    ID of the user. If not defined, current user.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise to be resolved when the plans are retrieved.
     */
    self.getCompetencySummary = function(competencyId, userId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();

            $log.debug('Get competency ' + competencyId + ' summary for user' + userId);

            var params = {
                    competencyid: competencyId,
                    userid: userId
                },
                preSets = {
                    cacheKey: getCompetencySummaryCacheKey(competencyId, userId)
                };

            return site.read('tool_lp_data_for_user_competency_summary', params, preSets).then(function(response) {
                if (response.competency) {
                    return response.competency;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Get an specific competency summary.
     *
     * @module mm.addons.competency
     * @ngdoc method
     * @name $mmaCompetency#getCourseCompetencies
     * @param  {Number} courseId    ID of the course.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise to be resolved when the course competencies are retrieved.
     */
    self.getCourseCompetencies = function(courseId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {

            $log.debug('Get course competencies for course ' + courseId);

            var params = {
                    courseid: courseId
                },
                preSets = {
                    cacheKey: getCourseCompetenciesCacheKey(courseId)
                };
            return site.read('tool_lp_data_for_course_competencies_page', params, preSets).then(function(response) {
                if (response.competencies) {
                    return response;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Invalidates User Learning Plans data.
     *
     * @module mm.addons.competency
     * @ngdoc method
     * @name $mmaCompetency#invalidateLearningPlans
     * @param  {Number} [userId]    ID of the user. If not defined, current user.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved when the data is invalidated.
     */
    self.invalidateLearningPlans = function(userId, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();
            return site.invalidateWsCacheForKey(getLearningPlansCacheKey(userId));
        });
    };

    /**
     * Invalidates Learning Plan data.
     *
     * @module mm.addons.competency
     * @ngdoc method
     * @name $mmaCompetency#invalidateLearningPlan
     * @param  {Number} planId    ID of the plan.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateLearningPlan = function(planId, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getLearningPlanCacheKey(planId));
        });
    };

    /**
     * Invalidates Competency in Plan data.
     *
     * @module mm.addons.competency
     * @ngdoc method
     * @name $mmaCompetency#invalidateCompetencyInPlan
     * @param  {Number} planId    ID of the plan.
     * @param  {Number} competencyId    ID of the competency.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateCompetencyInPlan = function(planId, competencyId, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getCompetencyInPlanCacheKey(planId, competencyId));
        });
    };

    /**
     * Invalidates Competency in Course data.
     *
     * @module mm.addons.competency
     * @ngdoc method
     * @name $mmaCompetency#invalidateCompetencyInCourse
     * @param  {Number} courseId    ID of the course.
     * @param  {Number} competencyId    ID of the competency.
     * @param  {Number} [userId]    ID of the user. If not defined, current user.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateCompetencyInCourse = function(courseId, competencyId, userId, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();
            return site.invalidateWsCacheForKey(getCompetencyInCourseCacheKey(courseId, competencyId, userId));
        });
    };


    /**
     * Invalidates Competency Summary data.
     *
     * @module mm.addons.competency
     * @ngdoc method
     * @name $mmaCompetency#invalidateCompetencySummary
     * @param  {Number} competencyId    ID of the competency.
     * @param  {Number} [userId]    ID of the user. If not defined, current user.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateCompetencySummary = function(competencyId, userId, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();
            return site.invalidateWsCacheForKey(getCompetencySummaryCacheKey(competencyId, userId));
        });
    };

    /**
     * Invalidates Course Competencies data.
     *
     * @module mm.addons.competency
     * @ngdoc method
     * @name $mmaCompetency#invalidateCourseCompetencies
     * @param  {Number} courseId    ID of the course.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateCourseCompetencies = function(courseId, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getCourseCompetenciesCacheKey(courseId));
        });
    };

    /**
     * Report the competency as being viewed in plan.
     *
     * @module mm.addons.competency
     * @ngdoc method
     * @name $mmaCompetency#logCompetencyInPlanView
     * @param  {Number} planId    ID of the plan.
     * @param  {Number} competencyId  ID of the competency.
     * @param  {Number} planStatus    Current plan Status to decide what action should be logged.
     * @param  {String} [userId] User ID. If not defined, current user.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}  Promise resolved when the WS call is successful.
     */
    self.logCompetencyInPlanView = function(planId, competencyId, planStatus, userId, siteId) {
        if (planId && competencyId) {
            siteId = siteId || $mmSite.getId();

            return $mmSitesManager.getSite(siteId).then(function(site) {
                userId = userId || site.getUserId();

                var params = {
                    planid: planId,
                    competencyid: competencyId,
                    userid: userId
                };
                if (planStatus == mmaCompetencyStatusComplete) {
                    return site.write('core_competency_user_competency_plan_viewed', params);
                } else {
                    return site.write('core_competency_user_competency_viewed_in_plan', params);
                }
            });
        }
        return $q.reject();
    };

    /**
     * Report the competency as being viewed in course.
     *
     * @module mm.addons.competency
     * @ngdoc method
     * @name $mmaCompetency#logCompetencyInCourseView
     * @param  {Number} courseId        ID of the course.
     * @param  {Number} competencyId    ID of the competency.
     * @param  {String} [userId] User ID. If not defined, current user.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}  Promise resolved when the WS call is successful.
     */
    self.logCompetencyInCourseView = function(courseId, competencyId, userId, siteId) {
        if (courseId && competencyId) {
            siteId = siteId || $mmSite.getId();

            return $mmSitesManager.getSite(siteId).then(function(site) {
                userId = userId || site.getUserId();

                var params = {
                    courseid: courseId,
                    competencyid: competencyId,
                    userid: userId
                };
                return site.write('core_competency_user_competency_viewed_in_course', params);
            });
        }
        return $q.reject();
    };

    /**
     * Report the competency as being viewed.
     *
     * @module mm.addons.competency
     * @ngdoc method
     * @name $mmaCompetency#logCompetencyView
     * @param  {Number} competencyId    ID of the competency.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}  Promise resolved when the WS call is successful.
     */
    self.logCompetencyView = function(competencyId, siteId) {
        if (competencyId) {
            siteId = siteId || $mmSite.getId();

            return $mmSitesManager.getSite(siteId).then(function(site) {
                var params = {
                    id: competencyId,
                };
                return site.write('core_competency_competency_viewed', params);
            });
        }
        return $q.reject();
    };

    return self;
});
