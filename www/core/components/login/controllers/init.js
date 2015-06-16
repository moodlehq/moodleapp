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

angular.module('mm.core.login')

/**
 * Controller to handle splash screen and initialize the app (restore session, determine first state, etc.).
 *
 * @module mm.core.login
 * @ngdoc controller
 * @name mmLoginInitCtrl
 */
.controller('mmLoginInitCtrl', function($ionicHistory, $state, $mmSitesManager, $mmSite, $mmEvents, $mmUtil) {

    // Disable animation and back button for the next transition.
    $ionicHistory.nextViewOptions({
        disableAnimate: true,
        disableBack: true
    });

    $mmSitesManager.restoreSession().then(function() {}, function(error) {
        if (error) {
            $mmUtil.showErrorModal(error);
        }
    }).finally(function() {
        if ($mmSite.isLoggedIn()) {
            $state.go('site.mm_courses').then(function() {
                $mmEvents.triggerUnique('initialized'); // @todo: Replace with "app ready" when it is implemented.
            });
        } else {
            $mmSitesManager.hasSites().then(function() {
                return $state.go('mm_login.sites');
            }, function() {
                return $state.go('mm_login.site');
            }).finally(function() {
                $mmEvents.triggerUnique('initialized'); // @todo: Replace with "app ready" when it is implemented.
            });
        }
    });

});