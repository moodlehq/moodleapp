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
 * Push notifications handlers factory.
 *
 * This factory holds the different handlers used for delegates.
 *
 * @module mm.addons.pushnotifications
 * @ngdoc service
 * @name $mmaPushNotificationsHandlers
 */
.factory('$mmaPushNotificationsHandlers', function($log, $mmaPushNotifications) {
    $log = $log.getInstance('$mmaPushNotificationsHandlers');

    var self = {};

    /**
     * Notification preferences handler.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmaPushNotificationsHandlers#notificationPreferences
     */
    self.notificationPreferences = function() {

        var self = {};

        /**
         * Check if handler is enabled.
         *
         * @return {Boolean} True if handler is enabled, false otherwise.
         */
        self.isEnabled = function() {
            return $mmaPushNotifications.isNotificationPreferencesEnabled();
        };

        /**
         * Get the controller.
         *
         * @return {Object} Controller.
         */
        self.getController = function() {
            return function($scope) {
                $scope.title = 'mma.pushnotifications.notificationpreferences';
                $scope.class = 'mma-pushnotifications-notificationpreferences-handler';
                $scope.state = 'site.pushnotifications-notificationpreferences';
            };
        };

        return self;
    };

    return self;
});
