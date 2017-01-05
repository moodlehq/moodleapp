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

angular.module('mm.addons.messageoutput_airnotifier', [])

.config(function($stateProvider) {

    $stateProvider

    .state('site.messageoutput-airnotifier-preferences', {
        url: '/messageoutput-airnotifier-preferences',
        params: {
        	title: null
        },
        views: {
            'site': {
                controller: 'mmaMessageOutputAirnotifierDevicesCtrl',
                templateUrl: 'addons/messageoutput/airnotifier/templates/devices.html'
            }
        }
    });
})

.run(function($mmAddonManager) {
    // Use addon manager to inject $mmaMessageOutputDelegate. This is to provide an example for remote addons,
    // since they cannot assume that the messageoutput addon will be packaged in custom apps.
    var $mmaMessageOutputDelegate = $mmAddonManager.get('$mmaMessageOutputDelegate');
    if ($mmaMessageOutputDelegate) {
        $mmaMessageOutputDelegate.registerHandler('mmaMessageOutputAirnotifier', 'airnotifier',
                '$mmaMessageOutputAirnotifierHandlers.processorPreferences');
    }
});
