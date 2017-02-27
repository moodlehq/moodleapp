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
        $mmUser, $translate, mmaMessagesNewMessageEvent, mmaMessagesAutomSyncedEvent, $mmaMessagesSync, $q, md5, $mmText,
        mmaMessagesReadChangedEvent) {

    $log = $log.getInstance('mmaMessagesDiscussionCtrl');

    var userId = $stateParams.userId,
        messagesBeingSent = 0,
        polling,
        fetching,
        backView = $ionicHistory.backView(),
        lastMessage = {message: '', timecreated: 0},
        scrollView = $ionicScrollDelegate.$getByHandle('mmaMessagesScroll'),
        canDelete = $mmaMessages.canDeleteMessages(), // Check if user can delete messages.
        syncObserver,
        scrollKeyboardInitialized = false,
        pagesLoaded = 1,
        unreadMessageFrom = false;

    $scope.showKeyboard = $stateParams.showKeyboard;
    $scope.loaded = false;
    $scope.messages = [];
    $scope.userId = userId;
    $scope.currentUserId = $mmSite.getUserId();
    $scope.data = {
        showDelete: false,
        canDelete: false
    };
    $scope.canLoadMore = false;
    $scope.loadingPrevious = false;

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

    /**
     * Copy message to clipboard
     *
     * @param  {String} text Message text to be copied.
     */
    $scope.copyMessage = function(text) {
        $mmUtil.copyToClipboard(text);
    };

    $scope.sendMessage = function(text) {
        var message;

        if (!text.trim()) {
            // Silent error.
            return;
        }

        hideUnreadLabel();

        $scope.data.showDelete = false;
        $scope.newMessage = ''; // Clear new message.

        text = $mmText.replaceNewLines(text, '<br>');
        message = {
            pending: true,
            sending: true,
            useridfrom: $scope.currentUserId,
            smallmessage: text,
            text: text,
            timecreated: new Date().getTime()
        };
        $scope.messages.push(message);

        messagesBeingSent++;

        // If there is an ongoing fetch, wait for it to finish.
        // Otherwise, if a message is sent while fetching it could disappear until the next fetch.
        waitForFetch().finally(function() {
            $mmaMessages.sendMessage(userId, text).then(function(data) {
                var promise;

                messagesBeingSent--;

                if (data.sent) {
                    // Message was sent, fetch messages right now.
                    promise = fetchMessages();
                } else {
                    promise = $q.reject();
                }

                promise.catch(function() {
                    // Fetch failed or is offline message, mark the message as sent. If fetch is successful there's no need
                    // to mark it because the fetch will already show the message received from the server.
                    message.sending = false;
                    if (data.sent) {
                        // Message sent to server, not pending anymore.
                        message.pending = false;
                    } else if (data.message) {
                        message.timecreated = data.message.timecreated;
                    }

                    notifyNewMessage();
                });
            }).catch(function(error) {
                messagesBeingSent--;

                // Only close the keyboard if an error happens, we want the user to be able to send multiple
                // messages without the keyboard being closed.
                $mmApp.closeKeyboard();

                $mmUtil.showErrorModalDefault(error, 'mma.messages.messagenotsent', true);
                $scope.messages.splice($scope.messages.indexOf(message), 1);
            });
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
            $mmUtil.showErrorModalDefault(error, 'mma.messages.errorwhileretrievingmessages', true);
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
            // Check if scroll is at bottom. If so, scroll bottom after rendering since there might be something new.
            if (scrollView.getScrollPosition().top == scrollView.getScrollView().getScrollMax().top) {
                // Need a timeout to leave time to the view to be rendered.
                $timeout(function() {
                    scrollView.scrollBottom();
                    if (!scrollKeyboardInitialized) {
                        setScrollWithKeyboard();
                    }
                });
            }
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
            return $q.reject();
        } else if (fetching) {
            // Already fetching.
            return $q.reject();
        }

        fetching = true;

        // Wait for synchronization process to finish.
        return $mmaMessagesSync.waitForSync(userId).then(function() {
            // Fetch messages. Invalidate the cache before fetching.
            return $mmaMessages.invalidateDiscussionCache(userId).catch(function() {
                // Ignore errors.
            });
        }).then(function() {
            return getDiscussion(pagesLoaded);
        }).then(function(messages) {
            if (messagesBeingSent > 0) {
                // Ignore polling due to a race condition.
                return $q.reject();
            }

            var currentMessages = {};

            // Add all displayed messages to be currentMessages map.
            angular.forEach($scope.messages, function(message) {
                // Use smallmessage instead of message ID because ID changes when a message is read.
                var id = md5.createHash(message.smallmessage) + '#' + message.timecreated;
                currentMessages[id] = {
                    message: message
                };
            });

            // Add new messages to the list and mark the messages that should still be displayed.
            angular.forEach(messages, function(message) {
                var id = md5.createHash(message.smallmessage) + '#' + message.timecreated;
                if (!currentMessages[id]) {
                    // Message not added to the list. Add it now.
                    $scope.messages.push(message);
                } else {
                    // Message needs to be kept in the list.
                    currentMessages[id].keep = true;
                }
            });

            // Remove messages that shouldn't be in the list anymore.
            angular.forEach(currentMessages, function(entry) {
                if (entry.keep) {
                    // Don't remove it.
                    return;
                }

                var position = $scope.messages.indexOf(entry.message);
                if (position != -1) {
                    $scope.messages.splice(position, 1);
                }
            });

            // Sort the messages.
            $mmaMessages.sortMessages($scope.messages);

            // Notify that there can be a new message.
            notifyNewMessage();

            // Mark retrieved messages as read if they are not.
            markMessagesAsRead();
        }).finally(function() {
            fetching = false;
        });
    }

    // Hide unread label when sending messages.
    function hideUnreadLabel() {
        if (typeof unreadMessageFrom == 'number') {
            angular.forEach($scope.messages, function(message) {
                if (message.id == unreadMessageFrom) {
                    message.unreadFrom = false;
                }
            });
            // Label hidden.
            unreadMessageFrom = true;
        }
    }

    // Wait until fetching is false.
    function waitForFetch() {
        if (!fetching) {
            return $q.when();
        }

        return $timeout(function() {
            return waitForFetch();
        }, 400);
    }

    // Mark messages as read.
    function markMessagesAsRead() {
        var readChanged = false,
            previousMessageRead = false,
            promises = [];

        angular.forEach($scope.messages, function(message) {

            if (message.useridfrom != $scope.currentUserId) {
                // If the message is unread, call $mmaMessages.markMessageRead.
                if (message.read == 0) {
                    promises.push($mmaMessages.markMessageRead(message.id).then(function() {
                        readChanged = true;
                        message.read = 1;
                    }));
                }

                // Place unread from message label only once.
                if (!unreadMessageFrom) {
                    message.unreadFrom = message.read == 0 && previousMessageRead;
                    // Save where the label is placed.
                    unreadMessageFrom = message.unreadFrom && parseInt(message.id, 10);
                    previousMessageRead = message.read != 0;
                }
            }
        });
        // Do not update the message unread from label on next refresh.
        if (!unreadMessageFrom) {
            // Using true to indicate the label is not placed but should not be placed.
            unreadMessageFrom = true;
        }

        $q.all(promises).finally(function() {
            if (readChanged) {
                $mmEvents.trigger(mmaMessagesReadChangedEvent, {
                    siteid: $mmSite.getId(),
                    userid: userId
                });
            }
        });
    }

    // Get a discussion. Can load several "pages".
    function getDiscussion(pagesToLoad, lfReceivedUnread, lfReceivedRead, lfSentUnread, lfSentRead) {
        lfReceivedUnread = lfReceivedUnread || 0;
        lfReceivedRead = lfReceivedRead || 0;
        lfSentUnread = lfSentUnread || 0;
        lfSentRead = lfSentRead || 0;

        // Only get offline messages if we're loading the first "page".
        var excludePending = lfReceivedUnread > 0 || lfReceivedRead > 0 || lfSentUnread > 0 || lfSentRead > 0;

        // Get next messages.
        return $mmaMessages.getDiscussion(userId, excludePending, lfReceivedUnread, lfReceivedRead, lfSentUnread, lfSentRead)
                .then(function(result) {

            pagesToLoad--;
            if (pagesToLoad > 0 && result.canLoadMore) {
                // More pages to load. Calculate new limit froms.
                angular.forEach(result.messages, function(message) {
                    if (!message.pending) {
                        if (message.useridfrom == userId) {
                            if (message.read) {
                                lfReceivedRead++;
                            } else {
                                lfReceivedUnread++;
                            }
                        } else {
                            if (message.read) {
                                lfSentRead++;
                            } else {
                                lfSentUnread++;
                            }
                        }
                    }
                });

                // Get next messages.
                return getDiscussion(pagesToLoad, lfReceivedUnread, lfReceivedRead, lfSentUnread, lfSentRead)
                        .then(function(nextMessages) {
                    return result.messages.concat(nextMessages);
                });
            } else {
                // No more messages to load, return them.
                $scope.canLoadMore = result.canLoadMore;
                return result.messages;
            }
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
        if ((last && (last.text !== lastMessage.message || last.timecreated !== lastMessage.timecreated))) {
            lastMessage = {message: last.text, timecreated: last.timecreated};
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

    // Scroll when keyboard is hide/shown to keep the user scroll.
    function setScrollWithKeyboard() {
        scrollKeyboardInitialized = true;

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

    // Function to load previous messages.
    $scope.loadPrevious = function() {
        if ($scope.loadingPrevious) {
            // Already loading.
            return;
        }

        $scope.loadingPrevious = true;

        // If there is an ongoing fetch, wait for it to finish.
        waitForFetch().finally(function() {

            // Get current height. This is to keep the scroll position after the messages are loaded.
            var oldHeight = scrollView.getScrollView().__contentHeight;
            pagesLoaded++;

            fetchMessages().then(function() {
                scrollView.resize();

                // Wait for new scroll to be calculated.
                $timeout(function() {
                    var newHeight = scrollView.getScrollView().__contentHeight;
                    scrollView.scrollBy(0, newHeight - oldHeight);
                });
            }).catch(function(error) {
                pagesLoaded--;
                $mmUtil.showErrorModalDefault(error, 'mma.messages.errorwhileretrievingmessages', true);
            }).finally(function() {
                $scope.loadingPrevious = false;
            });
        });
    };

    // Function to delete a message.
    $scope.deleteMessage = function(message, index) {
        var langKey = message.pending ? 'mm.core.areyousure' : 'mma.messages.deletemessageconfirmation';
        $mmUtil.showConfirm($translate(langKey)).then(function() {
            var modal = $mmUtil.showModalLoading('mm.core.deleting', true);
            $mmaMessages.deleteMessage(message).then(function() {
                $scope.messages.splice(index, 1); // Remove message from the list without having to wait for re-fetch.
                fetchMessages(); // Re-fetch messages to update cached data.
            }).catch(function(error) {
                $mmUtil.showErrorModalDefault(error, 'mma.messages.errordeletemessage', true);
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

