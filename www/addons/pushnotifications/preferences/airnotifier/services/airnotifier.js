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
 * Airnotifier notification preferences factory.
 *
 * @module mm.addons.pushnotifications
 * @ngdoc service
 * @name $mmaPushNotificationPreferencesAirnotifier
 */
.factory('$mmaPushNotificationPreferencesAirnotifier', function($mmSite, $log, $mmSitesManager, mmCoreConfigConstants) {
    $log = $log.getInstance('$mmaPushNotificationPreferencesAirnotifier');

    var self = {};

    /**
     * Get the cache key for the get user devices call.
     *
     * @return {String} Cache key.
     */
    function getUserDevicesCacheKey() {
        return 'mmaPushNotifications:userDevices';
    }

    /**
     * Get notification preferences.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmaPushNotificationPreferencesAirnotifier#getUserDevices
     * @param  {String} [siteid] Site ID. If not defined, use current site.
     * @return {Promise}         Promise resolved with the devices.
     */
    self.getUserDevices = function(siteId) {
        $log.debug('Get user devices');

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var data = {
                    appid: mmCoreConfigConstants.app_id
                },
                preSets = {
                    cacheKey: getUserDevicesCacheKey()
                };

            return site.read('message_airnotifier_get_user_devices', data, preSets).then(function(data) {
                return data.devices;
            });
        });
    };

    /**
     * Invalidate get user devices.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmaPushNotificationPreferencesAirnotifier#invalidateUserDevices
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when data is invalidated.
     */
    self.invalidateUserDevices = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getUserDevicesCacheKey());
        });
    };

    /**
     * Returns whether or not the plugin is enabled for the current site.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmaPushNotificationPreferencesAirnotifier#isEnabled
     * @return {Boolean} True if enabled, false otherwise.
     */
    self.isEnabled = function() {
        return $mmSite.wsAvailable('message_airnotifier_enable_device') &&
                $mmSite.wsAvailable('message_airnotifier_get_user_devices');
    };

    return self;
});
