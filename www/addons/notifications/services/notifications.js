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

angular.module('mm.addons.notifications')

/**
 * Service to handle notifications (messages).
 *
 * @module mm.addons.notifications
 * @ngdoc service
 * @name $mmaNotifications
 */
.factory('$mmaNotifications', function($q, $log, $mmSite, $mmSitesManager, $mmUser, mmaNotificationsListLimit) {

    $log = $log.getInstance('$mmaNotifications');

    var self = {};

    // Function to format notification data.
    function formatNotificationsData(notifications) {
        angular.forEach(notifications, function(notification) {
            // Set message to show.
            if (notification.contexturl && notification.contexturl.indexOf('/mod/forum/')) {
                notification.mobiletext = notification.smallmessage;
            } else {
                notification.mobiletext = notification.fullmessage;
            }

            // Try to set courseid the notification belongs to.
            var cid = notification.fullmessagehtml.match(/course\/view\.php\?id=([^"]*)/);
            if (cid && cid[1]) {
                notification.courseid = cid[1];
            }

            // Try to get the profile picture of the user.
            $mmUser.getProfile(notification.useridfrom, notification.courseid, true).then(function(user) {
                notification.profileimageurlfrom = user.profileimageurl;
            });
        });
    }

    /**
     * Get the cache key for the get notification preferences call.
     *
     * @return {String} Cache key.
     */
    function getNotificationPreferencesCacheKey() {
        return 'mmaNotifications:notificationPreferences';
    }

    /**
     * Get notification preferences.
     *
     * @module mm.addons.notifications
     * @ngdoc method
     * @name $mmaNotifications#getNotificationPreferences
     * @param  {String} [siteid] Site ID. If not defined, use current site.
     * @return {Promise}         Promise resolved with the notification preferences.
     */
    self.getNotificationPreferences = function(siteId) {
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
     * Get cache key for notification list WS calls.
     *
     * @return {String} Cache key.
     */
    function getNotificationsCacheKey() {
        return 'mmaNotifications:list';
    }

    /**
     * Get notifications from site.
     *
     * @module mm.addons.notifications
     * @ngdoc method
     * @name $mmaNotifications#getNotifications
     * @param {Boolean} read       True if should get read notifications, false otherwise.
     * @param {Number} limitFrom   Position of the first notification to get.
     * @param {Number} limitNumber Number of notifications to get.
     * @return {Promise}           Promise resolved with notifications.
     */
    self.getNotifications = function(read, limitFrom, limitNumber) {
        limitFrom = limitFrom || 0;
        limitNumber = limitNumber || mmaNotificationsListLimit;

        $log.debug('Get ' + (read ? 'read' : 'unread') + ' notifications from ' + limitFrom + '. Limit: ' + limitNumber);

        var data = {
            useridto: $mmSite.getUserId(),
            useridfrom: 0,
            type: 'notifications',
            read: read ? 1 : 0,
            newestfirst: 1,
            limitfrom: limitFrom,
            limitnum: limitNumber
        };
        var preSets = {
            cacheKey: getNotificationsCacheKey()
        };

        // Get unread notifications.
        return $mmSite.read('core_message_get_messages', data, preSets).then(function(response) {
            if (response.messages) {
                var notifications = response.messages;
                formatNotificationsData(notifications);
                return notifications;
            } else {
                return $q.reject();
            }
        });
    };

    /**
     * Get read notifications from site.
     *
     * @module mm.addons.notifications
     * @ngdoc method
     * @name $mmaNotifications#getReadNotifications
     * @param {Number} limitFrom   Position of the first notification to get.
     * @param {Number} limitNumber Number of notifications to get.
     * @return {Promise}           Promise resolved with notifications.
     */
    self.getReadNotifications = function(limitFrom, limitNumber) {
        return self.getNotifications(true, limitFrom, limitNumber);
    };

    /**
     * Get unread notifications from site.
     *
     * @module mm.addons.notifications
     * @ngdoc method
     * @name $mmaNotifications#getUnreadNotifications
     * @param {Number} limitFrom   Position of the first notification to get.
     * @param {Number} limitNumber Number of notifications to get.
     * @return {Promise}           Promise resolved with notifications.
     */
    self.getUnreadNotifications = function(limitFrom, limitNumber) {
        return self.getNotifications(false, limitFrom, limitNumber);
    };

    /**
     * Invalidate get notification preferences.
     *
     * @module mm.addons.notifications
     * @ngdoc method
     * @name $mmaNotifications#invalidateNotificationPreferences
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when data is invalidated.
     */
    self.invalidateNotificationPreferences = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getNotificationPreferencesCacheKey());
        });
    };

    /**
     * Invalidates notifications list WS calls.
     *
     * @module mm.addons.notifications
     * @ngdoc method
     * @name $mmaNotifications#invalidateNotificationsList
     * @return {Promise} Promise resolved when the list is invalidated.
     */
    self.invalidateNotificationsList = function() {
        return $mmSite.invalidateWsCacheForKey(getNotificationsCacheKey());
    };

    /**
     * Returns whether or not the notification preferences are enabled for the current site.
     *
     * @module mm.addons.notifications
     * @ngdoc method
     * @name $mmaNotifications#isNotificationPreferencesEnabled
     * @return {Boolean} True if enabled, false otherwise.
     */
    self.isNotificationPreferencesEnabled = function() {
        return $mmSite.wsAvailable('core_message_get_user_notification_preferences');
    };

    /**
     * Check if plugin is available.
     *
     * @module mm.addons.notifications
     * @ngdoc method
     * @name $mmaNotifications#isPluginEnabled
     * @return {Boolean} True if plugin is available, false otherwise.
     */
    self.isPluginEnabled = function() {
        return $mmSite.wsAvailable('core_message_get_messages');
    };

    /**
     * Check if plugin is available for a certain site.
     *
     * @module mm.addons.notifications
     * @ngdoc method
     * @name $mmaNotifications#isPluginEnabledForSite
     * @param {String} siteid Site ID.
     * @return {Promise}      Resolved when enabled, otherwise rejected.
     */
    self.isPluginEnabledForSite = function(siteid) {
        return $mmSitesManager.getSite(siteid).then(function(site) {
            if (!site.wsAvailable('core_message_get_messages')) {
                return $q.reject();
            }
        });
    };

    return self;
});
