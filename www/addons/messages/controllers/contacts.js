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
.controller('mmaMessagesContactsCtrl', function($scope, $mmaMessages, $mmSite, $mmUtil, $mmApp, mmUserProfileState, $q,
            $translate) {

    var currentUserId = $mmSite.getUserId(),
        searchingMessage = $translate.instant('mm.core.searching'),
        loadingMessage = $translate.instant('mm.core.loading'),
        searchedString;

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
        var promise;

        if (searchedString) {
            // User has searched, update the search.
            promise = search(searchedString);
        } else {
            // Update contacts.
            promise = $mmaMessages.invalidateAllContactsCache(currentUserId).then(function() {
                return fetchContacts(true);
            });
        }

        promise.finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    $scope.search = function(query) {
        $mmApp.closeKeyboard();

        $scope.loaded = false;
        $scope.loadingMessage = searchingMessage;
        return search(query).finally(function() {
            $scope.loaded = true;
        });
    };

    $scope.clearSearch = function() {
        $scope.loaded = false;
        fetchContacts().finally(function() {
            $scope.loaded = true;
        });
    };

    // Search users.
    function search(query) {
        return $mmaMessages.searchContacts(query).then(function(result) {
            $scope.hasContacts = result.length > 0;
            searchedString = query;
            $scope.contacts = {
                search: result
            };
        }).catch(function(error) {
            $mmUtil.showErrorModalDefault(error, 'mma.messages.errorwhileretrievingcontacts', true);
            return $q.reject();
        });
    }

    // Fetch contacts.
    function fetchContacts() {
        $scope.loadingMessage = loadingMessage;
        return $mmaMessages.getAllContacts().then(function(contacts) {
            $scope.contacts = contacts;
            searchedString = false; // Reset searched string.

            angular.forEach(contacts, function(contact) {
                if (contact.length > 0) {
                    $scope.hasContacts = true;
                }
            });
        }).catch(function(error) {
            $mmUtil.showErrorModalDefault(error, 'mma.messages.errorwhileretrievingcontacts', true);
            return $q.reject();
        });
    }

    fetchContacts().finally(function() {
        $scope.loaded = true;
    });
});

