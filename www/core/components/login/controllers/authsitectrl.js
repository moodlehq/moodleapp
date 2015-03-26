angular.module('mm.core.login')

.controller('mmAuthSiteCtrl', function($scope, $state, $mmSitesManager, $mmSite, $mmUtil, $ionicPopup,
                                       $translate, $ionicModal, $mmConfig, mmLoginSSO) {

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
                $mmSitesManager.newSite(sitedata.url, token).then(function() {
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

        }, function() {
            // Not a demo site.
            $mmSitesManager.checkSite(url).then(function(result) {

                if (result.code == 2) {
                    // SSO. User needs to authenticate in a browser.
                    $ionicPopup.confirm({template: $translate('mm.core.login.logininsiterequired')})
                        .then(function(confirmed) {
                            if (confirmed) {
                                $mmConfig.get('wsextservice').then(function(service) {
                                    var passport = Math.random() * 1000;
                                    var loginurl = result.siteurl + "/local/mobile/launch.php?service=" + service;
                                    loginurl += "&passport=" + passport;

                                    $mmConfig.set(mmLoginSSO.siteurl, result.siteurl);
                                    $mmConfig.set(mmLoginSSO.passport, passport);

                                    window.open(loginurl, "_system");
                                    if (navigator.app) {
                                        navigator.app.exitApp();
                                    }
                                });

                            }
                        }
                    );
                } else {
                    $state.go('mm_login.credentials', {siteurl: result.siteurl});
                }

            }, function(error) {
                $mmUtil.showErrorModal(error);
            }).finally(function() {
                $mmUtil.closeModalLoading();
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
