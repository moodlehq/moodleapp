// (C) Copyright 2015 Moodle Pty Ltd.
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

import { Injectable } from '@angular/core';
import { CoreEventsProvider } from '@providers/events';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider, CoreSitesReadingStrategy } from '@providers/sites';
import { CoreSite } from '@classes/site';

/**
 * Service that provides some features regarding lists of courses and categories.
 */
@Injectable()
export class CoreCoursesProvider {
    static SEARCH_PER_PAGE = 20;
    static ENROL_INVALID_KEY = 'CoreCoursesEnrolInvalidKey';
    static EVENT_MY_COURSES_CHANGED = 'courses_my_courses_changed'; // User course list changed while app is running.
    static EVENT_MY_COURSES_UPDATED = 'courses_my_courses_updated'; // A course was hidden/favourite, or user enroled in a course.
    static EVENT_MY_COURSES_REFRESHED = 'courses_my_courses_refreshed';
    static EVENT_DASHBOARD_DOWNLOAD_ENABLED_CHANGED = 'dashboard_download_enabled_changed';

    protected ROOT_CACHE_KEY = 'mmCourses:';
    protected logger;
    protected userCoursesIds: {[id: number]: boolean}; // Use an object to make it faster to search.

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private eventsProvider: CoreEventsProvider) {
        this.logger = logger.getInstance('CoreCoursesProvider');
    }

    /**
     * Whether current site supports getting course options.
     *
     * @return Whether current site supports getting course options.
     */
    canGetAdminAndNavOptions(): boolean {
        return this.sitesProvider.wsAvailableInCurrentSite('core_course_get_user_navigation_options') &&
                this.sitesProvider.wsAvailableInCurrentSite('core_course_get_user_administration_options');
    }

    /**
     * Get categories. They can be filtered by id.
     *
     * @param categoryId Category ID to get.
     * @param addSubcategories If it should add subcategories to the list.
     * @param siteId Site to get the courses from. If not defined, use current site.
     * @return Promise resolved with the categories.
     */
    getCategories(categoryId: number, addSubcategories?: boolean, siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            // Get parent when id is the root category.
            const criteriaKey = categoryId == 0 ? 'parent' : 'id',
                data = {
                    criteria: [
                        { key: criteriaKey, value: categoryId }
                    ],
                    addsubcategories: addSubcategories ? 1 : 0
                },
                preSets = {
                    cacheKey: this.getCategoriesCacheKey(categoryId, addSubcategories),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            return site.read('core_course_get_categories', data, preSets);
        });
    }

    /**
     * Get cache key for get categories methods WS call.
     *
     * @param categoryId Category ID to get.
     * @param addSubcategories If add subcategories to the list.
     * @return Cache key.
     */
    protected getCategoriesCacheKey(categoryId: number, addSubcategories?: boolean): string {
        return this.ROOT_CACHE_KEY + 'categories:' + categoryId + ':' + !!addSubcategories;
    }

    /**
     * Given a list of course IDs to get course admin and nav options, return the list of courseIds to use.
     *
     * @param courseIds Course IDs.
     * @param siteId Site Id. If not defined, use current site.
     * @return Promise resolved with the list of course IDs.
     */
    protected getCourseIdsForAdminAndNavOptions(courseIds: number[], siteId?: string): Promise<number[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const siteHomeId = site.getSiteHomeId();

            if (courseIds.length == 1) {
                // Only 1 course, check if it belongs to the user courses. If so, use all user courses.
                return this.getCourseIdsIfEnrolled(courseIds[0], siteId);
            } else {
                if (courseIds.length > 1 && courseIds.indexOf(siteHomeId) == -1) {
                    courseIds.push(siteHomeId);
                }

                // Sort the course IDs.
                courseIds.sort((a, b) => {
                   return b - a;
                });

                return courseIds;
            }
        });
    }

    /**
     * Given a course ID, if user is enrolled in the course it will return the IDs of all enrolled courses and site home.
     * Return only the course ID otherwise.
     *
     * @param courseIds Course IDs.
     * @param siteId Site Id. If not defined, use current site.
     * @return Promise resolved with the list of course IDs.
     */
    getCourseIdsIfEnrolled(courseId: number, siteId?: string): Promise<number[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const siteHomeId = site.getSiteHomeId();

            // Check if user is enrolled in the course.
            return this.getUserCourses(true, siteId).then((courses) => {
                let useAllCourses = false;

                if (courseId == siteHomeId) {
                    // It's site home, use all courses.
                    useAllCourses = true;
                } else {
                    useAllCourses = !!courses.find((course) => {
                        return course.id == courseId;
                    });
                }

                if (useAllCourses) {
                    // User is enrolled, return all the courses.
                    const courseIds = courses.map((course) => {
                        return course.id;
                    });

                    // Always add the site home ID.
                    courseIds.push(siteHomeId);

                    // Sort the course IDs.
                    courseIds.sort((a, b) => {
                       return b - a;
                    });

                    return courseIds;
                }

                return [courseId];
            }).catch(() => {
                // Ignore errors.
                return [courseId];
            });
        });
    }

    /**
     * Check if download a whole course is disabled in a certain site.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @return Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    isDownloadCourseDisabled(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.isDownloadCoursesDisabledInSite(site);
        });
    }

    /**
     * Check if download a whole course is disabled in a certain site.
     *
     * @param site Site. If not defined, use current site.
     * @return Whether it's disabled.
     */
    isDownloadCourseDisabledInSite(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.isOfflineDisabled() || site.isFeatureDisabled('NoDelegate_CoreCourseDownload');
    }

    /**
     * Check if download all courses is disabled in a certain site.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @return Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    isDownloadCoursesDisabled(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.isDownloadCoursesDisabledInSite(site);
        });
    }

    /**
     * Check if download all courses is disabled in a certain site.
     *
     * @param site Site. If not defined, use current site.
     * @return Whether it's disabled.
     */
    isDownloadCoursesDisabledInSite(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.isOfflineDisabled() || site.isFeatureDisabled('NoDelegate_CoreCoursesDownload');
    }

    /**
     * Check if My Courses is disabled in a certain site.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @return Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    isMyCoursesDisabled(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.isMyCoursesDisabledInSite(site);
        });
    }

    /**
     * Check if My Courses is disabled in a certain site.
     *
     * @param site Site. If not defined, use current site.
     * @return Whether it's disabled.
     */
    isMyCoursesDisabledInSite(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.isFeatureDisabled('CoreMainMenuDelegate_CoreCourses');
    }

    /**
     * Check if Search Courses is disabled in a certain site.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @return Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    isSearchCoursesDisabled(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.isSearchCoursesDisabledInSite(site);
        });
    }

    /**
     * Check if Search Courses is disabled in a certain site.
     *
     * @param site Site. If not defined, use current site.
     * @return Whether it's disabled.
     */
    isSearchCoursesDisabledInSite(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.isFeatureDisabled('CoreCourseOptionsDelegate_search');
    }

    /**
     * Get course.
     *
     * @param id ID of the course to get.
     * @param siteId Site to get the courses from. If not defined, use current site.
     * @return Promise resolved with the course.
     */
    getCourse(id: number, siteId?: string): Promise<any> {
        return this.getCourses([id], siteId).then((courses) => {
            if (courses && courses.length > 0) {
                return courses[0];
            }

            return Promise.reject(null);
        });
    }

    /**
     * Get the enrolment methods from a course.
     *
     * @param id ID of the course.
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved with the methods.
     */
    getCourseEnrolmentMethods(id: number, siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    courseid: id
                },
                preSets = {
                    cacheKey: this.getCourseEnrolmentMethodsCacheKey(id),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            return site.read('core_enrol_get_course_enrolment_methods', params, preSets);
        });
    }

    /**
     * Get cache key for get course enrolment methods WS call.
     *
     * @param id Course ID.
     * @return Cache key.
     */
    protected getCourseEnrolmentMethodsCacheKey(id: number): string {
        return this.ROOT_CACHE_KEY + 'enrolmentmethods:' + id;
    }

    /**
     * Get info from a course guest enrolment method.
     *
     * @param instanceId Guest instance ID.
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved when the info is retrieved.
     */
    getCourseGuestEnrolmentInfo(instanceId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    instanceid: instanceId
                },
                preSets = {
                    cacheKey: this.getCourseGuestEnrolmentInfoCacheKey(instanceId),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            return site.read('enrol_guest_get_instance_info', params, preSets).then((response) => {
                return response.instanceinfo;
            });
        });
    }

    /**
     * Get cache key for get course guest enrolment methods WS call.
     *
     * @param instanceId Guest instance ID.
     * @return Cache key.
     */
    protected getCourseGuestEnrolmentInfoCacheKey(instanceId: number): string {
        return this.ROOT_CACHE_KEY + 'guestinfo:' + instanceId;
    }

    /**
     * Get courses.
     * Warning: if the user doesn't have permissions to view some of the courses passed the WS call will fail.
     * The user must be able to view ALL the courses passed.
     *
     * @param ids List of IDs of the courses to get.
     * @param siteId Site to get the courses from. If not defined, use current site.
     * @return Promise resolved with the courses.
     */
    getCourses(ids: number[], siteId?: string): Promise<any[]> {
        if (!Array.isArray(ids)) {
            return Promise.reject(null);
        } else if (ids.length === 0) {
            return Promise.resolve([]);
        }

        return this.sitesProvider.getSite(siteId).then((site) => {
            const data = {
                    options: {
                        ids: ids
                    }
                },
                preSets = {
                    cacheKey: this.getCoursesCacheKey(ids),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            return site.read('core_course_get_courses', data, preSets);
        });
    }

    /**
     * Get cache key for get courses WS call.
     *
     * @param ids Courses IDs.
     * @return Cache key.
     */
    protected getCoursesCacheKey(ids: number[]): string {
        return this.ROOT_CACHE_KEY + 'course:' + JSON.stringify(ids);
    }

    /**
     * This function is meant to decrease WS calls.
     * When requesting a single course that belongs to enrolled courses, request all enrolled courses because
     * the WS call is probably cached.
     *
     * @param field The field to search.
     * @param value The value to match.
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved with the field and value to use.
     */
    protected fixCoursesByFieldParams(field?: string, value?: any, siteId?: string): Promise<{field: string, value: any}> {

        if (field == 'id' || field == 'ids') {
            const courseIds: any[] = String(value).split(',');

            // Use the same optimization as in get admin and nav options. This will return the course IDs to use.
            return this.getCourseIdsForAdminAndNavOptions(courseIds, siteId).then((courseIds) => {
                if (courseIds.length > 1) {
                    return {field: 'ids', value: courseIds.join(',')};
                } else {
                    return {field: 'id', value: Number(courseIds[0])};
                }
            });
        } else {
            // Nothing to do.
            return Promise.resolve({field: field, value: value});
        }
    }

    /**
     * Get the first course returned by getCoursesByField.
     *
     * @param field The field to search. Can be left empty for all courses or:
     *              id: course id.
     *              ids: comma separated course ids.
     *              shortname: course short name.
     *              idnumber: course id number.
     *              category: category id the course belongs to.
     * @param value The value to match.
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved with the first course.
     * @since 3.2
     */
    getCourseByField(field?: string, value?: any, siteId?: string): Promise<any> {
        return this.getCoursesByField(field, value, siteId).then((courses) => {
            if (courses && courses.length > 0) {
                return courses[0];
            }

            return Promise.reject(null);
        });
    }

    /**
     * Get courses. They can be filtered by field.
     *
     * @param field The field to search. Can be left empty for all courses or:
     *              id: course id.
     *              ids: comma separated course ids.
     *              shortname: course short name.
     *              idnumber: course id number.
     *              category: category id the course belongs to.
     * @param value The value to match.
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved with the courses.
     * @since 3.2
     */
    getCoursesByField(field?: string, value?: any, siteId?: string): Promise<any[]> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const originalValue = value;
        let hasChanged = false;

        return this.fixCoursesByFieldParams(field, value, siteId).then((result) => {
            hasChanged = result.field != field || result.value != value;
            field = result.field;
            value = result.value;

            return this.sitesProvider.getSite(siteId);
        }).then((site) => {
            const data = {
                    field: field || '',
                    value: field ? value : ''
                },
                preSets = {
                    cacheKey: this.getCoursesByFieldCacheKey(field, value),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            return site.read('core_course_get_courses_by_field', data, preSets).then((courses) => {
                if (courses.courses) {
                    if (field == 'ids' && hasChanged) {
                        // The list of courses requestes was changed to optimize it.
                        // Return only the ones that were being requested.
                        const courseIds = String(originalValue).split(','),
                            finalCourses = [];

                        courses.courses.forEach((course) => {
                            const position = courseIds.indexOf(String(course.id));
                            if (position != -1) {
                                // Course is in the original list, take it.
                                finalCourses.push(course);
                                courseIds.splice(position, 1);
                            }
                        });

                        courses.courses = finalCourses;
                    }

                    // Courses will be sorted using sortorder if avalaible.
                    return courses.courses.sort((a, b) => {
                        if (typeof a.sortorder == 'undefined' && typeof b.sortorder == 'undefined') {
                            return b.id - a.id;
                        }

                        if (typeof a.sortorder == 'undefined') {
                            return 1;
                        }

                        if (typeof b.sortorder == 'undefined') {
                            return -1;
                        }

                        return a.sortorder - b.sortorder;
                    });
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get cache key for get courses WS call.
     *
     * @param field The field to search.
     * @param value The value to match.
     * @return Cache key.
     */
    protected getCoursesByFieldCacheKey(field?: string, value?: any): string {
        field = field || '';
        value = field ? value : '';

        return this.ROOT_CACHE_KEY + 'coursesbyfield:' + field + ':' + value;
    }

    /**
     * Get courses matching the given custom field. Only works in online.
     *
     * @param  customFieldName Custom field name.
     * @param  customFieldValue Custom field value.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the list of courses.
     * @since 3.8
     */
    getEnrolledCoursesByCustomField(customFieldName: string, customFieldValue: string, siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const data = {
                    classification: 'customfield',
                    customfieldname: customFieldName,
                    customfieldvalue: customFieldValue
                },
                preSets = {
                    getFromCache: false
                };

            return site.read('core_course_get_enrolled_courses_by_timeline_classification', data, preSets).then((courses) => {
                if (courses.courses) {
                    return courses.courses;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Check if get courses by field WS is available in a certain site.
     *
     * @param site Site to check.
     * @return Whether get courses by field is available.
     * @since 3.2
     */
    isGetCoursesByFieldAvailable(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.wsAvailable('core_course_get_courses_by_field');
    }

    /**
     * Check if get courses by field WS is available in a certain site, by site ID.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with boolean: whether get courses by field is available.
     * @since 3.2
     */
    isGetCoursesByFieldAvailableInSite(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.isGetCoursesByFieldAvailable(site);
        });
    }

    /**
     * Get the navigation and administration options for the given courses.
     *
     * @param courseIds IDs of courses to get.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the options for each course.
     */
    getCoursesAdminAndNavOptions(courseIds: number[], siteId?: string): Promise<{ navOptions: any, admOptions: any }> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Get the list of courseIds to use based on the param.
        return this.getCourseIdsForAdminAndNavOptions(courseIds, siteId).then((courseIds) => {
            const promises = [];
            let navOptions,
                admOptions;

            // Get user navigation and administration options.
            promises.push(this.getUserNavigationOptions(courseIds, siteId).catch(() => {
                // Couldn't get it, return empty options.
                return {};
            }).then((options) => {
                navOptions = options;
            }));

            promises.push(this.getUserAdministrationOptions(courseIds, siteId).catch(() => {
                // Couldn't get it, return empty options.
                return {};
            }).then((options) => {
                admOptions = options;
            }));

            return Promise.all(promises).then(() => {
                return { navOptions: navOptions, admOptions: admOptions };
            });
        });
    }

    /**
     * Get the common part of the cache keys for user administration options WS calls.
     *
     * @return Cache key.
     */
    protected getUserAdministrationOptionsCommonCacheKey(): string {
        return this.ROOT_CACHE_KEY + 'administrationOptions:';
    }

    /**
     * Get cache key for get user administration options WS call.
     *
     * @param courseIds IDs of courses to get.
     * @return Cache key.
     */
    protected getUserAdministrationOptionsCacheKey(courseIds: number[]): string {
        return this.getUserAdministrationOptionsCommonCacheKey() + courseIds.join(',');
    }

    /**
     * Get user administration options for a set of courses.
     *
     * @param courseIds IDs of courses to get.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with administration options for each course.
     */
    getUserAdministrationOptions(courseIds: number[], siteId?: string): Promise<any> {
        if (!courseIds || courseIds.length == 0) {
            return Promise.resolve({});
        }

        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    courseids: courseIds
                },
                preSets = {
                    cacheKey: this.getUserAdministrationOptionsCacheKey(courseIds),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            return site.read('core_course_get_user_administration_options', params, preSets).then((response) => {
                // Format returned data.
                return this.formatUserAdminOrNavOptions(response.courses);
            });
        });
    }

    /**
     * Get the common part of the cache keys for user navigation options WS calls.
     *
     * @param courseIds IDs of courses to get.
     * @return Cache key.
     */
    protected getUserNavigationOptionsCommonCacheKey(): string {
        return this.ROOT_CACHE_KEY + 'navigationOptions:';
    }

    /**
     * Get cache key for get user navigation options WS call.
     *
     * @return Cache key.
     */
    protected getUserNavigationOptionsCacheKey(courseIds: number[]): string {
        return this.getUserNavigationOptionsCommonCacheKey() + courseIds.join(',');
    }

    /**
     * Get user navigation options for a set of courses.
     *
     * @param courseIds IDs of courses to get.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with navigation options for each course.
     */
    getUserNavigationOptions(courseIds: number[], siteId?: string): Promise<any> {
        if (!courseIds || courseIds.length == 0) {
            return Promise.resolve({});
        }

        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    courseids: courseIds
                },
                preSets = {
                    cacheKey: this.getUserNavigationOptionsCacheKey(courseIds),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            return site.read('core_course_get_user_navigation_options', params, preSets).then((response) => {
                // Format returned data.
                return this.formatUserAdminOrNavOptions(response.courses);
            });
        });
    }

    /**
     * Format user navigation or administration options.
     *
     * @param courses Navigation or administration options for each course.
     * @return Formatted options.
     */
    protected formatUserAdminOrNavOptions(courses: any[]): any {
        const result = {};

        courses.forEach((course) => {
            const options = {};

            if (course.options) {
                course.options.forEach((option) => {
                    options[option.name] = option.available;
                });
            }

            result[course.id] = options;
        });

        return result;
    }

    /**
     * Get a course the user is enrolled in. This function relies on getUserCourses.
     * preferCache=true will try to speed up the response, but the data returned might not be updated.
     *
     * @param id ID of the course to get.
     * @param preferCache True if shouldn't call WS if data is cached, false otherwise.
     * @param siteId Site to get the courses from. If not defined, use current site.
     * @return Promise resolved with the course.
     */
    getUserCourse(id: number, preferCache?: boolean, siteId?: string): Promise<any> {
        if (!id) {
            return Promise.reject(null);
        }

        return this.getUserCourses(preferCache, siteId).then((courses) => {
            let course;
            for (const i in courses) {
                if (courses[i].id == id) {
                    course = courses[i];
                    break;
                }
            }

            return course ? course : Promise.reject(null);
        });
    }

    /**
     * Get user courses.
     *
     * @param preferCache True if shouldn't call WS if data is cached, false otherwise.
     * @param siteId Site to get the courses from. If not defined, use current site.
     * @return Promise resolved with the courses.
     */
    getUserCourses(preferCache?: boolean, siteId?: string, strategy?: CoreSitesReadingStrategy): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {

            const userId = site.getUserId(),
                data: any = {
                    userid: userId
                },
                strategyPreSets = strategy
                    ? this.sitesProvider.getReadingStrategyPreSets(strategy)
                    : { omitExpires: !!preferCache },
                preSets = {
                    cacheKey: this.getUserCoursesCacheKey(),
                    getCacheUsingCacheKey: true,
                    updateFrequency: CoreSite.FREQUENCY_RARELY,
                    ...strategyPreSets,
                };

            if (site.isVersionGreaterEqualThan('3.7')) {
                data.returnusercount = 0;
            }

            return site.read('core_enrol_get_users_courses', data, preSets).then((courses) => {
                if (this.userCoursesIds) {
                    // Check if the list of courses has changed.
                    const added = [],
                        removed = [],
                        previousIds = Object.keys(this.userCoursesIds),
                        currentIds = {}; // Use an object to make it faster to search.

                    courses.forEach((course) => {
                        currentIds[course.id] = true;

                        if (!this.userCoursesIds[course.id]) {
                            // Course added.
                            added.push(course.id);
                        }
                    });

                    if (courses.length - added.length != previousIds.length) {
                        // A course was removed, check which one.
                        previousIds.forEach((id) => {
                            if (!currentIds[id]) {
                                // Course removed.
                                removed.push(Number(id));
                            }
                        });
                    }

                    if (added.length || removed.length) {
                        // At least 1 course was added or removed, trigger the event.
                        this.eventsProvider.trigger(CoreCoursesProvider.EVENT_MY_COURSES_CHANGED, {
                            added: added,
                            removed: removed
                        }, site.getId());
                    }

                    this.userCoursesIds = currentIds;
                } else {
                    this.userCoursesIds = {};

                    // Store the list of courses.
                    courses.forEach((course) => {
                        this.userCoursesIds[course.id] = true;
                    });
                }

                return courses;
            });
        });
    }

    /**
     * Get cache key for get user courses WS call.
     *
     * @return Cache key.
     */
    protected getUserCoursesCacheKey(): string {
        return this.ROOT_CACHE_KEY + 'usercourses';
    }

    /**
     * Invalidates get categories WS call.
     *
     * @param categoryId Category ID to get.
     * @param addSubcategories If it should add subcategories to the list.
     * @param siteId Site Id. If not defined, use current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateCategories(categoryId: number, addSubcategories?: boolean, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getCategoriesCacheKey(categoryId, addSubcategories));
        });
    }

    /**
     * Invalidates get course WS call.
     *
     * @param id Course ID.
     * @param siteId Site Id. If not defined, use current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateCourse(id: number, siteId?: string): Promise<any> {
        return this.invalidateCourses([id], siteId);
    }

    /**
     * Invalidates get course enrolment methods WS call.
     *
     * @param id Course ID.
     * @param siteId Site Id. If not defined, use current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateCourseEnrolmentMethods(id: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getCourseEnrolmentMethodsCacheKey(id));
        });
    }

    /**
     * Invalidates get course guest enrolment info WS call.
     *
     * @param instanceId Guest instance ID.
     * @param siteId Site Id. If not defined, use current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateCourseGuestEnrolmentInfo(instanceId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getCourseGuestEnrolmentInfoCacheKey(instanceId));
        });
    }

    /**
     * Invalidates the navigation and administration options for the given courses.
     *
     * @param courseIds IDs of courses to get.
     * @param siteId Site ID to invalidate. If not defined, use current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateCoursesAdminAndNavOptions(courseIds: number[], siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.getCourseIdsForAdminAndNavOptions(courseIds, siteId).then((ids) => {
            const promises = [];

            promises.push(this.invalidateUserAdministrationOptionsForCourses(ids, siteId));
            promises.push(this.invalidateUserNavigationOptionsForCourses(ids, siteId));

            return Promise.all(promises);
        });
    }

    /**
     * Invalidates get courses WS call.
     *
     * @param ids Courses IDs.
     * @param siteId Site Id. If not defined, use current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateCourses(ids: number[], siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getCoursesCacheKey(ids));
        });
    }

    /**
     * Invalidates get courses by field WS call.
     *
     * @param field See getCoursesByField for info.
     * @param value The value to match.
     * @param siteId Site Id. If not defined, use current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateCoursesByField(field?: string, value?: any, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.fixCoursesByFieldParams(field, value, siteId).then((result) => {
            field = result.field;
            value = result.value;

            return this.sitesProvider.getSite(siteId);
        }).then((site) => {
            return site.invalidateWsCacheForKey(this.getCoursesByFieldCacheKey(field, value));
        });
    }

    /**
     * Invalidates all user administration options.
     *
     * @param siteId Site ID to invalidate. If not defined, use current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateUserAdministrationOptions(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getUserAdministrationOptionsCommonCacheKey());
        });
    }

    /**
     * Invalidates user administration options for certain courses.
     *
     * @param courseIds IDs of courses.
     * @param siteId Site ID to invalidate. If not defined, use current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateUserAdministrationOptionsForCourses(courseIds: number[], siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getUserAdministrationOptionsCacheKey(courseIds));
        });
    }

    /**
     * Invalidates get user courses WS call.
     *
     * @param siteId Site ID to invalidate. If not defined, use current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateUserCourses(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getUserCoursesCacheKey());
        });
    }

    /**
     * Invalidates all user navigation options.
     *
     * @param siteId Site ID to invalidate. If not defined, use current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateUserNavigationOptions(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getUserNavigationOptionsCommonCacheKey());
        });
    }

    /**
     * Invalidates user navigation options for certain courses.
     *
     * @param courseIds IDs of courses.
     * @param siteId Site ID to invalidate. If not defined, use current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateUserNavigationOptionsForCourses(courseIds: number[], siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getUserNavigationOptionsCacheKey(courseIds));
        });
    }

    /**
     * Check if WS to retrieve guest enrolment data is available.
     *
     * @return Whether guest WS is available.
     */
    isGuestWSAvailable(): boolean {
        const currentSite = this.sitesProvider.getCurrentSite();

        return currentSite && currentSite.wsAvailable('enrol_guest_get_instance_info');
    }

    /**
     * Search courses.
     *
     * @param text Text to search.
     * @param page Page to get.
     * @param perPage Number of courses per page. Defaults to CoreCoursesProvider.SEARCH_PER_PAGE.
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved with the courses and the total of matches.
     */
    search(text: string, page: number = 0, perPage?: number, siteId?: string): Promise<{ total: number, courses: any[] }> {
        perPage = perPage || CoreCoursesProvider.SEARCH_PER_PAGE;

        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    criterianame: 'search',
                    criteriavalue: text,
                    page: page,
                    perpage: perPage
                },
                preSets = {
                    getFromCache: false
                };

            return site.read('core_course_search_courses', params, preSets).then((response) => {
                return { total: response.total, courses: response.courses };
            });
        });
    }

    /**
     * Self enrol current user in a certain course.
     *
     * @param courseId Course ID.
     * @param password Password to use.
     * @param instanceId Enrol instance ID.
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved if the user is enrolled. If the password is invalid, the promise is rejected
     *         with an object with code = CoreCoursesProvider.ENROL_INVALID_KEY.
     */
    selfEnrol(courseId: number, password: string = '', instanceId?: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {

            const params: any = {
                    courseid: courseId,
                    password: password
                };

            if (instanceId) {
                params.instanceid = instanceId;
            }

            return site.write('enrol_self_enrol_user', params).then((response): any => {
                if (response) {
                    if (response.status) {
                        return true;
                    } else if (response.warnings && response.warnings.length) {
                        let message;
                        response.warnings.forEach((warning) => {
                            // Invalid password warnings.
                            if (warning.warningcode == '2' || warning.warningcode == '3' || warning.warningcode == '4') {
                                message = warning.message;
                            }
                        });

                        if (message) {
                            return Promise.reject({ code: CoreCoursesProvider.ENROL_INVALID_KEY, message: message });
                        } else {
                            return Promise.reject(response.warnings[0]);
                        }
                    }
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Set favourite property on a course.
     *
     * @param courseId Course ID.
     * @param favourite If favourite or unfavourite.
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved when done.
     */
    setFavouriteCourse(courseId: number, favourite: boolean, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params: any = {
                    courses: [
                        {
                            id: courseId,
                            favourite: favourite ? 1 : 0
                        }
                    ]
                };

            return site.write('core_course_set_favourite_courses', params);
        });
    }
}
