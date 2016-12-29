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

angular.module('mm.core', ['pascalprecht.translate'])

.constant('mmCoreSessionExpired', 'mmCoreSessionExpired')
.constant('mmCoreUserDeleted', 'mmCoreUserDeleted')
.constant('mmCoreUserPasswordChangeForced', 'mmCoreUserPasswordChangeForced')
.constant('mmCoreUserNotFullySetup', 'mmCoreUserNotFullySetup')
.constant('mmCoreSitePolicyNotAgreed', 'mmCoreSitePolicyNotAgreed')
.constant('mmCoreSecondsYear', 31536000)
.constant('mmCoreSecondsDay', 86400)
.constant('mmCoreSecondsHour', 3600)
.constant('mmCoreSecondsMinute', 60)

// States for downloading files/modules.
.constant('mmCoreDownloaded', 'downloaded')
.constant('mmCoreDownloading', 'downloading')
.constant('mmCoreNotDownloaded', 'notdownloaded')
.constant('mmCoreOutdated', 'outdated')
.constant('mmCoreNotDownloadable', 'notdownloadable')

.constant('mmCoreWifiDownloadThreshold', 104857600) // 100MB.
.constant('mmCoreDownloadThreshold', 10485760) // 10MB.

.config(function($stateProvider, $provide, $ionicConfigProvider, $httpProvider, $mmUtilProvider,
        $mmLogProvider, $compileProvider, $mmInitDelegateProvider, mmInitDelegateMaxAddonPriority) {

    // Set tabs to bottom on Android.
    $ionicConfigProvider.platform.android.tabs.position('bottom');
    $ionicConfigProvider.form.checkbox('circle');

    // Use JS scrolling.
    $ionicConfigProvider.scrolling.jsScrolling(true);

    // Decorate $ionicPlatform.
    $provide.decorator('$ionicPlatform', ['$delegate', '$window', function($delegate, $window) {
        $delegate.isTablet = function() {
            var mq = 'only screen and (min-width: 768px) and (-webkit-min-device-pixel-ratio: 1)';
            return $window.matchMedia(mq).matches;
        };
        return $delegate;
    }]);

    // Decorate ion-radio in order to enabled links on its texts.
    $provide.decorator('ionRadioDirective', ['$delegate', function($delegate) {
        var directive = $delegate[0];

        transcludeRegex = /ng-transclude/
        directive.template =  directive.template.replace(transcludeRegex, 'ng-transclude data-tap-disabled="true"');
        return $delegate;
    }]);

    // Decorate ion-checkbox in order to enabled links on its texts.
    $provide.decorator('ionCheckboxDirective', ['$delegate', function($delegate) {
        var directive = $delegate[0];

        transcludeRegex = /ng-transclude/
        directive.template =  directive.template.replace(transcludeRegex, 'ng-transclude data-tap-disabled="true"');
        return $delegate;
    }]);

    /**
     * Decorate $log. Usage:
     * $log = $log.getInstance('MyFactory')
     * $log.debug('My message') -> "dd/mm/aaaa hh:mm:ss MyFactory: My message"
     */
    $provide.decorator('$log', ['$delegate', $mmLogProvider.logDecorator]);

    $stateProvider
        .state('redirect', {
            url: '/redirect',
            params: {
                siteid: null,
                state: null,
                params: null
            },
            cache: false,
            template: '<ion-view><ion-content mm-state-class><mm-loading class="mm-loading-center"></mm-loading></ion-content></ion-view>',
            controller: function($scope, $state, $stateParams, $mmSite, $mmSitesManager, $ionicHistory, $mmAddonManager, $mmApp) {

                $ionicHistory.nextViewOptions({disableBack: true});

                function loadSiteAndGo() {
                    $mmSitesManager.loadSite($stateParams.siteid).then(function() {
                        $state.go($stateParams.state, $stateParams.params);
                    }, function() {
                        // Site doesn't exist.
                        $state.go('mm_login.sites');
                    });
                }

                $scope.$on('$ionicView.enter', function() {
                    if ($mmSite.isLoggedIn()) {
                        if ($stateParams.siteid && $stateParams.siteid != $mmSite.getId()) {
                            // Target state belongs to a different site. Change site.
                            if ($mmAddonManager.hasRemoteAddonsLoaded()) {
                                // The site has remote addons so the app will be restarted. Store the data and logout.
                                $mmApp.storeRedirect($stateParams.siteid, $stateParams.state, $stateParams.params);
                                $mmSitesManager.logout();
                            } else {
                                $mmSitesManager.logout().then(function() {
                                    loadSiteAndGo();
                                });
                            }
                        } else {
                            $state.go($stateParams.state, $stateParams.params);
                        }
                    } else {
                        if ($stateParams.siteid) {
                            loadSiteAndGo();
                        } else {
                            $state.go('mm_login.sites');
                        }
                    }
                });
            }
        });

    // This code is to be able to get data sent with $http.post using $_POST variable.
    // Otherwise all the data ends up in php://input and seems like local/mobile/check.php doesn't like it.
    $httpProvider.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded;charset=utf-8';
    $httpProvider.defaults.transformRequest = [function(data) {
        return angular.isObject(data) && String(data) !== '[object File]' ? $mmUtilProvider.param(data) : data;
    }];

    // Add some protocols to safe protocols.
    function addProtocolIfMissing(list, protocol) {
        if (list.indexOf(protocol) == -1) {
            list = list.replace('https?', 'https?|' + protocol);
        }
        return list;
    }

    var hreflist = $compileProvider.aHrefSanitizationWhitelist().source,
        imglist = $compileProvider.imgSrcSanitizationWhitelist().source;

    hreflist = addProtocolIfMissing(hreflist, 'file');
    hreflist = addProtocolIfMissing(hreflist, 'tel');
    hreflist = addProtocolIfMissing(hreflist, 'mailto');
    hreflist = addProtocolIfMissing(hreflist, 'geo');
    hreflist = addProtocolIfMissing(hreflist, 'filesystem'); // For HTML5 FileSystem.
    imglist = addProtocolIfMissing(imglist, 'filesystem'); // For HTML5 FileSystem.
    imglist = addProtocolIfMissing(imglist, 'file');
    imglist = addProtocolIfMissing(imglist, 'cdvfile');

    // Set thresholds on app init to avoid duration roundings.
    moment.relativeTimeThreshold('M', 12);
    moment.relativeTimeThreshold('d', 31);
    moment.relativeTimeThreshold('h', 24);
    moment.relativeTimeThreshold('m', 60);
    moment.relativeTimeThreshold('s', 60);

    $compileProvider.aHrefSanitizationWhitelist(hreflist);
    $compileProvider.imgSrcSanitizationWhitelist(imglist);

    // Register the core init process, this should be the very first thing.
    $mmInitDelegateProvider.registerProcess('mmAppInit', '$mmApp.initProcess', mmInitDelegateMaxAddonPriority + 400, true);

    // Register upgrade check process, this should happen almost before everything else.
    $mmInitDelegateProvider.registerProcess('mmUpdateManager', '$mmUpdateManager.check', mmInitDelegateMaxAddonPriority + 300, true);

    // Register clear app tmp folder.
    $mmInitDelegateProvider.registerProcess('mmFSClearTmp', '$mmFS.clearTmpFolder', mmInitDelegateMaxAddonPriority + 150, false);
})

