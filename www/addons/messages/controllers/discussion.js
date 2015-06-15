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
 * Discussion controller.
 *
 * @module mm.addons.messages
 * @ngdoc controller
 * @name mmaMessagesDiscussionCtrl
 */
.controller('mmaMessagesDiscussionCtrl', function($scope, $stateParams, $mmApp, $mmaMessages, $mmSite, $timeout,
        $ionicScrollDelegate, mmUserProfileState, $mmUtil, mmaMessagesPollInterval, $interval, $log, $ionicHistory) {

    $log = $log.getInstance('mmaMessagesDiscussionCtrl');

    var userId = $stateParams.userId,
        userFullname = $stateParams.userFullname,
        messagesBeingSent = 0,
        polling,
        backView = $ionicHistory.backView();

    $scope.loaded = false;
    $scope.messages = [];
    $scope.userId = userId;
    $scope.currentUserId = $mmSite.getUserId();
    $scope.profileLink = true;

    if (userFullname) {
        $scope.title = userFullname;
    }

    // Disable the profile button if we're coming from a profile. It is safer to prevent forbid the access
    // to the full profile (we do not know the course ID they came from) as some users cannot view the full
    // profile of other users.
    if (backView && backView.stateName === mmUserProfileState) {
        $scope.profileLink = false;
    }

    $scope.isAppOffline = function() {
        return !$mmApp.isOnline();
    };

    $scope.showDate = function(message, prevMessage) {
        if (!prevMessage) {
            return true;
        }

        var prevDate = new Date(prevMessage.timecreated * 1000);
        prevDate.setMilliseconds(0);
        prevDate.setSeconds(0);
        prevDate.setMinutes(0);
        prevDate.setHours(1);

        var d = new Date(message.timecreated * 1000);
        d.setMilliseconds(0);
        d.setSeconds(0);
        d.setMinutes(0);
        d.setHours(1);

        if (d.getTime() != prevDate.getTime()) {
            return true;
        }
    };

    $scope.sendMessage = function(text) {
        var message;
        if (!$mmApp.isOnline()) {
            // Silent error, the view should prevent this.
            return;
        } else if (!text.trim()) {
            // Silent error.
            return;
        }

        text = text.replace(/(?:\r\n|\r|\n)/g, '<br />');
        message = {
            sending: true,
            useridfrom: $scope.currentUserId,
            smallmessage: text,
            timecreated: ((new Date()).getTime() / 1000)
        };
        $scope.messages.push(message);

        messagesBeingSent++;
        $mmaMessages.sendMessage(userId, text).then(function() {
            message.sending = false;
        }, function(error) {
            if (typeof error === 'string') {
                $mmUtil.showErrorModal(error);
            } else {
                $mmUtil.showErrorModal('mma.messages.messagenotsent', true);
            }
            $scope.messages.splice($scope.messages.indexOf(message), 1);
        }).finally(function() {
            messagesBeingSent--;
        });
    };

    // Fetch the messages for the first time.
    $mmaMessages.getDiscussion(userId).then(function(messages) {
        $scope.messages = $mmaMessages.sortMessages(messages);
        if (!userFullname && messages && messages.length > 0) {
            // When we did not receive the fullname via argument. Also it is possible that
            // we cannot resolve the name when no messages were yet exchanged.
            if (messages[0].useridto != $scope.currentUserId) {
                $scope.title = messages[0].usertofullname || '';
            } else {
                $scope.title = messages[0].userfromfullname || '';
            }
        }
    }, function(error) {
        if (typeof error === 'string') {
            $mmUtil.showErrorModal(error);
        } else {
            $mmUtil.showErrorModal('mma.messages.errorwhileretrievingmessages', true);
        }
    }).finally(function() {
        $scope.loaded = true;
    });

    $scope.scrollAfterRender = function(scope) {
        if (scope.$last === true) {
            // Need a timeout to leave time to the view to be rendered.
            $timeout(function() {
                var scrollView = $ionicScrollDelegate.$getByHandle('mmaMessagesScroll');
                scrollView.scrollBottom();
            });
        }
    };

    // Set up the polling on a view enter, this allows for the user to go back and resume the polling.
    $scope.$on('$ionicView.enter', function() {
        // Strange case, we already have the polling in place.
        if (polling) {
            return;
        }

        // Start polling.
        polling = $interval(function() {
            $log.debug('Polling new messages for discussion with user ' + userId);
            if (messagesBeingSent > 0) {
                // We do not poll while a message is being sent or we could confuse the user
                // as his message would disappear from the list, and he'd have to wait for the
                // interval to check for new messages.
                return;
            } else if (!$mmApp.isOnline()) {
                // Obviously we cannot check for new messages when the app is offline.
                return;
            }

            // Invalidate the cache before fetching.
            $mmaMessages.invalidateDiscussionCache(userId);
            $mmaMessages.getDiscussion(userId).then(function(messages) {
                if (messagesBeingSent > 0) {
                    // Ignore polling if due to a race condition.
                    return;
                }
                $scope.messages = $mmaMessages.sortMessages(messages);
            });
        }, mmaMessagesPollInterval);
    });

    // Removing the polling as we leave the page.
    $scope.$on('$ionicView.leave', function(e) {
        if (polling) {
            $log.debug('Cancelling polling for conversation with user ' + userId);
            $interval.cancel(polling);
        }
    });

});

