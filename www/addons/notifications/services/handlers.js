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
 * Notifications handlers factory.
 *
 * This factory holds the different handlers used for delegates.
 *
 * @module mm.addons.notifications
 * @ngdoc service
 * @name $mmaNotificationsHandlers
 */
.factory('$mmaNotificationsHandlers', function($log, $mmaNotifications, $mmEvents, $mmSitesManager, $mmUtil, $mmSite,
        mmaNotificationsReadChangedEvent, mmaNotificationsReadCronEvent, $mmAddonManager, $mmApp, $mmLocalNotifications,
        $mmEmulatorHelper, $mmText, mmaNotificationsPushSimulationComponent) {
    $log = $log.getInstance('$mmaNotificationsHandlers');

    var self = {};

    /**
     * Get the latest unread notifications from a site.
     *
     * @param  {String} siteId Site ID.
     * @return {Promise}       Promise resolved with the notifications.
     */
    function fetchNotifications(siteId) {
        return $mmaNotifications.getUnreadNotifications(0, undefined, true, false, true, siteId);
    }

    /**
     * Given a notification, return the title and the text for the notification.
     *
     * @param  {Object} notification Notification.
     * @return {Object}              Object with title and text.
     */
    function getTitleAndText(notification) {
        var data = {
                title: notification.userfromfullname,
                text: notification.mobiletext.replace(/-{4,}/ig, '')
            };
        data.text = $mmText.replaceNewLines(data.text, '<br>');

        return data;
    }

    /**
     * Side menu nav handler.
     *
     * @module mm.addons.notifications
     * @ngdoc method
     * @name $mmaNotificationsHandlers#sideMenuNav
     */
    self.sideMenuNav = function() {

        var self = {};

        /**
         * Check if handler is enabled.
         *
         * @return {Boolean} True if handler is enabled, false otherwise.
         */
        self.isEnabled = function() {
            return $mmaNotifications.isPluginEnabled();
        };

        /**
         * Get the controller.
         *
         * @return {Object} Controller.
         */
        self.getController = function() {

            /**
             * Side menu nav handler controller.
             *
             * @module mm.addons.notifications
             * @ngdoc controller
             * @name $mmaNotificationsHandlers#sideMenuNav:controller
             */
            return function($scope) {
                var $mmPushNotificationsDelegate = $mmAddonManager.get('$mmPushNotificationsDelegate'),
                    $mmaPushNotifications = $mmAddonManager.get('$mmaPushNotifications'),
                    readChangedObserver, cronObserver;

                $scope.icon = 'ion-ios-bell';
                $scope.title = 'mma.notifications.notifications';
                $scope.state = 'site.notifications';
                $scope.class = 'mma-notifications-handler';

                if ($mmaNotifications.isNotificationCountEnabled(true)) {
                    $scope.loading = true;

                    updateUnreadNotificationsCount().finally(function() {
                        $scope.loading = false;
                    });

                    readChangedObserver = $mmEvents.on(mmaNotificationsReadChangedEvent, function(data) {
                        if (data && $mmSitesManager.isCurrentSite(data.siteid)) {
                            updateUnreadNotificationsCount(data.siteid);
                        }
                    });

                    cronObserver = $mmEvents.on(mmaNotificationsReadCronEvent, function(data) {
                        if (data && $mmSitesManager.isCurrentSite(data.siteid)) {
                            updateUnreadNotificationsCount(data.siteid);
                        }
                    });

                    // If a message push notification is received, refresh the count.
                    if ($mmPushNotificationsDelegate) {
                        $mmPushNotificationsDelegate.registerReceiveHandler('mmaNotifications:sidemenu', function(notification) {
                            // New message received. If it's from current site, refresh the data.
                            if ($mmUtil.isTrueOrOne(notification.notif) && $mmSitesManager.isCurrentSite(notification.site)) {
                                updateUnreadNotificationsCount(notification.site);
                            }
                        });

                        // Register Badge counter.
                        $mmPushNotificationsDelegate.registerCounterHandler('mmaNotifications');
                    }

                    function updateUnreadNotificationsCount(siteId) {
                        siteId = siteId || $mmSite.getId();
                        return $mmaNotifications.getUnreadNotificationsCount(undefined, siteId).then(function(unread) {
                            // Leave badge enter if there is a 0+ or a 0.
                            $scope.badge = parseInt(unread, 10) > 0 ? unread : '';
                            // Update badge.
                            if ($mmaPushNotifications) {
                                $mmaPushNotifications.updateAddonCounter(siteId, 'mmaNotifications', unread);
                            }
                        });
                    }
                }

                $scope.$on('$destroy', function() {
                    readChangedObserver && readChangedObserver.off && readChangedObserver.off();
                    cronObserver && cronObserver.off && cronObserver.off();

                    if ($mmPushNotificationsDelegate) {
                        $mmPushNotificationsDelegate.unregisterReceiveHandler('mmaNotifications:sidemenu');
                    }
                });
            };
        };

        /**
         * Execute the process.
         * Receives the ID of the site affected, undefined for all sites.
         *
         * @param  {String} [siteId] ID of the site affected, undefined for all sites.
         * @return {Promise}         Promise resolved when done, rejected if failure.
         */
        self.execute = function(siteId) {
            if ($mmSitesManager.isCurrentSite(siteId) && $mmaNotifications.isNotificationCountEnabled(true)) {
                $mmEvents.trigger(mmaNotificationsReadCronEvent, {
                    siteid: siteId
                });
            }

            if ($mmApp.isDesktop() && $mmLocalNotifications.isAvailable()) {
                $mmEmulatorHelper.checkNewNotifications(
                        mmaNotificationsPushSimulationComponent, fetchNotifications, getTitleAndText, siteId);
            }
        };

        /**
         * Get the time between consecutive executions.
         *
         * @return {Number} Time between consecutive executions (in ms).
         */
        self.getInterval = function() {
            return $mmApp.isDesktop() ? 60000 : 600000; // 1 or 10 minutes.
        };

        /**
         * Whether it's a synchronization process or not.
         *
         * @return {Boolean} True if is a sync process, false otherwise.
         */
        self.isSync = function() {
            // This is done to use only wifi if using the fallback function.
            // In desktop it is always sync, since it fetches notification to see if there's a new one.
            return !$mmaNotifications.isNotificationCountEnabled() || $mmApp.isDesktop();
        };

        /**
         * Whether the process should be executed during a manual sync.
         *
         * @return {Boolean} True if is a manual sync process, false otherwise.
         */
        self.canManualSync = function() {
            return true;
        };

        /**
         * Whether the process uses network or not.
         *
         * @return {Boolean} True if uses network, false otherwise.
         */
        self.usesNetwork = function() {
            return true;
        };

        return self;
    };

    /**
     * Notification preferences handler.
     *
     * @module mm.addons.notifications
     * @ngdoc method
     * @name $mmaNotificationsHandlers#preferences
     */
    self.preferences = function() {

        var self = {};

        /**
         * Check if handler is enabled.
         *
         * @return {Boolean} True if handler is enabled, false otherwise.
         */
        self.isEnabled = function() {
            return true;
        };

        /**
         * Get the controller.
         *
         * @return {Object} Controller.
         */
        self.getController = function() {
            return function($scope) {
                $scope.title = 'mma.notifications.notificationpreferences';
                $scope.class = 'mma-notifications-notificationpreferences-handler';
                $scope.state = 'site.notifications-preferences';
            };
        };

        return self;
    };

    return self;
});
