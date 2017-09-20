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

angular.module('mm.addons.grades')

/**
 * Grades handlers factory.
 *
 * @module mm.addons.grades
 * @ngdoc service
 * @name $mmaGradesHandlers
 */
.factory('$mmaGradesHandlers', function($mmGrades, $mmaCoursesGrades, $state, $mmContentLinksHelper, $mmContentLinkHandlerFactory,
            mmCoursesAccessMethods, mmUserProfileHandlersTypeNewPage) {

    var self = {},
        viewGradesEnabledCache = {}; // We use a "cache" to decrease network usage.

    /**
     * Get a cache key to identify a course and a user.
     *
     * @param  {Number} courseId Course ID.
     * @param  {Number} userId   User ID.
     * @return {String}          Cache key.
     */
    function getCacheKey(courseId, userId) {
        return courseId + '#' + userId;
    }

    /**
     * Clear view grades cache.
     * If a courseId and userId are specified, it will only delete the entry for that user and course.
     *
     * @module mm.addons.grades
     * @ngdoc method
     * @name $mmaGradesHandlers#clearViewGradesCache
     * @param  {Number} [courseId] Course ID.
     * @param  {Number} [userId]   User ID.
     */
    self.clearViewGradesCache = function(courseId, userId) {
        if (courseId && userId) {
            delete viewGradesEnabledCache[getCacheKey(courseId, userId)];
        } else {
            viewGradesEnabledCache = {};
        }
    };

    /**
     * Course nav handler.
     *
     * @module mm.addons.grades
     * @ngdoc method
     * @name $mmaGradesHandlers#coursesNav
     */
    self.coursesNav = function() {

        var self = {};

        /**
         * Check if handler is enabled.
         *
         * @return {Promise} Promise resolved with true if handler is enabled, false otherwise.
         */
        self.isEnabled = function() {
            return $mmGrades.isPluginEnabled();
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

            if (navOptions && typeof navOptions.grades != 'undefined') {
                return navOptions.grades;
            }

            return $mmGrades.isPluginEnabledForCourse(courseId);
        };

        /**
         * Get the controller.
         *
         * @param {Number} courseId Course ID.
         * @return {Object}         Controller.
         */
        self.getController = function() {

            /**
             * Courses nav handler controller.
             *
             * @module mm.addons.grades
             * @ngdoc controller
             * @name $mmaGradesHandlers#coursesNav:controller
             */
            return function($scope, $state) {
                $scope.icon = 'ion-stats-bars';
                $scope.title = 'mm.grades.grades';
                $scope.class = 'mma-grades-mine-handler';
                $scope.action = function($event, course) {
                    $event.preventDefault();
                    $event.stopPropagation();
                    $state.go('site.grades', {
                        course: course
                    });
                };
            };
        };

        return self;
    };

    /**
     * View grades handler.
     *
     * @module mm.addons.grades
     * @ngdoc method
     * @name $mmaGradesHandlers#viewGrades
     */
    self.viewGrades = function() {

        var self = {
            type: mmUserProfileHandlersTypeNewPage
        };

        /**
         * Check if handler is enabled.
         *
         * @return {Promise} Promise resolved with true if handler is enabled, false otherwise.
         */
        self.isEnabled = function() {
            return $mmGrades.isPluginEnabled();
        };

        /**
         * Check if handler is enabled for this user in this context.
         *
         * @param {Object} user     User to check.
         * @param {Number} courseId Course ID.
         * @param  {Object} [navOptions] Course navigation options for current user. See $mmCourses#getUserNavigationOptions.
         * @param  {Object} [admOptions] Course admin options for current user. See $mmCourses#getUserAdministrationOptions.
         * @return {Promise}        Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
         */
        self.isEnabledForUser = function(user, courseId, navOptions, admOptions) {
            return $mmGrades.isPluginEnabledForCourse(courseId).then(function() {
                var cacheKey = getCacheKey(courseId, user.id);
                if (typeof viewGradesEnabledCache[cacheKey] != 'undefined') {
                    return viewGradesEnabledCache[cacheKey];
                }
                return $mmGrades.isPluginEnabledForUser(courseId, user.id).then(function(enabled) {
                    viewGradesEnabledCache[cacheKey] = enabled;
                    return enabled;
                });
            });
        };

        /**
         * Check if handler is enabled for this user in this context.
         *
         * @param {Object} user     User.
         * @param {Number} courseId Course ID.
         * @return {Object}         Controller.
         */
        self.getController = function(user, courseId) {

            /**
             * View grades handler controller.
             *
             * @module mm.addons.grades
             * @ngdoc controller
             * @name $mmaGradesHandlers#viewGrades:controller
             */
            return function($scope) {
                $scope.title = 'mm.grades.grades';
                $scope.class = 'mma-grades-user-handler';
                $scope.icon = 'ion-stats-bars';

                $scope.action = function($event) {
                    $event.preventDefault();
                    $event.stopPropagation();
                    $state.go('site.grades', {
                        userid: user.id,
                        course: {id: courseId}
                    });
                };
            };

        };

        return self;
    };

    /**
     * Content links handler for view user grades (can be current user).
     *
     * @module mm.addons.grades
     * @ngdoc method
     * @name $mmaGradesHandlers#userLinksHandler
     */
    self.userLinksHandler = $mmContentLinkHandlerFactory.createChild(
                '/grade/report/user/index.php', '$mmUserDelegate_mmaGrades:viewGrades');

    // Check if the handler is enabled for a certain site. See $mmContentLinkHandlerFactory#isEnabled.
    self.userLinksHandler.isEnabled = function(siteId, url, params, courseId) {
        courseId = parseInt(params.id, 10) || courseId;
        if (!courseId) {
            return false;
        }

        return $mmGrades.isPluginEnabled(siteId).then(function(enabled) {
            if (!enabled) {
                return false;
            }

            return $mmGrades.isPluginEnabledForCourse(courseId, siteId);
        });
    };

    // Get actions to perform with the link. See $mmContentLinkHandlerFactory#getActions.
    self.userLinksHandler.getActions = function(siteIds, url, params, courseId) {
        courseId = parseInt(params.id, 10) || courseId;

        return [{
            action: function(siteId) {
                var stateParams = {
                    course: {id: courseId},
                    userid: params.userid ? parseInt(params.userid, 10) : false,
                    courseid: courseId,
                    forcephoneview: false
                };
                $mmContentLinksHelper.goInSite('site.grades', stateParams, siteId);
            }
        }];
    };

    /**
     * Content links handler for overview courses grades.
     *
     * @module mm.addons.grades
     * @ngdoc method
     * @name $mmaGradesHandlers#overviewLinksHandler
     */
    self.overviewLinksHandler = $mmContentLinkHandlerFactory.createChild(
                '/grade/report/overview/index.php', '$mmSideMenuDelegate_mmaGrades');

    // Check if the handler is enabled for a certain site. See $mmContentLinkHandlerFactory#isEnabled.
    self.overviewLinksHandler.isEnabled = $mmaCoursesGrades.isPluginEnabled;

    // Get actions to perform with the link. See $mmContentLinkHandlerFactory#getActions.
    self.overviewLinksHandler.getActions = function(siteIds, url, params, courseId) {
        return [{
            action: function(siteId) {
                // Always use redirect to make it the new history root (to avoid "loops" in history).
                $state.go('redirect', {
                    siteid: siteId,
                    state: 'site.coursesgrades',
                    params: {}
                });
            }
        }];
    };

    /**
     * Side menu nav handler.
     *
     * @module mm.addons.grades
     * @ngdoc method
     * @name $mmaGradesHandlers#sideMenuNav
     */
    self.sideMenuNav = function() {

        var self = {};

        /**
         * Check if handler is enabled.
         *
         * @return {Promise|Boolean} If handler is enabled returns a resolved promise. If it's not it can return a
         *                           rejected promise or false.
         */
        self.isEnabled = function() {
            return $mmaCoursesGrades.isPluginEnabled();
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
             * @module mm.addons.grades
             * @ngdoc controller
             * @name $mmaGradesHandlers#sideMenuNav:controller
             */
            return function($scope) {
                $scope.icon = 'ion-stats-bars';
                $scope.title = 'mm.grades.grades';
                $scope.state = 'site.coursesgrades';
                $scope.class = 'mma-grades-coursesgrades';
            };
        };

        return self;
    };

    return self;
})

.run(function($mmaGradesHandlers, $mmEvents, mmCoreEventLogout, mmUserEventProfileRefreshed) {
    $mmEvents.on(mmCoreEventLogout, $mmaGradesHandlers.clearViewGradesCache);
    $mmEvents.on(mmUserEventProfileRefreshed, function(data) {
        if (data) {
            $mmaGradesHandlers.clearViewGradesCache(data.courseid, data.userid);
        }
    });
});
