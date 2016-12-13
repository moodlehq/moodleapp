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

angular.module('mm.core.grades')

/**
 * Controller to handle course grades.
 *
 * @module mm.core.grades
 * @ngdoc controller
 * @name mmGradesTableCtrl
 */
.controller('mmGradesTableCtrl', function($scope, $stateParams, $mmUtil, $mmGrades, $mmSite, $mmGradesHelper, $state) {

    var course = $stateParams.course || {},
        courseId = $stateParams.courseid || course.id,
        userId = $stateParams.userid || $mmSite.getUserId(),
        forcePhoneView = $stateParams.forcephoneview || false;

    $scope.forcePhoneView = !!forcePhoneView;

    function fetchGrades() {
        return $mmGrades.getGradesTable(courseId, userId).then(function(table) {
            table = $mmGradesHelper.formatGradesTable(table, forcePhoneView);
            return $mmGradesHelper.translateGradesTable(table).then(function(table) {
                $scope.gradesTable = table;
            });
        }, function(message) {
            $mmUtil.showErrorModal(message);
            $scope.errormessage = message;
        });
    }

    fetchGrades().then(function() {
        // Add log in Moodle.
        $mmSite.write('gradereport_user_view_grade_report', {
            courseid: courseId,
            userid: userId
        });
    }).finally(function() {
        $scope.gradesLoaded = true;
    });

    $scope.expandGradeInfo = function(gradeid) {
        if (gradeid) {
            $state.go('site.grade', {
                courseid: courseId,
                userid: userId,
                gradeid: gradeid
            });
        }
    };

    $scope.refreshGrades = function() {
        $mmGrades.invalidateGradesTableData(courseId, userId).finally(function() {
            fetchGrades().finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        });
    };
});
