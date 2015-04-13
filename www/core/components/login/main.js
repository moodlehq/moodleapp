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

angular.module('mm.core.login', [])

.constant('mmLoginSSO', {
    siteurl: 'launchSiteURL',
    passport: 'launchPassport'
})

.config(function($stateProvider) {

    $stateProvider

    .state('mm_login', {
        url: '/mm_login',
        abstract: true,
        templateUrl: 'core/components/login/templates/base.html',
        cache: false,   // Disable caching to force controller reload.
        onEnter: function($ionicHistory, $state, $mmSitesManager, $mmSite) {
            // Ensure that there is no history stack when getting here.
            $ionicHistory.clearHistory();

            $mmSitesManager.restoreSession().then(function() {
                if ($mmSite.isLoggedIn()) {
                    $state.go('site.index');
                }
            });
        }
    })

    .state('mm_login.index', {
        url: '/index',
        templateUrl: 'core/components/login/templates/sites.html',
        controller: 'mmLoginSitesCtrl',
        onEnter: function($state, $mmSitesManager) {
            // Skip this page if there are no sites yet.
            $mmSitesManager.noSites().then(function() {
                $state.go('mm_login.site');
            });
        },
        resolve: {
            sites: function($mmSitesManager) {
                return $mmSitesManager.getSites();
            }
          }
    })

    .state('mm_login.site', {
        url: '/site',
        templateUrl: 'core/components/login/templates/site.html',
        controller: 'mmLoginSiteCtrl',
        onEnter: function($ionicNavBarDelegate, $ionicHistory, $mmSitesManager) {
            // Don't show back button if there are no sites.
            $mmSitesManager.noSites().then(function() {
                $ionicNavBarDelegate.showBackButton(false);
                $ionicHistory.clearHistory();
            });
        }
    })

    .state('mm_login.credentials', {
        url: '/cred',
        templateUrl: 'core/components/login/templates/credentials.html',
        controller: 'mmLoginCredCtrl',
        params: {
            siteurl: ''
        },
        onEnter: function($state, $stateParams) {
            // Do not allow access to this page when the URL was not passed.
            if (!$stateParams.siteurl) {
              $state.go('mm_login.index');
            }
        }
    });

})

.run(function($log, $state, $mmUtil, $translate, $mmSitesManager, mmLoginSSO) {

    window.handleOpenURL = function(url) {
        // App opened using custom URL scheme. Probably an SSO authentication.
        $log.debug('App launched by URL');

        $translate('mm.core.login.authenticating').then(function(authenticatingString) {
            $mmUtil.showModalLoading(authenticatingString);
        });

        $mmSitesManager.validateBrowserSSOLogin(url).then(function(sitedata) {

            $mmSitesManager.newSite(sitedata.siteurl, sitedata.token).then(function() {
                $state.go('site.index');
            }, function(error) {
                $mmUtil.showErrorModal(error);
            }).finally(function() {
                $mmUtil.closeModalLoading();
            });

        }, function(errorMessage) {
            $mmUtil.closeModalLoading();
            if (typeof(errorMessage) === 'string' && errorMessage != '') {
                $mmUtil.showErrorModal(errorMessage);
            }
        });
    }
});
