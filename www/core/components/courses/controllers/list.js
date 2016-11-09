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
 * Controller to handle the courses list.
 *
 * @module mm.core.courses
 * @ngdoc controller
 * @name mmCoursesListCtrl
 */
.controller('mmCoursesListCtrl', function($scope, $mmCourses, $mmCoursesDelegate, $mmUtil, $mmEvents, $mmSite, $q,
            mmCoursesEventMyCoursesUpdated, mmCoursesEventMyCoursesRefreshed) {

    $scope.searchEnabled = $mmCourses.isSearchCoursesAvailable();
    $scope.areNavHandlersLoadedFor = $mmCoursesDelegate.areNavHandlersLoadedFor;
    $scope.filter = {};

    // Convenience function to fetch courses.
    function fetchCourses(refresh) {
        return $mmCourses.getUserCourses().then(function(courses) {
            $scope.courses = courses;
            $scope.filter.filterText = ''; // Filter value MUST be set after courses are shown.

            return loadCoursesNavHandlers(refresh);
        }, function(error) {
            if (typeof error != 'undefined' && error !== '') {
                $mmUtil.showErrorModal(error);
            } else {
                $mmUtil.showErrorModal('mm.courses.errorloadcourses', true);
            }
        });
    }

    // Convenience function to load the handlers of each course.
    function loadCoursesNavHandlers(refresh) {
        var promises = [],
            navOptions,
            admOptions,
            courseIds = $scope.courses.map(function(course) {
                return course.id;
            });

        // Get user navigation and administration options to speed up handlers loading.
        promises.push($mmCourses.getUserNavigationOptions(courseIds).catch(function() {
            // Couldn't get it, return empty options.
            return {};
        }).then(function(options) {
            navOptions = options;
        }));

        promises.push($mmCourses.getUserAdministrationOptions(courseIds).catch(function() {
            // Couldn't get it, return empty options.
            return {};
        }).then(function(options) {
            admOptions = options;
        }));

        return $q.all(promises).then(function() {
            angular.forEach($scope.courses, function(course) {
                course._handlers = $mmCoursesDelegate.getNavHandlersFor(
                            course.id, refresh, navOptions[course.id], admOptions[course.id]);
            });
        });
    }

    fetchCourses().finally(function() {
        $scope.coursesLoaded = true;
    });

    $scope.refreshCourses = function() {
        var promises = [];

        $mmEvents.trigger(mmCoursesEventMyCoursesRefreshed);

        promises.push($mmCourses.invalidateUserCourses());
        promises.push($mmCourses.invalidateUserNavigationOptions());
        promises.push($mmCourses.invalidateUserAdministrationOptions());

        $q.all(promises).finally(function() {
            fetchCourses(true).finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        });
    };

    $mmEvents.on(mmCoursesEventMyCoursesUpdated, function(siteid) {
        if (siteid == $mmSite.getId()) {
            fetchCourses();
        }
    });
});
