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

.config(function($stateProvider) {

    $stateProvider

    .state('site.pushnotifications-airnotifierpreferences', {
        url: '/pushnotifications-airnotifierpreferences',
        params: {
        	title: null
        },
        views: {
            'site': {
                controller: 'mmaPushNotificationsAirnotifierPreferencesCtrl',
                templateUrl: 'addons/pushnotifications/preferences/airnotifier/templates/preferences.html'
            }
        }
    });
})

.run(function($mmAddonManager) {
	// Use addon manager to inject $mmaPushNotificationsPreferencesDelegate. This is to provide an example for remote addons,
    // since they cannot assume that the pushnotification addon will be packaged in custom apps.
    var $mmaPushNotificationsPreferencesDelegate = $mmAddonManager.get('$mmaPushNotificationsPreferencesDelegate');
    if ($mmaPushNotificationsPreferencesDelegate) {
        $mmaPushNotificationsPreferencesDelegate.registerHandler('mmaPushNotificationPreferencesAirnotifier', 'airnotifier',
                '$mmaPushNotificationPreferencesAirnotifierHandler');
    }
});
