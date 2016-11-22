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

angular.module('mm.addons.badges')

/**
 * Controller to handle user badges.
 *
 * @module mm.addons.badges
 * @ngdoc controller
 * @name mmaBadgesUserCtrl
 */
.controller('mmaBadgesUserCtrl', function($scope, $mmaBadges, $mmUtil, $stateParams, $q, $mmSite) {

    $scope.courseId = $stateParams.courseid;
    $scope.userId = $stateParams.userid || $mmSite.getUserId();

    function fetchBadges() {

        return $mmaBadges.getUserBadges($scope.courseId, $scope.userId).then(function(badges) {
            $scope.badges = badges;
        }).catch(function(message) {
            if (message) {
                $mmUtil.showErrorModal(message);
            } else {
                $mmUtil.showErrorModal('Error getting badges data.');
            }
            return $q.reject();
        });
    }

    fetchBadges().finally(function() {
        $scope.badgesLoaded = true;
    });

    // Pull to refresh.
    $scope.refreshBadges = function() {
        $mmaBadges.invalidateUserBadges(courseId, userId).finally(function() {
            fetchBadges().finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        });
    };
});
