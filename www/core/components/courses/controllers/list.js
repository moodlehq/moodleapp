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
.controller('mmCoursesListCtrl', function($scope, $mmCourses, $mmCoursesDelegate, $mmUtil, $translate) {
    $translate('mm.core.loading').then(function(loadingString) {
        $mmUtil.showModalLoading(loadingString);
    });

    $mmCourses.getUserCourses().then(function(courses) {
        $scope.courses = courses;
        $scope.filterText = ''; // Filter value MUST be set after courses are shown.
    }, function(error) {
        if (typeof(error) !== 'undefined' && error != '') {
            $mmUtil.showErrorModal(error);
        } else {
            $mmUtil.showErrorModal('mm.courses.errorloadcourses', true);
        }
    }).finally(function() {
        $mmUtil.closeModalLoading();
    });

    var plugins = $mmCoursesDelegate.getData();
    $scope.hasPlugins = Object.keys(plugins).length;
    $scope.plugins = plugins;
});
