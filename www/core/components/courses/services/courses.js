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

    /**
     * DEPRECATED: this function will be removed in a future version.
     * Clear current courses array. Reserved for core use.
     *
     * @deprecated since version 2.5
     * @protected
     */
    self.clearCurrentCourses = function() {
        currentCourses = {};
    };

    /**
     * DEPRECATED: this function will be removed in a future version. Please use $mmCourses#getUserCourse.
     * Get a course stored in memory.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#getStoredCourse
     * @param  {Number} id ID of the course to get.
     * @return {Object}    Course.
     * @deprecated since version 2.5
     */
    self.getStoredCourse = function(id) {
        $log.warn('The function \'getStoredCourse\' is deprecated. Please use \'getUserCourse\' instead');
        return currentCourses[id];
    };

    /**
     * Get a course the user is enrolled in. This function relies on $mmCourses#getUserCourses.
     * preferCache=true will try to speed up the response, but the data returned might not be updated.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#getUserCourse
     * @param {Number} id                   ID of the course to get.
     * @param {Boolean} [preferCache=false] True if shouldn't call WS if data is cached, false otherwise.
     * @param {String} [siteid]             Site to get the courses from. If not defined, use current site.
     * @return {Promise}                    Promise resolved with the course.
     * @since 2.5
     */
    self.getUserCourse = function(id, preferCache, siteid) {
        siteid = siteid || $mmSite.getId();
        if (typeof preferCache == 'undefined') {
            preferCache = false;
        }

        return self.getUserCourses(preferCache, siteid).then(function(courses) {
            var course;
            angular.forEach(courses, function(c) {
                if (c.id === id) {
                    course = c;
                }
            });
            return course ? course : $q.reject();
        });
    };

    /**
     * Get user courses.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#getUserCourses
     * @param {Boolean} [preferCache=false] True if shouldn't call WS if data is cached, false otherwise.
     * @param {String} [siteid]            Site to get the courses from. If not defined, use current site.
     * @return {Promise}                   Promise to be resolved when the courses are retrieved.
     */
    self.getUserCourses = function(preferCache, siteid) {
        siteid = siteid || $mmSite.getId();
        if (typeof preferCache == 'undefined') {
            preferCache = false;
        }

        return $mmSitesManager.getSite(siteid).then(function(site) {

            var userid = site.getUserId(),
                presets = {
                    cacheKey: getUserCoursesCacheKey(),
                    omitExpires: preferCache
                },
                data = {userid: userid};

            if (typeof userid === 'undefined') {
                return $q.reject();
            }

            return site.read('core_enrol_get_users_courses', data, presets).then(function(courses) {
                if (siteid === $mmSite.getId()) {
                    // Only store courses if we're getting current site courses. This function is deprecated and will be removed.
                    storeCoursesInMemory(courses);
                }
                return courses;
            });
        });
    };

    /**
     * Get cache key for get user courses WS call.
     *
     * @return {String}       Cache key.
     */
    function getUserCoursesCacheKey() {
        return 'mmCourses:usercourses';
    }

    /**
     * Invalidates get user courses WS call.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#invalidateUserCourses
     * @param {String} [siteid] Site ID to invalidate. If not defined, use current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateUserCourses = function(siteid) {
        siteid = siteid || $mmSite.getId();
        return $mmSitesManager.getSite(siteid).then(function(site) {
            return site.invalidateWsCacheForKey(getUserCoursesCacheKey());
        });
    };

    /**
     * DEPRECATED: this function will be removed in a future version.
     * Stores a list of courses in memory so they can be retrieved later.
     *
     * @param  {Object[]} courses Courses to store
     * @return {Void}
     * @deprecated since version 2.5
     */
    function storeCoursesInMemory(courses) {
        angular.forEach(courses, function(course) {
            currentCourses[course.id] = angular.copy(course); // Store a copy to prevent unwanted modifications.
        });
    }

    return self;
});
