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
 * Controller to handle requesting a new password.
 *
 * @module mm.core.login
 * @ngdoc controller
 * @name mmLoginForgottenPasswordCtrl
 */
.controller('mmLoginForgottenPasswordCtrl', function($scope, $stateParams, $q, $mmUtil, $mmLoginHelper, $ionicHistory) {

    $scope.siteurl = $stateParams.siteurl;
    $scope.data = {
        field: 'username',
        value: $stateParams.username || ''
    };

    $scope.resetPassword = function(field, value) {
        if (!value) {
            $mmUtil.showErrorModal('mm.login.usernameoremail', true);
            return;
        }

        var modal = $mmUtil.showModalLoading('mm.core.sending', true),
            isMail = field == 'email';

        $mmLoginHelper.requestPasswordReset($scope.siteurl, isMail ? '' : value, isMail ? value : '').then(function(response) {
            if (response.status == 'dataerror') {
                // Error in the data sent.
                showError(isMail, response.warnings);
            } else if (response.status == 'emailpasswordconfirmnotsent' || response.status == 'emailpasswordconfirmnoemail') {
                // Error, not found.
                $mmUtil.showErrorModal(response.notice);
            } else {
                // Success.
                $mmUtil.showModal('mm.core.success', response.notice);
                $ionicHistory.goBack();
            }
        }).catch(function(error) {
            $mmUtil.showErrorModal(error.error);
            return $q.reject();
        }).finally(function() {
            modal.dismiss();
        });
    };

    // Show an error from the warnings.
    function showError(isMail, warnings) {
        for (var i = 0; i < warnings.length; i++) {
            var warning = warnings[i];
            if ((warning.item == 'email' && isMail) || (warning.item == 'username' && !isMail)) {
                $mmUtil.showErrorModal(warning.message);
                break;
            }
        }
    }

});
