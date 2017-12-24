angular.module('mm.core.custom', [])

    .config(function($stateProvider) {

        $stateProvider

            .state('site.mm_onlineTV', {
                url: 'mm_onlineTV',
                views: {
                    'site': {
                        templateUrl: 'core/components/custom/templates/onlineTV.html',
                        controller: 'mmOnlineTVCtrl'
                    }
                }
            })
    }

    );