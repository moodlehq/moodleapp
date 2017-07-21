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
 * Controller to handle input of user credentials.
 *
 * @module mm.core.login
 * @ngdoc controller
 * @name mmLoginReconnectCtrl
 */
.controller('mmLoginReconnectCtrl', function($scope, $state, $stateParams, $mmSitesManager, $mmApp, $mmUtil, $ionicHistory,
            $mmLoginHelper, $mmSite) {

    var infositeurl = $stateParams.infositeurl, // Siteurl in site info. It might be different than siteurl (http/https).
        stateName = $stateParams.statename,
        stateParams = $stateParams.stateparams,
        siteConfig = $stateParams.siteconfig;

    $scope.siteurl = $stateParams.siteurl;
    $scope.credentials = {
        username: $stateParams.username,
        password: ''
    };
    $scope.isLoggedOut = $mmSite.isLoggedOut();

    $mmSitesManager.getSite($stateParams.siteid).then(function(site) {
        $scope.site = {
            id: site.id,
            fullname: site.infos.fullname,
            avatar: site.infos.userpictureurl
        };

        $scope.credentials.username = site.infos.username;
        $scope.siteurl = site.infos.siteurl;
        $scope.sitename = site.infos.sitename;

        // Check logoURL if user avatar is not set.
        if ($scope.site.avatar.startsWith(site.infos.siteurl + '/theme/image.php')) {
            $scope.site.avatar = false;
            return site.getPublicConfig().then(function(config) {
                $scope.logourl = config.logourl || config.compactlogourl;
            });
        }
    });

    if (siteConfig) {
        $scope.identityProviders = $mmLoginHelper.getValidIdentityProviders(siteConfig);
    }

    $scope.cancel = function() {
        $mmSitesManager.logout().finally(function() {
            $ionicHistory.nextViewOptions({
                disableAnimate: true,
                disableBack: true
            });
            $state.go('mm_login.sites');
        });
    };

    $scope.login = function() {

        $mmApp.closeKeyboard();

        // Get input data.
        var siteurl = $scope.siteurl,
            username = $scope.credentials.username,
            password = $scope.credentials.password;

        if (!password) {
            $mmUtil.showErrorModal('mm.login.passwordrequired', true);
            return;
        }

        if (!$mmApp.isOnline()) {
            $mmUtil.showErrorModal('mm.core.networkerrormsg', true);
            return;
        }

        var modal = $mmUtil.showModalLoading();

        // Start the authentication process.
        $mmSitesManager.getUserToken(siteurl, username, password).then(function(data) {
            $mmSitesManager.updateSiteToken(infositeurl, username, data.token, data.privatetoken).then(function() {
                // Update site info too because functions might have changed (e.g. unisntall local_mobile).
                $mmSitesManager.updateSiteInfoByUrl(infositeurl, username).finally(function() {
                    delete $scope.credentials; // Delete password from the scope.
                    $ionicHistory.nextViewOptions({disableBack: true});
                    if (stateName) {
                        // State defined, go to that state instead of site initial page.
                        return $state.go(stateName, stateParams);
                    } else {
                        return $mmLoginHelper.goToSiteInitialPage();
                    }
                });
            }, function() {
                // Site deleted? Go back to login page.
                $mmUtil.showErrorModal('mm.login.errorupdatesite', true);
                $scope.cancel();
            }).finally(function() {
                modal.dismiss();
            });
        }, function(error) {
            modal.dismiss();
            $mmLoginHelper.treatUserTokenError(siteurl, error);
        });
    };

    // An OAuth button was clicked.
    $scope.oauthClicked = function(provider) {
        if (!$mmLoginHelper.openBrowserForOAuthLogin($scope.siteurl, provider, siteConfig.launchurl)) {
            $mmUtil.showErrorModal('Invalid data.');
        }
    };

});
