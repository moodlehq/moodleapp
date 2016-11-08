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

.constant('mmCoreLoginTokenChangePassword', '*changepassword*')

.config(function($stateProvider, $urlRouterProvider, $mmInitDelegateProvider, mmInitDelegateMaxAddonPriority) {

    $stateProvider

    .state('mm_login', {
        url: '/mm_login',
        abstract: true,
        templateUrl: 'core/components/login/templates/base.html',
        cache: false,   // Disable caching to force controller reload.
        onEnter: function($ionicHistory) {
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
        onEnter: function($mmLoginHelper, $mmSitesManager) {
            // Skip this page if there are no sites yet.
            $mmSitesManager.hasNoSites().then(function() {
                $mmLoginHelper.goToAddSite();
            });
        }
    })

    .state('mm_login.site', {
        url: '/site',
        templateUrl: 'core/components/login/templates/site.html',
        controller: 'mmLoginSiteCtrl'
    })

    .state('mm_login.credentials', {
        url: '/cred',
        templateUrl: 'core/components/login/templates/credentials.html',
        controller: 'mmLoginCredentialsCtrl',
        params: {
            siteurl: '',
            username: '',
            urltoopen: '', // For content links.
            siteconfig: null
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
            username: '',
            infositeurl: '',
            siteid: ''
        }
    });

    // Default redirect to the login page.
    $urlRouterProvider.otherwise(function($injector) {
        var $state = $injector.get('$state');
        return $state.href('mm_login.init').replace('#', '');
    });

    // Restore the session.
    $mmInitDelegateProvider.registerProcess('mmLogin', '$mmSitesManager.restoreSession', mmInitDelegateMaxAddonPriority + 200);
})

.run(function($log, $state, $mmUtil, $translate, $mmSitesManager, $rootScope, $mmSite, $mmURLDelegate, $ionicHistory, $timeout,
                $mmEvents, $mmLoginHelper, mmCoreEventSessionExpired, $mmApp, $ionicPlatform, mmCoreConfigConstants, $mmText,
                mmCoreEventPasswordChangeForced, mmCoreLoginTokenChangePassword) {

    $log = $log.getInstance('mmLogin');

    var isSSOConfirmShown = false,
        isChangePasswordConfirmShown = false,
        waitingForBrowser = false,
        lastInAppUrl;

    // Listen for sessionExpired event to reconnect the user.
    $mmEvents.on(mmCoreEventSessionExpired, sessionExpired);

    // Listen for sessionExpired event to reconnect the user.
    $mmEvents.on(mmCoreEventPasswordChangeForced, passwordChangeForced);

    // Register observer to check if the app was launched via URL scheme.
    $mmURLDelegate.register('mmLoginSSO', appLaunchedByURL);

    // Observe loaded pages in the InAppBrowser to handle SSO URLs.
    $rootScope.$on('$cordovaInAppBrowser:loadstart', function(e, event) {
        // URLs with a custom scheme can be prefixed with "http://" or "https://", we need to remove this.
        var protocol = $mmText.getUrlProtocol(event.url),
            url = event.url.replace(/^https?:\/\//, '');

        if (appLaunchedByURL(url)) {
            // Close the browser if it's a valid SSO URL.
            $mmUtil.closeInAppBrowser();
        } else if (ionic.Platform.isAndroid()) {
            // Check if the URL has a custom URL scheme. In Android they need to be opened manually.
            var urlScheme = $mmText.getUrlProtocol(url);
            if (urlScheme) {
                // Open in browser should launch the right app if found and do nothing if not found.
                $mmUtil.openInBrowser(url);

                // At this point the InAppBrowser is showing a "Webpage not available" error message.
                // Try to navigate to last loaded URL so this error message isn't found.
                if (lastInAppUrl) {
                    $mmUtil.openInApp(lastInAppUrl);
                } else {
                    // No last URL loaded, close the InAppBrowser.
                    $mmUtil.closeInAppBrowser();
                }
            } else {
                lastInAppUrl = protocol + '://' + url;
            }
        }
    });

    // Observe InAppBrowser closed and resume events to stop waiting for browser SSO.
    $rootScope.$on('$cordovaInAppBrowser:exit', function() {
        waitingForBrowser = false;
        lastInAppUrl = false;
    });
    $ionicPlatform.on('resume', function() {
        // Wait a second before setting it to false since in iOS there could be some frozen WS calls.
        $timeout(function() {
            waitingForBrowser = false;
        }, 1000);
    });

    // Redirect depending on user session.
    $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {

        // Prevent state changes while the app is not ready.
        if (!$mmApp.isReady() && toState.name !== 'mm_login.init') {
            event.preventDefault();
            $state.transitionTo('mm_login.init');
            $log.warn('Forbidding state change to \'' + toState.name + '\'. App is not ready yet.');
            return;
        }

        if (toState.name.substr(0, 8) === 'redirect' || toState.name.substr(0, 15) === 'mm_contentlinks') {
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
            $mmLoginHelper.goToSiteInitialPage();
        }

    });

    // Function to handle session expired events.
    function sessionExpired(siteid) {

        var siteurl = $mmSite.getURL();

        if (typeof(siteurl) === 'undefined') {
            return;
        }

        if (siteid && siteid !== $mmSite.getId()) {
            return; // Site that triggered the event is not current site.
        }

        // Check authentication method.
        $mmSitesManager.checkSite(siteurl).then(function(result) {

            if (result.warning) {
                $mmUtil.showErrorModal(result.warning, true, 4000);
            }

            if ($mmLoginHelper.isSSOLoginNeeded(result.code)) {
                // SSO. User needs to authenticate in a browser. Prevent showing the message several times
                // or show it again if the user is already authenticating using SSO.
                if (!$mmApp.isSSOAuthenticationOngoing() && !isSSOConfirmShown && !waitingForBrowser) {
                    isSSOConfirmShown = true;
                    $mmUtil.showConfirm($translate('mm.login.reconnectssodescription')).then(function() {
                        waitingForBrowser = true;
                        $mmLoginHelper.confirmAndOpenBrowserForSSOLogin(
                                    result.siteurl, result.code, result.service, result.config && result.config.launchurl);
                    }).finally(function() {
                        isSSOConfirmShown = false;
                    });
                }
            } else {
                var info = $mmSite.getInfo();
                if (typeof(info) !== 'undefined' && typeof(info.username) !== 'undefined') {
                    $ionicHistory.nextViewOptions({disableBack: true});
                    $state.go('mm_login.reconnect', {
                        siteurl: result.siteurl,
                        username: info.username,
                        infositeurl: info.siteurl,
                        siteid: $mmSite.getId()
                    });
                }
            }
        });
    }

    // Function to handle password change forced events.
    function passwordChangeForced(siteId) {
        if (!siteId) {
            return;
        }

        $mmSitesManager.getSite(siteId).then(function(site) {
            var siteUrl = site.getURL();
            if (typeof(siteUrl) === 'undefined') {
                return;
            }

            // Expire user token for the site.
            $log.debug('Expiring token for site ' + siteId);
            $mmSitesManager.updateSiteTokenBySiteId(siteId, mmCoreLoginTokenChangePassword);

            // Site that triggered the event is not current site.
            if (siteId !== $mmSite.getId()) {
                return;
            }

            if (!isChangePasswordConfirmShown && !waitingForBrowser) {
                isChangePasswordConfirmShown = true;

                // User password change forced, invalidate all site caches.
                site.invalidateWsCache();

                $mmEvents.trigger(mmCoreEventSessionExpired, siteId);

                // Session expired, trigger event.
                $mmLoginHelper.openChangePassword(siteUrl, $translate.instant('mm.core.nopasswordchangeforced')).then(function() {
                    waitingForBrowser = true;
                }).finally(function() {
                    isChangePasswordConfirmShown = false;
                });
            }
        });

    }

    // Function to handle URL received by Custom URL Scheme. If it's a SSO login, perform authentication.
    function appLaunchedByURL(url) {
        var ssoScheme = mmCoreConfigConstants.customurlscheme + '://token=';
        if (url.indexOf(ssoScheme) == -1) {
            return false;
        }
        if ($mmApp.isSSOAuthenticationOngoing()) {
            // Authentication ongoing, probably duplicated request.
            return true;
        }

        // App opened using custom URL scheme. Probably an SSO authentication.
        $mmApp.startSSOAuthentication();
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

        // Wait for app to be ready.
        $mmApp.ready().then(function() {
            return $mmLoginHelper.validateBrowserSSOLogin(url);
        }).then(function(siteData) {
            return $mmLoginHelper.handleSSOLoginAuthentication(siteData.siteurl, siteData.token);
        }).then(function() {
            $mmLoginHelper.goToSiteInitialPage();
        }).catch(function(errorMessage) {
            if (typeof errorMessage === 'string' && errorMessage !== '') {
                $mmUtil.showErrorModal(errorMessage);
            }
        }).finally(function() {
            modal.dismiss();
            $mmApp.finishSSOAuthentication();
        });

        return true;
    }
});
