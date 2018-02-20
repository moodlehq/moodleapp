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

angular.module('mm.core.courses')

/**
 * Course List Item directive.
 *
 * Display a course list item.
 *
 * @module mm.core.courses
 * @ngdoc directive
 * @name mmCourseListItem
 * @description
 *
 * This directive is meant to display an item for a list of courses.
 *
 * @example
 *
 * <mm-course-list-item course="course"></mm-course-list-item>
 */
.directive('mmCourseListItem', function($mmCourses, $translate) {
    return {
        restrict: 'E',
        templateUrl: 'core/components/courses/templates/courselistitem.html',
        scope: {
            course: '=',
        },
        link: function(scope) {
            var course = scope.course;

            return $mmCourses.getUserCourse(course.id).then(function() {
                course.isEnrolled = true;
            }).catch(function() {
                course.isEnrolled = false;
                course.enrollment = [];


                angular.forEach(course.enrollmentmethods, function(instance) {
                    if (instance === 'self') {
                        course.enrollment.push({
                            name: $translate.instant('mm.courses.selfenrolment'),
                            icon: 'ion-unlocked'
                        });
                    } else if (instance === 'guest') {
                        course.enrollment.push({
                            name: $translate.instant('mm.courses.allowguests'),
                            icon: 'ion-person'
                        });
                    } else if (instance === 'paypal') {
                        course.enrollment.push({
                            name: $translate.instant('mm.courses.paypalaccepted'),
                            img: 'img/icons/paypal.png'
                        });
                    }
                });

                if (course.enrollment.length == 0) {
                    course.enrollment.push({
                        name: $translate.instant('mm.courses.notenrollable'),
                        icon: 'ion-locked'
                    });
                }
            });
        }
    };
});
