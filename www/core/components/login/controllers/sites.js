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
 * Controller to handle the list of sites.
 *
 * @module mm.core.login
 * @ngdoc controller
 * @name mmLoginSitesCtrl
 */
.controller('mmLoginSitesCtrl', function($scope, $mmSitesManager, $log, $translate, $mmUtil, $ionicHistory, $mmText,
            $mmLoginHelper) {

    $log = $log.getInstance('mmLoginSitesCtrl');

    $mmSitesManager.getSites().then(function(sites) {
        // Remove protocol from the url to show more url text.
        sites = sites.map(function(a) {
            a.siteurl = a.siteurl.replace(/^https?:\/\//, '');
            return a;
        });

        // Sort sites by url and fullname.
        $scope.sites = sites.sort(function(a, b) {
            // First compare by site url without the protocol.
            var compareA = a.siteurl.toLowerCase(),
                compareB = b.siteurl.toLowerCase(),
                compare = compareA.localeCompare(compareB);

            if (compare !== 0) {
                return compare;
            }

            // If site url is the same, use fullname instead.
            compareA = a.fullname.toLowerCase().trim();
            compareB = b.fullname.toLowerCase().trim();
            return compareA.localeCompare(compareB);
        });

        $scope.data = {
            hasSites: sites.length > 0,
            showDelete: false
        };
    });

    $scope.toggleDelete = function() {
        $scope.data.showDelete = !$scope.data.showDelete;
    };

    $scope.onItemDelete = function(e, index) {
        // Prevent login() from being triggered. No idea why I cannot replicate this
        // problem on http://codepen.io/ionic/pen/JsHjf.
        e.stopPropagation();

        var site = $scope.sites[index],
            sitename = site.sitename;

        $mmText.formatText(sitename).then(function(sitename) {
            $mmUtil.showConfirm($translate.instant('mm.login.confirmdeletesite', {sitename: sitename})).then(function() {
                $mmSitesManager.deleteSite(site.id).then(function() {
                    $scope.sites.splice(index, 1);
                    $scope.data.showDelete = false;
                    $mmSitesManager.hasNoSites().then(function() {
                        // No sites left, go to add a new site state.
                        $ionicHistory.nextViewOptions({disableBack: true});
                        $mmLoginHelper.goToAddSite();
                    });
                }, function() {
                    $log.error('Delete site failed');
                    $mmUtil.showErrorModal('mm.login.errordeletesite', true);
                });
            });
        });
    };

    $scope.login = function(siteId) {
        var modal = $mmUtil.showModalLoading();

        $mmSitesManager.loadSite(siteId).then(function() {
            $ionicHistory.nextViewOptions({disableBack: true});
            return $mmLoginHelper.goToSiteInitialPage();
        }, function(error) {
            $log.error('Error loading site ' + siteId);
            error = error || 'Error loading site.';
            $mmUtil.showErrorModal(error);
        }).finally(function() {
            modal.dismiss();
        });
    };

    $scope.add = function() {
        $mmLoginHelper.goToAddSite();
    };

});
