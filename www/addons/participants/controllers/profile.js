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
 * Controller to handle a single course participant.
 *
 * @module mm.addons.participants
 * @ngdoc controller
 * @name mmaParticipantsProfileCtrl
 */
.controller('mmaParticipantsProfileCtrl', function($scope, $stateParams, $mmUtil, $mmaParticipants, $translate,
        $mmaParticipantsDelegate) {

    var courseid = $stateParams.courseid,
        userid   = $stateParams.userid;

    $scope.courseid = courseid;
    $scope.isAndroid = ionic.Platform.isAndroid();
    $scope.plugins = $mmaParticipantsDelegate.getData();

    $translate('mm.core.loading').then(function(loadingString) {
        $mmUtil.showModalLoading(loadingString);
    });

    $mmaParticipants.getParticipant(courseid, userid).then(function(user) {

        user.address = $mmUtil.formatUserAddress(user.address, user.city, user.country);
        if (user.address) {
            user.encodedAddress = encodeURIComponent(user.address);
        }

        $mmUtil.formatUserRoleList(user.roles).then(function(roles) {
            user.roles = roles;
        });

        $scope.participant = user;
        $scope.title = user.fullname;
        $scope.hasContact = user.email || user.phone1 || user.phone2 || user.city || user.country || user.address;
        $scope.hasDetails = user.url || user.roles || user.interests;
    }, function(message) {
        $mmUtil.showErrorModal(message);
    }).finally(function() {
        $mmUtil.closeModalLoading();
    });

});
