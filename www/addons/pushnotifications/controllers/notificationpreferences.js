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

angular.module('mm.addons.pushnotifications')

/**
 * Controller to handle notification preferences.
 *
 * @module mm.addons.pushnotifications
 * @ngdoc controller
 * @name mmaPushNotificationsNotifPreferencesCtrl
 */
.controller('mmaPushNotificationsNotifPreferencesCtrl', function($scope, $mmaPushNotifications, $mmUtil, $ionicPlatform, $mmUser,
            $mmaPushNotificationsPreferencesDelegate, $q, $timeout) {

    var updateTimeouts = {};

    $scope.isTablet = $ionicPlatform.isTablet();

    function fetchPreferences() {
        return $mmaPushNotifications.getAllPreferences().then(function(preferences) {
            if (!$scope.currentProcessor) {
                initCurrentProcessor(preferences.processors);
            }

            if (!$scope.currentProcessor) {
                // Shouldn't happen.
                return $q.reject('No processor found');
            }

            $scope.preferences = preferences;
            $scope.categories = $mmaPushNotifications.getProcessorCategories($scope.currentProcessor.name, preferences.categories);
            $scope.currentProcessor.supported =
                        $mmaPushNotificationsPreferencesDelegate.hasPreferenceHandler($scope.currentProcessor.name);
        }).catch(function(message) {
            $mmUtil.showErrorModal(message);
        }).finally(function() {
            $scope.preferencesLoaded = true;
        });
    }

    // Initialize current processor. Load "Mobile" (airnotifier) if available.
    function initCurrentProcessor(processors) {
        if (!processors) {
            return;
        }

        for (var i = 0, len = processors.length; i < len; i++) {
            var processor = processors[i];
            if (processor.name == 'airnotifier') {
                $scope.currentProcessor = processor;
                return;
            }
        }

        // Mobile (airnotifier) not available. Get the first processor.
        $scope.currentProcessor = processors[0];
    }

    // Update a category after a certain time. The purpose is to store the updated data, it won't be reflected in the view.
    function updateCategoryAfterDelay(name) {
        // Cancel pending updates.
        $timeout.cancel(updateTimeouts[name]);

        updateTimeouts[name] = $timeout(function() {
            delete updateTimeouts[name];
            updateCategory(name);
        }, 5000);
    }

    // Update a category. The purpose is to store the updated data, it won't be reflected in the view.
    function updateCategory(name) {
        if (name == $mmaPushNotifications.MESSAGE_CATEGORY) {
            $mmaPushNotifications.invalidateMessagePreferences().finally(function() {
                $mmaPushNotifications.getMessagePreferences();
            });
        } else if (name == $mmaPushNotifications.NOTIFICATION_CATEGORY) {
            $mmaPushNotifications.invalidateNotificationPreferences().finally(function() {
                $mmaPushNotifications.getNotificationPreferences();
            });
        }
    }

    fetchPreferences();

    // Refresh the list of preferences.
    $scope.refreshPreferences = function() {
        $mmaPushNotifications.invalidateAllPreferences().finally(function() {
            fetchPreferences().finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        });
    };

    // Change the current processor.
    $scope.changeProcessor = function(processor) {
        $scope.currentProcessor = processor;
        $scope.categories = $mmaPushNotifications.getProcessorCategories(processor.name, $scope.preferences.categories);
        $scope.currentProcessor.supported = $mmaPushNotificationsPreferencesDelegate.hasPreferenceHandler(processor.name);
    };

    // Open current processor's extra preferences.
    $scope.openProcessorPreferences = function() {
        if (!$scope.currentProcessor || !$scope.currentProcessor.hassettings || !$scope.currentProcessor.supported) {
            return;
        }

        $mmaPushNotificationsPreferencesDelegate.openPreferencesViewFor($scope.currentProcessor);
    };

    // Change the value of a certain preference.
    $scope.changePreference = function(notification, state, categoryName) {
        var processorState = notification.currentProcessor[state],
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

        processorState.updating = true;
        $mmUser.updateUserPreference(preferenceName, value).then(function() {
            // Update the category since it was modified.
            updateCategoryAfterDelay(categoryName);
        }).catch(function(message) {
            // Show error and revert change.
            $mmUtil.showErrorModal(message);
            notification.currentProcessor[state].checked = !notification.currentProcessor[state].checked;
        }).finally(function() {
            processorState.updating = false;
        });
    };

    // Disable all notifications changed.
    $scope.disableAll = function(disable) {
        var modal = $mmUtil.showModalLoading('mm.core.sending', true);
        $mmUser.updateUserPreferences([], disable).then(function() {
            // Disable all is present in both categories, update them both.
            updateCategoryAfterDelay($mmaPushNotifications.MESSAGE_CATEGORY);
            updateCategoryAfterDelay($mmaPushNotifications.NOTIFICATION_CATEGORY);
        }).catch(function(message) {
            // Show error and revert change.
            $mmUtil.showErrorModal(message);
            $scope.preferences.disableall = !$scope.preferences.disableall;
        }).finally(function() {
            modal.dismiss();
        });
    };

    // Block non-contacts changed.
    $scope.blockNonContacts = function(block) {
        var modal = $mmUtil.showModalLoading('mm.core.sending', true);
        $mmUser.updateUserPreference('message_blocknoncontacts', block ? 1 : 0).then(function() {
            // Update the message category since it was modified.
            updateCategoryAfterDelay($mmaPushNotifications.MESSAGE_CATEGORY);
        }).catch(function(message) {
            // Show error and revert change.
            $mmUtil.showErrorModal(message);
            $scope.preferences.blocknoncontacts = !$scope.preferences.blocknoncontacts;
        }).finally(function() {
            modal.dismiss();
        });
    };

    $scope.$on('$destroy', function() {
        // If there is a pending action to update a category, execute it right now.
        angular.forEach(updateTimeouts, function(updateTimeout, name) {
            $timeout.cancel(updateTimeout);
            updateCategory(name);
        });
    });
});
