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

angular.module('mm.addons.mod_chat')

/**
 * Chat controller.
 *
 * @module mm.addons.mod_chat
 * @ngdoc controller
 * @name mmaModChatChatCtrl
 */
.controller('mmaModChatChatCtrl', function($scope, $stateParams, $mmApp, $mmaModChat, $log, $ionicModal, $mmUtil, $ionicHistory,
            $ionicScrollDelegate, $timeout, $mmSite, $interval, mmaChatPollInterval, $q, $mmText) {

    $log = $log.getInstance('mmaModChatChatCtrl');

    var chatId = $stateParams.chatid,
        courseId = $stateParams.courseid,
        title = $stateParams.title,
        chatLastTime = 0,
        pollingRunning = false;

    $scope.loaded = false;
    $scope.title = title;
    $scope.currentUserId = $mmSite.getUserId();
    $scope.currentUserBeep = 'beep ' + $scope.currentUserId;
    $scope.messages = [];
    $scope.chatUsers = [];

    // We use an object because it works better with forms.
    $scope.newMessage = {
        text: ''
    };

    // Chat users modal.
    $ionicModal.fromTemplateUrl('addons/mod/chat/templates/users.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function(m) {
        $scope.modal = m;
    });

    // Close the chat users modal.
    $scope.closeModal = function(){
        $scope.modal.hide();
    };

    // Display the chat users modal.
    $scope.showChatUsers = function() {
        $scope.usersLoaded = false;
        $scope.modal.show();
        $mmaModChat.getChatUsers($scope.chatsid).then(function(data) {
            $scope.chatUsers = data.users;
        }).catch(function(error) {
            $mmUtil.showErrorModalDefault(error, 'mma.mod_chat.errorwhilegettingchatusers', true);
        }).finally(function() {
            $scope.usersLoaded = true;
        });
    };

    // Add To "user":
    $scope.talkTo = function(user) {
        $scope.newMessage.text = "To " + user + ": ";
        $scope.modal.hide();
    };

    // Beep a user.
    $scope.beepTo = function(userId) {
        $scope.sendMessage('', userId);
        $scope.modal.hide();
    };

    // Check is the app is offline.
    $scope.isAppOffline = function() {
        return !$mmApp.isOnline();
    };

    // Convenience function to login the user.
    function loginUser() {
        return $mmaModChat.loginUser(chatId).then(function(chatsid) {
            $scope.chatsid = chatsid;
        });
    }

    // Convenience function to get chat messages.
    function getMessages() {
        return $mmaModChat.getLatestMessages($scope.chatsid, chatLastTime).then(function(messagesInfo) {
            chatLastTime = messagesInfo.chatnewlasttime;
            return $mmaModChat.getMessagesUserData(messagesInfo.messages, courseId).then(function(messages) {
                $scope.messages = $scope.messages.concat(messages);
            });
        });
    }

    // Start the polling to get chat messages periodically.
    function startPolling() {
        // We already have the polling in place.
        if ($scope.polling) {
            return;
        }

        // Start polling.
        $scope.polling = $interval(getMessagesInterval, mmaChatPollInterval);
    }

    // Convenience function to be called every certain time to get chat messages.
    function getMessagesInterval() {
        $log.debug('Polling for messages');
        if (!$mmApp.isOnline() || pollingRunning) {
            // Obviously we cannot check for new messages when the app is offline.
            return $q.reject();
        }

        pollingRunning = true;

        return getMessages().catch(function() {
            // Try to login, it might have failed because the session expired.
            return loginUser().then(function() {
                return getMessages();
            }).catch(function(error) {
                // Fail again. Stop polling if needed.
                if ($scope.polling) {
                    $interval.cancel($scope.polling);
                    $scope.polling = undefined;
                }
                $mmUtil.showErrorModalDefault(error, 'mma.mod_chat.errorwhileretrievingmessages', true);
                return $q.reject();
            });
        }).finally(function() {
            pollingRunning = false;
        });
    }

    // Check if the date should be displayed between messages (when the day changes at midnight for example).
    $scope.showDate = function(message, prevMessage) {
        if (!prevMessage) {
            return true;
        }

        // Check if day has changed.
        return !moment(message.timestamp * 1000).isSame(prevMessage.timestamp * 1000, 'day');
    };

    // Send a message to the chat.
    $scope.sendMessage = function(text, beep) {
        beep = beep || '';

        if (!$mmApp.isOnline()) {
            // Silent error, the view should prevent this.
            return;
        } else if (beep === '' && !text.trim()) {
            // Silent error.
            return;
        }
        text = $mmText.replaceNewLines(text, '<br>');

        var modal = $mmUtil.showModalLoading('mm.core.sending', true);
        $mmaModChat.sendMessage($scope.chatsid, text, beep).then(function() {
            if (beep === '') {
                $scope.newMessage.text = '';
            }
            getMessagesInterval(); // Update messages to show the sent message.
        }).catch(function(error) {
            // Only close the keyboard if an error happens, we want the user to be able to send multiple
            // messages withoutthe keyboard being closed.
            $mmApp.closeKeyboard();

            $mmUtil.showErrorModalDefault(error, 'mma.mod_chat.errorwhilesendingmessage', true);
        }).finally(function() {
            modal.dismiss();
        });
    };

    $scope.reconnect = function() {
        var modal = $mmUtil.showModalLoading();

        // Call startPolling would take a while for the first execution, so we'll execute it manually to check if it works now.
        return getMessagesInterval().then(function() {
            // It works, start the polling again.
            startPolling();
        }).finally(function() {
            modal.dismiss();
        });
    };

    // Login the user.
    loginUser().then(function() {
        return getMessages().then(function() {
            startPolling();
        }).catch(function(error) {
            $mmUtil.showErrorModalDefault(error, 'mma.mod_chat.errorwhileretrievingmessages', true);
            $ionicHistory.goBack();
            return $q.reject();
        });
    }, function(error) {
        $mmUtil.showErrorModalDefault(error, 'mma.mod_chat.errorwhileconnecting', true);
        $ionicHistory.goBack();
    }).finally(function() {
        $scope.loaded = true;
    });

    // Scroll to the bottom.
    $scope.scrollAfterRender = function(scope) {
        if (scope.$last === true) {
            // Need a timeout to leave time to the view to be rendered.
            $timeout(function() {
                var scrollView = $ionicScrollDelegate.$getByHandle('mmaChatScroll');
                scrollView.scrollBottom();
            });
        }
    };

    // Removing the polling as we leave the page.
    $scope.$on('$ionicView.leave', function() {
        if ($scope.polling) {
            $log.debug('Cancelling polling for conversation');
            $interval.cancel($scope.polling);
        }
    });

});