.run(function($ionicPlatform, $ionicBody, $window, $mmEvents, $mmInitDelegate, mmCoreEventKeyboardShow, mmCoreEventKeyboardHide,
        $mmApp, $timeout, mmCoreEventOnline, mmCoreEventOnlineStatusChanged, $mmUtil, $ionicScrollDelegate) {
    // Execute all the init processes.
    $mmInitDelegate.executeInitProcesses();

    // When the platform is ready.
    $ionicPlatform.ready(function() {
        var checkTablet = function() {
            $ionicBody.enableClass($ionicPlatform.isTablet(), 'tablet');
        };
        ionic.on('resize', checkTablet, $window);
        checkTablet();

        // Listen for keyboard events. We don't use $cordovaKeyboard because it doesn't support keyboardHeight property.
        $window.addEventListener('native.keyboardshow', function(e) {
            $mmEvents.trigger(mmCoreEventKeyboardShow, e);

            if (ionic.Platform.isIOS() && document.activeElement && document.activeElement.tagName != 'BODY') {
                if ($mmUtil.closest(document.activeElement, 'ion-footer-bar[keyboard-attach]')) {
                    // Input element is in a footer with keyboard-attach directive, nothing to be done.
                    return;
                }

                // In iOS the user can select elements outside of the view using previous/next. Check if it's the case.
                if ($mmUtil.isElementOutsideOfScreen(document.activeElement)) {
                    // Focused element is outside of the screen. Scroll so the element is seen.
                    var position = $mmUtil.getElementXY(document.activeElement),
                        delegateHandle = $mmUtil.closest(document.activeElement, '*[delegate-handle]'),
                        scrollView;

                    if (position) {
                        if ($window && $window.innerHeight) {
                            // Put the input in the middle of screen aprox, not in top.
                            position[1] = position[1] - $window.innerHeight * 0.5;
                        }

                        // Get the right scroll delegate to use.
                        delegateHandle = delegateHandle && delegateHandle.getAttribute('delegate-handle');
                        scrollView = typeof delegateHandle == 'string' ?
                                $ionicScrollDelegate.$getByHandle(delegateHandle) : $ionicScrollDelegate;

                        // Scroll to the position.
                        $ionicScrollDelegate.scrollTo(position[0], position[1]);
                    }
                }
            }
        });
        $window.addEventListener('native.keyboardhide', function(e) {
            $mmEvents.trigger(mmCoreEventKeyboardHide, e);
        });
    });

    // Send event when device goes online.
    var lastExecution = 0;

    $mmApp.ready().then(function() {
        document.addEventListener('online', function() { sendOnlineEvent(true); }, false); // Cordova event.
        window.addEventListener('online', function() { sendOnlineEvent(true); }, false); // HTML5 event.
        document.addEventListener('offline', function() { sendOnlineEvent(false); }, false); // Cordova event.
        window.addEventListener('offline', function() { sendOnlineEvent(false); }, false); // HTML5 event.
    });

    function sendOnlineEvent(online) {
        // The online function can be called several times in a row, prevent consecutive executions.
        var now = new Date().getTime();
        if (now - lastExecution < 5000) {
            return;
        }
        lastExecution = now;

        $timeout(function() { // Minor delay just to make sure network is fully established.
            if (online) {
                // Deprecated on version 3.1.3.
                $mmEvents.trigger(mmCoreEventOnline);
            }
            $mmEvents.trigger(mmCoreEventOnlineStatusChanged, online);
        }, 1000);
    }
});
