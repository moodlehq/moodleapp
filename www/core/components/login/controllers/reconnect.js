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
.controller('mmLoginReconnectCtrl', function($scope, $state, $stateParams, $mmSitesManager, $mmApp, $mmUtil, $ionicHistory) {

    var infositeurl = $stateParams.infositeurl; // Siteurl in site info. It might be different than siteurl (http/https).
    $scope.siteurl = $stateParams.siteurl;
    $scope.credentials = {
        username: $stateParams.username,
        password: ''
    };

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

        var modal = $mmUtil.showModalLoading();

        // Start the authentication process.
        $mmSitesManager.getUserToken(siteurl, username, password).then(function(token) {
            $mmSitesManager.updateSiteToken(infositeurl, username, token).then(function() {
                // Update site info too because functions might have changed (e.g. unisntall local_mobile).
                $mmSitesManager.updateSiteInfoByUrl(infositeurl, username).finally(function() {
                    delete $scope.credentials; // Delete password from the scope.
                    $ionicHistory.nextViewOptions({disableBack: true});
                    $state.go('site.mm_courses');
                });
            }, function(error) {
                // Site deleted? Go back to login page.
                $mmUtil.showErrorModal('mm.login.errorupdatesite', true);
                $scope.cancel();
            }).finally(function() {
                modal.dismiss();
            });
        }, function(error) {
            modal.dismiss();
            $mmUtil.showErrorModal(error);
        });
    };

});
