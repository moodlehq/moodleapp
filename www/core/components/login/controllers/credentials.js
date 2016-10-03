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
 * @name mmLoginCredentialsCtrl
 */
.controller('mmLoginCredentialsCtrl', function($scope, $state, $stateParams, $mmSitesManager, $mmUtil, $ionicHistory, $mmApp,
            $q, $mmLoginHelper, $mmContentLinksDelegate, $mmContentLinksHelper) {

    $scope.siteurl = $stateParams.siteurl;
    $scope.credentials = {
        username: $stateParams.username
    };

    var siteChecked = false,
        urlToOpen = $stateParams.urltoopen;

    // Function to check if a site uses local_mobile, requires SSO login, etc.
    // This should be used only if a fixed URL is set, otherwise this check is already performed in mmLoginSiteCtrl.
    function checkSite(siteurl) {
        // If the site is configured with http:// protocol we force that one, otherwise we use default mode.
        var checkmodal = $mmUtil.showModalLoading(),
            protocol = siteurl.indexOf('http://') === 0 ? 'http://' : undefined;
        return $mmSitesManager.checkSite(siteurl, protocol).then(function(result) {

            siteChecked = true;
            $scope.siteurl = result.siteurl;

            if (result && result.warning) {
                $mmUtil.showErrorModal(result.warning, true, 4000);
            }

            if ($mmLoginHelper.isSSOLoginNeeded(result.code)) {
                // SSO. User needs to authenticate in a browser.
                $scope.isBrowserSSO = true;

                // Check that there's no SSO authentication ongoing and the view hasn't changed.
                if (!$mmApp.isSSOAuthenticationOngoing() && !$scope.$$destroyed) {
                    $mmLoginHelper.confirmAndOpenBrowserForSSOLogin(result.siteurl, result.code);
                }
            } else {
                $scope.isBrowserSSO = false;
            }

        }).catch(function(error) {
            $mmUtil.showErrorModal(error);
            return $q.reject();
        }).finally(function() {
            checkmodal.dismiss();
        });
    }

    if ($mmLoginHelper.isFixedUrlSet()) {
        // Fixed URL, we need to check if it uses browser SSO login.
        checkSite($scope.siteurl);
    } else {
        siteChecked = true;
    }

    $scope.login = function() {

        $mmApp.closeKeyboard();

        // Get input data.
        var siteurl = $scope.siteurl,
            username = $scope.credentials.username,
            password = $scope.credentials.password;

        if (!siteChecked) {
            // Site wasn't checked (it failed), let's check again.
            return checkSite(siteurl).then(function() {
                if (!$scope.isBrowserSSO) {
                    // Site doesn't use browser SSO, throw app's login again.
                    return $scope.login();
                }
            });
        } else if ($scope.isBrowserSSO) {
            // A previous check determined that browser SSO is needed. Let's check again, maybe site was updated.
            return checkSite(siteurl);
        }

        if (!username) {
            $mmUtil.showErrorModal('mm.login.usernamerequired', true);
            return;
        }
        if (!password) {
            $mmUtil.showErrorModal('mm.login.passwordrequired', true);
            return;
        }

        var modal = $mmUtil.showModalLoading();

        // Start the authentication process.
        return $mmSitesManager.getUserToken(siteurl, username, password).then(function(data) {
            return $mmSitesManager.newSite(data.siteurl, data.token).then(function() {
                delete $scope.credentials; // Delete username and password from the scope.
                $ionicHistory.nextViewOptions({disableBack: true});

                if (urlToOpen) {
                    // There's a content link to open.
                    return $mmContentLinksDelegate.getActionsFor(urlToOpen, undefined, username).then(function(actions) {
                        action = $mmContentLinksHelper.getFirstValidAction(actions);
                        if (action && action.sites.length) {
                            // Action should only have 1 site because we're filtering by username.
                            action.action(action.sites[0]);
                        } else {
                            return $mmLoginHelper.goToSiteInitialPage();
                        }
                    });
                } else {
                    return $mmLoginHelper.goToSiteInitialPage();
                }
            });
        }).catch(function(error) {
            $mmLoginHelper.treatUserTokenError(siteurl, error);
        }).finally(function() {
            modal.dismiss();
        });
    };

});
