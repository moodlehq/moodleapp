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
            $mmSitesManager.noSites().then(function() {
                $state.go('mm_login.site');
            });
        },
        resolve: {
            sites: function($mmSitesManager) {
                return $mmSitesManager.getSites();
            }
          }
    })

    .state('mm_login.site', {
        url: '/site',
        templateUrl: 'core/components/login/templates/login-site.html',
        controller: 'mmAuthSiteCtrl',
        onEnter: function($ionicNavBarDelegate, $ionicHistory, $mmSitesManager) {
            // Don't show back button if there are no sites.
            $mmSitesManager.noSites().then(function() {
                $ionicNavBarDelegate.showBackButton(false);
                $ionicHistory.clearHistory();
            });
        }
    })

    .state('mm_login.credentials', {
        url: '/cred',
        templateUrl: 'core/components/login/templates/login-credentials.html',
        controller: 'mmAuthCredCtrl',
        params: {
            siteurl: ''
        },
        onEnter: function($state, $stateParams) {
            // Do not allow access to this page when the URL was not passed.
            if (!$stateParams.siteurl) {
              $state.go('mm_login.index');
            }
        }
    });

});
