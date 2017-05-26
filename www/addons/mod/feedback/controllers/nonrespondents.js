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
 * Feedback non respondents controller.
 *
 * @module mm.addons.mod_feedback
 * @ngdoc controller
 * @name mmaModFeedbackNonRespondentsCtrl
 */
.controller('mmaModFeedbackNonRespondentsCtrl', function($scope, $stateParams, $mmaModFeedback, $mmUtil, $q, $mmText, $translate,
        mmaModFeedbackComponent, $mmGroups, $mmaModFeedbackHelper, $ionicHistory) {
    var module = $stateParams.module || {},
        courseId = $stateParams.courseid,
        page = 0,
        feedback;

    $scope.moduleUrl = module.url;
    $scope.refreshIcon = 'spinner';
    $scope.component = mmaModFeedbackComponent;
    $scope.componentId = module.id;
    $scope.selectedGroup = $stateParams.group || 0;
    $scope.canLoadMore = false;
    $scope.users = [];
    $scope.total = 0;

    // Convenience function to get feedback data.
    function fetchFeedbackRespondentsData(refresh) {
        return $mmaModFeedback.getFeedback(courseId, module.id).then(function(feedbackData) {
            feedback = feedbackData;

            $scope.description = feedback.intro;

            $scope.feedbackId = feedback.id;
            page = 0;
            $scope.total = 0;
            $scope.users = [];

            // Get groups (only for teachers).
            return $mmGroups.getActivityGroupInfo(feedback.coursemodule).then(function(groupInfo) {
                $scope.groupInfo = groupInfo;
                return loadGroupUsers($scope.selectedGroup);
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
     * @param  {Number} [groupId]   If defined it will change group if not, it will load more users for the same group.
     * @return {Promise}            Resolved with the users loaded.
     */
    function loadGroupUsers(groupId) {
        if (typeof groupId == "undefined") {
            page++;
            $scope.loadingMore = true;
        } else {
            $scope.selectedGroup = groupId;
            page = 0;
            $scope.total = 0;
            $scope.users = [];
            $scope.feedbackLoaded = false;
        }

        return $mmaModFeedbackHelper.getNonRespondents(feedback.id, $scope.selectedGroup, page).then(function(response) {
            $scope.total = response.total;

            if ($scope.users.length < response.total) {
                $scope.users = $scope.users.concat(response.users);
            }

            $scope.canLoadMore = $scope.users.length < response.total;

            return response;
        }).finally(function() {
            $scope.loadingMore = false;
            $scope.feedbackLoaded = true;
        });
    }

    // Load group attempts.
    $scope.loadGroupUsers = function(groupId) {
        loadGroupUsers(groupId).catch(function(message) {
            $mmUtil.showErrorModalDefault(message, 'mm.course.errorgetmodule', true);
        });
    };

    // Convenience function to refresh all the data.
    function refreshAllData() {
        var promises = [];
        promises.push($mmaModFeedback.invalidateFeedbackData(courseId));
        if (feedback) {
            promises.push($mmaModFeedback.invalidateNonRespondentsData(feedback.id));
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