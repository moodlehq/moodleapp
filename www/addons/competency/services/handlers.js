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
 * Competency handlers factory.
 *
 * This factory holds the different handlers used for delegates.
 *
 * @module mm.addons.competency
 * @ngdoc service
 * @name $mmaCompetencyHandlers
 */
.factory('$mmaCompetencyHandlers', function($log, $mmaCompetency, mmCoursesAccessMethods, mmUserProfileHandlersTypeNewPage, $q) {
    $log = $log.getInstance('$mmaCompetencyHandlers');

    var self = {},
        coursesNavEnabledCache = {},
        participantsNavEnabledCache = {},
        usersNavEnabledCache = {};

    /**
     * Clear courses nav cache.
     *
     * @module mm.addons.competency
     * @ngdoc method
     * @name $mmaCompetencyHandlers#clearCoursesNavCache
     */
    self.clearCoursesNavCache = function() {
        coursesNavEnabledCache = {};
    };

    /**
     * Clear users nav cache.
     *
     * @module mm.addons.competency
     * @ngdoc method
     * @name $mmaCompetencyHandlers#clearUsersNavCache
     */
    self.clearUsersNavCache = function() {
        participantsNavEnabledCache = {};
        usersNavEnabledCache = {};
    };

    /**
     * Side menu nav handler.
     *
     * @module mm.addons.competency
     * @ngdoc method
     * @name $mmaCompetencyHandlers#sideMenuNav
     */
    self.sideMenuNav = function() {

        var self = {};

        /**
         * Check if handler is enabled.
         *
         * @param  {String} siteId     Site ID.
         * @return {Promise} Promise resolved with true if enabled.
         */
        self.isEnabled = function(siteId) {
            return $mmaCompetency.isPluginEnabled(siteId).then(function(enabled) {
                if (!enabled) {
                    return false;
                }

                // Check the user has at least one learn plan available.
                return $mmaCompetency.getLearningPlans(false, siteId).then(function(plans) {
                    return plans.length > 0;
                });
            });
        };

        /**
         * Get the controller.
         *
         * @return {Object} Controller.
         */
        self.getController = function() {

            /**
             * Side menu nav handler controller.
             *
             * @module mm.addons.competency
             * @ngdoc controller
             * @name $mmaCompetencyHandlers#sideMenuNav:controller
             */
            return function($scope) {
                $scope.icon = 'ion-map';
                $scope.title = 'mma.competency.myplans';
                $scope.state = 'site.learningplans';
                $scope.class = 'mma-competency-handler';
            };
        };

        return self;
    };

    /**
     * Course nav handler.
     *
     * @module mm.addons.competency
     * @ngdoc method
     * @name $mmaCompetencyHandlers#coursesNav
     */
    self.coursesNav = function() {

        var self = {};

        /**
         * Invalidate data to determine if handler is enabled for a course.
         *
         * @param  {Number} courseId     Course ID.
         * @param  {Object} [navOptions] Course navigation options for current user. See $mmCourses#getUserNavigationOptions.
         * @param  {Object} [admOptions] Course admin options for current user. See $mmCourses#getUserAdministrationOptions.
         * @return {Promise}             Promise resolved when done.
         */
        self.invalidateEnabledForCourse = function(courseId, navOptions, admOptions) {
            if (navOptions && typeof navOptions.competencies != 'undefined') {
                // No need to invalidate anything.
                return $q.when();
            }

            return $mmaCompetency.invalidateCourseCompetencies(courseId);
        };

        /**
         * Check if handler is enabled.
         *
         * @return {Boolean} True if handler is enabled, false otherwise.
         */
        self.isEnabled = function() {
            return $mmaCompetency.isPluginEnabled();
        };

        /**
         * Check if handler is enabled for this course.
         *
         * For perfomance reasons, do NOT call WebServices in here, call them in shouldDisplayForCourse.
         *
         * @param  {Number} courseId     Course ID.
         * @param  {Object} accessData   Type of access to the course: default, guest, ...
         * @param  {Object} [navOptions] Course navigation options for current user. See $mmCourses#getUserNavigationOptions.
         * @param  {Object} [admOptions] Course admin options for current user. See $mmCourses#getUserAdministrationOptions.
         * @return {Boolean}             True if handler is enabled, false otherwise.
         */
        self.isEnabledForCourse = function(courseId, accessData, navOptions, admOptions) {
            if (accessData && accessData.type == mmCoursesAccessMethods.guest) {
                return false; // Not enabled for guests.
            }

            if (navOptions && typeof navOptions.competencies != 'undefined') {
                return navOptions.competencies;
            }

            // Assume it's enabled for now, further checks will be done in shouldDisplayForCourse.
            return true;
        };

        /**
         * Get the controller.
         *
         * @param {Number} courseId Course ID.
         * @return {Object}         Controller.
         */
        self.getController = function(courseId) {

            /**
             * Courses nav handler controller.
             *
             * @module mm.addons.competency
             * @ngdoc controller
             * @name $mmaCompetencyHandlers#coursesNav:controller
             */
            return function($scope, $state) {
                $scope.icon = 'ion-ribbon-a';
                $scope.title = 'mma.competency.competencies';
                $scope.class = 'mma-competency-handler';
                $scope.action = function($event, course) {
                    $event.preventDefault();
                    $event.stopPropagation();
                    $state.go('site.coursecompetencies', {
                        courseid: course.id
                    });
                };
            };
        };

        /**
         * Check if handler should be displayed in a course. Will only be called if the handler is enabled for the course.
         *
         * This function shouldn't be called too much, so WebServices calls are allowed.
         *
         * @param  {Number} courseId     Course ID.
         * @param  {Object} accessData   Type of access to the course: default, guest, ...
         * @param  {Object} [navOptions] Course navigation options for current user. See $mmCourses#getUserNavigationOptions.
         * @param  {Object} [admOptions] Course admin options for current user. See $mmCourses#getUserAdministrationOptions.
         * @return {Promise|Boolean}     True or promise resolved with true if handler should be displayed.
         */
        self.shouldDisplayForCourse = function(courseId, accessData, navOptions, admOptions) {
            if (navOptions && typeof navOptions.competencies != 'undefined') {
                return navOptions.competencies;
            }

            if (typeof coursesNavEnabledCache[courseId] != 'undefined') {
                return coursesNavEnabledCache[courseId];
            }

            return $mmaCompetency.isPluginForCourseEnabled(courseId).then(function(competencies) {
                var enabled = competencies ? !competencies.canmanagecoursecompetencies : false;
                // We can also cache call for participantsNav.
                participantsNavEnabledCache[courseId] = !!competencies;
                coursesNavEnabledCache[courseId] = enabled;
                return enabled;
            });
        };

        /**
         * Prefetch the addon for a certain course.
         *
         * @param  {Object} course Course to prefetch.
         * @return {Promise}       Promise resolved when the prefetch is finished.
         */
        self.prefetch = function(course) {
            // Invalidate data to be sure to get the latest info.
            return $mmaCompetency.invalidateCourseCompetencies(course.id).catch(function() {
                // Ignore errors.
            }).then(function() {
                return $mmaCompetency.getCourseCompetencies(course.id);
            });
        };

        return self;
    };

    /**
     * Learning Plan User handler.
     *
     * @module mm.addons.competency
     * @ngdoc method
     * @name $mmaCompetencyHandlers#learningPlan
     */
    self.learningPlan = function() {

        var self = {
            type: mmUserProfileHandlersTypeNewPage
        };

        /**
         * Check if handler is enabled.
         *
         * @return {Boolean} True if handler is enabled, false otherwise.
         */
        self.isEnabled = function() {
            return $mmaCompetency.isPluginEnabled();
        };

        /**
         * Check if handler is enabled for this course.
         *
         * @param {Number} user     User to check.
         * @param {Number} courseId Course ID.
         * @param  {Object} [navOptions] Course navigation options for current user. See $mmCourses#getUserNavigationOptions.
         * @param  {Object} [admOptions] Course admin options for current user. See $mmCourses#getUserAdministrationOptions.
         * @return {Boolean}          True if handler is enabled, false otherwise.
         */
        self.isEnabledForUser = function(user, courseId, navOptions, admOptions) {

            if (courseId) {
                // Link on a user course profile.
                if (typeof participantsNavEnabledCache[courseId] != 'undefined') {
                    return participantsNavEnabledCache[courseId];
                }
                return $mmaCompetency.isPluginForCourseEnabled(courseId).then(function(competencies) {
                    var enabled = !!competencies;
                    // We can also cache call for coursesNav.
                    coursesNavEnabledCache[courseId] = competencies ? !competencies.canmanagecoursecompetencies : false;
                    participantsNavEnabledCache[courseId] = enabled;
                    return enabled;
                });
            } else {
                // Link on a user site profile.
                if (typeof usersNavEnabledCache[user.id] != 'undefined') {
                    return usersNavEnabledCache[user.id];
                }
                return $mmaCompetency.getLearningPlans(user.id).then(function(plans) {
                    // Check the user has at least one learn plan available.
                    var enabled = plans.length > 0;
                    usersNavEnabledCache[user.id] = enabled;
                    return enabled;
                });
            }
        };

        /**
         * Get the controller.
         *
         * @param {Object} user    User.
         * @param {Number} courseId Course ID.
         * @return {Object}         Controller.
         */
        self.getController = function(user, courseId) {


            /**
             * Learning plan handler controller.
             *
             * @module mm.addons.competency
             * @ngdoc controller
             * @name $mmaCompetencyHandlers#learningPlan:controller
             */
            return function($scope, $state) {
                $scope.class = 'mma-competency-handler';
                if (courseId) {
                    $scope.icon = 'ion-ribbon-a';
                    $scope.title = 'mma.competency.competencies';
                    $scope.action = function($event) {
                        $event.preventDefault();
                        $event.stopPropagation();
                        $state.go('site.coursecompetencies', {
                            courseid: courseId,
                            userid: user.id
                        });
                    };
                } else {
                    $scope.icon = 'ion-map';
                    $scope.title = 'mma.competency.learningplans';
                    $scope.action = function($event) {
                        $event.preventDefault();
                        $event.stopPropagation();
                        $state.go('site.learningplans', {
                            userid: user.id
                        });
                    };
                }
            };

        };

        return self;
    };

    return self;
})

.run(function($mmaCompetencyHandlers, $mmEvents, mmCoreEventLogout, mmCoursesEventMyCoursesRefreshed, mmUserEventProfileRefreshed) {
    $mmEvents.on(mmCoreEventLogout, function() {
        $mmaCompetencyHandlers.clearCoursesNavCache();
        $mmaCompetencyHandlers.clearUsersNavCache();
    });
    $mmEvents.on(mmCoursesEventMyCoursesRefreshed, $mmaCompetencyHandlers.clearCoursesNavCache);
    $mmEvents.on(mmUserEventProfileRefreshed, $mmaCompetencyHandlers.clearUsersNavCache);
});
