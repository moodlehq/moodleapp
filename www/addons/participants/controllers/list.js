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

angular.module('mm.addons.participants')

/**
 * Controller to handle course participants.
 *
 * @module mm.addons.participants
 * @ngdoc controller
 * @name mmaParticipantsListCtrl
 */
.controller('mmaParticipantsListCtrl', function($scope, $state, $stateParams, $mmUtil, $mmaParticipants, $translate, $ionicPlatform) {

    var courseid = $stateParams.courseid;
    $scope.participants = [];

    $scope.getURL = function(id) {
        if ($ionicPlatform.isTablet()) {
            return $state.href('site.participant', {courseid: courseid, userid: id});
        } else {
            return $state.href('site.participants.tablet', {userid: id});
        }
    };

    function fetchParticipants() {
        return $mmaParticipants.getParticipants(courseid, $scope.participants.length).then(function(newParts) {
            $scope.participants = $scope.participants.concat(newParts);
            $scope.canLoadMore = $mmaParticipants.canLoadMore();
        }, function(message) {
            $mmUtil.showErrorModal(message);
        });
    }

    // Get first participants.
    $translate('mm.core.loading').then(function(loadingString) {
        $mmUtil.showModalLoading(loadingString);
    });
    fetchParticipants().finally(function() {
        $mmUtil.closeModalLoading();
    });

    // Load more participants.
    $scope.loadMoreParticipants = function(){
        fetchParticipants().finally(function() {
            $scope.$broadcast('scroll.infiniteScrollComplete');
        });
    };

    $translate('loading').then(function(loadingString) {
        $mmUtil.showModalLoading(loadingString);
    });
});
