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
.run(function($mmSideMenuDelegate, $translate, $mmaNotifications) {
    $translate('mma.notifications.notifications').then(function(pluginName) {
        $mmSideMenuDelegate.registerPlugin('mmaNotifications', function() {

            if ($mmaNotifications.isPluginEnabled()) {
                return {
                    icon: 'ion-ios-bell',
                    state: 'site.notifications',
                    title: pluginName
                };
            }

        });
    });
});
