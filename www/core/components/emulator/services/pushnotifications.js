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

angular.module('mm.core.emulator')

/**
 * This service handles the emulation of the Cordova PushNotifications plugin.
 *
 * @ngdoc service
 * @name $mmEmulatorPushNotifications
 * @module mm.core.emulator
 */
.factory('$mmEmulatorPushNotifications', function($log, $q, $window, $mmApp) {

    $log = $log.getInstance('$mmEmulatorPushNotifications');

    var self = {};

    /**
     * Load the emulation of the Cordova plugin.
     * Only some functions are supported.
     *
     * @module mm.core.emulator
     * @ngdoc method
     * @name $mmEmulatorPushNotifications#load
     * @return {Promise} Promise resolved when done.
     */
    self.load = function() {
        // Create the PushNotification object.
        var PushNotification = function(options) {};

        PushNotification.prototype.unregister = function(successCallback, errorCallback, options) {
            errorCallback && errorCallback('Unregister is only supported in mobile devices');
        };

        PushNotification.prototype.subscribe = function(topic, successCallback, errorCallback) {
            errorCallback && errorCallback('Suscribe is only supported in mobile devices');
        };

        PushNotification.prototype.unsubscribe = function(topic, successCallback, errorCallback) {
            errorCallback && errorCallback('Unsuscribe is only supported in mobile devices');
        };

        PushNotification.prototype.setApplicationIconBadgeNumber = function(successCallback, errorCallback, badge) {
            if (!$mmApp.isDesktop()) {
                errorCallback && errorCallback('setApplicationIconBadgeNumber is not supported in browser');
                return;
            }

            try {
                var app = require('electron').remote.app;
                if (app.setBadgeCount(badge)) {
                    successCallback && successCallback();
                } else {
                    errorCallback && errorCallback();
                }
            } catch(ex) {
                errorCallback && errorCallback(ex);
            }
        };

        PushNotification.prototype.getApplicationIconBadgeNumber = function(successCallback, errorCallback) {
            if (!$mmApp.isDesktop()) {
                errorCallback && errorCallback('getApplicationIconBadgeNumber is not supported in browser');
                return;
            }

            try {
                var app = require('electron').remote.app;
                successCallback && successCallback(app.getBadgeCount());
            } catch(ex) {
                errorCallback && errorCallback(ex);
            }
        };

        PushNotification.prototype.clearAllNotifications = function(successCallback, errorCallback) {
            errorCallback && errorCallback('clearAllNotifications is only supported in mobile devices');
        };

        PushNotification.prototype.on = function(eventName, callback) {};
        PushNotification.prototype.off = function(eventName, handle) {};
        PushNotification.prototype.emit = function() {};

        PushNotification.prototype.finish = function(successCallback, errorCallback, id) {
            errorCallback && errorCallback('finish is only supported in mobile devices');
        };

        // Create the visible PushNotification object.
        $window.PushNotification = {
            init: function(options) {
                return new PushNotification(options);
            },

            hasPermission: function(successCallback, errorCallback) {
                errorCallback && errorCallback('hasPermission is only supported in mobile devices');
            },

            PushNotification: PushNotification
        };

        return $q.when();
    };

    return self;
});
