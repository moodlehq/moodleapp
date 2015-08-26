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
            var promise = self.getUserGroupsInCourse(courseid, refresh, siteid, userid);
            promises.push(promise);
            promise.then(function(response) {
                if (response.groups && response.groups.length > 0) {
                    groups = groups.concat(response.groups);
                }
            });
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
            return site.read('core_group_get_course_user_groups', data, presets);
        });
    };

    return self;
});
