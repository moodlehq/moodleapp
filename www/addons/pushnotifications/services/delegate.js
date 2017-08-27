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
 * Service to handle push notifications clicks.
 *
 * @module mm.addons.pushnotifications
 * @ngdoc service
 * @name $mmPushNotificationsDelegate
 */
.factory('$mmPushNotificationsDelegate', function($log) {

    $log = $log.getInstance('$mmPushNotificationsDelegate');

    var clickHandlers = {},
        receiveHandlers = {},
        counterHandlers = {},
        self = {};

    /**
     * Function called when a push notification is clicked. Sends notification to handlers.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmPushNotificationsDelegate#clicked
     * @param {Object} notification Notification clicked.
     * @return {Void}
     */
    self.clicked = function(notification) {
        for (var name in clickHandlers) {
            var callback = clickHandlers[name];
            if (typeof callback == 'function') {
                var treated = callback(notification);
                if (treated) {
                    return; // Stop execution when notification is treated.
                }
            }
        }
    };

    /**
     * Function called when a push notification is received in foreground (cannot tell when it's received in background).
     * Sends notification to all handlers.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmPushNotificationsDelegate#received
     * @param {Object} notification Notification received.
     * @return {Void}
     */
    self.received = function(notification) {
        for (var name in receiveHandlers) {
            var callback = receiveHandlers[name];
            if (typeof callback == 'function') {
                callback(notification);
            }
        }
    };

    /**
     * Register a push notifications handler for CLICKS.
     * When a notification is clicked, the handler will receive a notification to treat.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmPushNotificationsDelegate#registerHandler
     * @param {String} name       Handler's name.
     * @param {Function} callback The callback function. Will get as parameter the clicked notification.
     * @description
     * The handler should return true if the notification is the one expected, false otherwise.
     * @see {@link $mmPushNotificationsDelegate#clicked}
     */
    self.registerHandler = function(name, callback) {
        $log.debug("Registered handler '" + name + "' as CLICK push notification handler.");
        clickHandlers[name] = callback;
    };

    /**
     * Register a push notifications handler for RECEIVE notifications in foreground (cannot tell when it's received in background).
     * When a notification is received, the handler will receive a notification to treat.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmPushNotificationsDelegate#registerReceiveHandler
     * @param {String} name       Handler's name.
     * @param {Function} callback The callback function. Will get as parameter the clicked notification.
     * @see {@link $mmPushNotificationsDelegate#received}
     */
    self.registerReceiveHandler = function(name, callback) {
        $log.debug("Registered handler '" + name + "' as RECEIVE push notification handler.");
        receiveHandlers[name] = callback;
    };

    /**
     * Unregister a push notifications handler for RECEIVE notifications.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmPushNotificationsDelegate#unregisterReceiveHandler
     * @param {String} name       Handler's name.
     */
    self.unregisterReceiveHandler = function(name) {
        $log.debug("Unregister handler '" + name + "' from RECEIVE push notification handlers.");
        delete receiveHandlers[name];
    };

    /**
     * Register a push notifications handler for update badge counter.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmPushNotificationsDelegate#registerCounterHandler
     * @param {String} name       Handler's name.
     */
    self.registerCounterHandler = function(name) {
        $log.debug("Registered handler '" + name + "' as badge counter handler.");
        counterHandlers[name] = name;
    };

    /**
     * Check if a counter handler is present.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmPushNotificationsDelegate#isCounterHandlerRegistered
     * @param {String} name       Handler's name.
     * @return {Boolean}  If handler name is present.
     */
    self.isCounterHandlerRegistered = function(name) {
        return typeof counterHandlers[name] != "undefined";
    };

    /**
     * Get all counter badge handlers.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmPushNotificationsDelegate#getCounterHandlers
     * @return {Object}  with all the handler names.
     */
    self.getCounterHandlers = function() {
        return counterHandlers;
    };

    return self;
});
