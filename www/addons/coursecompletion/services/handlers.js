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

angular.module('mm.addons.coursecompletion')

/**
 * Course completion handlers factory.
 *
 * This factory holds the different handlers used for delegates.
 *
 * @module mm.addons.coursecompletion
 * @ngdoc service
 * @name $mmaCourseCompletionHandlers
 */
.factory('$mmaCourseCompletionHandlers', function($mmaCourseCompletion, $state, mmCoursesAccessMethods, mmUserProfileHandlersTypeNewPage) {

    // We use "caches" to decrease network usage.
    var self = {},
        viewCompletionEnabledCache = {},
        coursesNavEnabledCache = {};

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
     * Clear view completion cache.
     * If a courseId and userId are specified, it will only delete the entry for that user and course.
     *
     * @module mm.addons.coursecompletion
     * @ngdoc method
     * @name $mmaCourseCompletionHandlers#clearViewCompletionCache
     * @param  {Number} [courseId] Course ID.
     * @param  {Number} [userId]   User ID.
     */
    self.clearViewCompletionCache = function(courseId, userId) {
        if (courseId && userId) {
            delete viewCompletionEnabledCache[getCacheKey(courseId, userId)];
        } else {
            viewCompletionEnabledCache = {};
        }
    };

    /**
     * Clear courses nav caches.
     *
     * @module mm.addons.coursecompletion
     * @ngdoc method
     * @name $mmaCourseCompletionHandlers#clearCoursesNavCache
     */
    self.clearCoursesNavCache = function() {
        coursesNavEnabledCache = {};
    };

    /**
     * View user completion handler.
     *
     * @module mm.addons.coursecompletion
     * @ngdoc method
     * @name $mmaCourseCompletionHandlers#viewCompletion
     */
    self.viewCompletion = function() {

        var self = {
            type: mmUserProfileHandlersTypeNewPage
        };

        /**
         * Check if handler is enabled.
         *
         * @return {Boolean} True if handler is enabled, false otherwise.
         */
        self.isEnabled = function() {
            return $mmaCourseCompletion.isPluginViewEnabled();
        };

        /**
         * Check if handler is enabled for this user in this context.
         *
         * @param {Object} user     User to check.
         * @param {Number} courseId Course ID.
         * @param  {Object} [navOptions] Course navigation options for current user. See $mmCourses#getUserNavigationOptions.
         * @param  {Object} [admOptions] Course admin options for current user. See $mmCourses#getUserAdministrationOptions.
         * @return {Boolean}        True if handler is enabled, false otherwise.
         */
        self.isEnabledForUser = function(user, courseId, navOptions, admOptions) {
            return $mmaCourseCompletion.isPluginViewEnabledForCourse(courseId).then(function(courseEnabled) {
                var cacheKey = getCacheKey(courseId, user.id);
                // If is not enabled in the course, is not enabled for the user.
                if (!courseEnabled) {
                    viewCompletionEnabledCache[cacheKey] = false;
                }
                if (typeof viewCompletionEnabledCache[cacheKey] != 'undefined') {
                    return viewCompletionEnabledCache[cacheKey];
                }
                return $mmaCourseCompletion.isPluginViewEnabledForUser(courseId, user.id).then(function(enabled) {
                    viewCompletionEnabledCache[cacheKey] = enabled;
                    return enabled;
                });
            });
        };

        /**
         * Get the controller.
         *
         * @param {Object} user     Course ID.
         * @param {Number} courseId Course ID.
         * @return {Object}         Controller.
         */
        self.getController = function(user, courseId) {

            /**
             * View course completion handler controller.
             *
             * @module mm.addons.coursecompletion
             * @ngdoc controller
             * @name $mmaCourseCompletionHandlers#viewCompletion:controller
             */
            return function($scope) {

                // Button title.
                $scope.title = 'mma.coursecompletion.coursecompletion';
                $scope.class = 'mma-coursecompletion-user-handler';
                $scope.icon = 'ion-android-checkbox-outline';

                $scope.action = function($event) {
                    $event.preventDefault();
                    $event.stopPropagation();
                    $state.go('site.course-completion', {
                        userid: user.id,
                        course: {id: courseId}
                    });

                };
            };

        };

        return self;
    };

    /**
     * Course nav handler.
     *
     * @module mm.addons.coursecompletion
     * @ngdoc method
     * @name $mmaCourseCompletionHandlers#coursesNav
     */
    self.coursesNav = function() {

        var self = {};

        /**
         * Check if handler is enabled.
         *
         * @return {Boolean} True if handler is enabled, false otherwise.
         */
        self.isEnabled = function() {
            return $mmaCourseCompletion.isPluginViewEnabled();
        };

        /**
         * Check if handler is enabled for this course.
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

            return $mmaCourseCompletion.isPluginViewEnabledForCourse(courseId).then(function(courseEnabled) {
                // If is not enabled in the course, is not enabled for the user.
                if (!courseEnabled) {
                    coursesNavEnabledCache[courseId] = false;
                }
                // Check if the user can see his own report, teachers can't.
                if (typeof coursesNavEnabledCache[courseId] != 'undefined') {
                    return coursesNavEnabledCache[courseId];
                }
                return $mmaCourseCompletion.isPluginViewEnabledForUser(courseId).then(function(enabled) {
                    coursesNavEnabledCache[courseId] = enabled;
                    return enabled;
                });
            });
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
             * @module mm.addons.coursecompletion
             * @ngdoc controller
             * @name $mmaCourseCompletionHandlers#coursesNav:controller
             */
            return function($scope, $state) {
                $scope.icon = 'ion-android-checkbox-outline';
                $scope.title = 'mma.coursecompletion.coursecompletion';
                $scope.class = 'mma-coursecompletion-mine-handler';
                $scope.action = function($event, course) {
                    $event.preventDefault();
                    $event.stopPropagation();
                    $state.go('site.course-completion', {
                        course: course
                    });
                };
            };
        };

        return self;
    };

    return self;
})

.run(function($mmaCourseCompletionHandlers, $mmEvents, mmCoreEventLogout, mmCoursesEventMyCoursesRefreshed,
            mmUserEventProfileRefreshed) {
    $mmEvents.on(mmCoreEventLogout, function() {
        $mmaCourseCompletionHandlers.clearViewCompletionCache();
        $mmaCourseCompletionHandlers.clearCoursesNavCache();
    });
    $mmEvents.on(mmCoursesEventMyCoursesRefreshed, $mmaCourseCompletionHandlers.clearCoursesNavCache);
    $mmEvents.on(mmUserEventProfileRefreshed, function(data) {
        if (data) {
            $mmaCourseCompletionHandlers.clearViewCompletionCache(data.courseid, data.userid);
        }
    });
});
