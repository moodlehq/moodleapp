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
.controller('mmaMessagesDiscussionCtrl', function($scope, $stateParams, $mmApp, $mmaMessages, $mmSite, $timeout, $mmEvents, $window,
        $ionicScrollDelegate, mmUserProfileState, $mmUtil, mmaMessagesPollInterval, $interval, $log, $ionicHistory, $ionicPlatform,
        mmCoreEventKeyboardShow, mmCoreEventKeyboardHide, mmaMessagesDiscussionLoadedEvent, mmaMessagesDiscussionLeftEvent) {

    $log = $log.getInstance('mmaMessagesDiscussionCtrl');

    var userId = $stateParams.userId,
        userFullname = $stateParams.userFullname,
        messagesBeingSent = 0,
        polling,
        backView = $ionicHistory.backView(),
        lastMessage,
        scrollView = $ionicScrollDelegate.$getByHandle('mmaMessagesScroll');

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

        // Check if day has changed.
        return !moment(message.timecreated * 1000).isSame(prevMessage.timecreated * 1000, 'day');
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
            notifyNewMessage();
        }, function(error) {

            // Only close the keyboard if an error happens, we want the user to be able to send multiple
            // messages withoutthe keyboard being closed.
            $mmApp.closeKeyboard();

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
        notifyNewMessage();
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
                scrollView.scrollBottom();
                setScrollWithKeyboard();
            });
        }
    };

    // Set a polling to get new messages every certain time.
    function setPolling() {
        if (polling) {
            // We already have the polling in place.
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
                notifyNewMessage();
            });
        }, mmaMessagesPollInterval);
    }

    // Unset polling.
    function unsetPolling() {
        if (polling) {
            $log.debug('Cancelling polling for conversation with user ' + userId);
            $interval.cancel(polling);
            polling = undefined;
        }
    }

    if ($ionicPlatform.isTablet()) {
        // Listen for events to set/unset the polling in tablet. We use angular events because we cannot use ionic events
        // (we use ui-view). The behavior is the same, since scope is destroyed on tablet view when navigating to subviews.
        $scope.$on('$viewContentLoaded', function(){
            setPolling();
        });
        $scope.$on('$destroy', function(){
            unsetPolling();
        });
    } else {
        // Listen for events to set/unset the polling in phones. We can use ionic events.
        $scope.$on('$ionicView.enter', function() {
            setPolling();
        });
        $scope.$on('$ionicView.leave', function(e) {
            unsetPolling();
        });

    }

    // Notify the last message found so discussions list controller can tell if last message should be updated.
    function notifyNewMessage() {
        var last = $scope.messages[$scope.messages.length - 1];
        if (last && last.smallmessage !== lastMessage) {
            lastMessage = last.smallmessage;
            $mmEvents.trigger($mmaMessages.getDiscussionEventName(userId), {
                message: lastMessage,
                timecreated: last.timecreated
            });
        }
    }

    // Scroll when keyboard is hide/shown to keep the user scroll. This is only needed for Android.
    function setScrollWithKeyboard() {
        if (ionic.Platform.isAndroid()) {
            $timeout(function() { // Use a $timeout to wait for scroll to correctly measure height.
                var obsShow,
                    obsHide,
                    keyboardHeight,
                    maxInitialScroll = scrollView.getScrollView().__contentHeight - scrollView.getScrollView().__clientHeight,
                    initialHeight = $window.innerHeight;

                obsShow = $mmEvents.on(mmCoreEventKeyboardShow, function(e) {
                    $timeout(function() {
                        // Try to calculate keyboard height ourselves since e.keyboardHeight is not reliable.
                        var heightDifference = initialHeight - $window.innerHeight,
                            newKeyboardHeight = heightDifference > 50 ? heightDifference : e.keyboardHeight;
                        if (newKeyboardHeight) {
                            keyboardHeight = newKeyboardHeight;
                            scrollView.scrollBy(0, newKeyboardHeight);
                        }
                    });
                });

                obsHide = $mmEvents.on(mmCoreEventKeyboardHide, function(e) {
                    if (!scrollView || !scrollView.getScrollPosition()) {
                        return; // Can't get scroll position, stop.
                    }

                    if (scrollView.getScrollPosition().top >= maxInitialScroll) {
                        // scrollBy(0,0) would automatically reset at maxInitialScroll. We need to apply the difference
                        // from there to scroll to the right point.
                        scrollView.scrollBy(0, scrollView.getScrollPosition().top - keyboardHeight - maxInitialScroll);
                    } else {
                        scrollView.scrollBy(0, - keyboardHeight);
                    }
                });

                $scope.$on('$destroy', function() {
                    obsShow && obsShow.off && obsShow.off();
                    obsHide && obsHide.off && obsHide.off();
                });
            });
        }
    }

    if ($ionicPlatform.isTablet()) {
        $mmEvents.trigger(mmaMessagesDiscussionLoadedEvent, userId);
    }
    $scope.$on('$destroy', function() {
        if ($ionicPlatform.isTablet()) {
            $mmEvents.trigger(mmaMessagesDiscussionLeftEvent);
        }
    });

});

