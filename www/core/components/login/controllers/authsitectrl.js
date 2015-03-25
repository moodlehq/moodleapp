angular.module('mm.core.login')

.controller('mmAuthSiteCtrl', function($scope, $state, $mmSitesManager, $mmSite, $mmUtil) {

    $scope.siteurl = '';

    $scope.connect = function(url) {

        if (!url) {
            alert('siteurlrequired');
            return;
        }

        $mmUtil.showModalLoading('Loading');

        $mmSitesManager.getDemoSiteData(url).then(function(sitedata) {

            $mmSitesManager.getUserToken(sitedata.url, sitedata.username, sitedata.password).then(function(token) {
                $mmSitesManager.newSite(sitedata.url, sitedata.username, token).then(function() {
                    $mmUtil.closeModalLoading();
                    $state.go('site.index');
                }, function(error) {
                    alert(error);
                });
            }, function(error) {
                alert(error);
            });

        }, function() {
            // Not a demo site.
            $mmSitesManager.checkSite(url).then(function(result) {
                $mmUtil.closeModalLoading();
                $state.go('mm_login.credentials', {siteurl: result.siteurl});
            }, function(error) {
                // TODO: Show error message with ngMessages or popup
                $mmUtil.closeModalLoading();
                alert(error);
            });
        });
    }

});