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
 * Controller to handle accepting site policy.
 *
 * @module mm.core.login
 * @ngdoc controller
 * @name mmLoginSitePolicyCtrl
 */
.controller('mmLoginSitePolicyCtrl', function($scope, $state, $stateParams, $mmSitesManager, $mmSite, $mmUtil, $ionicHistory,
            $mmLoginHelper, $mmWS, $q, $sce, $mmFS) {

    var siteId = $stateParams.siteid || $mmSite.getId();

    if (!siteId || siteId != $mmSite.getId() || !$mmSite.wsAvailable('core_user_agree_site_policy')) {
        // Not current site or WS not available, stop.
        cancel();
        return;
    }

    // Fetch the site policy URL.
    function fetchSitePolicy() {
        return $mmLoginHelper.getSitePolicy(siteId).then(function(sitePolicy) {
            $scope.sitePolicy = sitePolicy;

            // Try to get the mime type.
            return $mmUtil.getMimeTypeFromUrl($scope.sitePolicy).then(function(mimeType) {
                var extension = $mmFS.getExtension(mimeType, $scope.sitePolicy);
                $scope.showInline = extension == 'html' || extension == 'html';

                if ($scope.showInline) {
                    $scope.trustedSitePolicy = $sce.trustAsResourceUrl($scope.sitePolicy);
                }
            }).catch(function() {
                // Unable to get mime type, assume it's not supported.
                $scope.showInline = false;
            }).finally(function() {
                $scope.policyLoaded = true;
            });
        }).catch(function(error) {
            $mmUtil.showErrorModalDefault(error && error.error, 'Error getting site policy.');
            cancel();
        });
    }

    fetchSitePolicy();

    $scope.cancel = function() {
        cancel();
    };

    $scope.accept = function() {
        var modal = $mmUtil.showModalLoading('mm.core.sending', true);
        $mmLoginHelper.acceptSitePolicy(siteId).then(function() {
            // Success accepting, go to site initial page.
            // Invalidate cache since some WS don't return error if site policy is not accepted.
            return $mmSite.invalidateWsCache().catch(function() {
                // Ignore errors.
            }).then(function() {
                $ionicHistory.nextViewOptions({disableBack: true});
                return $mmLoginHelper.goToSiteInitialPage();
            });
        }).catch(function(error) {
            $mmUtil.showErrorModalDefault(error, 'Error accepting site policy.');
        }).finally(function() {
            modal.dismiss();
        });
    };

    // Logout and go to sites screen.
    function cancel() {
        $mmSitesManager.logout().finally(function() {
            $ionicHistory.nextViewOptions({
                disableAnimate: true,
                disableBack: true
            });
            $state.go('mm_login.sites');
        });
    }

});
