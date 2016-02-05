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
.factory('$mmaGradesHandlers', function($mmaGrades, $state, $mmUtil, $mmContentLinksHelper, mmCoursesAccessMethods) {

    var self = {};

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
            return $mmaGrades.isPluginEnabled();
        };

        /**
         * Check if handler is enabled for this course.
         *
         * @param {Number} courseId   Course ID.
         * @param {Object} accessData Type of access to the course: default, guest, ...
         * @return {Promise}          Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
         */
        self.isEnabledForCourse = function(courseId, accessData) {
            if (accessData && accessData.type == mmCoursesAccessMethods.guest) {
                return false; // Not enabled for guests.
            }
            return $mmaGrades.isPluginEnabledForCourse(courseId);
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
                $scope.title = 'mma.grades.grades';
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

        var self = {};

        /**
         * Check if handler is enabled.
         *
         * @return {Promise} Promise resolved with true if handler is enabled, false otherwise.
         */
        self.isEnabled = function() {
            return $mmaGrades.isPluginEnabled();
        };

        /**
         * Check if handler is enabled for this user in this context.
         *
         * @param {Object} user     User to check.
         * @param {Number} courseId Course ID.
         * @return {Promise}        Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
         */
        self.isEnabledForUser = function(user, courseId) {
            return $mmaGrades.isPluginEnabledForCourse(courseId);
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
                $scope.title = 'mma.grades.viewgrades';

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
     * Content links handler.
     *
     * @module mm.addons.grades
     * @ngdoc method
     * @name $mmaGradesHandlers#linksHandler
     */
    self.linksHandler = function() {

        var self = {};

        /**
         * Whether or not the handler is enabled for a certain site and course.
         *
         * @param  {String} siteId   Site ID.
         * @param  {Number} courseId Course ID.
         * @return {Promise}         Promise resolved with true if enabled.
         */
        function isEnabled(siteId, courseId) {
            return $mmaGrades.isPluginEnabled(siteId).then(function(enabled) {
                if (enabled) {
                    return $mmaGrades.isPluginEnabledForCourse(courseId, siteId);
                }
            });
        }

        /**
         * Get actions to perform with the link.
         *
         * @param {String[]} siteIds Site IDs the URL belongs to.
         * @param {String} url       URL to treat.
         * @return {Object[]}        Promise resolved with the list of actions.
         *                           See {@link $mmContentLinksDelegate#registerLinkHandler}.
         */
        self.getActions = function(siteIds, url) {
            // Check it's a grade URL.
            if (typeof self.handles(url) != 'undefined') {
                var params = $mmUtil.extractUrlParams(url);
                if (typeof params.id != 'undefined') {
                    var courseId = parseInt(params.id, 10);
                    // Pass false because all sites should have the same siteurl.
                    return $mmContentLinksHelper.filterSupportedSites(siteIds, isEnabled, false, courseId).then(function(ids) {
                        if (!ids.length) {
                            return [];
                        } else {
                            // Return actions.
                            return [{
                                message: 'mm.core.view',
                                icon: 'ion-eye',
                                sites: ids,
                                action: function(siteId) {
                                    var stateParams = {
                                        course: {id: courseId},
                                        userid: parseInt(params.userid, 10)
                                    };
                                    $mmContentLinksHelper.goInSite('site.grades', stateParams, siteId);
                                }
                            }];
                        }
                    });
                }
            }
            return [];
        };

        /**
         * Check if the URL is handled by this handler. If so, returns the URL of the site.
         *
         * @param  {String} url URL to check.
         * @return {String}     Site URL. Undefined if the URL doesn't belong to this handler.
         */
        self.handles = function(url) {
            var position = url.indexOf('/grade/report/user/index.php');
            if (position > -1) {
                return url.substr(0, position);
            }
        };

        return self;
    };

    return self;
});
