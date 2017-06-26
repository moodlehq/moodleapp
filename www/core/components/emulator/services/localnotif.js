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

.constant('mmCoreDesktopLocalNotificationsStore', 'desktop_local_notifications')

.config(function($mmAppProvider, mmCoreDesktopLocalNotificationsStore) {
    var stores = [
        {
            name: mmCoreDesktopLocalNotificationsStore, // Store to schedule notifications in desktop apps.
            keyPath: 'id',
            indexes: [
                {
                    name: 'triggered'
                }
            ]
        }
    ];
    $mmAppProvider.registerStores(stores);
})

/**
 * This service handles the emulation of the local notifications Cordova plugin in desktop apps.
 *
 * @ngdoc service
 * @name $mmEmulatorLocalNotifications
 * @module mm.core.emulator
 */
.factory('$mmEmulatorLocalNotifications', function($log, $q, $mmApp, $mmUtil, $timeout, $interval, $rootScope,
            $cordovaLocalNotification, mmCoreDesktopLocalNotificationsStore, mmCoreSecondsYear, mmCoreSecondsDay,
            mmCoreSecondsHour, mmCoreSecondsMinute) {

    $log = $log.getInstance('$mmEmulatorLocalNotifications');

    var self = {},
        scheduled = {},
        triggered = {},
        defaults = {
            text:  '',
            title: '',
            sound: '',
            badge: 0,
            id:    0,
            data:  undefined,
            every: undefined,
            at:    undefined
        };

    /**
     * Cancel a local notification.
     *
     * @param  {Number} id         Notification ID.
     * @param  {Boolean} omitEvent If true, the clear/cancel event won't be triggered.
     * @param  {[type]} eventName  Name of the event to trigger.
     * @return {Void}
     */
    function cancelNotification(id, omitEvent, eventName) {
        var notification = scheduled[id].notification;

        $timeout.cancel(scheduled[id].timeout);
        $interval.cancel(scheduled[id].interval);
        delete scheduled[id];
        delete triggered[id];

        removeNotification(id);

        if (!omitEvent) {
            $rootScope.$broadcast(eventName, notification, 'foreground');
        }
    }

    /**
     * Convert a list of IDs to numbers.
     * Code extracted from the Cordova plugin.
     *
     * @param  {Mixed[]} ids List of IDs.
     * @return {Number[]}    List of IDs as numbers.
     */
    function convertIds(ids) {
        var convertedIds = [];

        for (var i = 0; i < ids.length; i++) {
            convertedIds.push(Number(ids[i]));
        }

        return convertedIds;
    }

    /**
     * Convert the notification options to their required type.
     * Code extracted from the Cordova plugin.
     *
     * @param  {Object} options Notification options.
     * @return {Object}         Converted options.
     */
    function convertProperties(options) {
        if (options.id) {
            if (isNaN(options.id)) {
                options.id = defaults.id;
                $log.warn('Id is not a number: ' + options.id);
            } else {
                options.id = Number(options.id);
            }
        }

        if (options.title) {
            options.title = options.title.toString();
        }

        if (options.text) {
            options.text  = options.text.toString();
        }

        if (options.badge) {
            if (isNaN(options.badge)) {
                options.badge = defaults.badge;
                $log.warn('Badge number is not a number: ' + options.id);
            } else {
                options.badge = Number(options.badge);
            }
        }

        if (options.at) {
            if (typeof options.at == 'object') {
                options.at = options.at.getTime();
            }

            options.at = Math.round(options.at / 1000);
        }

        if (typeof options.data == 'object') {
            options.data = JSON.stringify(options.data);
        }

        return options;
    }

    /**
     * Get all the notification stored in local DB.
     *
     * @return {Promise} Promise resolved with the notifications.
     */
    function getAllNotifications() {
        return $mmApp.getDB().getAll(mmCoreDesktopLocalNotificationsStore);
    }

    /**
     * Get a set of notifications. If ids isn't specified, return all the notifications.
     *
     * @param  {Number[]} [ids]         Ids of notifications to get. If not specified, get all notifications.
     * @param  {Boolean} [getScheduled] Get scheduled notifications.
     * @param  {Boolean} [getTriggered] Get triggered notifications.
     * @return {Object[]}               List of notifications.
     */
    function getNotifications(ids, getScheduled, getTriggered) {
        var notifications = [];

        if (getScheduled) {
            angular.forEach(scheduled, function(entry, id) {
                if (!ids || ids.indexOf(id) != -1) {
                    notifications.push(entry.notification);
                }
            });
        }

        if (getTriggered) {
            angular.forEach(triggered, function(notification, id) {
                if ((!getScheduled || !scheduled[id]) && (!ids || ids.indexOf(id) != -1)) {
                    notifications.push(notification);
                }
            });
        }

        return notifications;
    }

    /**
     * Given an object of options and a list of properties, return the first property that exists.
     * Code extracted from the Cordova plugin.
     *
     * @param  {Object} options Notification options.
     * @return {Mixed}          First value found.
     */
    function getValueFor(options) {
        var keys = Array.apply(null, arguments).slice(1);

        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];

            if (options.hasOwnProperty(key)) {
                return options[key];
            }
        }
    }

    /**
     * Load the emulation of the Cordova plugin. Only for desktop apps.
     *
     * @module mm.core.emulator
     * @ngdoc method
     * @name $mmEmulatorLocalNotifications#load
     * @return {Promise} Promise resolved when done.
     */
    self.load = function() {
        if (!$mmApp.isDesktop()) {
            return $q.when();
        }

        // Redefine $cordovaLocalNotification methods instead of the core plugin (window.cordova.plugins.notification.local)
        // because creating window.cordova breaks the app (it thinks it's a real device).
        $cordovaLocalNotification.schedule = function(notifications, scope, isUpdate) {
            var promises = [];

            notifications = Array.isArray(notifications) ? notifications : [notifications];

            angular.forEach(notifications, function(notification) {
                mergeWithDefaults(notification);
                convertProperties(notification);

                // Cancel current notification if exists.
                $cordovaLocalNotification.cancel(notification.id, null, true);

                // Store the notification in the scheduled list and in the DB.
                scheduled[notification.id] = {
                    notification: notification
                };
                promises.push(storeNotification(notification, false));

                // Schedule the notification.
                var toTrigger = notification.at * 1000 - Date.now();
                scheduled[notification.id].timeout = $timeout(function trigger() {
                    // Trigger the notification.
                    var notifInstance = new Notification(notification.title, {
                        body: notification.text
                    });

                    // Store the notification as triggered. Don't remove it from scheduled, it's how the plugin works.
                    triggered[notification.id] = notification;
                    storeNotification(notification, true);

                    // Launch the trigger event.
                    $rootScope.$broadcast('$cordovaLocalNotification:trigger', notification, 'foreground');

                    // Listen for click events.
                    notifInstance.onclick = function() {
                        $rootScope.$broadcast('$cordovaLocalNotification:click', notification, 'foreground');
                    };

                    if (notification.every && scheduled[notification.id] && !scheduled[notification.id].interval) {
                        var interval = parseInterval(notification.every);
                        if (interval > 0) {
                            scheduled[notification.id].interval = $interval(trigger, interval);
                        }
                    }
                }, toTrigger);

                // Launch the scheduled/update event.
                var eventName = isUpdate ? 'update' : 'schedule';
                $rootScope.$broadcast('$cordovaLocalNotification:' + eventName, notification, 'foreground');
            });

            return $q.when();
        };

        $cordovaLocalNotification.update = function(notifications) {
            // Just schedule them again, since scheduling cancels the existing one.
            return $cordovaLocalNotification.schedule(notifications, null, true);
        };

        $cordovaLocalNotification.clear = function(ids, scope, omitEvent) {
            var promises = [];

            ids = Array.isArray(ids) ? ids : [ids];
            ids = convertIds(ids);

            // Clear the notifications.
            angular.forEach(ids, function(id) {
                // Cancel only the notifications that aren't repeating.
                if (scheduled[id] && scheduled[id].notification && !scheduled[id].notification.every) {
                    promises.push(cancelNotification(id, omitEvent, '$cordovaLocalNotification:clear'));
                }
            });

            return $q.all(promises);
        };

        $cordovaLocalNotification.clearAll = function(scope, omitEvent) {
            var ids = Object.keys(scheduled);
            return $cordovaLocalNotification.clear(ids, scope, omitEvent).then(function() {
                if (!omitEvent) {
                    $rootScope.$broadcast('$cordovaLocalNotification:clearall', 'foreground');
                }
            });
        };

        $cordovaLocalNotification.cancel = function(ids, scope, omitEvent) {
            var promises = [];

            ids = Array.isArray(ids) ? ids : [ids];
            ids = convertIds(ids);

            // Cancel the notifications.
            angular.forEach(ids, function(id) {
                if (scheduled[id]) {
                    promises.push(cancelNotification(id, omitEvent, '$cordovaLocalNotification:cancel'));
                }
            });

            return $q.all(promises);
        };

        $cordovaLocalNotification.cancelAll = function(scope, omitEvent) {
            var ids = Object.keys(scheduled);
            return $cordovaLocalNotification.cancel(ids, scope, omitEvent).then(function() {
                if (!omitEvent) {
                    $rootScope.$broadcast('$cordovaLocalNotification:cancelall', 'foreground');
                }
            });
        };

        $cordovaLocalNotification.isPresent = function(id) {
            return $q.when(!!scheduled[id] || !!triggered[notification.id]);
        };

        $cordovaLocalNotification.isScheduled = function(id) {
            return $q.when(!!scheduled[id]);
        };

        $cordovaLocalNotification.isTriggered = function(id) {
            return $q.when(!!triggered[notification.id]);
        };

        $cordovaLocalNotification.hasPermission = function() {
            return $q.when(true);
        };

        $cordovaLocalNotification.registerPermission = function() {
            return $q.when(true);
        };

        $cordovaLocalNotification.getAllIds = function() {
            return $q.when($mmUtil.mergeArraysWithoutDuplicates(Object.keys(scheduled), Object.keys(triggered)));
        };
        $cordovaLocalNotification.getIds = $cordovaLocalNotification.getAllIds;

        $cordovaLocalNotification.getScheduledIds = function() {
            return $q.when(Object.keys(scheduled));
        };

        $cordovaLocalNotification.getTriggeredIds = function() {
            return $q.when(Object.keys(triggered));
        };

        $cordovaLocalNotification.get = function(ids) {
            ids = Array.isArray(ids) ? ids : [ids];
            ids = convertIds(ids);
            return $q.when(getNotifications(ids, true, true));
        };

        $cordovaLocalNotification.getAll = function() {
            return $q.when(getNotifications(null, true, true));
        };

        $cordovaLocalNotification.getScheduled = function(ids) {
            ids = Array.isArray(ids) ? ids : [ids];
            ids = convertIds(ids);
            return $q.when(getNotifications(ids, true, false));
        };

        $cordovaLocalNotification.getAllScheduled = function() {
            return $q.when(getNotifications(null, true, false));
        };

        $cordovaLocalNotification.getTriggered = function(ids) {
            ids = Array.isArray(ids) ? ids : [ids];
            ids = convertIds(ids);
            return $q.when(getNotifications(ids, false, true));
        };

        $cordovaLocalNotification.getAllTriggered = function() {
            return $q.when(getNotifications(null, false, true));
        };

        $cordovaLocalNotification.getDefaults = function() {
            return defaults;
        };

        $cordovaLocalNotification.setDefaults = function(newDefaults) {
            for (var key in defaults) {
                if (newDefaults.hasOwnProperty(key)) {
                    defaults[key] = newDefaults[key];
                }
            }
        };

        // App is being loaded, re-schedule all the notifications that were scheduled before.
        return getAllNotifications().catch(function() {
            return [];
        }).then(function(notifications) {
            angular.forEach(notifications, function(notification) {
                if (notification.triggered) {
                    // Notification was triggered already, store it in memory but don't schedule it again.
                    delete notification.triggered;
                    scheduled[notification.id] = {
                        notification: notification
                    };
                    triggered[notification.id] = notification;
                } else {
                    // Schedule the notification again unless it should have been triggered more than an hour ago.
                    delete notification.triggered;
                    notification.at = notification.at * 1000;
                    if (notification.at - Date.now() > - mmCoreSecondsHour * 1000) {
                        $cordovaLocalNotification.schedule(notification);
                    }
                }
            });
        });
    };

    /**
     * Merge notification options with default values.
     * Code extracted from the Cordova plugin.
     *
     * @param  {Object} options Notification options.
     * @return {Object}         Merged options.
     */
    function mergeWithDefaults(options) {
        options.at   = getValueFor(options, 'at', 'firstAt', 'date');
        options.text = getValueFor(options, 'text', 'message');
        options.data = getValueFor(options, 'data', 'json');

        if (defaults.hasOwnProperty('autoClear')) {
            options.autoClear = getValueFor(options, 'autoClear', 'autoCancel');
        }

        if (options.autoClear !== true && options.ongoing) {
            options.autoClear = false;
        }

        if (options.at === undefined || options.at === null) {
            options.at = new Date();
        }

        for (var key in defaults) {
            if (options[key] === null || options[key] === undefined) {
                if (options.hasOwnProperty(key) && ['data','sound'].indexOf(key) > -1) {
                    options[key] = undefined;
                } else {
                    options[key] = defaults[key];
                }
            }
        }

        for (key in options) {
            if (!defaults.hasOwnProperty(key)) {
                delete options[key];
                $log.warn('Unknown property: ' + key);
            }
        }

        return options;
    }

    /**
     * Parse a interval and convert it to a number of milliseconds (0 if not valid).
     * Code extracted from the Cordova plugin.
     *
     * @param  {String} every Interval to convert.
     * @return {Number}       Number of milliseconds of the interval-
     */
    function parseInterval(every) {
        var interval;

        every = String(every).toLowerCase();

        if (!every || every == 'undefined') {
            interval = 0;
        } else if (every == 'second') {
            interval = 1000;
        } else if (every == 'minute') {
            interval = mmCoreSecondsMinute * 1000;
        } else if (every == 'hour') {
            interval = mmCoreSecondsHour * 1000;
        } else if (every == 'day') {
            interval = mmCoreSecondsDay * 1000;
        } else if (every == 'week') {
            interval = mmCoreSecondsDay * 7 * 1000;
        } else if (every == 'month') {
            interval = mmCoreSecondsDay * 31 * 1000;
        } else if (every == 'quarter') {
            interval = mmCoreSecondsHour * 2190 * 1000;
        } else if (every == 'year') {
            interval = mmCoreSecondsYear * 1000;
        } else {
            interval = parseInt(every, 10);
            if (isNaN(interval)) {
                interval = 0;
            } else {
                interval *= 60000;
            }
        }

        return interval;
    }

    /**
     * Remove a notification from local DB.
     *
     * @param  {Number} id ID of the notification.
     * @return {Promise}   Promise resolved when done.
     */
    function removeNotification(id) {
        return $mmApp.getDB().remove(mmCoreDesktopLocalNotificationsStore, id);
    }

    /**
     * Store a notification in local DB.
     *
     * @param  {Object} notification Notification to store.
     * @param  {Boolean} triggered   Whether the notification has been triggered.
     * @return {Promise}             Promise resolved when stored.
     */
    function storeNotification(notification, triggered) {
        notification = angular.copy(notification);
        notification.triggered = !!triggered;
        return $mmApp.getDB().insert(mmCoreDesktopLocalNotificationsStore, notification);
    }

    return self;
});
