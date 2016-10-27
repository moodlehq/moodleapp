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
 * Push notifications factory.
 *
 * @module mm.addons.pushnotifications
 * @ngdoc service
 * @name $mmaPushNotifications
 */
.factory('$mmaPushNotifications', function($mmSite, $log, $cordovaPushV5, $mmText, $q, $cordovaDevice, $mmUtil, $mmSitesManager,
            mmCoreConfigConstants, $mmApp, $mmLocalNotifications, $mmPushNotificationsDelegate, mmaPushNotificationsComponent) {
    $log = $log.getInstance('$mmaPushNotifications');

    var self = {},
        pushID;

    /**
     * Get the cache key for the get notification preferences call.
     *
     * @return {String} Cache key.
     */
    function getNotificationPreferencesCacheKey() {
        return 'mmaPushNotifications:notificationPreferences';
    }

    /**
     * Get notification preferences.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmaPushNotifications#getNotificationPreferences
     * @param  {String} [siteid] Site ID. If not defined, use current site.
     * @return {Promise}         Promise resolved with the notification preferences.
     */
    self.getNotificationPreferences = function(siteId) {
        siteId = siteId || $mmSite.getId();

        $log.debug('Get notification preferences');

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var preSets = {
                    cacheKey: getNotificationPreferencesCacheKey()
                };

            return site.read('core_message_get_user_notification_preferences', {}, preSets).then(function(data) {
                return data.preferences;
            });
        });
    };

    /**
     * Return the components and notifications that have a certain processor.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmaPushNotifications#getProcessorComponents
     * @param  {String} processor    Name of the processor to filter.
     * @param  {Object[]} components Array of components.
     * @return {Object[]}            Filtered components.
     */
    self.getProcessorComponents = function(processor, components) {
        var result = [];

        angular.forEach(components, function(component) {

            // Create a copy of the component with an empty list of notifications.
            var componentCopy = angular.copy(component);
            componentCopy.notifications = [];

            angular.forEach(component.notifications, function(notification) {
                var hasProcessor = false;
                for (var i = 0, len = notification.processors.length; i < len; i++) {
                    var proc = notification.processors[i];
                    if (proc.name == processor) {
                        hasProcessor = true;
                        notification.currentProcessor = proc;
                        break;
                    }
                }

                if (hasProcessor) {
                    // Add the notification.
                    componentCopy.notifications.push(notification);
                }
            });

            if (componentCopy.notifications.length) {
                // At least 1 notification added, add the component to the result.
                result.push(componentCopy);
            }
        });

        return result;
    };

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
     * Invalidate get notification preferences.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmaPushNotifications#invalidateNotificationPreferences
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when data is invalidated.
     */
    self.invalidateNotificationPreferences = function(siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getNotificationPreferencesCacheKey());
        });
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
     * Returns whether or not the notification preferences are enabled for the current site.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmaPushNotifications#isNotificationPreferencesEnabled
     * @return {Boolean} True if enabled, false otherwise.
     */
    self.isNotificationPreferencesEnabled = function() {
        return $mmSite.wsAvailable('core_message_get_user_notification_preferences');
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

    return self;
});
