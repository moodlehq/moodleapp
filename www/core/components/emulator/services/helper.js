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

.constant('mmCoreEmulatorLastReceivedNotificationStore', 'mm_emulator_last_received_notification')

.config(function($mmSitesFactoryProvider, mmCoreEmulatorLastReceivedNotificationStore) {
    var stores = [
        {
            name: mmCoreEmulatorLastReceivedNotificationStore,
            keyPath: 'component' // Only 1 entry per component.
        }
    ];
    $mmSitesFactoryProvider.registerStores(stores);
})

.factory('$mmEmulatorHelper', function($log, $mmSitesManager, $mmApp, $q, $mmLocalNotifications, $mmUtil, mmCoreSecondsDay,
            mmCoreEmulatorLastReceivedNotificationStore) {

    $log = $log.getInstance('$mmEmulatorHelper');

    var self = {};

    /**
     * Check if there are new notifications, triggering a local notification if found.
     * Only for desktop apps since they don't support push notifications.
     *
     * @module mm.core.emulator
     * @ngdoc method
     * @name $mmEmulatorHelper#checkNewNotifications
     * @param {String} [siteId] Site ID to check. If not defined, check all sites.
     * @return {Promise}        Promise resolved when done.
     */
    self.checkNewNotifications = function(component, fetchFn, getDataFn, siteId) {
        if (!$mmApp.isDesktop() || !$mmLocalNotifications.isAvailable()) {
            return $q.when();
        }

        if (!$mmApp.isOnline()) {
            $log.debug('Cannot check push notifications because device is offline.');
            return $q.reject();
        }

        var promise;
        if (!siteId) {
            // No site ID defined, check all sites.
            promise = $mmSitesManager.getSitesIds();
        } else {
            promise = $q.when([siteId]);
        }

        return promise.then(function(siteIds) {
            var sitePromises = [];

            angular.forEach(siteIds, function(siteId) {
                // Check new notifications for each site.
                sitePromises.push(checkNewNotificationsForSite(component, fetchFn, getDataFn, siteId));
            });

            return $q.all(sitePromises);
        });
    };

    /**
     * Check if there are new notifications for a certain site, triggering a local notification if found.
     *
     * @param {String} siteId Site ID to check.
     * @return {Promise}      Promise resolved when done.
     */
    function checkNewNotificationsForSite(component, fetchFn, getDataFn, siteId) {
        // Get the last received notification in the app.
        return self.getLastReceivedNotification(component, siteId).then(function(lastNotification) {
            // Now fetch the latest notifications from the server.
            return fetchFn(siteId).then(function(notifications) {
                if (!lastNotification || !notifications.length) {
                    // No last notification stored (first call) or no new notifications. Stop.
                    return;
                }

                var notification = notifications[0];

                if (notification.id == lastNotification.id || notification.timecreated <= lastNotification.timecreated ||
                        $mmUtil.timestamp() - notification.timecreated > mmCoreSecondsDay) {
                    // There are no new notifications or the newest one happened more than a day ago, stop.
                    return;
                }

                // There is a new notification, show it.
                return $q.when(getDataFn(notification)).then(function(titleAndText) {
                    var localNotif = {
                            id: 1,
                            at: new Date(),
                            title: titleAndText.title,
                            text: titleAndText.text,
                            data: {
                                notif: notification,
                                site: siteId
                            }
                        };

                    $mmLocalNotifications.schedule(localNotif, component, siteId);
                });
            });
        });
    }


    /**
     * Get the last notification received in a certain site for a certain component.
     *
     * @module mm.core.emulator
     * @ngdoc method
     * @name $mmEmulatorHelper#getLastReceivedNotification
     * @param  {String} component Component of the notification to get.
     * @param  {String} siteId    Site ID of the notification.
     * @return {Promise}          Promise resolved with the notification or false if not found.
     */
    self.getLastReceivedNotification = function(component, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().get(mmCoreEmulatorLastReceivedNotificationStore, component);
        }).catch(function() {
            return false;
        });
    };

    /**
     * Check if the app is running in a Linux environment.
     *
     * @module mm.core.emulator
     * @ngdoc method
     * @name $mmEmulatorHelper#isLinux
     * @return {Boolean} Whether it's running in a Linux environment.
     */
    self.isLinux = function() {
        try {
            var os = require('os');
            return os.platform().indexOf('linux') === 0;
        } catch(ex) {
            return false;
        }
    };

    /**
     * Check if the app is running in a Mac OS environment.
     *
     * @module mm.core.emulator
     * @ngdoc method
     * @name $mmEmulatorHelper#isMac
     * @return {Boolean} Whether it's running in a Mac OS environment.
     */
    self.isMac = function() {
        try {
            var os = require('os');
            return os.platform().indexOf('darwin') === 0;
        } catch(ex) {
            return false;
        }
    };

    /**
     * Check if the app is running in a Windows environment.
     *
     * @module mm.core.emulator
     * @ngdoc method
     * @name $mmEmulatorHelper#isWindows
     * @return {Boolean} Whether it's running in a Windows environment.
     */
    self.isWindows = function() {
        try {
            var os = require('os');
            return os.platform().indexOf('win') === 0;
        } catch(ex) {
            return false;
        }
    };

    /**
     * Store the last notification received in a certain site.
     *
     * @module mm.core.emulator
     * @ngdoc method
     * @name $mmEmulatorHelper#storeLastReceivedNotification
     * @param  {String} component    Component of the notification to store.
     * @param  {Object} notification Notification to store.
     * @param  {String} siteId       Site ID of the notification.
     * @return {Promise}             Promise resolved when done.
     */
    self.storeLastReceivedNotification = function(component, notification, siteId) {
        if (!notification) {
            // No notification, store a fake one.
            notification = {id: -1, timecreated: 0};
        }
        notification.component = component;

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().insert(mmCoreEmulatorLastReceivedNotificationStore, notification);
        });
    };

    return self;
});
