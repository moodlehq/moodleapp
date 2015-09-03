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
.constant('mmCoreSecondsYear', 31536000)
.constant('mmCoreSecondsDay', 86400)
.constant('mmCoreSecondsHour', 3600)
.constant('mmCoreSecondsMinute', 60)


.config(function($stateProvider, $provide, $ionicConfigProvider, $httpProvider, $mmUtilProvider,
        $mmLogProvider, $compileProvider, $mmInitDelegateProvider, mmInitDelegateMaxAddonPriority) {

    // Set tabs to bottom on Android.
    $ionicConfigProvider.platform.android.tabs.position('bottom');

    // Decorate $ionicPlatform.
    $provide.decorator('$ionicPlatform', ['$delegate', '$window', function($delegate, $window) {
        $delegate.isTablet = function() {
            var mq = 'only screen and (min-width: 768px) and (-webkit-min-device-pixel-ratio: 1)';
            return $window.matchMedia(mq).matches;
        };
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
            controller: function($scope, $state, $stateParams, $mmSite, $mmSitesManager, $ionicHistory) {

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
                            // Notification belongs to a different site. Change site.
                            $mmSitesManager.logout().then(function() {
                                loadSiteAndGo();
                            });
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
    var list = $compileProvider.aHrefSanitizationWhitelist().source;

    function addProtocolIfMissing(protocol) {
        if (list.indexOf(protocol) == -1) {
            list = list.replace('https?', 'https?|' + protocol);
        }
    }
    addProtocolIfMissing('file');
    addProtocolIfMissing('tel');
    addProtocolIfMissing('mailto');
    addProtocolIfMissing('geo');
    $compileProvider.aHrefSanitizationWhitelist(list);

    // Register the core init process, this should be the very first thing.
    $mmInitDelegateProvider.registerProcess('mmAppInit', '$mmApp.initProcess', mmInitDelegateMaxAddonPriority + 400, true);

    // Register upgrade check process, this should happen almost before everything else.
    $mmInitDelegateProvider.registerProcess('mmUpdateManager', '$mmUpdateManager.check', mmInitDelegateMaxAddonPriority + 300, true);
})

.run(function($ionicPlatform, $ionicBody, $window, $mmEvents, $mmInitDelegate, mmCoreEventKeyboardShow, mmCoreEventKeyboardHide) {
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
        });
        $window.addEventListener('native.keyboardhide', function(e) {
            $mmEvents.trigger(mmCoreEventKeyboardHide, e);
        });
    });
});
