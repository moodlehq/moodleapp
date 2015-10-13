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

angular.module('mm.core.courses')

/**
 * Service to handle site courses.
 *
 * @module mm.core.courses
 * @ngdoc service
 * @name $mmCourses
 */
.factory('$mmCourses', function($q, $mmSite, $mmSitesManager) {

    var self = {},
        currentCourses = {};

    function storeCoursesInMemory(courses) {
        angular.forEach(courses, function(course) {
            currentCourses[course.id] = course;
        });
    }

    /**
     * Get a course stored in memory.
     *
     * @param  {Number} id ID of the course to get.
     * @return {Object}    Course.
     */
    self.getStoredCourse = function(id) {
        return currentCourses[id];
    };

    /**
     * Get user courses.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#getUserCourses
     * @param {Boolean} [refresh] True when we should not get the value from the cache.
     * @param {String} [siteid]   Site to get the courses from. If not defined, use current site.
     * @return {Promise}          Promise to be resolved when the courses are retrieved.
     */
    self.getUserCourses = function(refresh, siteid) {
        siteid = siteid || $mmSite.getId();

        return $mmSitesManager.getSite(siteid).then(function(site) {

            var userid = site.getUserId(),
                presets = {},
                data = {userid: userid};

            if (typeof userid === 'undefined') {
                return $q.reject();
            }

            if (refresh) {
                presets.getFromCache = false;
            }
            return site.read('core_enrol_get_users_courses', data, presets).then(function(courses) {
                if (siteid === $mmSite.getId()) { // Only store courses if we're getting current site courses.
                    storeCoursesInMemory(courses);
                }
                return courses;
            });
        });
    };

    return self;
});
