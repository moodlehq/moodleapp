angular.module('mm.core.login')

.controller('mmAuthLoginCtrl', function($scope, $state, $mmSitesManager, $ionicPopup, $log, sites) {

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

        $ionicPopup.confirm({template: 'Are you sure you want to delete the site "'+site.sitename+'"?'})
            .then(function(confirmed) {
                if(confirmed) {
                    $mmSitesManager.deleteSite(site.id).then(function() {
                        $scope.sites.splice(index, 1);
                        $mmSitesManager.noSites().then(function() {
                            $state.go('mm_login.site');
                        });
                    }, function(error) {
                        // TODO: Show error message.
                        $log.error('Delete site failed');
                        console.log(error);
                    });
                }
            });

    }

    $scope.login = function(index) {
        var siteid = $scope.sites[index].id;
        $mmSitesManager.loadSite(siteid).then(function() {
            $state.go('site.index');
        }, function(error) {
            // TODO: Show error message.
            $log.error('Error loading site.');
            console.log(error);
        });
    };

    $scope.add = function() {
        $state.go('mm_login.site');
    };

});