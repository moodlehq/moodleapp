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


.constant('mmaPushNotificationsBadgeStore', 'mma_pushnotifications_badge')

.config(function($mmAppProvider, mmaPushNotificationsBadgeStore) {
    var stores = [
        {
            name: mmaPushNotificationsBadgeStore,
            keyPath: ['siteid', 'addon'],
            indexes: [
                {
                    name: 'siteid'
                },
                {
                    name: 'addon'
                }
            ]
        }
    ];
    $mmAppProvider.registerStores(stores);
})

/**
 * Push notifications factory.
 *
 * @module mm.addons.pushnotifications
 * @ngdoc service
 * @name $mmaPushNotifications
 */
.factory('$mmaPushNotifications', function($mmSite, $log, $cordovaPushV5, $mmText, $q, $cordovaDevice, $mmUtil, $mmSitesManager,
            mmCoreConfigConstants, $mmApp, $mmLocalNotifications, $mmPushNotificationsDelegate, mmaPushNotificationsComponent,
            mmaPushNotificationsBadgeStore) {
    $log = $log.getInstance('$mmaPushNotifications');

    var self = {},
        pushID;

    /**
     * Get the pushID for this device.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmaPushNotifications#getPushId
     * @return {String} Push ID.
     */
    self.getPushId = function() {
        return pushID;
    };

    /**
     * Returns whether or not the plugin is enabled for the current site.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmaPushNotifications#isPluginEnabled
     * @return {Boolean} True if enabled, false otherwise.
     */
    self.isPluginEnabled = function() {
        return $mmSite.wsAvailable('core_user_add_user_device')
                && $mmSite.wsAvailable('message_airnotifier_is_system_configured')
                && $mmSite.wsAvailable('message_airnotifier_are_notification_preferences_configured');
    };

    /**
     * Function called when a push notification is clicked. Redirect the user to the right state.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmaPushNotifications#notificationClicked
     * @param {Object} notification Notification.
     */
    self.notificationClicked = function(notification) {
        $mmApp.ready().then(function() {
            $mmPushNotificationsDelegate.clicked(notification);
        });
    };

    /**
     * This function is called when we receive a Notification from APNS or a message notification from GCM.
     * The app can be in foreground or background,
     * if we are in background this code is executed when we open the app clicking in the notification bar.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmaPushNotifications#onMessageReceived
     * @param {Object} notification Notification received.
     */
    self.onMessageReceived = function(notification) {
        var promise,
            data = notification ? notification.additionalData : {};

        if (data.site) {
            promise = $mmSitesManager.getSite(data.site); // Check if site exists.
        } else {
            promise = $q.when(); // No site specified, resolve.
        }

        promise.then(function() {
            if ($mmUtil.isTrueOrOne(data.foreground)) {
                // If the app is in foreground when the notification is received, it's not shown. Let's show it ourselves.
                if ($mmLocalNotifications.isAvailable()) {
                    var localNotif = {
                            id: 1,
                            at: new Date(),
                            data: {
                                notif: data.notif,
                                site: data.site
                            }
                        },
                        promises = [];

                    // Apply formatText to title and message.
                    promises.push($mmText.formatText(notification.title, true, true).then(function(formattedTitle) {
                        localNotif.title = formattedTitle;
                    }).catch(function() {
                        localNotif.title = notification.title;
                    }));

                    promises.push($mmText.formatText(notification.message, true, true).then(function(formattedMessage) {
                        localNotif.text = formattedMessage;
                    }).catch(function() {
                        localNotif.text = notification.message;
                    }));

                    $q.all(promises).then(function() {
                        $mmLocalNotifications.schedule(localNotif, mmaPushNotificationsComponent, data.site);
                    });
                }

                // Trigger a notification received event.
                $mmApp.ready().then(function() {
                    data.title = notification.title;
                    data.message = notification.message;
                    $mmPushNotificationsDelegate.received(data);
                });
            } else {
                // The notification was clicked. For compatibility with old push plugin implementation
                // we'll merge all the notification data in a single object.
                data.title = notification.title;
                data.message = notification.message;
                self.notificationClicked(data);
            }
        });
    };

    /**
     * Register a device in Apple APNS or Google GCM.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmaPushNotifications#registerDevice
     * @return {Promise} Promise resolved when the device is registered.
     */
    self.registerDevice = function() {
        try {
            var options = {
                android: {
                    senderID: mmCoreConfigConstants.gcmpn
                },
                ios: {
                    alert: true,
                    badge: true,
                    sound: true
                }
            };
            return $cordovaPushV5.initialize(options).then(function() {
                // Start listening for notifications and errors.
                $cordovaPushV5.onNotification();
                $cordovaPushV5.onError();

                // Register the device in GCM or APNS.
                return $cordovaPushV5.register().then(function(token) {
                    pushID = token;
                    return self.registerDeviceOnMoodle();
                });
            });
        } catch(ex) {}

        return $q.reject();
    };

    /**
     * Registers a device on current Moodle site.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmaPushNotifications#registerDeviceOnMoodle
     * @return {Promise}      Promise resolved when device is registered.
     */
    self.registerDeviceOnMoodle = function() {
        $log.debug('Register device on Moodle.');

        if (!$mmSite.isLoggedIn() || !pushID || !$mmApp.isDevice()) {
            return $q.reject();
        }

        var data = {
            appid:      mmCoreConfigConstants.app_id,
            name:       ionic.Platform.device().name || '',
            model:      $cordovaDevice.getModel(),
            platform:   $cordovaDevice.getPlatform(),
            version:    $cordovaDevice.getVersion(),
            pushid:     pushID,
            uuid:       $cordovaDevice.getUUID()
        };
        return $mmSite.write('core_user_add_user_device', data);
    };

    /**
     * Unregisters a device from a certain Moodle site.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmaPushNotifications#unregisterDeviceOnMoodle
     * @param {Object} site Site to unregister from.
     * @return {Promise}    Promise resolved when device is unregistered.
     */
    self.unregisterDeviceOnMoodle = function(site) {

        if (!site || !$mmApp.isDevice()) {
            return $q.reject();
        }

        $log.debug('Unregister device on Moodle: ' + site.id);

        var data = {
            appid: mmCoreConfigConstants.app_id,
            uuid:  $cordovaDevice.getUUID()
        };
        return site.write('core_user_remove_user_device', data).then(function(response) {
            if (!response || !response.removed) {
                return $q.reject();
            }
        });
    };

    /**
     * Update Counter for an addon. It will update the refered siteId counter and the total badge.
     * It will return the updated addon counter.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmaPushNotifications#updateAddonCounter
     * @param  {String} siteId Site ID.
     * @param  {String} addon  Registered addon name to set the badge number.
     * @param  {Number} number The number to be stored.
     * @return {Promise}       Promise resolved with the stored badge counter for the addon on the site.
     */
    self.updateAddonCounter = function(siteId, addon, number) {
        if ($mmPushNotificationsDelegate.isCounterHandlerRegistered(addon)) {
            siteId = siteId || $mmSite.getId();

            return saveAddonBadge(siteId, number, addon).then(function() {
                return self.updateSiteCounter(siteId).then(function() {
                    return number;
                });
            });
        }
        return $q.when(0);
    };

    /**
     * Update counter for a site using the stored addon data. It will update the total badge application number.
     * It will return the updated site counter.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmaPushNotifications#updateSiteCounter
     * @param  {String} siteId Site ID.
     * @return {Promise}       Promise resolved with the stored badge counter for the site.
     */
    self.updateSiteCounter = function(siteId) {
        var addons = $mmPushNotificationsDelegate.getCounterHandlers(),
            promises = [];

        angular.forEach(addons, function(addon) {
            promises.push(getAddonBadge(siteId, addon));
        });

        return $q.all(promises).then(function (counters) {
            var plus = false,
                total = counters.reduce(function (previous, counter) {
                    // Check if there is a plus sign at the end of the counter.
                    if (counter != parseInt(counter, 10)) {
                        plus = true;
                        counter = parseInt(counter, 10);
                    }
                    return previous + counter;
                }, 0);

            total = plus && total > 0 ? total + '+' : total;

            // Save the counter on site.
            return saveAddonBadge(siteId, total);
        }).then(function(siteTotal) {
            return self.updateAppCounter().then(function() {
                return siteTotal;
            });
        });
    };

    /**
     * Update total badge counter of the app.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmaPushNotifications#updateAppCounter
     * @return {Promise}        Promise resolved with the stored badge counter for the site.
     */
    self.updateAppCounter = function() {
        return $mmSitesManager.getSitesIds().then(function (sites) {
            var promises = [];
            angular.forEach(sites, function(siteId) {
                promises.push(getAddonBadge(siteId));
            });

            return $q.all(promises).then(function (counters) {
                var total = counters.reduce(function (previous, counter) {
                        // The app badge counter does not support strings, so parse to int before.
                        return previous + parseInt(counter, 10);
                    }, 0);

                // Set the app badge.
                return $cordovaPushV5.setBadgeNumber(total).then(function() {
                    return total;
                });
            });
        });
    };

    /**
     * Delete all badge records for a given site.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmaPushNotifications#cleanSiteCounters
     * @param  {String} siteId Site ID.
     * @return {Promise}       Resolved when done.
     */
    self.cleanSiteCounters = function(siteId) {
        var db = $mmApp.getDB();
        return db.whereEqual(mmaPushNotificationsBadgeStore, 'siteid', siteId).then(function (entries) {
            var promises =  [];
            angular.forEach(entries, function (entry) {
                promises.push(db.remove(mmaPushNotificationsBadgeStore, [entry.siteid, entry.addon]));
            });
            return $q.all(promises);
        }).finally(function() {
            self.updateAppCounter();
        });

    };

    /**
     * Get Sitebadge  counter from the database.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmaPushNotifications#getSiteCounter
     * @param  {String} siteId Site ID.
     * @return {Promise}       Promise resolved with the stored badge counter for the site.
     */
    self.getSiteCounter = function(siteId) {
        return getAddonBadge(siteId);
    };

    /**
     * Get the addon/site badge counter from the database.
     *
     * @param  {String} siteId   Site ID.
     * @param  {String} [addon]  Registered addon name. If not defined it will return the site total.
     * @return {Promise}         Promise resolved with the stored badge counter for the addon or site or 0 if none.
     */
    function getAddonBadge(siteId, addon) {
        addon = addon || 'site';

        return $mmApp.getDB().get(mmaPushNotificationsBadgeStore, [siteId, addon]).then(function(entry) {
             return (entry && entry.number) || 0;
        }).catch(function() {
            return 0;
        });
    }

    /**
     * Save the addon/site badgecounter on the database.
     *
     * @param  {String} siteId   Site ID.
     * @param  {Number} number   The number to be stored.
     * @param  {String} [addon]  Registered addon name. If not defined it will store the site total.
     * @return {Promise}         Promise resolved with the stored badge counter for the addon or site.
     */
    function saveAddonBadge(siteId, number, addon) {
        var entry = {
            siteid: siteId,
            addon: addon || 'site',
            number: number
        };

        return $mmApp.getDB().insert(mmaPushNotificationsBadgeStore, entry).then(function() {
            return number;
        });
    }

    return self;
});
