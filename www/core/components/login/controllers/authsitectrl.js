angular.module('mm.core.login')

.controller('mmAuthSiteCtrl', function($scope, $state, $mmSitesManager, $mmSite, $mmUtil, $ionicPopup, $translate, $ionicModal) {

    $scope.siteurl = '';

    $scope.connect = function(url) {

        if (!url) {
            $mmUtil.showErrorModal('mm.core.login.siteurlrequired', true);
            return;
        }

        $translate('loading').then(function(loadingString) {
            $mmUtil.showModalLoading(loadingString);
        });

        $mmSitesManager.getDemoSiteData(url).then(function(sitedata) {

            $mmSitesManager.getUserToken(sitedata.url, sitedata.username, sitedata.password).then(function(token) {
                $mmSitesManager.newSite(sitedata.url, sitedata.username, token).then(function() {
                    $mmUtil.closeModalLoading();
                    $state.go('site.index');
                }, function(error) {
                    $mmUtil.closeModalLoading();
                    $mmUtil.showErrorModal(error);
                });
            }, function(error) {
                $mmUtil.closeModalLoading();
                $mmUtil.showErrorModal(error);
            });

        }, function() {
            // Not a demo site.
            $mmSitesManager.checkSite(url).then(function(result) {
                $mmUtil.closeModalLoading();
                $state.go('mm_login.credentials', {siteurl: result.siteurl});
            }, function(error) {
                $mmUtil.closeModalLoading();
                $mmUtil.showErrorModal(error);
            });
        });
    };

    // Setup help modal
    $ionicModal.fromTemplateUrl('core/components/login/templates/login-help-modal.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function(helpModal) {
        $scope.showHelp = function() {
            helpModal.show();
        };
        $scope.closeHelp = function() {
            helpModal.hide();
        };
        $scope.$on('$destroy', function() {
            helpModal.remove();
        });
    });

});
