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

angular.module('mm.core.contentlinks')

/**
 * Controller to choose an account to handle content links.
 *
 * @module mm.core.contentlinks
 * @ngdoc controller
 * @name mmContentLinksChooseSiteCtrl
 */
.controller('mmContentLinksChooseSiteCtrl', function($scope, $stateParams, $mmSitesManager, $mmUtil, $ionicHistory, $state, $q,
            $mmContentLinksDelegate, $mmContentLinksHelper) {

    $scope.url = $stateParams.url || '';

    var action;

    function leaveView() {
        $mmSitesManager.logout().finally(function() {
            $ionicHistory.nextViewOptions({
                disableAnimate: true,
                disableBack: true
            });
            $state.go('mm_login.sites');
        });
    }

    if (!$scope.url) {
        leaveView();
        return;
    }

    $mmContentLinksDelegate.getActionsFor($scope.url).then(function(actions) {
        action = $mmContentLinksHelper.getFirstValidAction(actions);
        if (!action) {
            return $q.reject();
        }

        $mmSitesManager.getSites(action.sites).then(function(sites) {
            $scope.sites = sites;
        });
    }).catch(function() {
        $mmUtil.showErrorModal('mm.contentlinks.errornosites', true);
        leaveView();
    });

    $scope.siteClicked = function(siteId) {
        action.action(siteId);
    };

    $scope.cancel = function() {
        leaveView();
    };

});
