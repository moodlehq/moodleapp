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
 * Controller to handle courses grades (side menu option).
 *
 * @module mm.addons.grades
 * @ngdoc controller
 * @name mmaGradesCoursesGradesCtrl
 */
.controller('mmaGradesCoursesGradesCtrl', function($scope, $mmUtil, $mmaCoursesGrades, $mmSite, $log) {

    $log = $log.getInstance('mmaGradesCoursesGradesCtrl');
    $scope.userid = $mmSite.getUserId();
    $scope.grades = [];

    function fetchCoursesGrades() {
        return $mmaCoursesGrades.getGrades().then(function(grades) {
            return $mmaCoursesGrades.getGradesCourseData(grades).then(function(grades) {
               $scope.grades = grades;
            });
        }, function(message) {
            $mmUtil.showErrorModal(message);
        });
    }

    fetchCoursesGrades().then(function() {
        // Add log in Moodle.
        var courseId = $mmSite.getInfo().siteid || 1;
        $mmSite.write('gradereport_overview_view_grade_report', {
            courseid: courseId,
        });
    }).finally(function() {
        $scope.gradesLoaded = true;
    });

    $scope.refreshGrades = function() {
        $mmaCoursesGrades.invalidateCoursesGradesData().finally(function() {
            fetchCoursesGrades().finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        });
    };
});
