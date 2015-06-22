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
.constant('mmCoreSecondsDay', 86400)

.config(function($stateProvider, $provide, $ionicConfigProvider, $httpProvider, $mmUtilProvider,
        $mmLogProvider, $compileProvider) {

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

    // Ugly hack to "decorate" the $stateProvider.state() method.
    // This allows us to automagically define 'tablet' states which use split views.
    // We can probably do this better, or define our own $stateProvider to clean this up.
    var $mmStateProvider = {
        state: function(name, stateConfig) {
            function setupTablet(state) {
                if (!state.tablet) {
                    return;
                }

                // Support shorthand tablet definition.
                if (angular.isString(state.tablet)) {
                    state.tablet = {
                        parent: state.tablet
                    }
                }

                var params = state.tablet,
                    parent = params.parent,
                    node = params.node || 'tablet',
                    config = {};

                // Remove any trace from the state object.
                delete state['tablet'];

                // Prepare the default parameters for the tablet.
                delete params['node'];
                delete params['parent'];
                angular.copy(state, config);
                angular.extend(config, params);

                // We can only support 1 view at the moment.
                if (config.views.length > 1) {
                    console.log('Cannot guess the view data to use for tablet state of ' + name);
                    return;
                }

                // Find view name.
                var viewName, viewData;
                angular.forEach(config.views, function(v, k) {
                    viewName = k;
                    viewData = v;
                }, this);

                // Delete the original view and replace with the new one.
                delete config.views[viewName];
                config.views['tablet'] = viewData;

                // Define the new tablet state.
                $stateProvider.state.apply($stateProvider, [parent + '.' + node, config]);
            }

            setupTablet.apply(this, [stateConfig]);
            $stateProvider.state.apply($stateProvider, [name, stateConfig]);
            return this;
        }
    };

    $stateProvider
        .state('redirect', {
            url: '/redirect',
            params: {
                siteid: null,
                state: null,
                params: null
            },
            controller: function($scope, $state, $stateParams, $mmSite, $mmSitesManager, $ionicHistory) {

                function goToSitesList() {
                    $ionicHistory.nextViewOptions({
                        disableBack: true
                    });
                    $state.go('mm_login.sites');
                }

                function loadSiteAndGo() {
                    $mmSitesManager.loadSite($stateParams.siteid).then(function() {
                        $state.go($stateParams.state, $stateParams.params);
                    }, function() {
                        // Site doesn't exist.
                        goToSitesList();
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
                            goToSitesList();
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

    // Set our own safe protocols, otherwise geo:// is marked as unsafe.
    $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|tel|geo|file):/);
})

.run(function($ionicPlatform, $ionicBody, $window) {
    $ionicPlatform.ready(function() {
        var checkTablet = function() {
            $ionicBody.enableClass($ionicPlatform.isTablet(), 'tablet');
        };
        ionic.on('resize', checkTablet, $window);
        checkTablet();
    });
});
