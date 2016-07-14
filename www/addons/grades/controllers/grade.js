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
 * Controller to handle activity grades.
 *
 * @module mm.addons.grades
 * @ngdoc controller
 * @name mmaGradesGradeCtrl
 */
.controller('mmaGradesGradeCtrl', function($scope, $stateParams, $mmUtil, $mmaGrades, $mmSite, $mmaGradesHelper, $log,
        $mmContentLinksHelper) {

    $log = $log.getInstance('mmaGradesGradeCtrl');

    var courseId = $stateParams.courseid,
        userId = $stateParams.userid || $mmSite.getUserId();

    function fetchGrade() {
        return $mmaGrades.getGradesTable(courseId, userId).then(function(table) {
            $scope.grade = $mmaGradesHelper.getGradeRow(table, $stateParams.gradeid);
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

    $scope.gotoActivity = function() {
        if ($scope.grade.link) {
            $mmContentLinksHelper.handleLink($scope.grade.link).then(function(treated) {
                if (!treated) {
                    $log.debug('Link not being handled ' + $scope.grade.link + ' opening in browser...');
                    $mmUtil.openInBrowser($scope.grade.link);
                }
            });
        }
    };

    $scope.refreshGrade = function() {
        $mmaGrades.invalidateGradesTableData(courseId, userId).finally(function() {
            fetchGrade().finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        });
    };
});
