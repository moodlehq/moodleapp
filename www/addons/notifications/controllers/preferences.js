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

angular.module('mm.addons.notifications')

/**
 * Controller to handle notification preferences.
 *
 * @module mm.addons.notifications
 * @ngdoc controller
 * @name mmaNotificationsPreferencesCtrl
 */
.controller('mmaNotificationsPreferencesCtrl', function($scope, $mmaNotifications, $mmUtil, $ionicPlatform, $mmUser, $mmConfig,
            $mmaMessageOutputDelegate, $q, $timeout, $mmSettingsHelper, mmCoreSettingsNotificationSound, $mmLocalNotifications,
            $mmEvents, mmCoreEventNotificationSoundChanged, $mmApp) {

    var updateTimeout;

    $scope.isTablet = $ionicPlatform.isTablet();
    $scope.notifPrefsEnabled = $mmaNotifications.isNotificationPreferencesEnabled();
    $scope.canChangeSound = $mmLocalNotifications.isAvailable() && !$mmApp.isDesktop();

    if ($scope.canChangeSound) {
        // Notification sound setting.
        $mmConfig.get(mmCoreSettingsNotificationSound, true).then(function(enabled) {
            $scope.notificationSound = enabled;
        });

        $scope.notificationSoundChanged = function(enabled) {
            $mmConfig.set(mmCoreSettingsNotificationSound, enabled);
            $mmEvents.trigger(mmCoreEventNotificationSoundChanged, enabled);
            $mmLocalNotifications.rescheduleAll();
        };
    }

    if (!$scope.notifPrefsEnabled) {
        // Notification preferences aren't enabled, stop.
        $scope.preferencesLoaded = true;
        return;
    }

    function fetchPreferences() {
        return $mmaNotifications.getNotificationPreferences().then(function(preferences) {
            if (!$scope.currentProcessor) {
                // Initialize current processor. Load "Mobile" (airnotifier) if available.
                $scope.currentProcessor = $mmSettingsHelper.getProcessor(preferences.processors, 'airnotifier');
            }

            if (!$scope.currentProcessor) {
                // Shouldn't happen.
                return $q.reject('No processor found');
            }

            preferences.disableall = !!preferences.disableall; // Convert to boolean.
            $scope.preferences = preferences;
            loadProcessor($scope.currentProcessor);
        }).catch(function(message) {
            $mmUtil.showErrorModal(message);
        }).finally(function() {
            $scope.preferencesLoaded = true;
        });
    }

    function loadProcessor(processor) {
        if (!processor) {
            return;
        }

        $scope.currentProcessor = processor;
        $scope.components = $mmSettingsHelper.getProcessorComponents(processor.name, $scope.preferences.components);
        processor.supported = $mmaMessageOutputDelegate.hasHandler(processor.name);
        if (processor.supported) {
            processor.preferencesLabel = $mmaMessageOutputDelegate.getPreferenceLabel(processor.name);
        }
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
        $mmaNotifications.invalidateNotificationPreferences().finally(function() {
            $mmaNotifications.getNotificationPreferences();
        });
    }

    fetchPreferences();

    // Refresh the list of preferences.
    $scope.refreshPreferences = function() {
        $mmaNotifications.invalidateNotificationPreferences().finally(function() {
            fetchPreferences().finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        });
    };

    // Change the current processor.
    $scope.changeProcessor = function(processor) {
        loadProcessor(processor);
    };

    // Open current processor's extra preferences.
    $scope.openProcessorPreferences = function() {
        if (!$scope.currentProcessor || !$scope.currentProcessor.hassettings || !$scope.currentProcessor.supported) {
            return;
        }

        $mmaMessageOutputDelegate.openPreferencesViewFor($scope.currentProcessor);
    };

    // Change the value of a certain preference.
    $scope.changePreference = function(notification, state) {
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
            // Update the preferences since they were modified.
            updatePreferencesAfterDelay();
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
            // Update the preferences since they were modified.
            updatePreferencesAfterDelay();
        }).catch(function(message) {
            // Show error and revert change.
            $mmUtil.showErrorModal(message);
            $scope.preferences.disableall = !$scope.preferences.disableall;
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
