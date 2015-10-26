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
 * Controller to handle view a course that was searched.
 *
 * @module mm.core.courses
 * @ngdoc controller
 * @name mmCoursesViewResultCtrl
 */
.controller('mmCoursesViewResultCtrl', function($scope, $stateParams, $mmCourses, $mmCoursesDelegate,
            mmCoursesSearchComponent) {

    var course = $stateParams.course || {},
        storedCourse = $mmCourses.getStoredCourse(course.id);

    $scope.course = course;
    $scope.title = course.fullname;
    $scope.component = mmCoursesSearchComponent;

    // Convenience function to get course. We use this to determine if a user can see the course or not.
    function getCourse(refresh) {
        var promise;

        if (storedCourse) {
            // The user is enrolled in the course. We use getUserCourses because getCourse doesn't work for students.
            promise = $mmCourses.getUserCourses(refresh).then(function(courses) {
                if (courses && courses.length > 0) {
                    return courses[0];
                }
                return storedCourse;
            }, function() {
                return storedCourse;
            });
        } else {
            // User not enrolled in the course.
            promise = $mmCourses.getCourse(course.id);
        }

        return promise.then(function(c) {
            // Success retrieving the course, we can assume the user has permissions to view it.
            course.fullname = c.fullname || course.fullname;
            course.summary = c.summary || course.summary;
            course._handlers = $mmCoursesDelegate.getNavHandlersFor(course.id, refresh);
        });
    }

    getCourse().finally(function() {
        $scope.courseLoaded = true;
    });

    $scope.doRefresh = function() {
        $mmCourses.invalidateCourse(course.id).finally(function() {
            getCourse(true).finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        });
    };
});
