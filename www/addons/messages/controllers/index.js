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

angular.module('mm.addons.messages')

/**
 * Messages index controller.
 *
 * @module mm.addons.messages
 * @ngdoc controller
 * @name mmaMessagesIndexCtrl
 */
.controller('mmaMessagesIndexCtrl', function($scope, $mmEvents, $ionicPlatform, $ionicTabsDelegate, $mmUser,
            mmaMessagesDiscussionLoadedEvent, mmaMessagesDiscussionLeftEvent) {
    // Listen for discussion loaded event to show user profile link in tablet view.
    var obsLoaded = $mmEvents.on(mmaMessagesDiscussionLoadedEvent, function(userId) {
        if ($ionicPlatform.isTablet()) {
            // A discussion was loaded in tablet, get the user image and show the button to the profile.
            $scope.userId = userId;
            $mmUser.getProfile(userId, undefined, true).catch(function() {
                // Couldn't retrieve the image, use a default icon.
                return {
                    profileimageurl: true
                };
            }).then(function(user) {
                // Verify that no other user was loaded while the async call was in progress.
                if ($scope.userId == userId) {
                    // Use a default icon if no image URL available.
                    $scope.profileLink = user.profileimageurl || true;
                }
            });
        }
    });

    // Listen for discussion loaded event to show user profile link in tablet view.
    var obsLeft = $mmEvents.on(mmaMessagesDiscussionLeftEvent, function() {
        $scope.profileLink = false;
    });

    $scope.$on('$destroy', function() {
        if (obsLoaded && obsLoaded.off) {
            obsLoaded.off();
        }
        if (obsLeft && obsLeft.off) {
            obsLeft.off();
        }
    });
});

