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

angular.module('mm.core.user', [])

.constant('mmUserEventProfileRefreshed', 'user_profile_refreshed') // User refreshed an user profile.
.constant('mmUserProfilePictureUpdated', 'user_profile_picture_updated') // User profile picture updated.
.value('mmUserProfileState', 'site.mm_user-profile')

.config(function($stateProvider, $mmContentLinksDelegateProvider) {

    $stateProvider

        .state('site.mm_user-profile', {
            url: '/mm_user-profile',
            views: {
                'site': {
                    controller: 'mmUserProfileCtrl',
                    templateUrl: 'core/components/user/templates/profile.html'
                }
            },
            params: {
                courseid: 0,
                userid: 0
            }
        });

    // Register content links handler.
    $mmContentLinksDelegateProvider.registerLinkHandler('mmUser', '$mmUserHandlers.linksHandler');

})

.run(function($mmEvents, mmCoreEventLogin, mmCoreEventSiteUpdated, $mmUserDelegate, $mmSite, mmCoreEventUserDeleted, $mmUser,
            mmCoreEventRemoteAddonsLoaded, $mmUserProfileFieldsDelegate) {
    function updateHandlers() {
        $mmUserDelegate.updateProfileHandlers();
        $mmUserProfileFieldsDelegate.updateFieldHandlers();
    }

    $mmEvents.on(mmCoreEventLogin, updateHandlers);
    $mmEvents.on(mmCoreEventSiteUpdated, updateHandlers);
    $mmEvents.on(mmCoreEventRemoteAddonsLoaded, updateHandlers);

    $mmEvents.on(mmCoreEventUserDeleted, function(data) {
        if (data.siteid && data.siteid === $mmSite.getId() && data.params) {
            // Search for userid in params.
            var params = data.params,
                userid = 0;
            if (params.userid) {
                userid = params.userid;
            } else if (params.userids) {
                userid = params.userids[0];
            } else if (params.field === 'id' && params.values && params.values.length) {
                userid = params.values[0];
            } else if (params.userlist && params.userlist.length) {
                userid = params.userlist[0].userid;
            }

            userid = parseInt(userid);
            if (userid > 0) {
                $mmUser.deleteStoredUser(userid);
            }
        }
    });
});
