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
    var course = $stateParams.course,
        courseid = course.id;

    $scope.participants = [];
    $scope.courseid = courseid;

    // Get participant ui-sref depending on Mobile or Tablet.
    // @todo Adapt to tablet split view when it is implemented.
    $scope.getState = function(id) {
        return 'site.participants-profile({courseid: '+courseid+', userid: '+id+'})';
    };

    function fetchParticipants(refresh) {
        var firstToGet = refresh ? 0 : $scope.participants.length;
        return $mmaParticipants.getParticipants(courseid, firstToGet).then(function(data) {
            if (refresh) {
                $scope.participants = data.participants;
            } else {
                $scope.participants = $scope.participants.concat(data.participants);
            }
            $scope.canLoadMore = data.canLoadMore;
        }, function(message) {
            $mmUtil.showErrorModal(message);
        });
    }

    // Get first participants.
    $translate('mm.core.loading').then(function(loadingString) {
        $mmUtil.showModalLoading(loadingString);
    });
    fetchParticipants(true).finally(function() {
        $mmUtil.closeModalLoading();
    });

    // Load more participants.
    $scope.loadMoreParticipants = function(){
        fetchParticipants().finally(function() {
            $scope.$broadcast('scroll.infiniteScrollComplete');
        });
    };

    $scope.refreshParticipants = function() {
        fetchParticipants(true).finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };
});
