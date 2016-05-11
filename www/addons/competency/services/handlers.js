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
.factory('$mmaCompetencyHandlers', function($log, $mmaCompetency, mmCoursesAccessMethods) {
    $log = $log.getInstance('$mmaCompetencyHandlers');

    var self = {},
        coursesNavEnabledCache = {};

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
                $scope.title = 'mma.competency.mylearningplans';
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
         * @param {Number} courseId   Course ID.
         * @param {Object} accessData Type of access to the course: default, guest, ...
         * @return {Boolean}          True if handler is enabled, false otherwise.
         */
        self.isEnabledForCourse = function(courseId, accessData) {
            if (accessData && accessData.type == mmCoursesAccessMethods.guest) {
                return false; // Not enabled for guests.
            }
            if (typeof coursesNavEnabledCache[courseId] != 'undefined') {
                return coursesNavEnabledCache[courseId];
            }
            return $mmaCompetency.isPluginForCourseEnabled(courseId).then(function(enabled) {
                coursesNavEnabledCache[courseId] = enabled;
                return enabled;
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

        return self;
    };

    return self;
})

.run(function($mmaCompetencyHandlers, $mmEvents, mmCoreEventLogout, mmCoursesEventMyCoursesRefreshed) {
    $mmEvents.on(mmCoreEventLogout, function() {
        $mmaCompetencyHandlers.clearCoursesNavCache();
    });
    $mmEvents.on(mmCoursesEventMyCoursesRefreshed, $mmaCompetencyHandlers.clearCoursesNavCache);
});
