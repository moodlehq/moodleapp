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
 * Controller to handle a competency learning plan.
 *
 * @module mm.addons.competency
 * @ngdoc controller
 * @name mmaLearningPlanCtrl
 */
.controller('mmaLearningPlanCtrl', function($scope, $stateParams, $mmaCompetency, $mmUtil, $translate,
    mmaCompetencyStatusDraft, mmaCompetencyStatusActive, mmaCompetencyStatusComplete, mmaCompetencyStatusWaitingForReview,
    mmaCompetencyStatusInReview, $state, $ionicPlatform, $q, $mmaCompetencyHelper) {

    var planId = parseInt($stateParams.id);

    // Convenience function that fetches the event and updates the scope.
    function fetchLearningPlan() {
        return $mmaCompetency.getLearningPlan(planId).then(function(plan) {
            var statusName, userId;

            plan.plan.statusname = getStatusName(plan.plan.status);

            userId = plan.plan.userid;
            // Get the user profile image.
            $mmaCompetencyHelper.getProfile(userId).then(function(user) {
                $scope.user = user;
            });

            $scope.plan = plan;
        }, function(message) {
            if (message) {
                $mmUtil.showErrorModal(message);
            } else {
                $mmUtil.showErrorModal('Error getting learning plan data.');
            }
            return $q.reject();
        });
    }

    $scope.gotoCompetency = function(competencyId) {
        if ($ionicPlatform.isTablet()) {
            // Show split view on tablet.
            $state.go('site.competencies', {pid: planId, compid: competencyId});
        } else {
            $state.go('site.competency', {planid: planId, competencyid: competencyId});
        }
    };

    // Convenience function to get the status name translated
    function getStatusName(status) {
        var statusTranslateName;
        switch (status) {
            case mmaCompetencyStatusDraft:
                statusTranslateName = 'draft';
                break;
            case mmaCompetencyStatusInReview:
                statusTranslateName = 'inreview';
                break;
            case mmaCompetencyStatusWaitingForReview:
                statusTranslateName = 'waitingforreview';
                break;
            case mmaCompetencyStatusActive:
                statusTranslateName = 'active';
                break;
            case mmaCompetencyStatusComplete:
                statusTranslateName = 'complete';
                break;
            default:
                // We can use the current status name.
                return status;
        }
        return $translate.instant('mma.competency.planstatus' + statusTranslateName);
    }

    // Convenience function to refresh all the data.
    function refreshAllData() {
        return $mmaCompetency.invalidateLearningPlan(planId).finally(function() {
            return fetchLearningPlan();
        });
    }

    fetchLearningPlan().finally(function() {
        $scope.planLoaded = true;
    });

    // Pull to refresh.
    $scope.refreshLearningPlan = function() {
        refreshAllData().finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };
});
