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
.factory('$mmCourses', function($q, $mmSite, $log, $mmSitesManager, mmCoursesSearchPerPage, mmCoursesEnrolInvalidKey) {

    $log = $log.getInstance('$mmCourses');

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
     * Get course.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#getCourse
     * @param {Number} id       ID of the course to get.
     * @param {String} [siteid] Site to get the courses from. If not defined, use current site.
     * @return {Promise}        Promise to be resolved when the courses are retrieved.
     */
    self.getCourse = function(id, siteid) {
        return self.getCourses([id], siteid).then(function(courses) {
            if (courses && courses.length > 0) {
                return courses[0];
            }
            return $q.reject();
        });
    };

    /**
     * Get the enrolment methods from a course.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#getCourseEnrolmentMethods
     * @param {Number} id ID of the course.
     * @return {Promise}  Promise to be resolved when the methods are retrieved.
     */
    self.getCourseEnrolmentMethods = function(id) {
        var params = {
                courseid: id
            },
            preSets = {
                cacheKey: getCourseEnrolmentMethodsCacheKey(id)
            };

        return $mmSite.read('core_enrol_get_course_enrolment_methods', params, preSets);
    };

    /**
     * Get cache key for get course enrolment methods WS call.
     *
     * @param  {Number} id Course ID.
     * @return {String}    Cache key.
     */
    function getCourseEnrolmentMethodsCacheKey(id) {
        return 'mmCourses:enrolmentmethods:' + id;
    }

    /**
     * Get info from a course guest enrolment method.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#getCourseGuestEnrolmentInfo
     * @param {Number} instanceId Guest instance ID.
     * @return {Promise}          Promise to be resolved when the info is retrieved.
     */
    self.getCourseGuestEnrolmentInfo = function(instanceId) {
        var params = {
                instanceid: instanceId
            },
            preSets = {
                cacheKey: getCourseGuestEnrolmentInfoCacheKey(instanceId)
            };

        return $mmSite.read('enrol_guest_get_instance_info', params, preSets).then(function(response) {
            return response.instanceinfo;
        });
    };

    /**
     * Get cache key for get course enrolment methods WS call.
     *
     * @param {Number} instanceId Guest instance ID.
     * @return {String}           Cache key.
     */
    function getCourseGuestEnrolmentInfoCacheKey(instanceId) {
        return 'mmCourses:guestinfo:' + instanceId;
    }

    /**
     * Get courses.
     * Warning: if the user doesn't have permissions to view some of the courses passed the WS call will fail.
     * The user must be able to view ALL the courses passed.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#getCourses
     * @param {Number[]} ids    List of IDs of the courses to get.
     * @param {String} [siteid] Site to get the courses from. If not defined, use current site.
     * @return {Promise}        Promise to be resolved when the courses are retrieved.
     */
    self.getCourses = function(ids, siteid) {
        siteid = siteid || $mmSite.getId();

        if (!angular.isArray(ids)) {
            return $q.reject();
        } else if (ids.length === 0) {
            return $q.when([]);
        }

        return $mmSitesManager.getSite(siteid).then(function(site) {

            var data = {
                    options: {
                        ids: ids
                    }
                },
                preSets = {
                    cacheKey: getCoursesCacheKey(ids)
                };

            return site.read('core_course_get_courses', data, preSets).then(function(courses) {
                if (typeof courses != 'object' && !angular.isArray(courses)) {
                    return $q.reject();
                }
                return courses;
            });
        });
    };

    /**
     * Get cache key for get courses WS call.
     *
     * @param  {Number[]} ids Courses IDs.
     * @return {String}       Cache key.
     */
    function getCoursesCacheKey(ids) {
        return 'mmCourses:course:' + JSON.stringify(ids);
    }

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

        if (!id) {
            return $q.reject();
        }

        if (typeof preferCache == 'undefined') {
            preferCache = false;
        }

        return self.getUserCourses(preferCache, siteid).then(function(courses) {
            var course;
            angular.forEach(courses, function(c) {
                if (c.id == id) {
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
     * Invalidates get course WS call.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#invalidateCourse
     * @param  {Number} id Course ID.
     * @return {Promise}   Promise resolved when the data is invalidated.
     */
    self.invalidateCourse = function(id, siteid) {
        return self.invalidateCourses([id], siteid);
    };

    /**
     * Invalidates get course enrolment methods WS call.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#invalidateUserCourses
     * @param {Number} id Course ID.
     * @return {Promise}  Promise resolved when the data is invalidated.
     */
    self.invalidateCourseEnrolmentMethods = function(id) {
        return $mmSite.invalidateWsCacheForKey(getCourseEnrolmentMethodsCacheKey(id));
    };

    /**
     * Invalidates get course guest enrolment info WS call.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#invalidateUserCourses
     * @param {Number} instanceId Guest instance ID.
     * @return {Promise}          Promise resolved when the data is invalidated.
     */
    self.invalidateCourseGuestEnrolmentInfo = function(instanceId) {
        return $mmSite.invalidateWsCacheForKey(getCourseGuestEnrolmentInfoCacheKey(instanceId));
    };

    /**
     * Invalidates get courses WS call.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#invalidateCourses
     * @param  {Number[]} ids   Courses IDs.
     * @param {String} [siteid] Site ID to invalidate. If not defined, use current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateCourses = function(ids, siteid) {
        siteid = siteid || $mmSite.getId();
        return $mmSitesManager.getSite(siteid).then(function(site) {
            return site.invalidateWsCacheForKey(getCoursesCacheKey(ids));
        });
    };

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
     * Check if WS to retrieve guest enrolment data is available.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#isGuestWSAvailable
     * @return {Boolean} True if guest WS is available, false otherwise.
     */
    self.isGuestWSAvailable = function() {
        return $mmSite.wsAvailable('enrol_guest_get_instance_info');
    };

    /**
     * Check if search courses feature is available in the current site.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#isSearchCoursesAvailable
     * @return {Boolean} True if is available, false otherwise.
     */
    self.isSearchCoursesAvailable = function() {
        return $mmSite.wsAvailable('core_course_search_courses');
    };

    /**
     * Check if self enrolment is available.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#isSelfEnrolmentEnabled
     * @return {Boolean} True if self enrolment is available, false otherwise.
     */
    self.isSelfEnrolmentEnabled = function() {
        return $mmSite.wsAvailable('enrol_self_enrol_user');
    };

    /**
     * Search courses.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#search
     * @param {String} text      Text to search.
     * @param {Number} [page]    Page to get. Defaults to 0.
     * @param {Number} [perpage] Number of courses per page. Defaults to mmCoursesSearchPerPage.
     * @return {Promise}         Promise resolved with the courses and the total of matches.
     */
    self.search = function(text, page, perpage) {
        page = page || 0;
        perpage = perpage || mmCoursesSearchPerPage;

        var params = {
                criterianame: 'search',
                criteriavalue: text,
                page: page,
                perpage: perpage
            }, preSets = {
                getFromCache: false
            };

        return $mmSite.read('core_course_search_courses', params, preSets).then(function(response) {
            if (typeof response == 'object') {
                return {total: response.total, courses: response.courses};
            }
            return $q.reject();
        });
    };

    /**
     * Self enrol current user in a certain course.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#selfEnrol
     * @param {String} courseid     Course ID.
     * @param {String} [password]   Password to use.
     * @param {Number} [instanceId] Enrol instance ID.
     * @return {Promise}            Promise resolved if the user is enrolled. If the password is invalid,
     *                              the promise is rejected with an object with code = mmCoursesEnrolInvalidKey.
     */
    self.selfEnrol = function(courseid, password, instanceId) {
        if (typeof password == 'undefined') {
            password = '';
        }

        var params = {
            courseid: courseid,
            password: password
        };
        if (instanceId) {
            params.instanceid = instanceId;
        }

        return $mmSite.write('enrol_self_enrol_user', params).then(function(response) {
            if (response) {
                if (response.status) {
                    return true;
                } else if (response.warnings && response.warnings.length) {
                    var message;
                    angular.forEach(response.warnings, function(warning) {
                        if (warning.warningcode == '2' || warning.warningcode == '4') { // Invalid password warnings.
                            message = warning.message;
                        }
                    });

                    if (message) {
                        return $q.reject({code: mmCoursesEnrolInvalidKey, message: message});
                    }
                }
            }
            return $q.reject();
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
