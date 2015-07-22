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
.controller('mmaMessagesIndexCtrl', function($scope, $mmEvents, $ionicPlatform, $ionicTabsDelegate,
            mmaMessagesDiscussionLoadedEvent, mmaMessagesDiscussionLeftEvent) {
    // Listen for discussion loaded event to show user profile link in tablet view.
    var obsLoaded = $mmEvents.on(mmaMessagesDiscussionLoadedEvent, function(userId) {
        $scope.profileLink = $ionicPlatform.isTablet() && $ionicTabsDelegate.selectedIndex() == 0;
        $scope.userId = userId;
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

