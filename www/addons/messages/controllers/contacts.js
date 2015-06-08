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
 * Contacts controller.
 *
 * @module mm.addons.messages
 * @ngdoc controller
 * @name mmaMessagesContactsCtrl
 */
.controller('mmaMessagesContactsCtrl', function($q, $scope, $mmaMessages, $mmSite, mmUserProfileState) {

    var currentUserId = $mmSite.getUserId();

    $scope.loaded = false;
    $scope.contactTypes = ['online', 'offline', 'blocked', 'strangers'];
    $scope.profileState = mmUserProfileState;
    $scope.hasContacts = false;

    $scope.refresh = function() {
        $mmaMessages.invalidateAllContactsCache(currentUserId).then(function() {
            return fetchContacts(true);
        }).finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    function fetchContacts() {
        return $mmaMessages.getAllContacts().then(function(contacts) {
            $scope.contacts = contacts;

            angular.forEach(contacts, function(contact) {
                if (contact.length > 0) {
                    $scope.hasContacts = true;
                }
            });
        }, function() {
            $mmUtil.showErrorModal('mma.messages.errorwhileretrievingcontacts', true);
        });
    }
    fetchContacts().finally(function() {
        $scope.loaded = true;
    });
});

