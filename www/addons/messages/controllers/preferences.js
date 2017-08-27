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
 * Controller to handle message preferences.
 *
 * @module mm.addons.messages
 * @ngdoc controller
 * @name mmaMessagesPreferencesCtrl
 */
.controller('mmaMessagesPreferencesCtrl', function($scope, $mmaMessages, $mmUtil, $ionicPlatform, $mmUser, $timeout) {

    var updateTimeout;

    $scope.isTablet = $ionicPlatform.isTablet();

    function fetchPreferences() {
        return $mmaMessages.getMessagePreferences().then(function(preferences) {
            preferences.blocknoncontacts = !!preferences.blocknoncontacts; // Convert to boolean.
            $scope.preferences = preferences;
        }).catch(function(message) {
            $mmUtil.showErrorModal(message);
        }).finally(function() {
            $scope.preferencesLoaded = true;
        });
    }

    // Update preferences after a certain time. The purpose is to store the updated data, it won't be reflected in the view.
    function updatePreferencesAfterDelay() {
        // Cancel pending updates.
        $timeout.cancel(updateTimeout);

        updateTimeout = $timeout(function() {
            updateTimeout = null;
            updatePreferences();
        }, 5000);
    }

    // Update preferences. The purpose is to store the updated data, it won't be reflected in the view.
    function updatePreferences() {
        $mmaMessages.invalidateMessagePreferences().finally(function() {
            $mmaMessages.getMessagePreferences();
        });
    }

    fetchPreferences();

    // Refresh the list of preferences.
    $scope.refreshPreferences = function() {
        $mmaMessages.invalidateMessagePreferences().finally(function() {
            fetchPreferences().finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        });
    };

    // Change the value of a certain preference.
    $scope.changePreference = function(notification, state, processor) {
        var processorState = processor[state],
            preferenceName = notification.preferencekey + '_' + processorState.name,
            value;

        angular.forEach(notification.processors, function(processor) {
            if (processor[state].checked) {
                if (!value) {
                    value = processor.name;
                } else {
                    value += ',' + processor.name;
                }
            }
        });

        if (!value) {
            value = 'none';
        }
        if (!notification.updating) {
            notification.updating = {};
        }

        notification.updating[state] = true;
        $mmUser.updateUserPreference(preferenceName, value).then(function() {
            // Update the preferences since they were modified.
            updatePreferencesAfterDelay();
        }).catch(function(message) {
            // Show error and revert change.
            $mmUtil.showErrorModal(message);
            processorState.checked = !processorState.checked;
        }).finally(function() {
            notification.updating[state] = false;
        });
    };

    // Block non contacts.
    $scope.blockNonContacts = function(block) {
        var modal = $mmUtil.showModalLoading('mm.core.sending', true);
        $mmUser.updateUserPreference('message_blocknoncontacts', block ? 1 : 0).then(function() {
            // Update the preferences since they were modified.
            updatePreferencesAfterDelay();
        }).catch(function(message) {
            // Show error and revert change.
            $mmUtil.showErrorModal(message);
            $scope.preferences.blocknoncontacts = !$scope.preferences.blocknoncontacts;
        }).finally(function() {
            modal.dismiss();
        });
    };

    $scope.$on('$destroy', function() {
        // If there is a pending action to update preferences, execute it right now.
        if (updateTimeout) {
            $timeout.cancel(updateTimeout);
            updatePreferences();
        }
    });
});
