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
 * Controller to handle course competencies.
 *
 * @module mm.addons.competency
 * @ngdoc controller
 * @name mmaCourseCompetenciesCtrl
 */
.controller('mmaCourseCompetenciesCtrl', function($scope, $stateParams, $mmaCompetency, $mmUtil, $state, $ionicPlatform, $q,
    $mmaCompetencyHelper) {

    var courseId = parseInt($stateParams.courseid);
        userId = parseInt($stateParams.userid) || false;

    // Convenience function that fetches the event and updates the scope.
    function fetchCourseCompetencies() {
        return $mmaCompetency.getCourseCompetencies(courseId).then(function(competencies) {
            $scope.competencies = competencies;

            // Get the user profile image.
            $mmaCompetencyHelper.getProfile(userId).then(function(user) {
                $scope.user = user;
            });
        }, function(message) {
            if (message) {
                $mmUtil.showErrorModal(message);
            } else {
                $mmUtil.showErrorModal('Error getting course competencies data.');
            }
            return $q.reject();
        });
    }

    $scope.gotoCompetency = function(competencyId) {
        if ($ionicPlatform.isTablet()) {
            // Show split view on tablet.
            $state.go('site.competencies', {cid: courseId, compid: competencyId, uid: userId});
        } else {
            $state.go('site.competency', {courseid: courseId, competencyid: competencyId, userid: userId});
        }
    };

    // Convenience function to refresh all the data.
    function refreshAllData() {
        return $mmaCompetency.invalidateCourseCompetencies(courseId).finally(function() {
            return fetchCourseCompetencies();
        });
    }

    fetchCourseCompetencies().finally(function() {
        $scope.competenciesLoaded = true;
    });

    // Pull to refresh.
    $scope.refreshCourseCompetencies = function() {
        refreshAllData().finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };
});
