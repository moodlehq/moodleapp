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
 * Discussions controller.
 *
 * @module mm.addons.messages
 * @ngdoc controller
 * @name mmaMessagesDiscussionsCtrl
 */
.controller('mmaMessagesDiscussionsCtrl', function($q, $state, $scope, $mmUtil, $mmaMessages, $rootScope, $mmEvents,
            mmCoreSplitViewLoad) {
    var observers = [];

    $scope.loaded = false;

    // Set observers to watch for new messages on discussions. If a user sees a new message in a discussion, we'll update
    // the discussion's last message in discussions list.
    function setObservers(discussions) {
        clearObservers();

        angular.forEach(discussions, function(discussion) {
            observers.push($mmEvents.on($mmaMessages.getDiscussionEventName(discussion.message.user), function(data) {
                if (data && data.timecreated > discussion.message.timecreated) {
                    discussion.message.message = data.message;
                    discussion.message.timecreated = data.timecreated;
                }
            }));
        });
    }

    // Clear observers.
    function clearObservers() {
        angular.forEach(observers, function(observer) {
            if (observer && observer.off) {
                observer.off();
            }
        });
    }

    function fetchDiscussions() {
        return $mmaMessages.getDiscussions().then(function(discussions) {
            // Convert to an array for sorting.
            var array = [];
            angular.forEach(discussions, function(v) {
                array.push(v);
            });
            $scope.discussions = array;
            setObservers(array);
        }, function(error) {
            if (typeof error === 'string') {
                $mmUtil.showErrorModal(error);
            } else {
                $mmUtil.showErrorModal('mma.messages.errorwhileretrievingdiscussions', true);
            }
        });
    }

    $scope.refresh = function() {
        $mmaMessages.invalidateDiscussionsCache().then(function() {
            return fetchDiscussions();
        }).finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    fetchDiscussions().finally(function() {
        $scope.loaded = true;
        // Tell mm-split-view that it can load the first link now in tablets. We need to do it
        // like this because the directive doesn't have access to $scope.loaded variable (because of tabs).
        $rootScope.$broadcast(mmCoreSplitViewLoad);
    });

    $scope.$on('$destroy', function() {
        clearObservers();
    });
});

