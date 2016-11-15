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
 * Controller to handle course grades.
 *
 * @module mm.addons.grades
 * @ngdoc controller
 * @name mmaGradesTableCtrl
 */
.controller('mmaGradesTableCtrl', function($scope, $stateParams, $mmUtil, $mmaGrades, $mmSite, $mmaGradesHelper, $state) {

    var course = $stateParams.course || {},
        courseId = $stateParams.courseid || course.id,
        userId = $stateParams.userid || $mmSite.getUserId(),
        forcePhoneView = $stateParams.forcephoneview || false;

    $scope.forcePhoneView = !!forcePhoneView;

    function fetchGrades() {
        return $mmaGrades.getGradesTable(courseId, userId).then(function(table) {
            table = $mmaGradesHelper.formatGradesTable(table, forcePhoneView);
            return $mmaGradesHelper.translateGradesTable(table).then(function(table) {
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
        $mmaGrades.invalidateGradesTableData(courseId, userId).finally(function() {
            fetchGrades().finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        });
    };
});
