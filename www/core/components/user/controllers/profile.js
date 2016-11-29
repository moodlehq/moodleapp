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
 * Controller to handle a user profile page.
 *
 * @module mm.core.user
 * @ngdoc controller
 * @name mmaParticipantsProfileCtrl
 */
.controller('mmUserProfileCtrl', function($scope, $stateParams, $mmUtil, $mmUser, $mmUserDelegate, $mmSite, $q, $translate,
            $mmEvents, $mmCourses, $mmFileUploaderHelper, $mmSitesManager, mmUserEventProfileRefreshed,
            mmUserProfilePictureUpdated) {

    var courseid = $stateParams.courseid,
        userid   = $stateParams.userid;

    $scope.isAndroid = ionic.Platform.isAndroid();
    $scope.plugins = [];

    function fetchUserData() {
        return $mmUser.getProfile(userid, courseid).then(function(user) {

            user.address = $mmUser.formatAddress(user.address, user.city, user.country);
            if (user.address) {
                user.encodedAddress = encodeURIComponent(user.address);
            }

            $mmUser.formatRoleList(user.roles).then(function(roles) {
                user.roles = roles;
            });

            $scope.user = user;
            $scope.title = user.fullname;
            $scope.hasContact = user.email || user.phone1 || user.phone2 || user.city || user.country || user.address;
            $scope.hasCourseDetails = user.roles;
            $scope.hasDetails = user.url || user.interests || (user.customfields && user.customfields.length > 0);

            $scope.isLoadingHandlers = true;
            $mmUserDelegate.getProfileHandlersFor(user, courseid).then(function(handlers) {
                $scope.profileHandlers = handlers;
            }).finally(function() {
                $scope.isLoadingHandlers = false;
            });
        }, function(message) {
            $scope.user = false;
            if (message) {
                $mmUtil.showErrorModal(message);
            }
            return $q.reject();
        });
    }

    fetchUserData().then(function() {
        // Add log in Moodle.
        return $mmSite.write('core_user_view_user_profile', {
            userid: userid,
            courseid: courseid
        }).catch(function(error) {
            $scope.isDeleted = error === $translate.instant('mm.core.userdeleted');
        });
    }).finally(function() {
        $scope.userLoaded = true;
    });

    $scope.refreshUser = function() {
        var promises = [];
        $mmEvents.trigger(mmUserEventProfileRefreshed, {courseid: courseid, userid: userid});

        promises.push($mmUser.invalidateUserCache(userid));
        promises.push($mmCourses.invalidateUserNavigationOptions());
        promises.push($mmCourses.invalidateUserAdministrationOptions());

        $q.all(promises).finally(function() {
            fetchUserData().finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        });
    };

    // Allow to change the profile image only in the app profile page.
    $scope.canChangeProfilePicture =
        (!courseid || courseid == ($mmSite.getInfo().siteid || 1)) &&
        userid == $mmSite.getUserId() &&
        $mmSite.canUploadFiles() &&
        $mmSite.wsAvailable('core_user_update_picture');

    $scope.changeProfilePicture = function() {
        var maxSize = -1;
        var title = $translate.instant('mm.user.newpicture');
        var filterMethods = ['album', 'camera'];

        return $mmFileUploaderHelper.selectAndUploadFile(maxSize, title, filterMethods).then(function(result) {
            return $mmUser.changeProfilePicture(result.itemid, userid).then(function(profileimageurl) {
                $mmEvents.trigger(mmUserProfilePictureUpdated, {userId: userid, picture: profileimageurl});
                $mmSitesManager.updateSiteInfo($mmSite.getId());
                $scope.refreshUser();
            });
        }).catch(function(message) {
            if (message) {
                $mmUtil.showErrorModal(message);
            }
            return $q.reject();
        });
    };

});
