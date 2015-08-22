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
.controller('mmaMessagesContactsCtrl', function($scope, $mmaMessages, $mmSite, $mmUtil, mmUserProfileState) {

    var currentUserId = $mmSite.getUserId();

    $scope.loaded = false;
    $scope.contactTypes = ['online', 'offline', 'blocked', 'strangers', 'search'];
    $scope.searchType = 'search';
    $scope.hasContacts = false;
    $scope.canSearch = $mmaMessages.isSearchEnabled;
    $scope.formData = {
        searchString: ''
    };
    $scope.userStateName = mmUserProfileState;

    $scope.refresh = function() {
        $mmaMessages.invalidateAllContactsCache(currentUserId).then(function() {
            return fetchContacts(true).then(function() {
                $scope.formData.searchString = '';
            });
        }).finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    $scope.search = function(query) {
        if (query.length < 3) {
            // The view should handle this case, but adding this check here to document that
            // we do not want users to query on less than 3 characters as they could retrieve
            // too many users!
            return;
        }
        $scope.loaded = false;
        return $mmaMessages.searchContacts(query).then(function(result) {
            $scope.hasContacts = result.length > 0;
            $scope.contacts = {
                search: result
            };
        }).catch(function(error) {
            if (typeof error === 'string') {
                $mmUtil.showErrorModal(error);
            } else {
                $mmUtil.showErrorModal('mma.messages.errorwhileretrievingcontacts', true);
            }
        }).finally(function() {
            $scope.loaded = true;
        });
    };

    $scope.clearSearch = function() {
        $scope.loaded = false;
        fetchContacts().finally(function() {
            $scope.loaded = true;
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
        }, function(error) {
            if (typeof error === 'string') {
                $mmUtil.showErrorModal(error);
            } else {
                $mmUtil.showErrorModal('mma.messages.errorwhileretrievingcontacts', true);
            }
        });
    }
    fetchContacts().finally(function() {
        $scope.loaded = true;
    });
});

