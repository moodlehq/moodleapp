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

    var handlers = {},
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
        for (var name in handlers) {
            var callback = handlers[name];
            if (typeof callback == 'function') {
                var treated = callback(notification);
                if (treated) {
                    return; // Stop execution when notification is treated.
                }
            }
        }
    };

    /**
     * Register a push notifications handler. The handler will receive a notification to treat.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmPushNotificationsDelegate#registerHandler
     * @param {String} name       Handler's name.
     * @param {Function} callback The callback function. Will get as parameter the URL to handle.
     * @description
     * The handler should return true if the notification is the one expected, false otherwise.
     * @see {@link $mmPushNotificationsDelegate#clicked}
     */
    self.registerHandler = function(name, callback) {
        $log.debug("Registered handler '" + name + "' as push notification handler.");
        handlers[name] = callback;
    };

    return self;
});
