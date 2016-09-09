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
        mmCoreEventKeyboardShow, mmCoreEventKeyboardHide, mmaMessagesDiscussionLoadedEvent, mmaMessagesDiscussionLeftEvent,
        $mmUser, $translate, mmaMessagesNewMessageEvent, mmaMessagesAutomSyncedEvent, $mmaMessagesSync) {

    $log = $log.getInstance('mmaMessagesDiscussionCtrl');

    var userId = $stateParams.userId,
        messagesBeingSent = 0,
        polling,
        fetching,
        backView = $ionicHistory.backView(),
        lastMessage = {message: '', timecreated: 0},
        scrollView = $ionicScrollDelegate.$getByHandle('mmaMessagesScroll'),
        canDelete = $mmaMessages.canDeleteMessages(), // Check if user can delete messages.
        syncObserver;

    $scope.loaded = false;
    $scope.messages = [];
    $scope.userId = userId;
    $scope.currentUserId = $mmSite.getUserId();
    $scope.data = {
        showDelete: false,
        canDelete: false
    };

    // Disable the profile button if we're already coming from a profile.
    if (backView && backView.stateName === mmUserProfileState) {
        $scope.profileLink = false;
    }

    if (userId) {
        // Get the user profile to retrieve the user fullname and image.
        $mmUser.getProfile(userId, undefined, true).then(function(user) {
            if (!$scope.title) {
                $scope.title = user.fullname;
            }
            if (typeof $scope.profileLink == 'undefined') {
                $scope.profileLink = user.profileimageurl || true;
            }
        }).catch(function() {
            // Couldn't retrieve the image, use a default icon.
            $scope.profileLink = true;
        });
    }

    $scope.showDate = function(message, prevMessage) {
        if (!prevMessage) {
            return true;
        } else if (message.pending) {
            return false;
        }

        // Check if day has changed.
        return !moment(message.timecreated).isSame(prevMessage.timecreated, 'day');
    };

    $scope.sendMessage = function(text) {
        var message;

        if (!text.trim()) {
            // Silent error.
            return;
        }

        $scope.data.showDelete = false;

        text = text.replace(/(?:\r\n|\r|\n)/g, '<br />');
        message = {
            pending: true,
            sending: true,
            useridfrom: $scope.currentUserId,
            smallmessage: text,
            timecreated: new Date().getTime()
        };
        $scope.messages.push(message);

        messagesBeingSent++;

        $mmaMessages.sendMessage(userId, text).then(function(sent) {
            message.sending = false;
            if (sent) {
                // Message sent to server, not pending anymore.
                message.pending = false;
            }
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

    // Synchronize messages if needed.
    $mmaMessagesSync.syncDiscussion(userId).catch(function() {
        // Ignore errors.
    }).then(function(warnings) {
        if (warnings && warnings[0]) {
            $mmUtil.showErrorModal(warnings[0]);
        }

        // Fetch the messages for the first time.
        fetchMessages().then(function() {
            if (!$scope.title && $scope.messages.length) {
                // Didn't receive the fullname via argument. Try to get it from messages.
                // It's possible that name cannot be resolved when no messages were yet exchanged.
                if ($scope.messages[0].useridto != $scope.currentUserId) {
                    $scope.title = $scope.messages[0].usertofullname || '';
                } else {
                    $scope.title = $scope.messages[0].userfromfullname || '';
                }
            }
        }, function(error) {
            if (typeof error === 'string') {
                $mmUtil.showErrorModal(error);
            } else {
                $mmUtil.showErrorModal('mma.messages.errorwhileretrievingmessages', true);
            }
        }).finally(function() {
            triggerDiscussionLoadedEvent();
            $scope.loaded = true;
        });
    });

    var triggerDiscussionLoadedEvent = function() {
        if (canDelete) {
            // Check if there's any message to be deleted. All messages being sent should be at the end of the list.
            var first = $scope.messages[0];
            $scope.data.canDelete = first && !first.sending;
        }

        if ($ionicPlatform.isTablet()) {
            $mmEvents.trigger(mmaMessagesDiscussionLoadedEvent, {userId: $scope.userId, canDelete: $scope.data.canDelete});
        }
    };

    $scope.scrollAfterRender = function(scope) {
        if (scope.$last === true) {
            // Need a timeout to leave time to the view to be rendered.
            $timeout(function() {
                scrollView.scrollBottom();
                setScrollWithKeyboard();
            });
        }
    };

    $scope.toggleDelete = function() {
        $scope.data.showDelete = !$scope.data.showDelete;
    };

    // Convenience function to fetch messages.
    function fetchMessages() {
        $log.debug('Polling new messages for discussion with user ' + userId);
        if (messagesBeingSent > 0) {
            // We do not poll while a message is being sent or we could confuse the user
            // as his message would disappear from the list, and he'd have to wait for the
            // interval to check for new messages.
            return;
        } else if (fetching) {
            // Already fetching.
            return;
        }

        fetching = true;

        // Wait for synchronization process to finish.
        return $mmaMessagesSync.waitForSync(userId).then(function() {
            // Fetch messages. Invalidate the cache before fetching.
            return $mmaMessages.invalidateDiscussionCache(userId).catch(function() {
                // Ignore errors.
            });
        }).then(function() {
            return $mmaMessages.getDiscussion(userId);
        }).then(function(messages) {
            if (messagesBeingSent > 0) {
                // Ignore polling due to a race condition.
                return;
            }

            // Sort messages.
            $scope.messages = $mmaMessages.sortMessages(messages);

            // Notify that there can be a new message.
            notifyNewMessage();
        }).finally(function() {
            fetching = false;
        });
    }

    // Set a polling to get new messages every certain time.
    function setPolling() {
        if (polling) {
            // We already have the polling in place.
            return;
        }

        // Start polling.
        polling = $interval(fetchMessages, mmaMessagesPollInterval);
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
        var last = $scope.messages[$scope.messages.length - 1],
            trigger = false;
        if ((last && (last.smallmessage !== lastMessage.message || last.timecreated !== lastMessage.timecreated))) {
            lastMessage = {message: last.smallmessage, timecreated: last.timecreated};
            trigger = true;
        } else if (!last) {
            lastMessage = {message: "", timecreated: 0};
            trigger = true;
        }

        if (trigger) {
            // Update discussions last message.
            $mmEvents.trigger(mmaMessagesNewMessageEvent, {
                siteid: $mmSite.getId(),
                userid: userId,
                message: lastMessage.message,
                timecreated: lastMessage.timecreated
            });

            // Update navBar links and buttons.
            var newCanDelete = (last && last.id && $scope.messages.length == 1) || $scope.messages.length > 1;
            if (canDelete && ($scope.data.canDelete != newCanDelete)) {
                triggerDiscussionLoadedEvent();
            }
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

    // Function to delete a message.
    $scope.deleteMessage = function(message, index) {
        var langKey = message.pending ? 'mm.core.areyousure' : 'mma.messages.deletemessageconfirmation';
        $mmUtil.showConfirm($translate(langKey)).then(function() {
            var modal = $mmUtil.showModalLoading('mm.core.deleting', true);
            $mmaMessages.deleteMessage(message).then(function() {
                $scope.messages.splice(index, 1); // Remove message from the list without having to wait for re-fetch.
                fetchMessages(); // Re-fetch messages to update cached data.
            }).catch(function(error) {
                if (typeof error === 'string') {
                    $mmUtil.showErrorModal(error);
                } else {
                    $mmUtil.showErrorModal('mma.messages.errordeletemessage', true);
                }
            }).finally(function() {
                modal.dismiss();
            });
        });
    };

    // Refresh data if this discussion is synchronized automatically.
    syncObserver = $mmEvents.on(mmaMessagesAutomSyncedEvent, function(data) {
        if (data && data.siteid == $mmSite.getId() && data.userid == userId) {
            // Fetch messages.
            fetchMessages();

            // Show first warning if any.
            if (data.warnings && data.warnings[0]) {
                $mmUtil.showErrorModal(data.warnings[0]);
            }
        }
    });

    $scope.$on('$destroy', function() {
        if ($ionicPlatform.isTablet()) {
            $mmEvents.trigger(mmaMessagesDiscussionLeftEvent);
        }
        if (syncObserver && syncObserver.off) {
            syncObserver.off();
        }
    });

});

