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
.controller('mmCoursesListCtrl', function($scope, $log, $mmCourses, $timeout, $mmCoursesDelegate, $mmUtil, $mmEvents, $mmSite,
            mmCoursesEventMyCoursesUpdated, mmCoursesEventMyCoursesRefreshed) {

    $scope.searchEnabled = $mmCourses.isSearchCoursesAvailable();
    $scope.areNavHandlersLoadedFor = $mmCoursesDelegate.areNavHandlersLoadedFor;
    $scope.filter = {};
    $scope.courses;
    $scope.selectedCategory = 0;
    $scope.distinct = [{'categoryID':0, 'categoryName':"All Categories"}];
    $scope.unique = {};
    $scope.browsedCourses = [];
    $scope.allCourses = [];

    // Convenience function to fetch courses.
    function fetchCourses(refresh) {
        return $mmCourses.getUserCourses().then(function(courses) {
            $scope.allCourses = courses;
            $scope.courses = $scope.allCourses;
            angular.forEach(courses, function(course) {
                course._handlers = $mmCoursesDelegate.getNavHandlersFor(course.id, refresh);
            });
            $scope.filter.filterText = ''; // Filter value MUST be set after courses are shown.

            $scope.browseCategory();
        }, function(error) {
            if (typeof error != 'undefined' && error !== '') {
                $mmUtil.showErrorModal(error);
            } else {
                $mmUtil.showErrorModal('mm.courses.errorloadcourses', true);
            }
        });
    }
    fetchCourses().finally(function() {
        $scope.coursesLoaded = true;
    });

    $scope.refreshCourses = function() {
        $mmEvents.trigger(mmCoursesEventMyCoursesRefreshed);
        $mmCourses.invalidateUserCourses().finally(function() {
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

    $scope.browseCategory = function(){
        for( var i in $scope.allCourses ){
            if( typeof($scope.unique[$scope.allCourses[i].category]) == "undefined"){
                $mmCourses.search($scope.allCourses[i].shortname).then(function(response) {
                    //List will always contain one object, therefore we get the first course object from list
                    var arr = {};
                    arr['categoryID'] = response.courses[0].categoryid;
                    arr['categoryName'] = response.courses[0].categoryname;
                    $scope.distinct.push(arr);
                }).catch(function(message) {
                    $scope.canLoadMore = false;
                    if (message) {
                        $mmUtil.showErrorModal(message);
                    } else {
                        $mmUtil.showErrorModal('mm.courses.errorsearching', true);
                    }
                    return $q.reject();
                });

            }
            $scope.unique[$scope.allCourses[i].category] = 0;
        }
    };

    $scope.showCategory = function(uniqueCategory){
        if(uniqueCategory == 0) {
            $scope.courses = $scope.allCourses;
            return;
        }
        $scope.browsedCourses = [];

        for( var i in $scope.allCourses){
            if($scope.allCourses[i].category == uniqueCategory){
              $scope.browsedCourses.push($scope.allCourses[i]);
            }
        }
        $scope.courses = $scope.browsedCourses;
    }
});
