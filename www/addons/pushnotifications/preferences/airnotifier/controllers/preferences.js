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
 * @name mmaPushNotificationsAirnotifierPreferencesCtrl
 */
.controller('mmaPushNotificationsAirnotifierPreferencesCtrl', function($stateParams, $scope, $mmUtil, $translate,
        $mmaPushNotifications, $mmaPushNotificationPreferencesAirnotifier) {

    $scope.title = $stateParams.title || $translate.instant('mma.pushnotifications.processorsettings');

    function fetchDevices() {
        return $mmaPushNotificationPreferencesAirnotifier.getUserDevices().then(function(devices) {
            var pushId = $mmaPushNotifications.getPushId();

            // Convert enabled to boolean and search current device.
            angular.forEach(devices, function(device) {
                device.enable = !!device.enable;
                device.current = pushId && pushId == device.pushid;
            });

            $scope.devices = devices;
        }).catch(function(message) {
            $mmUtil.showErrorModal(message);
        }).finally(function() {
            $scope.devicesLoaded = true;
        });
    }

    fetchDevices();

    $scope.refreshDevices = function() {
        $mmaPushNotificationPreferencesAirnotifier.invalidateUserDevices().finally(function() {
            fetchDevices().finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        });
    };

    // Enable or disable a certain device.
    $scope.enableDevice = function(device, enable) {
        device.updating = true;
        $mmaPushNotificationPreferencesAirnotifier.enableDevice(device.id, enable).catch(function(message) {
            // Show error and revert change.
            $mmUtil.showErrorModal(message);
            device.enable = !device.enable;
        }).finally(function() {
            device.updating = false;
        });
    };

});
