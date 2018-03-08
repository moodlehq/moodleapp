// (C) Copyright 2015 Martin Dougiamas
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

angular.module('mm.addons.badges', [])

.constant('mmaBadgesPriority', 50)
.constant('mmaBadgesComponent', 'mmaBadges')

.config(function($stateProvider, $mmUserDelegateProvider, mmaBadgesPriority, $mmContentLinksDelegateProvider) {

    $stateProvider

    .state('site.userbadges', {
        url: '/userbadges',
        views: {
            'site': {
                templateUrl: 'addons/badges/templates/userbadges.html',
                controller: 'mmaBadgesUserCtrl'
            }
        },
        params: {
            courseid: null,
            userid: null
        }
    })

    .state('site.issuedbadge', {
        url: '/issuedbadge',
        views: {
            'site': {
                templateUrl: 'addons/badges/templates/issuedbadge.html',
                controller: 'mmaBadgesIssuedCtrl'
            }
        },
        params: {
            cid: null, // Not naming it courseid because it collides with 'site.userbadges' param in split-view.
            uid: null, // Not naming it userid because it collides with 'site.userbadges' param in split-view.
            uniquehash: null
        }
    });

    // Register plugin on user profile.
    $mmUserDelegateProvider.registerProfileHandler('mmaBadges', '$mmaBadgesHandlers.userProfile', mmaBadgesPriority);
    $mmContentLinksDelegateProvider.registerLinkHandler('mmaBadges:myBadges', '$mmaBadgesHandlers.myBadgesLinksHandler');
    $mmContentLinksDelegateProvider.registerLinkHandler('mmaBadges:badge', '$mmaBadgesHandlers.badgeLinksHandler');
});
