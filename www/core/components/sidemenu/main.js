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

angular.module('mm.core.sidemenu', [])

.config(function($stateProvider) {

    $stateProvider

    .state('site', {
        url: '/site',
        templateUrl: 'core/components/sidemenu/templates/menu.html',
        controller: 'mmSideMenuCtrl',
        abstract: true,
        cache: false,
        onEnter: function($ionicHistory, $state, $mmSite) {
            // Remove the login page from the history stack.
            $ionicHistory.clearHistory();

            // Go to login if user is not logged in.
            if (!$mmSite.isLoggedIn()) {
                $state.go('mm_login.init');
            }
        }
    });

})

.run(function($mmEvents, mmCoreEventLogin, mmCoreEventSiteUpdated, mmCoreEventLogout, $mmSideMenuDelegate,
            mmCoreEventRemoteAddonsLoaded) {
    $mmEvents.on(mmCoreEventLogin, $mmSideMenuDelegate.updateNavHandlers);
    $mmEvents.on(mmCoreEventSiteUpdated, $mmSideMenuDelegate.updateNavHandlers);
    $mmEvents.on(mmCoreEventRemoteAddonsLoaded, $mmSideMenuDelegate.updateNavHandlers);
    $mmEvents.on(mmCoreEventLogout, $mmSideMenuDelegate.clearSiteHandlers);
});
