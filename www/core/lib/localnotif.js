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

angular.module('mm.core')

// Stores used to create unique IDs for notifications.
.constant('mmCoreNotificationsSitesStore', 'notification_sites')
.constant('mmCoreNotificationsTypesStore', 'notification_types')

.config(function($mmAppProvider, mmCoreNotificationsSitesStore, mmCoreNotificationsTypesStore) {
    var stores = [
        {
            name: mmCoreNotificationsSitesStore,
            keyPath: 'id',
            indexes: [
                {
                    name: 'code',
                }
            ]
        },
        {
            name: mmCoreNotificationsTypesStore,
            keyPath: 'id',
            indexes: [
                {
                    name: 'code',
                }
            ]
        }
    ];
    $mmAppProvider.registerStores(stores);
})

/**
 * Factory to handle local notifications.
 *
 * @module mm.core
 * @ngdoc service
 * @name $mmLocalNotifications
 * @description
 * Provides methods to trigger notifications, listen clicks on them, etc.
 */
.factory('$mmLocalNotifications', function($log, $mmSitesManager, $mmSite, $cordovaLocalNotification, $mmApp,
        mmCoreNotificationsSitesStore, mmCoreNotificationsTypesStore) {

    $log = $log.getInstance('$mmLocalNotifications');

    var self = {},
        observers = {};

    /**
     * Get a code to create unique notifications. If there's no code assigned, create a new one.
     *
     * @param  {String} store Store to search in local DB.
     * @param  {String} id    ID of the element to get its code.
     * @return {Promise}      Promise resolved when the code is retrieved.
     */
    function getCode(store, id) {
        var db = $mmApp.getDB();

        return db.get(store, id).then(function(entry) {
            return entry.code;
        }, function() {
            // Site is not in the DB. Create a new ID for it.
            return db.query(store, undefined, 'code', true).then(function(entries) {
                var newid = 0;
                if (entries.length > 0) {
                    newid = parseInt(entries[0].code) + 1;
                }
                return db.insert(store, {id: id, code: newid}).then(function() {
                    return newid;
                });
            });
        });
    }

    /**
     * Get a site code to be used.
     * If it's the first time this site is used to send notifications, create a new code for it.
     *
     * @param  {String} [siteid] Site ID. If not defined, use current site.
     * @return {Promise}         Promise resolved when the site code is retrieved.
     */
    function getSiteCode(siteid) {
        siteid = siteid || $mmSite.getId();
        return getCode(mmCoreNotificationsSitesStore, siteid);
    }

    /**
     * Get a notification type code to be used.
     * If it's the first time this type is used to send notifications, create a new code for it.
     *
     * @param  {String} type Type name.
     * @return {Promise}     Promise resolved when the type code is retrieved.
     */
    function getTypeCode(type) {
        return getCode(mmCoreNotificationsTypesStore, type);
    }

    /**
     * Create a unique notification ID, trying to prevent collisions. Generated ID must be a Number (Android).
     * The generated ID shouldn't be higher than 2147483647 or it's going to cause problems in Android.
     * This function will prevent collisions and keep the number under Android limit if:
     *     -User has used less than 21 sites.
     *     -There are less than 11 types of events.
     *     -The notificationid passed as parameter is lower than 10000000.
     *
     * @param  {Number} notificationid Notification ID.
     * @param  {String} type           Type of the notification.
     * @param  {Number} [siteid]       Site ID. If not defined, use current site.
     * @return {Promise}               Promise resolved when the notification ID is generated.
     */
    function getUniqueNotificationId(notificationid, type, siteid) {

        return getSiteCode(siteid).then(function(sitecode) {
            return getTypeCode(type).then(function(typecode) {
                return sitecode * 100000000 + typecode * 10000000 + notificationid;
            });
        });
    }

    /**
     * Cancel a local notification.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmLocalNotifications#cancel
     * @param {Number} id       Notification id.
     * @param {String} type     Type of the notification.
     * @param {Number} [siteid] Site ID. If not defined, use current site.
     * @return {Promise}        Promise resolved when the notification is cancelled.
     */
    self.cancel = function(id, type, siteid) {
        var uniqueId = getUniqueNotificationId(id, type, siteid);
        return $cordovaLocalNotification.cancel(uniqueId);
    };

    /**
     * Returns whether local notifications plugin is installed.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmLocalNotifications#isAvailable
     * @return {Boolean} True when local notifications plugin is installed.
     */
    self.isAvailable = function() {
        return window.plugin && window.plugin.notification && window.plugin.notification.local ? true: false;
    };

    /**
     * Notify notification click to observers. If an observer "consumes" the notification, stops notifying.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmLocalNotifications#notifyClick
     * @param {Object} data Data received by the notification.
     */
    self.notifyClick = function(data) {
        var treated = false; // Once an observer accepts the data (return true) we stop notifying.
        angular.forEach(observers, function(callback, name) {
            if (!treated && typeof callback == 'function') {
                treated = callback(data);
            }
        });
    };

    /**
     * Schedule a local notification.
     * @see https://github.com/katzer/cordova-plugin-local-notifications/wiki/04.-Scheduling
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmLocalNotifications#schedule
     * @param {Object} notification Notification to schedule. Its ID must be lower than 10000000 and it should be unique
     *                              inside its type and site.
     * @param {String} type         Type of the notification. It is used to generate unique IDs.
     * @param {Number} [siteid]     Site ID. If not defined, use current site.
     * @return {Promise}            Promise resolved when the notification is scheduled.
     */
    self.schedule = function(notification, type, siteid) {
        notification.id = getUniqueNotificationId(notification.id, type, siteid);
        return $cordovaLocalNotification.add(notification);
    };

    /**
     * Register an observer to be notified when a notification is clicked.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmLocalNotifications#registerClick
     * @param {String} name       Observer's name. Must be unique.
     * @param {Function} callback Function to call with the data received by the notification. This function should return
     *                            true if it receives the data expected, so no more observers get notified.
     */
    self.registerClick = function(name, callback) {
        $log.debug("Register observer '"+name+"' for notification click.");
        observers[name] = callback;
    };

    return self;
})

.run(function($rootScope, $log, $mmLocalNotifications) {
    $log = $log.getInstance('$mmLocalNotifications');

     $rootScope.$on('$cordovaLocalNotification:clicked', function(e, notification, state) {
        if (notification && notification.id && notification.id.data) {
            $log.debug('Notification clicked: '+notification.id.data);
            var data = JSON.parse(notification.id.data);
            $mmLocalNotifications.notifyClick(data);
        }
    });
});
