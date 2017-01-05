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

angular.module('mm.addons.competency')

/**
 * Controller to handle competencies of a learning plan.
 *
 * @module mm.addons.competency
 * @ngdoc controller
 * @name mmaCompetenciesListCtrl
 */
.controller('mmaCompetenciesListCtrl', function($scope, $mmaCompetency, $mmUtil, $stateParams, $state, $ionicPlatform, $q,
    $translate, $mmaCompetencyHelper) {

    var planId = parseInt($stateParams.pid) || false,
        courseId = parseInt($stateParams.cid) || false,
        competencyId = parseInt($stateParams.compid);

    $scope.userId = parseInt($stateParams.uid) || false;

    function fetchCompetencies() {
        var promise;

        if (planId) {
            promise = $mmaCompetency.getLearningPlan(planId);
        } else if (courseId){
            promise = $mmaCompetency.getCourseCompetencies(courseId);
        } else {
            promise = $q.reject();
        }

        return promise.then(function(response) {
            if (response.competencycount <= 0) {
                return $q.reject($translate.instant('mma.competency.errornocompetenciesfound'));
            }

            if (planId) {
                $scope.title = response.plan.name;
                $scope.id = response.plan.id;
                $scope.idname = 'planid';
                $scope.userId = response.plan.userid;
            } else {
                $scope.title = $translate.instant('mma.competency.coursecompetencies');
                $scope.id = response.courseid;
                $scope.idname = 'courseid';
            }

            $scope.competencies = response.competencies;
        }).catch(function(message) {
            if (message) {
                $mmUtil.showErrorModal(message);
            } else {
                $mmUtil.showErrorModal('Error getting competencies data.');
            }
            return $q.reject();
        });
    }

    $scope.gotoCompetency = function(competencyId) {
        if (planId) {
            // Show split view on tablet.
            $state.go('site.competency', {planid: planId, competencyid: competencyId});
        } else {
            $state.go('site.competency', {courseid: courseId, competencyid: competencyId, userid: $scope.userId});
        }
    };

    // Convenience function to refresh all the data.
    function refreshAllData() {
        var promise;
        if (planId) {
            promise = $mmaCompetency.invalidateLearningPlan(planId);
        } else {
            promise = $mmaCompetency.invalidateCourseCompetencies(courseId);
        }
        return promise.finally(function() {
            return fetchCompetencies();
        });
    }

    // Convenience function to autoload a competency if competencyId param is set.
    function autoloadCompetency() {
        if (competencyId) {
            if ($ionicPlatform.isTablet()) {
                // Search the position of the section to load.
                angular.forEach($scope.competencies, function(competency, index) {
                    if (competency.competency.id == competencyId) {
                        $scope.competencyToLoad = index + 1;
                    }
                });
            } else {
                $scope.gotoCompetency(competencyId);
            }
        }
    }

    fetchCompetencies().finally(function() {
        autoloadCompetency();
        $scope.competenciesLoaded = true;
    });

    // Pull to refresh.
    $scope.refreshCompetencies = function() {
        refreshAllData().finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };
});
