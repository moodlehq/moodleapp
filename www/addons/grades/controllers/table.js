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
.controller('mmaGradesTableCtrl', function($scope, $stateParams, $translate, $mmUtil, $mmaGrades) {

    var course = $stateParams.course || {},
        courseid = course.id;

    function fetchGrades() {
        $translate('mm.core.loading').then(function(str) {
            $mmUtil.showModalLoading(str);
        });

        $mmaGrades.getGradesTable(courseid).then(function(table) {
            $scope.gradesTable = table;
        }, function(message) {
            $mmUtil.showErrorModal(message);
        }).finally(function() {
            $mmUtil.closeModalLoading();
        });
    }
    fetchGrades();
});
