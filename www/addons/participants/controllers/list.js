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
.controller('mmaParticipantsListCtrl', function($scope, $stateParams, $mmUtil, $mmaParticipants, $mmSite, mmUserProfileState) {
    var course = angular.copy($stateParams.course),
        courseid = course.id;

    $scope.participants = [];
    $scope.courseid = courseid;
    $scope.userStateName = mmUserProfileState;

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
            $scope.canLoadMore = false; // Set to false to prevent infinite calls with infinite-loading.
        });
    }

    // Get first participants.
    fetchParticipants(true).then(function() {
        // Add log in Moodle.
        $mmSite.write('core_user_view_user_list', {
            courseid: courseid
        });
    }).finally(function() {
        $scope.participantsLoaded = true;
    });

    // Load more participants.
    $scope.loadMoreParticipants = function(){
        fetchParticipants().finally(function() {
            $scope.$broadcast('scroll.infiniteScrollComplete');
        });
    };

    $scope.refreshParticipants = function() {
        $mmaParticipants.invalidateParticipantsList(courseid).finally(function() {
            fetchParticipants(true).finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        });
    };
});
