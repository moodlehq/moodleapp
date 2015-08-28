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
.factory('$mmaPushNotifications', function($mmSite, $log, $cordovaPush, $mmConfig, $mmText, $q, $cordovaDevice, $mmEvents, $mmUtil,
            $mmApp, $mmLocalNotifications, $mmPushNotificationsDelegate, mmaPushNotificationsComponent) {
    $log = $log.getInstance('$mmaPushNotifications');

    var self = {},
        pushID;

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
     * @param {Object} data Notification data.
     */
    self.notificationClicked = function(data) {
        $mmApp.ready().then(function() {
            $mmPushNotificationsDelegate.clicked(data);
        });
    };

    /**
     * This function is called from the PushPlugin when we receive a Notification from GCM.
     * The app can be in foreground or background,
     * if we are in background this code is executed when we open the app clicking in the notification bar.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmaPushNotifications#onGCMReceived
     * @param {Object} notification Notification data.
     */
    self.onGCMReceived = function(notification) {
        $log.debug('GCM notification received. Type: '+notification.event);

        switch (notification.event) {
            case 'registered':
                if (notification.regid.length > 0) {
                    pushID = notification.regid;
                    return self.registerDeviceOnMoodle();
                } else {
                    $log.debug('Device NOT registered in GCM, invalid regid');
                    break;
                }

            case 'message':
                notification.payload.foreground = notification.foreground;
                return self.onMessageReceived(notification.payload);

            case 'error':
                $log.debug('Push messages error');
                break;

            default:
                $log.debug('Push unknown message');
        }
    };

    /**
     * This function is called when we receive a Notification from APNS or a message notification from GCM.
     * The app can be in foreground or background,
     * if we are in background this code is executed when we open the app clicking in the notification bar.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmaPushNotifications#onMessageReceived
     * @param {Object} data Notification data.
     */
    self.onMessageReceived = function(data) {
        if ($mmUtil.isTrueOrOne(data.foreground)) {
            // If the app is in foreground when the notification is received, it's not shown. Let's show it ourselves.
            if ($mmLocalNotifications.isAvailable()) {
                // Apply formatText to title and message.
                $mmText.formatText(data.title, true, true).then(function(formattedTitle) {
                    $mmText.formatText(data.message, true, true).then(function(formattedMessage) {
                        var localNotif = {
                            id: 1,
                            title: formattedTitle,
                            message: formattedMessage,
                            at: new Date(),
                            smallIcon: 'res://icon',
                            data: {
                                notif: data.notif,
                                site: data.site
                            }
                        };
                        $mmLocalNotifications.schedule(localNotif, mmaPushNotificationsComponent, data.site);
                    });
                });
            }
        } else {
            self.notificationClicked(data);
        }
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
            if (ionic.Platform.isIOS()) {
                return self._registerDeviceAPNS();
            } else if (ionic.Platform.isAndroid()) {
                return self._registerDeviceGCM();
            }
        } catch(ex) {}

        return $q.reject();
    };

    /**
     * Register a device in Apple APNS (Apple Push Notificaiton System) using the Phonegap PushPlugin.
     * It also registers the device in the Moodle site using the core_user_add_user_device WebService.
     * We need the device registered in Moodle so we can connect the device with the message output Moode plugin airnotifier.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmaPushNotifications#_registerDeviceAPNS
     * @return {Promise} Promise resolved when the device is registered.
     * @protected
     */
    self._registerDeviceAPNS = function() {
        var options = {
            alert: 'true',
            badge: 'true',
            sound: 'true'
        };
        return $cordovaPush.register(options).then(function(token) {
            pushID = token;
            return self.registerDeviceOnMoodle();
        }, function(error) {
            return $q.reject();
        });
    };

    /**
     * Register a device in Google GCM using the Phonegap PushPlugin.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmaPushNotifications#_registerDeviceGCM
     * @return {Promise} Promise resolved when the device is registered.
     * @protected
     */
    self._registerDeviceGCM = function() {
        return $mmConfig.get('gcmpn').then(function(gcmpn) {
            return $cordovaPush.register({
                senderID: gcmpn
            });
        });
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

        if (!$mmSite.isLoggedIn() || !pushID) {
            return $q.reject();
        }

        return $mmConfig.get('app_id').then(function(appid) {
            var data = {
                appid:      appid,
                name:       window.device.name || '',
                model:      $cordovaDevice.getModel(),
                platform:   $cordovaDevice.getPlatform(),
                version:    $cordovaDevice.getVersion(),
                pushid:     pushID,
                uuid:       $cordovaDevice.getUUID()
            };
            return $mmSite.write('core_user_add_user_device', data);
        });

    };

    return self;
});
