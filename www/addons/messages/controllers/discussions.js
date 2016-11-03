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
.controller('mmaMessagesDiscussionsCtrl', function($scope, $mmUtil, $mmaMessages, $rootScope, $mmEvents, $mmSite,
            $translate, $ionicScrollDelegate, $ionicSideMenuDelegate, mmCoreSplitViewLoad, mmaMessagesNewMessageEvent) {
    var newMessagesObserver,
        siteId = $mmSite.getId(),
        discussions;

    $scope.canDelete = $mmaMessages.canDeleteDiscussion();
    $scope.loaded = false;

    var discussionOptionsWidth;
    var swiping = false;
    var pulling = false;
    var swipeStartOffset;
    var swipeOffset = 0;

    function fetchDiscussions() {
        return $mmaMessages.getDiscussions().then(function(discs) {
            discussions = discs;

            // Convert to an array for sorting.
            var array = [];
            angular.forEach(discussions, function(v) {
                array.push(v);
            });
            $scope.discussions = array;
        }, function(error) {
            if (typeof error === 'string') {
                $mmUtil.showErrorModal(error);
            } else {
                $mmUtil.showErrorModal('mma.messages.errorwhileretrievingdiscussions', true);
            }
        });
    }

    function refreshData() {
        return $mmaMessages.invalidateDiscussionsCache().then(function() {
            return fetchDiscussions();
        });
    }

    $scope.refresh = function() {
        refreshData().finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    fetchDiscussions().finally(function() {
        $scope.loaded = true;
        // Tell mm-split-view that it can load the first link now in tablets. We need to do it
        // like this because the directive doesn't have access to $scope.loaded variable (because of tabs).
        $rootScope.$broadcast(mmCoreSplitViewLoad);
    });

    newMessagesObserver = $mmEvents.on(mmaMessagesNewMessageEvent, function(data) {
        var discussion;

        if (data && data.siteid == siteId && data.userid) {
            discussion = discussions[data.userid];

            if (typeof discussion == 'undefined') {
                // It's a new discussion. Refresh list.
                $scope.loaded = false;
                refreshData().finally(function() {
                    $scope.loaded = true;
                });
            } else {
                // An existing discussion has a new message, update the last message.
                discussion.message.message = data.message;
                discussion.message.timecreated = data.timecreated;
            }
        }
    });

    $scope.$on('$destroy', function() {
        if (newMessagesObserver && newMessagesObserver.off) {
            newMessagesObserver.off();
        }
    });

    $scope.onDragStart = function(event) {
        var element = angular.element(event.currentTarget);
        var optionsElement = event.currentTarget.parentElement.getElementsByClassName('mma-messages-discussions-options')[0];
        discussionOptionsWidth = optionsElement.clientWidth;

        var rightStr = element.css('right');
        if (rightStr) {
            var rightStrPx = rightStr.substr(0, rightStr.length - 'px'.length); // Remove 'px' from value (e.g. 10px => 10)
            swipeStartOffset = parseInt(rightStrPx, 10);
        } else {
            swipeStartOffset = 0;
        }
    };

    $scope.onDrag = function(event) {
        var horizontalMovement = event.gesture.center.pageX - event.gesture.startEvent.center.pageX;

        if (!pulling && !swiping) {
            var verticalMovement = event.gesture.center.pageY - event.gesture.startEvent.center.pageY;

            if (Math.abs(horizontalMovement) > Math.abs(verticalMovement)) {
                swiping = true;
                $ionicScrollDelegate.freezeScroll(true);
            } else if (Math.abs(verticalMovement) > 0) {
                pulling = true;
            }
        }

        if (swiping) {
            swipeOffset = swipeStartOffset - horizontalMovement;

            if (swipeOffset > 0) {
                $ionicSideMenuDelegate.canDragContent(false);
            }

            var element = angular.element(event.currentTarget);

            if (swipeOffset >= discussionOptionsWidth) {
                element.css('right', discussionOptionsWidth + 'px');
            } else if (swipeOffset < 0) {
                element.css('right', '0px');
            } else {
                element.css('right', swipeOffset + 'px');
            }
        }
    };

    $scope.onDragStop = function(event) {
        var element = angular.element(event.currentTarget);

        if (swipeOffset >= discussionOptionsWidth / 2) {
            element.css('right', discussionOptionsWidth + 'px');
        } else {
            element.css('right', '0px');
        }

        if (swiping) {
            $ionicScrollDelegate.freezeScroll(false);
            $ionicSideMenuDelegate.canDragContent(true);
        }

        swiping = false;
        pulling = false;
    };

    $scope.deleteDiscussion = function(discussion) {
        var langKey = 'mma.messages.deletediscussionconfirmation';
        $mmUtil.showConfirm($translate(langKey)).then(function() {
            var modal = $mmUtil.showModalLoading('mm.core.deleting', true);
            $mmaMessages.deleteDiscussion(discussion).then(function() {
                $scope.discussions.splice($scope.discussions.indexOf(discussion), 1); // Remove discussion from the list without having to wait for re-fetch.
                fetchDiscussions(); // Re-fetch discussions to update cached data.
            }).catch(function(error) {
                if (typeof error === 'string') {
                    $mmUtil.showErrorModal(error);
                } else {
                    $mmUtil.showErrorModal('mma.messages.errordeletediscussion', true);
                }
            }).finally(function() {
                modal.dismiss();
            });
        });
    };
});

