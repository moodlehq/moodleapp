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
     * Get categories. They can be filtered by id.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#getCategories
     * @param   {Number}  categoryId        Category ID to get.
     * @param   {Boolean} addSubcategories  If add subcategories to the list.
     * @param   {String}  [siteId]          Site to get the courses from. If not defined, use current site.
     * @return  {Promise}                   Promise to be resolved when the categories are retrieved.
     */
    self.getCategories = function(categoryId, addSubcategories, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            // Get parent when id is the root category.
            var criteriaKey = categoryId == 0 ? 'parent' : 'id';

            var data = {
                    criteria: [
                        { key: criteriaKey, value: categoryId }
                    ],
                    addsubcategories: addSubcategories ? 1 : 0
                },
                preSets = {
                    cacheKey: getCategoriesCacheKey(categoryId, addSubcategories)
                };

            return site.read('core_course_get_categories', data, preSets);
        });
    };

    /**
     * Get cache key for get categories methods WS call.
     *
     * @param   {Number}    categoryId        Category ID to get.
     * @param   {Boolean}   addSubcategories  If add subcategories to the list.
     * @return  {String}    Cache key.
     */
    function getCategoriesCacheKey(categoryId, addSubcategories) {
        return 'mmCourses:categories:' + categoryId + ':' + addSubcategories;
    }

    /**
     * Given a list of course IDs to get course options, return the list of courseIds to use.
     *
     * @param  {Number[]} courseIds Course IDs.
     * @param  {String} [siteId]    Site Id. If not defined, use current site.
     * @return {Promise}            Promise resolved with the list of course IDs.
     */
    function getCourseIdsForOptions(courseIds, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var siteHomeId = site.getSiteHomeId();

            if (courseIds.length == 1) {
                // Only 1 course, check if it belongs to the user courses. If so, use all user courses.
                return self.getUserCourses(true, siteId).then(function(courses) {
                    var courseId = courseIds[0],
                        useAllCourses = false;

                    if (courseId == siteHomeId) {
                        // It's site home, use all courses.
                        useAllCourses = true;
                    } else {
                        for (var i = 0; i < courses.length; i++) {
                            if (courses[i].id == courseId) {
                                useAllCourses = true;
                                break;
                            }
                        }
                    }

                    if (useAllCourses) {
                        // User is enrolled, retrieve all the courses.
                        courseIds = courses.map(function(course) {
                            return course.id;
                        });

                        // Always add the site home ID.
                        courseIds.push(siteHomeId);
                    }

                    return courseIds;
                }).catch(function() {
                    // Ignore errors.
                    return courseIds;
                });
            } else {
                return courseIds;
            }
        });
    }

    /**
     * Check if get cateogries WS is available.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#isGetCategoriesAvailable
     * @return {Boolean} True if get categories is available, false otherwise.
     */
    self.isGetCategoriesAvailable = function() {
        return $mmSite.wsAvailable('core_course_get_categories');
    };

    /**
     * Check if My Courses is disabled in a certain site.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#isMyCoursesDisabled
     * @param  {String} [siteId] Site Id. If not defined, use current site.
     * @return {Promise}         Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    self.isMyCoursesDisabled = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return self.isMyCoursesDisabledInSite(site);
        });
    };

    /**
     * Check if My Courses is disabled in a certain site.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#isMyCoursesDisabledInSite
     * @param  {Object} [site] Site. If not defined, use current site.
     * @return {Boolean}       True if disabled, false otherwise.
     */
    self.isMyCoursesDisabledInSite = function(site) {
        site = site || $mmSite;
        return site.isFeatureDisabled('$mmSideMenuDelegate_mmCourses');
    };

    /**
     * Check if Search Courses is disabled in a certain site.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#isSearchCoursesDisabled
     * @param  {String} [siteId] Site Id. If not defined, use current site.
     * @return {Promise}         Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    self.isSearchCoursesDisabled = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return self.isSearchCoursesDisabledInSite(site);
        });
    };

    /**
     * Check if Search Courses is disabled in a certain site.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#isSearchCoursesDisabledInSite
     * @param  {Object} [site] Site. If not defined, use current site.
     * @return {Boolean}       True if disabled, false otherwise.
     */
    self.isSearchCoursesDisabledInSite = function(site) {
        site = site || $mmSite;
        return site.isFeatureDisabled('$mmCoursesDelegate_search');
    };

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
     * Get courses. They can be filtered by field.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#getCoursesByField
     * @param {String}  [field]     The field to search can be left empty for all courses or:
     *                                  id: course id.
     *                                  ids: comma separated course ids.
     *                                  shortname: course short name.
     *                                  idnumber: course id number.
     *                                  category: category id the course belongs to.
     * @param {Mixed}   [value]     The value to match.
     * @param {String}  [siteId]    Site to get the courses from. If not defined, use current site.
     * @return {Promise}        Promise to be resolved when the courses are retrieved.
     */
    self.getCoursesByField = function(field, value, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var data = {
                    field: field || "",
                    value: field ? value : ""
                },
                preSets = {
                    cacheKey: getCoursesByFieldCacheKey(field, value)
                };

            return site.read('core_course_get_courses_by_field', data, preSets).then(function(courses) {
                if (courses.courses) {
                    // Courses will be sorted using sortorder if avalaible.
                    return courses.courses.sort(function(a, b) {
                        if (typeof a.sortorder == "undefined" && typeof b.sortorder == "undefined") {
                            return b.id - a.id;
                        }

                        if (typeof a.sortorder == "undefined") {
                            return 1;
                        }

                        if (typeof b.sortorder == "undefined") {
                            return -1;
                        }

                        return a.sortorder - b.sortorder;
                    });
                }
                return $q.reject();
            });
        });
    };

    /**
     * Get cache key for get courses WS call.
     *
     * @param  {String} [field]     The field to search.
     * @param  {Mixed}  [value]     The value to match.
     * @return {String}       Cache key.
     */
    function getCoursesByFieldCacheKey(field, value) {
        field = field || "";
        value = field ? value : "";
        return 'mmCourses:coursesbyfield:' + field + ":" + value;
    }

    /**
     * Check if get courses by field WS is available.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#isGetCoursesByFieldAvailable
     * @return {Boolean} True if get courses by field is available, false otherwise.
     */
    self.isGetCoursesByFieldAvailable = function() {
        return $mmSite.wsAvailable('core_course_get_courses_by_field');
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
     * Get the navigation and administration options for the given courses.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#getCoursesOptions
     * @param  {Number[]} courseIds IDs of courses to get.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with the options for each course.
     */
    self.getCoursesOptions = function(courseIds, siteId) {
        var promises = [],
            navOptions,
            admOptions;

        // Get the list of courseIds to use based on the param.
        return getCourseIdsForOptions(courseIds, siteId).then(function(courseIds) {

            // Get user navigation and administration options.
            promises.push(self.getUserNavigationOptions(courseIds, siteId).catch(function() {
                // Couldn't get it, return empty options.
                return {};
            }).then(function(options) {
                navOptions = options;
            }));

            promises.push(self.getUserAdministrationOptions(courseIds, siteId).catch(function() {
                // Couldn't get it, return empty options.
                return {};
            }).then(function(options) {
                admOptions = options;
            }));

            return $q.all(promises).then(function() {
                return {navOptions: navOptions, admOptions: admOptions};
            });
        });
    };

    /**
     * Get the common part of the cache keys for user administration options WS calls.
     *
     * @return {String} Cache key.
     */
    function getUserAdministrationOptionsCommonCacheKey() {
        return 'mmCourses:administrationOptions:';
    }

    /**
     * Get cache key for get user administration options WS call.
     *
     * @return {String} Cache key.
     */
    function getUserAdministrationOptionsCacheKey(courseIds) {
        return getUserAdministrationOptionsCommonCacheKey() + courseIds.join(',');
    }

    /**
     * Get user administration options for a set of courses.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#getUserAdministrationOptions
     * @param  {Number[]} courseIds IDs of courses to get.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with administration options for each course.
     */
    self.getUserAdministrationOptions = function(courseIds, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    courseids: courseIds
                },
                preSets = {
                    cacheKey: getUserAdministrationOptionsCacheKey(courseIds)
                };

            return site.read('core_course_get_user_administration_options', params, preSets).then(function(response) {
                // Format returned data.
                return formatUserOptions(response.courses);
            });
        });
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
                siteid = siteid || site.getId();
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
     * Get the common part of the cache keys for user navigation options WS calls.
     *
     * @return {String} Cache key.
     */
    function getUserNavigationOptionsCommonCacheKey() {
        return 'mmCourses:navigationOptions:';
    }

    /**
     * Get cache key for get user navigation options WS call.
     *
     * @return {String} Cache key.
     */
    function getUserNavigationOptionsCacheKey(courseIds) {
        return getUserNavigationOptionsCommonCacheKey() + courseIds.join(',');
    }

    /**
     * Get user navigation options for a set of courses.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#getUserNavigationOptions
     * @param  {Number[]} courseIds IDs of courses to get.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with navigation options for each course.
     */
    self.getUserNavigationOptions = function(courseIds, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    courseids: courseIds
                },
                preSets = {
                    cacheKey: getUserNavigationOptionsCacheKey(courseIds)
                };

            return site.read('core_course_get_user_navigation_options', params, preSets).then(function(response) {
                // Format returned data.
                return formatUserOptions(response.courses);
            });
        });
    };

    /**
     * Format user navigation or administration options.
     *
     * @param  {Object[]} courses Navigation or administration options for each course.
     * @return {Object}           Formatted options.
     */
    function formatUserOptions(courses) {
        var result = {};

        angular.forEach(courses, function(course) {
            var options = {};

            angular.forEach(course.options, function(option) {
                options[option.name] = option.available;
            });

            result[course.id] = options;
        });

        return result;
    }

    /**
     * Invalidates get categories WS call.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#invalidateCategories
     * @param  {Number}  categoryId          Category id to get.
     * @param  {Boolean} addSubcategories    If add subcategories to the list.
     * @param  {String}  [siteId]            Site Id. If not defined, use current site.
     * @return {Promise}                     Promise resolved when the data is invalidated.
     */
    self.invalidateCategories = function(categoryId, addSubcategories, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getCategoriesCacheKey(categoryId, addSubcategories));
        });
    };

    /**
     * Invalidates get course WS call.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#invalidateCourse
     * @param  {Number}   id          Course ID.
     * @param  {String}   [siteId]    Site Id. If not defined, use current site.
     * @return {Promise}   Promise resolved when the data is invalidated.
     */
    self.invalidateCourse = function(id, siteId) {
        return self.invalidateCourses([id], siteId);
    };

    /**
     * Invalidates get course enrolment methods WS call.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#invalidateCourseEnrolmentMethods
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
     * @name $mmCourses#invalidateCourseGuestEnrolmentInfo
     * @param {Number} instanceId Guest instance ID.
     * @return {Promise}          Promise resolved when the data is invalidated.
     */
    self.invalidateCourseGuestEnrolmentInfo = function(instanceId) {
        return $mmSite.invalidateWsCacheForKey(getCourseGuestEnrolmentInfoCacheKey(instanceId));
    };

    /**
     * Invalidates the navigation and administration options for the given courses.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#invalidateCoursesOptions
     * @param  {Number[]} courseIds IDs of courses to get.
     * @param  {String} [siteId]    Site ID to invalidate. If not defined, use current site.
     * @return {Promise}            Promise resolved when the data is invalidated.
     */
    self.invalidateCoursesOptions = function(courseIds, siteId) {
        return getCourseIdsForOptions(courseIds, siteId).then(function(ids) {
            var promises = [];

            promises.push(self.invalidateUserAdministrationOptionsForCourses(ids, siteId));
            promises.push(self.invalidateUserNavigationOptionsForCourses(ids, siteId));

            return $q.all(promises);
        });
    };

    /**
     * Invalidates get courses WS call.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#invalidateCourses
     * @param  {Number[]} ids         Courses IDs.
     * @param  {String}   [siteId]    Site Id. If not defined, use current site.
     * @return {Promise}              Promise resolved when the data is invalidated.
     */
    self.invalidateCourses = function(ids, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getCoursesCacheKey(ids));
        });
    };

    /**
     * Invalidates get courses by field WS call.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#invalidateCoursesByField
     * @param {String}  [field]     See mmCourses#getCoursesByField for info.
     * @param {Mixed}   [value]     The value to match.
     * @param {String}  [siteId]    Site Id. If not defined, use current site.
     * @return {Promise}   Promise resolved when the data is invalidated.
     */
    self.invalidateCoursesByField = function(field, value, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getCoursesByFieldCacheKey(field, value));
        });
    };

    /**
     * Invalidates all user administration options.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#invalidateUserAdministrationOptions
     * @param {String} [siteId] Site ID to invalidate. If not defined, use current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateUserAdministrationOptions = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getUserAdministrationOptionsCommonCacheKey());
        });
    };

    /**
     * Invalidates user administration options for certain courses.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#invalidateUserAdministrationOptionsForCourses
     * @param  {Number[]} courseIds IDs of courses.
     * @param {String} [siteId]     Site ID to invalidate. If not defined, use current site.
     * @return {Promise}            Promise resolved when the data is invalidated.
     */
    self.invalidateUserAdministrationOptionsForCourses = function(courseIds, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getUserAdministrationOptionsCacheKey(courseIds));
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
        return $mmSitesManager.getSite(siteid).then(function(site) {
            return site.invalidateWsCacheForKey(getUserCoursesCacheKey());
        });
    };

    /**
     * Invalidates all user navigation options.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#invalidateUserNavigationOptions
     * @param {String} [siteId] Site ID to invalidate. If not defined, use current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateUserNavigationOptions = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getUserNavigationOptionsCommonCacheKey());
        });
    };

    /**
     * Invalidates user navigation options for certain courses.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCourses#invalidateUserNavigationOptionsForCourses
     * @param  {Number[]} courseIds IDs of courses.
     * @param {String} [siteId]     Site ID to invalidate. If not defined, use current site.
     * @return {Promise}            Promise resolved when the data is invalidated.
     */
    self.invalidateUserNavigationOptionsForCourses = function(courseIds, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getUserNavigationOptionsCacheKey(courseIds));
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
                        // Invalid password warnings.
                        if (warning.warningcode == '2' || warning.warningcode == '3' || warning.warningcode == '4') {
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
