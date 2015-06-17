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

.config(function($stateProvider, $urlRouterProvider) {

    $stateProvider

    .state('mm_login', {
        url: '/mm_login',
        abstract: true,
        templateUrl: 'core/components/login/templates/base.html',
        cache: false,   // Disable caching to force controller reload.
        onEnter: function($ionicHistory, $state, $mmSitesManager, $mmSite) {
            // Ensure that there is no history stack when getting here.
            $ionicHistory.clearHistory();
        }
    })

    .state('mm_login.init', {
        url: '/init',
        templateUrl: 'core/components/login/templates/init.html',
        controller: 'mmLoginInitCtrl',
        cache: false // Disable caching to force controller reload.
    })

    .state('mm_login.sites', {
        url: '/sites',
        templateUrl: 'core/components/login/templates/sites.html',
        controller: 'mmLoginSitesCtrl',
        onEnter: function($state, $mmSitesManager) {
            // Skip this page if there are no sites yet.
            $mmSitesManager.hasNoSites().then(function() {
                $state.go('mm_login.site');
            });
        }
    })

    .state('mm_login.site', {
        url: '/site',
        templateUrl: 'core/components/login/templates/site.html',
        controller: 'mmLoginSiteCtrl',
        onEnter: function($ionicNavBarDelegate, $ionicHistory, $mmSitesManager) {
            // Don't show back button if there are no sites.
            $mmSitesManager.hasNoSites().then(function() {
                $ionicNavBarDelegate.showBackButton(false);
                $ionicHistory.clearHistory();
            });
        }
    })

    .state('mm_login.credentials', {
        url: '/cred',
        templateUrl: 'core/components/login/templates/credentials.html',
        controller: 'mmLoginCredentialsCtrl',
        params: {
            siteurl: ''
        },
        onEnter: function($state, $stateParams) {
            // Do not allow access to this page when the URL was not passed.
            if (!$stateParams.siteurl) {
              $state.go('mm_login.init');
            }
        }
    })

    .state('mm_login.reconnect', {
        url: '/reconnect',
        templateUrl: 'core/components/login/templates/reconnect.html',
        controller: 'mmLoginReconnectCtrl',
        cache: false,
        params: {
            siteurl: '',
            username: ''
        }
    });

    // Default redirect to the login page.
    $urlRouterProvider.otherwise(function($injector, $location) {
        var $state = $injector.get('$state');
        return $state.href('mm_login.init').replace('#', '');
    });

})

.run(function($log, $state, $mmUtil, $translate, $mmSitesManager, $rootScope, $mmSite, $mmURLDelegate, $ionicHistory,
                $mmEvents, $mmLoginHelper, mmCoreEventSessionExpired) {

    $log = $log.getInstance('mmLogin');

    // Listen for sessionExpired event to reconnect the user.
    $mmEvents.on(mmCoreEventSessionExpired, sessionExpired);

    // Register observer to check if the app was launched via URL scheme.
    $mmURLDelegate.register('mmLoginSSO', appLaunchedByURL);

    // Redirect depending on user session.
    $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {

        if (toState.name.substr(0, 8) === 'redirect') {
            return;
        } else if ((toState.name.substr(0, 8) !== 'mm_login' || toState.name === 'mm_login.reconnect') && !$mmSite.isLoggedIn()) {
            // We are not logged in.
            event.preventDefault();
            $log.debug('Redirect to login page, request was: ' + toState.name);
            // Disable animation and back button for the next transition.
            $ionicHistory.nextViewOptions({
                disableAnimate: true,
                disableBack: true
            });
            $state.transitionTo('mm_login.init');
        } else if (toState.name.substr(0, 8) === 'mm_login' && toState.name !== 'mm_login.reconnect' && $mmSite.isLoggedIn()) {
            // We are logged in and requested the login page.
            event.preventDefault();
            $log.debug('Redirect to course page, request was: ' + toState.name);
            // Disable animation and back button for the next transition.
            $ionicHistory.nextViewOptions({
                disableAnimate: true,
                disableBack: true
            });
            $state.transitionTo('site.mm_courses');
        }

    });

    // Function to handle session expired events.
    function sessionExpired(data) {

        var siteurl = $mmSite.getURL();

        if (typeof(siteurl) !== 'undefined') {

            if (typeof data != 'undefined') {
                if (data.siteid !== $mmSite.getId()) {
                    return; // Site that triggered the event is not current site.
                }
            }

            // Check authentication method.
            $mmSitesManager.checkSite(siteurl).then(function(result) {
                if ($mmLoginHelper.isSSOLoginNeeded(result.code)) {
                    // SSO. User needs to authenticate in a browser.
                    $mmUtil.showConfirm($translate('mm.login.reconnectssodescription')).then(function() {
                        $mmLoginHelper.openBrowserForSSOLogin(siteurl);
                    });
                } else {
                    var info = $mmSite.getInfo();
                    if (typeof(info) !== 'undefined' && typeof(info.username) !== 'undefined') {
                        $state.go('mm_login.reconnect', {siteurl: siteurl, username: info.username});
                    }
                }
            });
        }
    }

    // Function to handle URL received by Custom URL Scheme. If it's a SSO login, perform authentication.
    function appLaunchedByURL(url) {
        var ssoScheme = 'moodlemobile://token=';
        if (url.indexOf(ssoScheme) == -1) {
            return false;
        }

        // App opened using custom URL scheme. Probably an SSO authentication.
        $log.debug('App launched by URL');

        var modal = $mmUtil.showModalLoading('mm.login.authenticating', true);

        // Delete the sso scheme from the URL.
        url = url.replace(ssoScheme, '');
        // Decode from base64.
        try {
            url = atob(url);
        } catch(err) {
            // Error decoding the parameter.
            $log.error('Error decoding parameter received for login SSO');
            return false;
        }

        $mmLoginHelper.validateBrowserSSOLogin(url).then(function(sitedata) {

            $mmLoginHelper.handleSSOLoginAuthentication(sitedata.siteurl, sitedata.token).then(function() {
                $state.go('site.mm_courses');
            }, function(error) {
                $mmUtil.showErrorModal(error);
            }).finally(function() {
                modal.dismiss();
            });

        }, function(errorMessage) {
            modal.dismiss();
            if (typeof(errorMessage) === 'string' && errorMessage != '') {
                $mmUtil.showErrorModal(errorMessage);
            }
        });

        return true;
    }
});
