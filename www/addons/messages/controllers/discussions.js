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
.controller('mmaMessagesDiscussionsCtrl', function($q, $state, $scope, $mmUtil, $mmaMessages) {
    $scope.loaded = false;

    function fetchDiscussions() {
        return $mmaMessages.getDiscussions().then(function(discussions) {
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

    $scope.refresh = function() {
        $mmaMessages.invalidateDiscussionsCache().then(function() {
            return fetchDiscussions();
        }).finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    $scope.goToDiscussion = function(discussion) {
        $state.go('site.messages-discussion', {
            userId: discussion.message.user,
            userFullname: discussion.fullname
        });
    };

    fetchDiscussions().finally(function() {
        $scope.loaded = true;
    });
});

