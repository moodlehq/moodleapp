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
 * Controller to handle a competency in plan.
 *
 * @module mm.addons.competency
 * @ngdoc controller
 * @name mmaCompetencyCtrl
 */
.controller('mmaCompetencyCtrl', function($scope, $stateParams, $mmaCompetency, $mmUtil, $translate, $q, $mmSite,
    mmaCompetencyReviewStatusIdle, mmaCompetencyReviewStatusInReview, mmaCompetencyReviewStatusWaitingForReview) {

    var competencyId = parseInt($stateParams.competencyid),
        planId = parseInt($stateParams.planid) || false,
        courseId = parseInt($stateParams.courseid) || false,
        userId = parseInt($stateParams.userid) || false,
        planStatus = false;

    // Convenience function that fetches the event and updates the scope.
    function fetchCompetency() {

        if (planId) {
            planStatus = false;
            promise = $mmaCompetency.getCompetencyInPlan(planId, competencyId);
        } else if (courseId){
            promise = $mmaCompetency.getCompetencyInCourse(courseId, competencyId, userId);
        } else {
            promise = $q.reject();
        }

        return promise.then(function(competency) {

            if (planId) {
                planStatus = competency.plan.status;
                competency.usercompetencysummary.usercompetency.statusname = getStatusName(competency.usercompetencysummary.usercompetency.status);
            } else {
                competency.usercompetencysummary.usercompetency = competency.usercompetencysummary.usercompetencycourse;
                $scope.coursemodules = competency.coursemodules;
            }

            if (competency.usercompetencysummary.user.id != $mmSite.getUserId()) {
                competency.usercompetencysummary.user.profileimageurl = competency.usercompetencysummary.user.profileimageurl
                    || true;

                // Get the user profile image from the returned object.
                $scope.user = competency.usercompetencysummary.user;
            }

            angular.forEach(competency.usercompetencysummary.evidence, function(evidence) {
                if (evidence.descidentifier) {
                    evidence.description = $translate.instant('mma.competency.' + evidence.descidentifier, {a: evidence.desca});
                }
            });

            $scope.competency = competency.usercompetencysummary;

        }, function(message) {
            if (message) {
                $mmUtil.showErrorModal(message);
            } else {
                $mmUtil.showErrorModal('Error getting competency data.');
            }
            return $q.reject();
        });
    }

    // Convenience function to get the review status name translated
    function getStatusName(status) {
        var statusTranslateName;
        switch (status) {
            case mmaCompetencyReviewStatusIdle:
                statusTranslateName = 'idle';
                break;
            case mmaCompetencyReviewStatusInReview:
                statusTranslateName = 'inreview';
                break;
            case mmaCompetencyReviewStatusWaitingForReview:
                statusTranslateName = 'waitingforreview';
                break;
            default:
                // We can use the current status name.
                return status;
        }
        return $translate.instant('mma.competency.usercompetencystatus_' + statusTranslateName);
    }

    // Convenience function to refresh all the data.
    function refreshAllData() {
        var promise;

        if (planId) {
            promise =  $mmaCompetency.invalidateCompetencyInPlan(planId, competencyId);
        } else {
            promise = $mmaCompetency.invalidateCompetencyInCourse(courseId, competencyId);
        }
        return promise.finally(function() {
            return fetchCompetency();
        });
    }

    fetchCompetency().then(function() {
        if (planId) {
            $mmaCompetency.logCompetencyInPlanView(planId, competencyId, planStatus, userId);
        } else {
            $mmaCompetency.logCompetencyInCourseView(courseId, competencyId, userId);
        }
    }).finally(function() {
        $scope.competencyLoaded = true;
    });

    // Pull to refresh.
    $scope.refreshCompetency = function() {
        refreshAllData().finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };
});
