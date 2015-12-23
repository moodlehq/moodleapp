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

angular.module('mm.addons.participants')

/**
 * Service to handle course participants.
 *
 * @module mm.addons.participants
 * @ngdoc service
 * @name $mmaParticipants
 */
.factory('$mmaParticipants', function($log, $mmSite, $mmUser, mmaParticipantsListLimit) {

    $log = $log.getInstance('$mmaParticipants');

    var self = {};

    /**
     * Get cache key for participant list WS calls.
     *
     * @param  {Number} courseid Course ID.
     * @return {String}          Cache key.
     */
    function getParticipantsListCacheKey(courseid) {
        return 'mmaParticipants:list:'+courseid;
    }

    /**
     * Get participants for a certain course.
     *
     * @module mm.addons.participants
     * @ngdoc method
     * @name $mmaParticipants#getParticipants
     * @param {String} courseid    ID of the course.
     * @param {Number} limitFrom   Position of the first participant to get.
     * @param {Number} limitNumber Number of participants to get.
     * @return {Promise}           Promise to be resolved when the participants are retrieved.
     */
    self.getParticipants = function(courseid, limitFrom, limitNumber) {

        if (typeof limitFrom == 'undefined') {
            limitFrom = 0;
        }
        if (typeof limitNumber == 'undefined') {
            limitNumber = mmaParticipantsListLimit;
        }

        $log.debug('Get participants for course ' + courseid + ' starting at ' + limitFrom);

        var wsName,
            data = {
                courseid: courseid
            }, preSets = {
                cacheKey: getParticipantsListCacheKey(courseid)
            };

        if ($mmSite.wsAvailable('core_enrol_get_enrolled_users')) {
            wsName = 'core_enrol_get_enrolled_users';
            data.options = [
                {
                    name: 'limitfrom',
                    value: limitFrom
                },
                {
                    name: 'limitnumber',
                    value: limitNumber
                },
                {
                    name: 'sortby',
                    value: 'siteorder'
                }
            ];
        } else {
            wsName = 'moodle_enrol_get_enrolled_users';
            limitNumber = 9999999999; // Set a big limitNumber so canLoadMore is always false (WS not paginated).
        }

        return $mmSite.read(wsName, data, preSets).then(function(users) {
            // Format user data, moodle_enrol_get_enrolled_users returns some attributes with a different name.
            angular.forEach(users, function(user) {
                if (typeof user.id == 'undefined' && typeof user.userid != 'undefined') {
                    user.id = user.userid;
                }
                if (typeof user.profileimageurl == 'undefined' && typeof user.profileimgurl != 'undefined') {
                    user.profileimageurl = user.profileimgurl;
                }
            });

            var canLoadMore = users.length >= limitNumber;
            $mmUser.storeUsers(users);
            return {participants: users, canLoadMore: canLoadMore};
        });
    };

    /**
     * Invalidates participant list for a certain course.
     *
     * @module mm.addons.participants
     * @ngdoc method
     * @name $mmaParticipants#invalidateParticipantsList
     * @param  {Number} courseid Course ID.
     * @return {Promise}         Promise resolved when the list is invalidated.
     */
    self.invalidateParticipantsList = function(courseid) {
        return $mmSite.invalidateWsCacheForKey(getParticipantsListCacheKey(courseid));
    };

    /**
     * Returns whether or not the participants addon is enabled for a certain course.
     *
     * @module mm.addons.participants
     * @ngdoc method
     * @name $mmaParticipants#isPluginEnabledForCourse
     * @param {Number} courseId Course ID.
     * @return {Promise}        Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    self.isPluginEnabledForCourse = function(courseId) {
        if (!courseId) {
            return $q.reject();
        }

        // Retrieving one participant will fail if browsing users is disabled by capabilities.
        return self.getParticipants(courseId, 0, 1).then(function(parcitipants) {
            return true;
        }).catch(function(error) {
            return false;
        });
    };

    return self;
});
