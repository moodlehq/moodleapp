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
 * Controller to handle activity grades.
 *
 * @module mm.core.grades
 * @ngdoc controller
 * @name mmGradesGradeCtrl
 */
.controller('mmGradesGradeCtrl', function($scope, $stateParams, $mmUtil, $mmGrades, $mmSite, $mmGradesHelper, $log) {

    $log = $log.getInstance('mmGradesGradeCtrl');

    var courseId = $stateParams.courseid,
        userId = $stateParams.userid || $mmSite.getUserId();

    function fetchGrade() {
        return $mmGrades.getGradesTable(courseId, userId).then(function(table) {
            $scope.grade = $mmGradesHelper.getGradeRow(table, $stateParams.gradeid);
        }, function(message) {
            $mmUtil.showErrorModal(message);
            $scope.errormessage = message;
        });
    }


    fetchGrade().finally(function() {
        $scope.gradeLoaded = true;
    });

    $scope.refreshGrade = function() {
        fetchGrade().finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    $scope.refreshGrade = function() {
        $mmGrades.invalidateGradesTableData(courseId, userId).finally(function() {
            fetchGrade().finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        });
    };
});
