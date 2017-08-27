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

angular.module('mm.addons.messageoutput_airnotifier')

/**
 * Controller to handle airnotifier devices.
 *
 * @module mm.addons.messageoutput_airnotifier
 * @ngdoc controller
 * @name mmaMessageOutputAirnotifierDevicesCtrl
 */
.controller('mmaMessageOutputAirnotifierDevicesCtrl', function($stateParams, $scope, $mmUtil, $translate, $timeout, $injector,
        $mmaMessageOutputAirnotifier) {

    // Use $injector since pushnotifications is an addon and it might not be in the app.
    var $mmaPushNotifications = $injector.get('$mmaPushNotifications'),
        updateTimeout;

    $scope.title = $stateParams.title || $translate.instant('mm.settings.processorsettings');

    function fetchDevices() {
        return $mmaMessageOutputAirnotifier.getUserDevices().then(function(devices) {
            var pushId;
            if ($mmaPushNotifications) {
                pushId = $mmaPushNotifications.getPushId();
            }

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

    // Update list of devices after a certain time. The purpose is to store the updated data, it won't be reflected in the view.
    function updateDevicesAfterDelay() {
        // Cancel pending updates.
        $timeout.cancel(updateTimeout);

        updateTimeout = $timeout(function() {
            updateTimeout = null;
            updateDevices();
        }, 5000);
    }

    // Fetch devices. The purpose is to store the updated data, it won't be reflected in the view.
    function updateDevices() {
        $mmaMessageOutputAirnotifier.invalidateUserDevices().finally(function() {
            $mmaMessageOutputAirnotifier.getUserDevices();
        });
    }

    fetchDevices();

    $scope.refreshDevices = function() {
        $mmaMessageOutputAirnotifier.invalidateUserDevices().finally(function() {
            fetchDevices().finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        });
    };

    // Enable or disable a certain device.
    $scope.enableDevice = function(device, enable) {
        device.updating = true;
        $mmaMessageOutputAirnotifier.enableDevice(device.id, enable).then(function() {
            // Update the list of devices since it was modified.
            updateDevicesAfterDelay();
        }).catch(function(message) {
            // Show error and revert change.
            $mmUtil.showErrorModal(message);
            device.enable = !device.enable;
        }).finally(function() {
            device.updating = false;
        });
    };

    $scope.$on('$destroy', function() {
        // If there is a pending action to update devices, execute it right now.
        if (updateTimeout) {
            $timeout.cancel(updateTimeout);
            updateDevices();
        }
    });
});
