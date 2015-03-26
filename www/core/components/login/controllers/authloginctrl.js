angular.module('mm.core.login')

.controller('mmAuthLoginCtrl', function($scope, $state, $mmSitesManager, $ionicPopup, $log, sites, $translate) {

    $scope.sites = sites;
    $scope.data = {
        hasSites: sites.length > 0,
        showDetele: false
    };

    $scope.toggleDelete = function() {
        $scope.data.showDelete = !$scope.data.showDelete;
    };

    $scope.onItemDelete = function(e, index) {
        // Prevent login() from being triggered. No idea why I cannot replicate this
        // problem on http://codepen.io/ionic/pen/JsHjf.
        e.stopPropagation();

        var site = $scope.sites[index];

        $ionicPopup.confirm({template: $translate('mm.core.login.confirmdeletesite', {sitename: site.sitename})})
            .then(function(confirmed) {
                if(confirmed) {
                    $mmSitesManager.deleteSite(site.id).then(function() {
                        $scope.sites.splice(index, 1);
                        $mmSitesManager.noSites().then(function() {
                            $state.go('mm_login.site');
                        });
                    }, function(error) {
                        $log.error('Delete site failed');
                        $mmUtil.showErrorModal('mm.core.login.errordeletesite', true);
                    });
                }
            });

    }

    $scope.login = function(index) {
        var siteid = $scope.sites[index].id;
        $mmSitesManager.loadSite(siteid).then(function() {
            $state.go('site.index');
        }, function(error) {
            $log.error('Error loading site.');
            $mmUtil.showErrorModal('mm.core.login.errorloadsite', true);
        });
    };

    $scope.add = function() {
        $state.go('mm_login.site');
    };

});