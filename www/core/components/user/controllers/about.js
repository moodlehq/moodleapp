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

angular.module('mm.core.user')

/**
 * Controller to handle a user about page.
 *
 * @module mm.core.user
 * @ngdoc controller
 * @name mmUserAboutCtrl
 */
.controller('mmUserAboutCtrl', function($scope, $stateParams, $mmUtil, $mmUser, $q, $mmEvents, $mmCourses,
            mmUserEventProfileRefreshed) {

    var courseId = $stateParams.courseid,
        userId   = $stateParams.userid;

    $scope.isAndroid = ionic.Platform.isAndroid();

    function fetchUserData() {
        return $mmUser.getProfile(userId, courseId).then(function(user) {

            if (user.address) {
                user.address = $mmUser.formatAddress(user.address, user.city, user.country);
                user.encodedAddress = encodeURIComponent(user.address);
            }

            $scope.user = user;
            $scope.title = user.fullname;
            $scope.hasContact = user.email || user.phone1 || user.phone2 || user.city || user.country || user.address;
            $scope.hasDetails = user.url || user.interests || (user.customfields && user.customfields.length > 0);
        }, function(message) {
            if (message) {
                $mmUtil.showErrorModal(message);
            }
            return $q.reject();
        });
    }

    fetchUserData().finally(function() {
        $scope.userLoaded = true;
    });

    $scope.refreshUser = function() {
        var promises = [];

        promises.push($mmUser.invalidateUserCache(userId));

        $q.all(promises).finally(function() {
            fetchUserData().finally(function() {
                $mmEvents.trigger(mmUserEventProfileRefreshed, {courseid: courseId, userid: userId, user: $scope.user});
                $scope.$broadcast('scroll.refreshComplete');
            });
        });
    };
});
