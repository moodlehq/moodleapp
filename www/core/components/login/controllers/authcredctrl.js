angular.module('mm.core.login')

.controller('mmAuthCredCtrl', function($scope, $state, $stateParams, $mmSitesManager, $mmUtil, $translate) {

    $scope.siteurl = $stateParams.siteurl;
    $scope.credentials = {};
    $scope.login = function() {

        var siteurl = $scope.siteurl,
            username = $scope.credentials.username,
            password = $scope.credentials.password;

        if (!username) {
            $mmUtil.showErrorModal('mm.core.login.usernamerequired', true);
            return;
        }
        if(!password) {
            $mmUtil.showErrorModal('mm.core.login.passwordrequired', true);
            return;
        }

        $translate('loading').then(function(loadingString) {
            $mmUtil.showModalLoading(loadingString);
        });

        $mmSitesManager.getUserToken(siteurl, username, password).then(function(token) {
            $mmSitesManager.newSite(siteurl, username, token).then(function() {
                delete $scope.credentials;
                $state.go('site.index');
            }, function(error) {
                $mmUtil.showErrorModal(error);
            }).finally(function() {
                $mmUtil.closeModalLoading();
            });
        }, function(error) {
            $mmUtil.closeModalLoading();
            $mmUtil.showErrorModal(error);
        });
    };

});
