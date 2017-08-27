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
.controller('mmLoginInitCtrl', function($log, $ionicHistory, $state, $mmSitesManager, $mmSite, $mmApp, $mmLoginHelper) {

    $log = $log.getInstance('mmLoginInitCtrl');

    $mmApp.ready().then(function() {

        // Disable animation and back button for the next transition.
        $ionicHistory.nextViewOptions({
            disableAnimate: true,
            disableBack: true
        });

        // Check if there was a pending redirect.
        var redirectData = $mmApp.getRedirect();
        if (redirectData.siteid && redirectData.state) {
            // Unset redirect data.
            $mmApp.storeRedirect('', '', '');

            // Only accept the redirect if it was stored less than 20 seconds ago.
            if (new Date().getTime() - redirectData.timemodified < 20000) {
                return $mmSitesManager.loadSite(redirectData.siteid).then(function() {
                    if (!$mmLoginHelper.isSiteLoggedOut(redirectData.state, redirectData.params)) {
                        $state.go(redirectData.state, redirectData.params);
                    }
                }).catch(function() {
                    // Site doesn't exist.
                    loadCurrent();
                });
            }
        }

        loadCurrent();
    });

    function loadCurrent() {
        if ($mmSite.isLoggedIn()) {
            if (!$mmLoginHelper.isSiteLoggedOut()) {
                $mmLoginHelper.goToSiteInitialPage();
            }
        } else {
            $mmSitesManager.hasSites().then(function() {
                return $state.go('mm_login.sites');
            }, function() {
                return $mmLoginHelper.goToAddSite();
            });
        }
    }

});
