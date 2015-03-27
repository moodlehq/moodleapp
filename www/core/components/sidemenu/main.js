angular.module('mm.core.sidemenu', [])

.config(function($stateProvider) {

    $stateProvider

    .state('site', {
        url: '/site',
        templateUrl: 'core/components/sidemenu/templates/sidemenu.html',
        controller: 'mmSideMenu',
        abstract: true,
        onEnter: function($ionicHistory, $state, $mmSite) {
            // Remove the login page from the history stack.
            $ionicHistory.clearHistory();

            // Go to login if user is not logged in.
            if (!$mmSite.isloggedin()) {
                $state.go('mm_login.index');
            }
        }
    });

});
