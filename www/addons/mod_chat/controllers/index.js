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
 * Chat index controller.
 *
 * @module mm.addons.mod_chat
 * @ngdoc controller
 * @name mmaModChatIndexCtrl
 */
.controller('mmaModChatIndexCtrl', function($scope, $stateParams, $mmaModChat, $mmUtil, $q, $mmCourse) {
    var module = $stateParams.module || {},
        courseid = $stateParams.courseid,
        chat;

    $scope.title = module.name;
    $scope.description = module.description;
    $scope.moduleurl = module.url;
    $scope.courseid = courseid;

    // Convenience function to get chat data.
    function fetchChatData(refresh) {
        return $mmaModChat.getChat(courseid, module.id, refresh).then(function(chatdata) {
            chat = chatdata;
            $scope.title = chat.name || $scope.title;
            $scope.description = chat.intro || $scope.description;
            $scope.chatId = chat.id;
            $scope.chatScheduled = '';

            var now = $mmUtil.timestamp();
            var span = chat.chattime - now;

            if (chat.chattime && chat.schedule > 0 && span > 0) {
                $mmUtil.formatTime(span).then(function(time) {
                    $scope.chatScheduled = time;
                });
            }

        }, function(error) {
            if (error) {
                $mmUtil.showErrorModal(error);
            } else {
                $mmUtil.showErrorModal('mm.core.error', true);
            }
            return $q.reject();
        });
    }

    fetchChatData().then(function() {
        $mmaModChat.logView(chat.id).then(function() {
            $mmCourse.checkModuleCompletion(courseid, module.completionstatus);
        });
    }).finally(function() {
        $scope.chatLoaded = true;
    });

    // Pull to refresh.
    $scope.refreshChat = function() {
        fetchChatData(true).finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };
});