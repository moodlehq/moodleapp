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
            $ionicScrollDelegate, $timeout, $mmSite, $interval, mmaChatPollInterval) {

    $log = $log.getInstance('mmaModChatChatCtrl');

    var chatId = $stateParams.chatid,
        courseId = $stateParams.courseid,
        title = $stateParams.title,
        polling;

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
    chatLastTime = 0;

    // Chat users modal.
    $ionicModal.fromTemplateUrl('addons/mod_chat/templates/users.html', {
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
        }).catch(showError)
        .finally(function() {
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

    // Show error modal.
    function showError(error) {
        if (typeof error === 'string') {
            $mmUtil.showErrorModal(error);
        } else {
            $mmUtil.showErrorModal(defaultMessage, 'mm.core.error');
        }
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
        var message;
        beep = beep || '';

        if (!$mmApp.isOnline()) {
            // Silent error, the view should prevent this.
            return;
        } else if (beep === '' && !text.trim()) {
            // Silent error.
            return;
        }
        text = text.replace(/(?:\r\n|\r|\n)/g, '<br />');

        $mmaModChat.sendMessage($scope.chatsid, text, beep).then(function() {
            if (beep === '') {
                $scope.newMessage.text = '';
            }
        }, function(error) {
            // Only close the keyboard if an error happens, we want the user to be able to send multiple
            // messages withoutthe keyboard being closed.
            $mmApp.closeKeyboard();

            showError(error);
        });
    };

    // Login the user.
    $mmaModChat.loginUser(chatId).then(function(data) {
        return $mmaModChat.getLatestMessages(data.chatsid, 0).then(function(messagesInfo) {
            $scope.chatsid = data.chatsid;
            chatLastTime = messagesInfo.chatnewlasttime;
            return $mmaModChat.getMessagesUserData(messagesInfo.messages, courseId).then(function(messages) {
                $scope.messages = $scope.messages.concat(messages);
            });
        }).catch(showError);
    }, function(error) {
        showError(error);
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

    // Set up the polling on a view enter, this allows for the user to go back and resume the polling.
    $scope.$on('$ionicView.enter', function() {
        // Strange case, we already have the polling in place.
        if (polling) {
            return;
        }

        // Start polling.
        polling = $interval(function() {
            $log.debug('Polling for messages');
            if (!$mmApp.isOnline()) {
                // Obviously we cannot check for new messages when the app is offline.
                return;
            }

            $mmaModChat.getLatestMessages($scope.chatsid, chatLastTime).then(function(data) {
                chatLastTime = data.chatnewlasttime;
                $mmaModChat.getMessagesUserData(data.messages, courseId).then(function(messages) {
                    $scope.messages = $scope.messages.concat(messages);
                });
            }, function(error) {
                $interval.cancel(polling);
                showError(error);
            });

        }, mmaChatPollInterval);
    });

    // Removing the polling as we leave the page.
    $scope.$on('$ionicView.leave', function(e) {
        if (polling) {
            $log.debug('Cancelling polling for conversation');
            $interval.cancel(polling);
        }
    });

});
