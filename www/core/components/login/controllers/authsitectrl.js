angular.module('mm.core.login')

.controller('mmAuthSiteCtrl', function($scope, $state, $mmSitesManager, $mmSite, $mmUtil) {

    $scope.logindata = $mmSitesManager.getLoginData();

    $scope.connect = function(url) {

        if (!url) {
            alert('siteurlrequired');
            return;
        }

        $mmUtil.showModalLoading('Loading');

        if($mmSitesManager.isDemoSite(url)) {

            var sitedata = $mmSitesManager.getDemoSiteData(url);

            $mmSitesManager.getUserToken(sitedata.url, sitedata.username, sitedata.password).then(function(token) {
                $mmSite.newSite(sitedata.url, token).then(function(site) {
                    $mmSitesManager.addSite(site);
                    $mmUtil.closeModalLoading();
                    $mmSitesManager.clearLoginData();
                    $state.go('site.index');
                }, function(error) {
                    alert(error);
                });
            }, function(error) {
                alert(error);
            });
        }
        else {
            $mmSitesManager.checkSite(url).then(function(code) {
                $mmUtil.closeModalLoading();
                $state.go('mm_login.credentials');
            }, function(error) {
                // TODO: Show error message with ngMessages or popup
                $mmUtil.closeModalLoading();
                alert(error);
            });

        }
    }

});