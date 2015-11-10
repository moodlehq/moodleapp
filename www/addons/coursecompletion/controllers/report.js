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

angular.module('mm.addons.coursecompletion')

/**
 * Controller to handle course completion report.
 *
 * @module mm.addons.coursecompletion
 * @ngdoc controller
 * @name mmaCourseCompletionReportCtrl
 */
.controller('mmaCourseCompletionReportCtrl', function($scope, $stateParams, $mmUtil, $mmaCourseCompletion, $mmSite,
            $ionicPlatform) {

    var course = $stateParams.course,
        userid = $stateParams.userid || $mmSite.getUserId();

    $scope.isTablet = $ionicPlatform.isTablet();

    function fetchCompletion() {
        return $mmaCourseCompletion.getCompletion(course.id, userid).then(function(completion) {

            completion.statusText = $mmaCourseCompletion.getCompletedStatusText(completion);

            $scope.completion = completion;
            $scope.showSelfComplete = $mmaCourseCompletion.isSelfCompletionAvailable() &&
                                        $mmaCourseCompletion.canMarkSelfCompleted(userid, completion);
        }).catch(function(message) {
            if (message) {
                $mmUtil.showErrorModal(message);
            } else {
                $mmUtil.showErrorModal('mma.coursecompletion.couldnotloadreport', true);
            }
        });
    }

    fetchCompletion().finally(function() {
        $scope.completionLoaded = true;
    });

    // Convenienve function to refresh completion data.
    function refreshCompletion() {
        return $mmaCourseCompletion.invalidateCourseCompletion(course.id, userid).finally(function() {
            return fetchCompletion();
        });
    }

    $scope.refreshCompletion = function() {
        refreshCompletion().finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    $scope.completeCourse = function() {
        var modal = $mmUtil.showModalLoading('mm.core.sending', true);
        $mmaCourseCompletion.markCourseAsSelfCompleted(course.id).then(function() {
            return refreshCompletion();
        }).catch(function(message) {
            $mmUtil.showErrorModal(message);
        }).finally(function() {
            modal.dismiss();
        });
    };
});
