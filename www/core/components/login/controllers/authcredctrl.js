angular.module('mm.core.login')

.controller('mmAuthCredCtrl', function($scope, $state, $stateParams, $timeout, $mmSitesManager, $mmSite, $mmUtil) {

    $scope.siteurl = $mmSitesManager.getLoginURL();
    $scope.credentials = {};
    $scope.login = function() {

        var siteurl = $scope.siteurl,
            username = $scope.credentials.username,
            password = $scope.credentials.password;

            console.log($scope.username);

        if (!username) {
            alert('usernamerequired');
            return;
        }
        if(!password) {
            alert('passwordrequired');
            return;
        }

        $mmUtil.showModalLoading('Loading');

        $mmSitesManager.getUserToken(siteurl, username, password).then(function(token) {
            $mmSite.newSite(siteurl, token).then(function(site) {
                $mmSitesManager.addSite(site);
                $mmUtil.closeModalLoading();

                $mmSitesManager.clearLoginData();
                $scope.username = '';
                $scope.password = '';

                $state.go('site.index');
            }, function(error) {
                alert(error);
            });
        }, function(error) {
            $mmUtil.closeModalLoading();
            alert(error);
        });
    };

});
