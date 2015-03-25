angular.module('mm.core.login')

.controller('mmAuthLoginCtrl', function($scope, $state, $ionicHistory, $mmSitesManager, $ionicLoading) {

    $scope.sites = $mmSitesManager.getSites();
    $scope.data = {
        hasSites: $mmSitesManager.hasSites(),
        showDetele: false
    }

    $scope.toggleDelete = function() {
        $scope.data.showDelete = !$scope.data.showDelete;
    };

    $scope.onItemDelete = function(e, index) {
        // Prevent login() from being triggered. No idea why I cannot replicate this
        // problem on http://codepen.io/ionic/pen/JsHjf.
        e.stopPropagation();

        var site = $mmSitesManager.getSite(index);
        $ionicPopup.confirm({template: 'Are you sure you want to delete the site "'+site.sitename+'"?'})
            .then(function(confirmed) {
                if(confirmed) {
                    $mmSitesManager.deleteSite(index);
                    $scope.sites.splice(index, 1);

                    if(!$mmSitesManager.hasSites()) {
                        $state.go('mm_login.site');
                    }
                }
            });

    }

    $scope.login = function(index) {
        $mmSitesManager.loginInSite(index);
        $state.go('site.index');
    }

    $scope.add = function() {
        $state.go('mm_login.site');
    }

});