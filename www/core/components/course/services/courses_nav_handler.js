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

angular.module('mm.core.course')

/**
 * Courses nav handler.
 *
 * @module mm.core.course
 * @ngdoc service
 * @name $mmCourseCoursesNavHandler
 */
.factory('$mmCourseCoursesNavHandler', function() {
    return {

        /**
         * Check if handler is enabled.
         *
         * @return {Boolean} True if handler is enabled, false otherwise.
         */
        isEnabled: function() {
            return true;
        },

        /**
         * Check if handler is enabled for this course.
         *
         * @param {Number} courseId   Course ID.
         * @param {Object} accessData Type of access to the course: default, guest, ...
         * @return {Boolean}          True if handler is enabled, false otherwise.
         */
        isEnabledForCourse: function() {
            return true;
        },

        /**
         * Get the controller.
         *
         * @param {Number} courseId Course ID.
         * @return {Object}         Controller.
         */
        getController: function(courseId) {
            return function($scope, $state) {
                $scope.icon = 'ion-briefcase';
                $scope.title = 'mm.course.contents';
                $scope.class = 'mm-course-handler';

                $scope.action = function(e, course) {
                    $state.go('site.mm_course', {courseid: course.id});
                    e.preventDefault();
                    e.stopPropagation();
                };
            };
        }
    };
});
