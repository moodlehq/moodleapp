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
 * Controller to handle email signup.
 *
 * @module mm.core.login
 * @ngdoc controller
 * @name mmLoginEmailSignupCtrl
 */
.controller('mmLoginEmailSignupCtrl', function($scope, $stateParams, $mmUtil, $ionicHistory, $mmLoginHelper, $mmWS, $q,
            $ionicModal) {

    var siteConfig = $stateParams.siteconfig,
        modalInitialized = false;

    $scope.siteurl = $stateParams.siteurl;
    $scope.data = {};

    // Treat the site's config, setting scope variables.
    function treatSiteConfig(siteConfig) {
        if (siteConfig && siteConfig.registerauth == 'email') {
            $scope.logourl = siteConfig.logourl || siteConfig.compactlogourl;
            $scope.authInstructions = siteConfig.authinstructions;
            initAuthInstructionsModal();
            return true;
        } else {
            $mmUtil.showErrorModal('Sorry, you may not use this page.');
            $ionicHistory.goBack();
            return false;
        }
    }

    // Get signup settings from server.
    function getSignupSettings() {
        return $mmWS.callAjax('auth_email_get_signup_settings', {}, {siteurl: $scope.siteurl}).then(function(settings) {
            $scope.settings = settings;
            $scope.countries = $mmUtil.getCountryList();
            $scope.categories = $mmLoginHelper.formatProfileFieldsForSignup(settings.profilefields);

            if (settings.defaultcity && !$scope.data.city) {
                $scope.data.city = settings.defaultcity;
            }
            if (settings.country && !$scope.data.country) {
                $scope.data.country = settings.country;
            }
        }).catch(function(err) {
            $mmUtil.showErrorModal(err);
            return $q.reject();
        });
    }

    // Init auth instructions modal.
    function initAuthInstructionsModal() {
        if ($scope.authInstructions && !modalInitialized) {
            $ionicModal.fromTemplateUrl('core/components/login/templates/authinstructions-modal.html', {
                scope: $scope,
                animation: 'slide-in-up'
            }).then(function(modal) {
                modalInitialized = true;

                $scope.showAuthInstructions = function() {
                    modal.show();
                };
                $scope.closeAuthInstructions = function() {
                    modal.hide();
                };
                $scope.$on('$destroy', function() {
                    modal.remove();
                });
            });
        }
    }

    if (treatSiteConfig(siteConfig)) {
        getSignupSettings().finally(function() {
            $scope.settingsLoaded = true;
        });
    }

    // Pull to refresh.
    $scope.refreshSettings = function() {
        getSignupSettings().finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };
});
