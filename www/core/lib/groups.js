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

angular.module('mm.core')

/**
 * Service to handle groups.
 *
 * @module mm.core.groups
 * @ngdoc service
 * @name $mmGroups
 */
.factory('$mmGroups', function($log, $q, $mmSite, $mmSitesManager) {

    $log = $log.getInstance('$mmGroups');

    var self = {};

    // Group mode constants.
    self.NOGROUPS       = 0;
    self.SEPARATEGROUPS = 1;
    self.VISIBLEGROUPS  = 2;

    /**
     * Get the groups allowed in an activity.
     *
     * @module mm.core.groups
     * @ngdoc method
     * @name $mmGroups#getActivityAllowedGroups
     * @param {Number} cmid     Course module ID.
     * @param {Number} [userid] User ID. If not defined, use current user.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the groups are retrieved.
     */
    self.getActivityAllowedGroups = function(cmid, userid, siteId) {
        userid = userid || $mmSite.getUserId();
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    cmid: cmid,
                    userid: userid
                },
                preSets = {
                    cacheKey: getActivityAllowedGroupsCacheKey(cmid, userid)
                };

            return site.read('core_group_get_activity_allowed_groups', params, preSets).then(function(response) {
                if (!response || !response.groups) {
                    return $q.reject();
                }
                return response.groups;
            });
        });
    };

    /**
     * Get cache key for group mode WS calls.
     *
     * @param {Number} cmid Course module ID.
     * @return {String}     Cache key.
     */
    function getActivityAllowedGroupsCacheKey(cmid, userid) {
        return 'mmGroups:allowedgroups:' + cmid + ':' + userid;
    }

    /**
     * Get the group mode of an activity.
     *
     * @module mm.core.groups
     * @ngdoc method
     * @name $mmGroups#getActivityGroupMode
     * @param {Number} cmid Course module ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}    Promise resolved when the group mode is retrieved.
     */
    self.getActivityGroupMode = function(cmid, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    cmid: cmid
                },
                preSets = {
                    cacheKey: getActivityGroupModeCacheKey(cmid)
                };

            return site.read('core_group_get_activity_groupmode', params, preSets).then(function(response) {
                if (!response || typeof response.groupmode == 'undefined') {
                    return $q.reject();
                }
                return response.groupmode;
            });
        });
    };

    /**
     * Get cache key for group mode WS calls.
     *
     * @param {Number} cmid Course module ID.
     * @return {String}     Cache key.
     */
    function getActivityGroupModeCacheKey(cmid) {
        return 'mmGroups:groupmode:' + cmid;
    }

    /**
     * Get user groups in courses.
     *
     * @module mm.core.groups
     * @ngdoc method
     * @name $mmGroups#getUserGroups
     * @param {Object[]|Number[]} courses List of courses or course ids to get the groups from.
     * @param {Boolean} [refresh]         True when we should not get the value from the cache.
     * @param {String} [siteid]           Site to get the groups from. If not defined, use current site.
     * @param {Number} [userid]           ID of the user. If not defined, use the userid related to siteid.
     * @return {Promise}                  Promise to be resolved when the groups are retrieved.
     */
    self.getUserGroups = function(courses, refresh, siteid, userid) {
        var promises = [],
            groups = [],
            deferred = $q.defer();

        angular.forEach(courses, function(course) {
            var courseid;
            if (typeof course == 'object') { // Param is array of courses.
                courseid = course.id;
            } else { // Param is array of courseids.
                courseid = course;
            }
            var promise = self.getUserGroupsInCourse(courseid, refresh, siteid, userid).then(function(coursegroups) {
                groups = groups.concat(coursegroups);
            });
            promises.push(promise);
        });

        $q.all(promises).finally(function() {
            // Use finally because we don't want to block the load of events if a request fails.
            deferred.resolve(groups);
        });

        return deferred.promise;
    };

    /**
     * Get user groups in a course.
     *
     * @module mm.core.groups
     * @ngdoc method
     * @name $mmGroups#getUserGroupsInCourse
     * @param {Number} courseid   ID of the course.
     * @param {Boolean} [refresh] True when we should not get the value from the cache.
     * @param {String} [siteid]   Site to get the groups from. If not defined, use current site.
     * @param {Number} [userid]   ID of the user. If not defined, use ID related to siteid.
     * @return {Promise}        Promise to be resolved when the groups are retrieved.
     */
    self.getUserGroupsInCourse = function(courseid, refresh, siteid, userid) {
        siteid = siteid || $mmSite.getId();

        return $mmSitesManager.getSite(siteid).then(function(site) {
            var presets = {},
                data = {
                    userid: userid || site.getUserId(),
                    courseid: courseid
                };
            if (refresh) {
                presets.getFromCache = false;
            }
            return site.read('core_group_get_course_user_groups', data, presets).then(function(response) {
                if (response && response.groups) {
                    return response.groups;
                } else {
                    return $q.reject();
                }
            });
        });
    };

    /**
     * Invalidates activity allowed groups.
     *
     * @module mm.core.groups
     * @ngdoc method
     * @name $mmGroups#invalidateActivityAllowedGroups
     * @param {Number} cmid     Course module ID.
     * @param {Number} [userid] User ID. If not defined, use current user.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateActivityAllowedGroups = function(cmid, userid) {
        userid = userid || $mmSite.getUserId();
        return $mmSite.invalidateWsCacheForKey(getActivityAllowedGroupsCacheKey(cmid, userid));
    };

    /**
     * Invalidates activity group mode.
     *
     * @module mm.core.groups
     * @ngdoc method
     * @name $mmGroups#invalidateActivityGroupMode
     * @param {Number} cmid Course module ID.
     * @return {Promise}    Promise resolved when the data is invalidated.
     */
    self.invalidateActivityGroupMode = function(cmid) {
        return $mmSite.invalidateWsCacheForKey(getActivityGroupModeCacheKey(cmid));
    };

    return self;
});
