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
 * Controller to handle the input of a site URL and its validation.
 *
 * @module mm.core.login
 * @ngdoc controller
 * @name mmLoginSiteCtrl
 */
.controller('mmLoginSiteCtrl', function($scope, $state, $mmSitesManager, $mmUtil, $ionicPopup, $translate, $ionicModal,
                                        $mmConfig, mmLoginLaunchSiteURL, mmLoginLaunchPassport, mmLoginSSOCode) {

    $scope.siteurl = '';
    $scope.isInvalidUrl = true;

    $scope.validate = function(url) {
        if (!url) {
            $scope.isInvalidUrl = true;
            return;
        }

        $mmSitesManager.getDemoSiteData(url).then(function() {
            // Is demo site.
            $scope.isInvalidUrl = false;
        }, function() {
            // formatURL adds the protocol if is missing.
            var formattedurl = $mmUtil.formatURL(url);
            $scope.isInvalidUrl = formattedurl.indexOf('://localhost') == -1 && !$mmUtil.isValidURL(formattedurl);
        });
    };

    $scope.connect = function(url) {

        if (!url) {
            $mmUtil.showErrorModal('mm.login.siteurlrequired', true);
            return;
        }

        $translate('mm.core.loading').then(function(loadingString) {
            $mmUtil.showModalLoading(loadingString);
        });

        $mmSitesManager.getDemoSiteData(url).then(function(sitedata) {

            $mmSitesManager.getUserToken(sitedata.url, sitedata.username, sitedata.password).then(function(token) {
                $mmSitesManager.newSite(sitedata.url, token).then(function() {
                    $state.go('site.mm_courses');
                }, function(error) {
                    $mmUtil.showErrorModal(error);
                }).finally(function() {
                    $mmUtil.closeModalLoading();
                });
            }, function(error) {
                $mmUtil.closeModalLoading();
                $mmUtil.showErrorModal(error);
            });

        }, function() {
            // Not a demo site.
            $mmSitesManager.checkSite(url).then(function(result) {

                if (result.code == mmLoginSSOCode) {
                    // SSO. User needs to authenticate in a browser.
                    $ionicPopup.confirm({template: $translate('mm.login.logininsiterequired')})
                        .then(function(confirmed) {
                            if (confirmed) {
                                $mmConfig.get('wsextservice').then(function(service) {
                                    var passport = Math.random() * 1000;
                                    var loginurl = result.siteurl + "/local/mobile/launch.php?service=" + service;
                                    loginurl += "&passport=" + passport;

                                    // Store the siteurl and passport in $mmConfig for persistence. We are "configuring"
                                    // the app to wait for an SSO. $mmConfig shouldn't be used as a temporary storage.
                                    $mmConfig.set(mmLoginLaunchSiteURL, result.siteurl);
                                    $mmConfig.set(mmLoginLaunchPassport, passport);

                                    window.open(loginurl, "_system");
                                    if (navigator.app) {
                                        navigator.app.exitApp();
                                    }
                                });

                            }
                        }
                    );
                } else {
                    $state.go('mm_login.credentials', {siteurl: result.siteurl});
                }

            }, function(error) {
                $mmUtil.showErrorModal(error);
            }).finally(function() {
                $mmUtil.closeModalLoading();
            });
        });
    };

    // Setup help modal.
    $ionicModal.fromTemplateUrl('core/components/login/templates/help-modal.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function(helpModal) {
        $scope.showHelp = function() {
            helpModal.show();
        };
        $scope.closeHelp = function() {
            helpModal.hide();
        };
        $scope.$on('$destroy', function() {
            helpModal.remove();
        });
    });

});
