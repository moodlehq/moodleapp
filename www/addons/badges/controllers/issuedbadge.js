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
 * Controller to handle an issued badge.
 *
 * @module mm.addons.badges
 * @ngdoc controller
 * @name mmaBadgesIssuedCtrl
 */
.controller('mmaBadgesIssuedCtrl', function($scope, $stateParams, $mmUtil, $mmaBadges, $mmSite, $q, $mmCourses, $mmUser) {

    $scope.courseId = $stateParams.cid;
    $scope.userId = $stateParams.uid || $mmSite.getUserId();
    var uniqueHash = $stateParams.uniquehash;

    function fetchIssuedBadge() {
        var promises = [],
            promise;

        $scope.currentTime = $mmUtil.timestamp();
        promise = $mmUser.getProfile($scope.userId, $scope.courseId, true).then(function(user) {
            $scope.user = user;
        });
        promises.push(promise);

        promise = $mmaBadges.getUserBadges($scope.courseId, $scope.userId).then(function(badges) {
            angular.forEach(badges, function(badge) {
                if (uniqueHash == badge.uniquehash) {
                    $scope.badge = badge;
                    if (badge.courseid) {
                        return $mmCourses.getUserCourse(badge.courseid, true).then(function(course) {
                            $scope.course = course;
                        }).catch(function() {
                            // Maybe and old deleted course.
                            $scope.course = null;
                        });
                    }
                }
            });
        }).catch(function(message) {
            if (message) {
                $mmUtil.showErrorModal(message);
            } else {
                $mmUtil.showErrorModal('Error getting badge data.');
            }
            return $q.reject();
        });
        promises.push(promise);

        return $q.all(promises);
    }

    fetchIssuedBadge().finally(function() {
        $scope.badgeLoaded = true;
    });

    // Pull to refresh.
    $scope.refreshBadges = function() {
        $mmaBadges.invalidateUserBadges($scope.courseId, $scope.userId).finally(function() {
            fetchIssuedBadge().finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        });
    };

});
