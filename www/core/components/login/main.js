angular.module('mm.core.login', [])

.config(function($stateProvider) {

    $stateProvider

    .state('mm_login', {
        url: '/mm_login',
        abstract: true,
        templateUrl: 'core/components/login/templates/login.html',
        cache: false,   // Disable caching to force controller reload.
        onEnter: function($ionicHistory) {
            // Ensure that there is no history stack when getting here.
            $ionicHistory.clearHistory();
        }
    })

    .state('mm_login.index', {
        url: '/index',
        templateUrl: 'core/components/login/templates/login-index.html',
        controller: 'mmAuthLoginCtrl',
        onEnter: function($state, $mmSitesManager) {
            // Skip this page if there are no sites yet.
            if (!$mmSitesManager.hasSites()) {
                $state.go('mm_login.site');
            }
        }
    })

    .state('mm_login.site', {
        url: '/site',
        templateUrl: 'core/components/login/templates/login-site.html',
        controller: 'mmAuthSiteCtrl',
        onEnter: function($ionicNavBarDelegate, $mmSitesManager) {
            if (!$mmSitesManager.hasSites()) {
                $ionicNavBarDelegate.showBackButton(false);
            }
        }
    })

    .state('mm_login.credentials', {
        url: '/cred',
        templateUrl: 'core/components/login/templates/login-credentials.html',
        controller: 'mmAuthCredCtrl',
        onEnter: function($state, $mmSitesManager) {
            // Do not allow access to this page when the URL was not passed.
            if ($mmSitesManager.getLoginURL() == '') {
                $state.go('mm_login.index');
            }
        }
    });

});
