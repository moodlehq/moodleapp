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

angular.module('mm.addons.notifications', [])

.constant('mmaNotificationsListLimit', 20) // Max of notifications to retrieve in each WS call.

.config(function($stateProvider) {

    $stateProvider

    .state('site.notifications', {
        url: '/notifications',
        views: {
            'site': {
                templateUrl: 'addons/notifications/templates/list.html',
                controller: 'mmaNotificationsListCtrl'
            }
        }
    });

})

.run(function($log, $mmSideMenuDelegate, $mmaNotifications, $mmPushNotificationsDelegate, $mmUtil, $state, $injector) {
    $log = $log.getInstance('mmaNotifications');

    $mmSideMenuDelegate.registerPlugin('mmaNotifications', function() {
        if ($mmaNotifications.isPluginEnabled()) {
            return {
                icon: 'ion-ios-bell',
                state: 'site.notifications',
                title: 'mma.notifications.notifications'
            };
        }
    });

    // Register push notification clicks.
    try {
        // Use injector because the delegate belongs to an addon, so it might not exist.
        var $mmPushNotificationsDelegate = $injector.get('$mmPushNotificationsDelegate');
        $mmPushNotificationsDelegate.registerHandler('mmaNotifications', function(notification) {
            if ($mmUtil.isTrueOrOne(notification.notif)) {
                $mmaNotifications.isPluginEnabledForSite(notification.site).then(function() {
                    $mmaNotifications.invalidateNotificationsList().finally(function() {
                        $state.go('redirect', {siteid: notification.site, state: 'site.notifications'});
                    });
                });
                return true;
            }
        });
    } catch(ex) {
        $log.error('Cannot register push notifications handler: delegate not found');
    }
});
