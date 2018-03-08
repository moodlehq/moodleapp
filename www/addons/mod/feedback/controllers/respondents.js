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

angular.module('mm.addons.mod_feedback')

/**
 * Feedback respondents controller.
 *
 * @module mm.addons.mod_feedback
 * @ngdoc controller
 * @name mmaModFeedbackRespondentsCtrl
 */
.controller('mmaModFeedbackRespondentsCtrl', function($scope, $stateParams, $mmaModFeedback, $mmUtil, $q, $mmText, $translate,
        mmaModFeedbackComponent, $mmGroups, $mmaModFeedbackHelper, $ionicHistory) {
    var module = $stateParams.module ? angular.copy($stateParams.module) : {},
        courseId = $stateParams.courseid,
        page = 0,
        feedback;

    $scope.moduleUrl = module.url;
    $scope.refreshIcon = 'spinner';
    $scope.component = mmaModFeedbackComponent;
    $scope.componentId = module.id;
    $scope.selectedGroup = $stateParams.group || 0;
    $scope.canLoadMoreAnon = false;
    $scope.canLoadMoreNonAnon = false;
    $scope.responses = {
        attempts: [],
        anonattempts: [],
        totalattempts: 0,
        totalanonattempts: 0
    };

    // Convenience function to get feedback data.
    function fetchFeedbackRespondentsData(refresh) {
        return $mmaModFeedback.getFeedback(courseId, module.id).then(function(feedbackData) {
            feedback = feedbackData;

            $scope.description = feedback.intro;

            $scope.feedbackId = feedback.id;
            page = 0;
            $scope.responses.totalattempts = 0;
            $scope.responses.totalanonattempts = 0;
            $scope.responses.attempts = [];
            $scope.responses.anonattempts = [];

            // Get groups (only for teachers).
            return $mmGroups.getActivityGroupInfo(feedback.coursemodule).then(function(groupInfo) {
                $scope.groupInfo = groupInfo;
                return loadGroupAttempts($scope.selectedGroup);
            });
        }).catch(function(message) {
            $mmUtil.showErrorModalDefault(message, 'mm.course.errorgetmodule', true);

            if (!refresh) {
                // Some call failed on first fetch, go back.
                $ionicHistory.goBack();
            }
            return $q.reject();
        });
    }

    /**
     * Load Group responses.
     *
     * @param  {Number} [groupId]   If defined it will change group if not, it will load more attempts for the same group.
     * @return {Promise}            Resolved with the attempts loaded.
     */
    function loadGroupAttempts(groupId) {
        if (typeof groupId == "undefined") {
            page++;
            $scope.loadingMore = true;
        } else {
            $scope.selectedGroup = groupId;
            page = 0;
            $scope.responses.totalattempts = 0;
            $scope.responses.totalanonattempts = 0;
            $scope.responses.attempts = [];
            $scope.responses.anonattempts = [];
            $scope.feedbackLoaded = false;
        }

        return $mmaModFeedbackHelper.getResponsesAnalysis(feedback.id, $scope.selectedGroup, page).then(function(responses) {
            $scope.responses.totalattempts = responses.totalattempts;
            $scope.responses.totalanonattempts = responses.totalanonattempts;

            if ($scope.responses.anonattempts.length < responses.totalanonattempts) {
                $scope.responses.anonattempts = $scope.responses.anonattempts.concat(responses.anonattempts);
            }
            if ($scope.responses.attempts.length < responses.totalattempts) {
                $scope.responses.attempts = $scope.responses.attempts.concat(responses.attempts);
            }

            $scope.canLoadMoreAnon = $scope.responses.anonattempts.length < responses.totalanonattempts;
            $scope.canLoadMoreNonAnon = $scope.responses.attempts.length < responses.totalattempts;

            return responses;
        }).finally(function() {
            $scope.loadingMore = false;
            $scope.feedbackLoaded = true;
        });
    }

    // Load group attempts.
    $scope.loadGroupAttempts = function(groupId) {
        loadGroupAttempts(groupId).catch(function(message) {
            $mmUtil.showErrorModalDefault(message, 'mm.course.errorgetmodule', true);
        });
    };

    // Convenience function to refresh all the data.
    function refreshAllData() {
        var promises = [];
        promises.push($mmaModFeedback.invalidateFeedbackData(courseId));
        if (feedback) {
            promises.push($mmaModFeedback.invalidateResponsesAnalysisData(feedback.id));
            promises.push($mmGroups.invalidateActivityGroupInfo(feedback.coursemodule));
        }
        return $q.all(promises).finally(function() {
            return fetchFeedbackRespondentsData(true);
        });
    }

    fetchFeedbackRespondentsData().finally(function() {
        $scope.refreshIcon = 'ion-refresh';
    });

    // Context Menu Description action.
    $scope.expandDescription = function() {
        $mmText.expandText($translate.instant('mm.core.description'), $scope.description, false, mmaModFeedbackComponent, module.id);
    };

    // Pull to refresh.
    $scope.refreshFeedback = function() {
        if ($scope.feedbackLoaded) {
            $scope.refreshIcon = 'spinner';
            return refreshAllData().finally(function() {
                $scope.refreshIcon = 'ion-refresh';
                $scope.$broadcast('scroll.refreshComplete');
            });
        }
    };

});