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

angular.module('mm.addons.competency')

.factory('$mmaCompetencyHelper', function($mmUser, $mmSite, $log, $q) {

    $log = $log.getInstance('$mmaCompetencyHelper');

    var self = {};

    /**
     * Convenient helper to get the user profile image.
     *
     * @module mm.addons.competency
     * @ngdoc method
     * @name $mmaCompetencyHelper#getProfile
     * @param  {Integer} userId User Id
     * @return {Promise}        User profile Image URL or true if default icon.
     */
    self.getProfile = function(userId) {
        if (!userId || userId == $mmSite.getUserId()) {
            return $q.when(false);
        }

        // Get the user profile to retrieve the user image.
        return $mmUser.getProfile(userId, undefined, true).then(function(user) {
            user.profileimageurl = user.profileimageurl || true;
            return user;
        });
    };

    return self;
});
