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
.controller('mmaMessagesDiscussionsCtrl', function($state, $scope, $mmaMessages) {
    $scope.loaded = false;

    $mmaMessages.getDiscussions().then(function(discussions) {
        $scope.discussions = discussions;
    }, function() {
        $mmUtil.showErrorModal('mma.messages.errorwhileretrievingdiscussions', true);
    }).finally(function() {
        $scope.loaded = true;
    });

    $scope.goToDiscussion = function(discussion) {
        $state.go('site.messages-discussion', {
            userId: discussion.message.user,
            userFullname: discussion.fullname
        });
    };

    $scope.hasMessages = function(discussion) {
        return typeof discussion.message !== 'undefined';
    };

});

