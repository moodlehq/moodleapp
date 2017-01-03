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
 * @name mmUserProfileCtrl
 */
.controller('mmUserProfileCtrl', function($scope, $stateParams, $mmUtil, $mmUser, $mmUserDelegate, $mmSite, $translate, $mmCourses,
            $q, $mmEvents, $mmFileUploaderHelper, $mmSitesManager, mmUserEventProfileRefreshed, mmUserProfilePictureUpdated,
            mmUserProfileHandlersTypeNewPage, mmUserProfileHandlersTypeCommunication, mmUserProfileHandlersTypeAction) {

    $scope.courseId = $stateParams.courseid;
    $scope.userId   = $stateParams.userid;

    function fetchUserData() {
        return $mmUser.getProfile($scope.userId, $scope.courseId).then(function(user) {

            user.address = $mmUser.formatAddress("", user.city, user.country);
            user.roles = $mmUser.formatRoleList(user.roles);

            $scope.user = user;
            $scope.title = user.fullname;

            $scope.isLoadingHandlers = true;
            $mmUserDelegate.getProfileHandlersFor(user, $scope.courseId).then(function(handlers) {
                $scope.actionHandlers = [];
                $scope.newPageHandlers = [];
                $scope.communicationHandlers = [];
                angular.forEach(handlers, function(handler) {
                    switch (handler.type) {
                        case mmUserProfileHandlersTypeCommunication:
                            $scope.communicationHandlers.push(handler);
                            break;
                        case mmUserProfileHandlersTypeAction:
                            $scope.actionHandlers.push(handler);
                            break;
                        case mmUserProfileHandlersTypeNewPage:
                        default:
                            $scope.newPageHandlers.push(handler);
                            break;
                    }
                });
            }).finally(function() {
                $scope.isLoadingHandlers = false;
            });
        }, function(message) {
            if (message) {
                $mmUtil.showErrorModal(message);
            }
            return $q.reject();
        });
    }

    fetchUserData().then(function() {
        // Add log in Moodle.
        return $mmSite.write('core_user_view_user_profile', {
            userid: $scope.userId,
            courseid: $scope.courseId
        }).catch(function(error) {
            $scope.isDeleted = error === $translate.instant('mm.core.userdeleted');
        });
    }).finally(function() {
        $scope.userLoaded = true;
    });

    obsRefreshed = $mmEvents.on(mmUserEventProfileRefreshed, function(data) {
        if (typeof data.user != "undefined") {
            $scope.user.email = data.user.email;
            $scope.user.address = $mmUser.formatAddress("", data.user.city, data.user.country);
        }
    });

    $scope.refreshUser = function() {
        var promises = [];

        promises.push($mmUser.invalidateUserCache($scope.userId));
        promises.push($mmCourses.invalidateUserNavigationOptions());
        promises.push($mmCourses.invalidateUserAdministrationOptions());

        $q.all(promises).finally(function() {
            fetchUserData().finally(function() {
                $mmEvents.trigger(mmUserEventProfileRefreshed, {courseid: $scope.courseId, userid: $scope.userId,
                    user: $scope.user});
                $scope.$broadcast('scroll.refreshComplete');
            });
        });
    };

    // Allow to change the profile image only in the app profile page.
    $scope.canChangeProfilePicture =
        (!$scope.courseId ||$scope.courseId == ($mmSite.getInfo().siteid || 1)) &&
        $scope.userId == $mmSite.getUserId() &&
        $mmSite.canUploadFiles() &&
        $mmSite.wsAvailable('core_user_update_picture');

    $scope.changeProfilePicture = function() {
        var maxSize = -1;
        var title = $translate.instant('mm.user.newpicture');
        var filterMethods = ['album', 'camera'];

        return $mmFileUploaderHelper.selectAndUploadFile(maxSize, title, filterMethods).then(function(result) {
            return $mmUser.changeProfilePicture(result.itemid, $scope.userId).then(function(profileimageurl) {
                $mmEvents.trigger(mmUserProfilePictureUpdated, {userId: $scope.userId, picture: profileimageurl});
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

    $scope.$on('$destroy', function() {
        obsRefreshed && obsRefreshed.off && obsRefreshed.off();
    });
});
