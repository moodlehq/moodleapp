angular.module('mm.core.login')

.controller('mmAuthCredCtrl', function($scope, $state, $stateParams, $timeout, $mmSitesManager, $mmSite, $mmUtil) {

    $scope.siteurl = $stateParams.siteurl;
    $scope.credentials = {};
    $scope.login = function() {

        var siteurl = $scope.siteurl,
            username = $scope.credentials.username,
            password = $scope.credentials.password;

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
            $mmSitesManager.newSite(siteurl, username, token).then(function() {
                $mmUtil.closeModalLoading();
                delete $scope.credentials;
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
