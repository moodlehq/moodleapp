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
.controller('mmaPushNotificationsNotifPreferencesCtrl', function($scope, $mmaPushNotifications, $mmUtil, $ionicPlatform,
            $mmaPushNotificationsPreferencesDelegate) {

    $scope.isTablet = $ionicPlatform.isTablet();

    function fetchPreferences() {
        return $mmaPushNotifications.getNotificationPreferences().then(function(preferences) {
            if (!$scope.currentProcessor) {
                initCurrentProcessor(preferences.processors);
            }

            if (!$scope.currentProcessor) {
                // Shouldn't happen.
                return $q.reject('No processor found');
            }

            preferences.disableall = !!preferences.disableall; // Convert to boolean.
            $scope.preferences = preferences;
            $scope.components = $mmaPushNotifications.getProcessorComponents($scope.currentProcessor.name, preferences.components);
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

    fetchPreferences();

    $scope.refreshPreferences = function() {
        $mmaPushNotifications.invalidateNotificationPreferences().finally(function() {
            fetchPreferences().finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        });
    };

    $scope.changeProcessor = function(processor) {
        $scope.currentProcessor = processor;
        $scope.components = $mmaPushNotifications.getProcessorComponents(processor.name, $scope.preferences.components);
        $scope.currentProcessor.supported =
                    $mmaPushNotificationsPreferencesDelegate.hasPreferenceHandler($scope.currentProcessor.name);
    };

    $scope.openProcessorPreferences = function() {
        if (!$scope.currentProcessor || !$scope.currentProcessor.hassettings || !$scope.currentProcessor.supported) {
            return;
        }

        $mmaPushNotificationsPreferencesDelegate.openPreferencesViewFor($scope.currentProcessor);
    };
});
