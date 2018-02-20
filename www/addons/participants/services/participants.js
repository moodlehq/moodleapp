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
.factory('$mmaParticipants', function($log, $mmSite, $mmUser, mmaParticipantsListLimit, $mmSitesManager) {

    $log = $log.getInstance('$mmaParticipants');

    var self = {};

    /**
     * Get cache key for participant list WS calls.
     *
     * @param  {Number} courseId Course ID.
     * @return {String}          Cache key.
     */
    function getParticipantsListCacheKey(courseId) {
        return 'mmaParticipants:list:' + courseId;
    }

    /**
     * Get participants for a certain course.
     *
     * @module mm.addons.participants
     * @ngdoc method
     * @name $mmaParticipants#getParticipants
     * @param  {String} courseId    ID of the course.
     * @param  {Number} limitFrom   Position of the first participant to get.
     * @param  {Number} limitNumber Number of participants to get.
     * @param  {String} [siteId]    Site Id. If not defined, use current site.
     * @return {Promise}            Promise to be resolved when the participants are retrieved.
     */
    self.getParticipants = function(courseId, limitFrom, limitNumber, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            if (typeof limitFrom == 'undefined') {
                limitFrom = 0;
            }
            if (typeof limitNumber == 'undefined') {
                limitNumber = mmaParticipantsListLimit;
            }

            $log.debug('Get participants for course ' + courseId + ' starting at ' + limitFrom);

            var wsName,
                data = {
                    courseid: courseId
                }, preSets = {
                    cacheKey: getParticipantsListCacheKey(courseId)
                };

            if (site.wsAvailable('core_enrol_get_enrolled_users')) {
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

            return site.read(wsName, data, preSets).then(function(users) {
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
        });
    };

    /**
     * Invalidates participant list for a certain course.
     *
     * @module mm.addons.participants
     * @ngdoc method
     * @name $mmaParticipants#invalidateParticipantsList
     * @param  {Number} courseId Course ID.
     * @param  {String} [siteId] Site Id. If not defined, use current site.
     * @return {Promise}         Promise resolved when the list is invalidated.
     */
    self.invalidateParticipantsList = function(courseId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getParticipantsListCacheKey(courseId));
        });
    };

    /**
     * Check if course participants is disabled in a certain site.
     *
     * @module mm.addons.participants
     * @ngdoc method
     * @name $mmaParticipants#isDisabled
     * @param  {String} [siteId] Site Id. If not defined, use current site.
     * @return {Promise}         Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    self.isDisabled = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return self.isDisabledInSite(site);
        });
    };

    /**
     * Check if course participants is disabled in a certain site.
     *
     * @module mm.addons.participants
     * @ngdoc method
     * @name $mmaParticipants#isDisabledInSite
     * @param  {Object} [site] Site. If not defined, use current site.
     * @return {Boolean}       True if disabled, false otherwise.
     */
    self.isDisabledInSite = function(site) {
        site = site || $mmSite;
        return site.isFeatureDisabled('$mmCoursesDelegate_mmaParticipants');
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
    self.isPluginEnabledForCourse = function(courseId, siteId) {
        if (!courseId) {
            return $q.reject();
        }

        // Retrieving one participant will fail if browsing users is disabled by capabilities.
        return self.getParticipants(courseId, 0, 1, siteId).then(function() {
            return true;
        }).catch(function() {
            return false;
        });
    };

    return self;
});
