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
import { CoreSites, CoreSitesCommonWSOptions, CoreSitesReadingStrategy } from '@services/sites';
import { CoreSite  } from '@classes/sites/site';
import { makeSingleton } from '@singletons';
import { CoreWarningsWSResponse, CoreWSExternalFile, CoreWSExternalWarning } from '@services/ws';
import { CoreEvents } from '@singletons/events';
import { CoreCourseAnyCourseDataWithExtraInfoAndOptions, CoreCourseWithImageAndColor } from './courses-helper';
import { asyncObservable, ignoreErrors, zipIncludingComplete } from '@/core/utils/rxjs';
import { of, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { AddonEnrolGuestInfo } from '@addons/enrol/guest/services/guest';
import { CoreEnrolEnrolmentInfo, CoreEnrolEnrolmentMethod } from '@features/enrol/services/enrol';
import { CoreSiteWSPreSets, WSObservable } from '@classes/sites/authenticated-site';
import { CoreCacheUpdateFrequency } from '@/core/constants';
import {
    CORE_COURSES_ENROL_INVALID_KEY,
    CORE_COURSES_DASHBOARD_DOWNLOAD_ENABLED_CHANGED_EVENT,
    CORE_COURSES_MY_COURSES_CHANGED_EVENT,
    CORE_COURSES_MY_COURSES_REFRESHED_EVENT,
    CORE_COURSES_MY_COURSES_UPDATED_EVENT,
    CoreCoursesMyCoursesUpdatedEventAction,
    CORE_COURSES_STATE_FAVOURITE,
    CORE_COURSES_STATE_HIDDEN,
    CORE_COURSES_DOWNLOAD_FEATURE_NAME,
    CORE_COURSE_DOWNLOAD_FEATURE_NAME,
    CORE_COURSES_MYCOURSES_MENU_FEATURE_NAME,
    CORE_COURSES_SEARCH_FEATURE_NAME,
} from '../constants';
import { CoreTextFormat } from '@singletons/text';

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [CORE_COURSES_MY_COURSES_CHANGED_EVENT]: CoreCoursesMyCoursesChangedEventData;
        [CORE_COURSES_MY_COURSES_UPDATED_EVENT]: CoreCoursesMyCoursesUpdatedEventData;
        [CORE_COURSES_DASHBOARD_DOWNLOAD_ENABLED_CHANGED_EVENT]: CoreCoursesDashboardDownloadEnabledChangedEventData;
    }

}

/**
 * Service that provides some features regarding lists of courses and categories.
 */
@Injectable({ providedIn: 'root' })
export class CoreCoursesProvider {

    protected static readonly ROOT_CACHE_KEY = 'mmCourses:';

    protected static readonly SEARCH_PER_PAGE = 20;
    protected static readonly RECENT_PER_PAGE = 10;

    /**
     * @deprecated since 5.0. Use CORE_COURSES_ENROL_INVALID_KEY instead.
     */
    static readonly ENROL_INVALID_KEY = CORE_COURSES_ENROL_INVALID_KEY;
    /**
     * @deprecated since 5.0. Use CORE_COURSES_MY_COURSES_CHANGED_EVENT instead.
     */
    static readonly EVENT_MY_COURSES_CHANGED = CORE_COURSES_MY_COURSES_CHANGED_EVENT;
    /**
     * @deprecated since 5.0. Use CORE_COURSES_MY_COURSES_UPDATED_EVENT instead.
     */
    static readonly EVENT_MY_COURSES_UPDATED = CORE_COURSES_MY_COURSES_UPDATED_EVENT;
    /**
     * @deprecated since 5.0. Use CORE_COURSES_MY_COURSES_REFRESHED_EVENT instead.
     */
    static readonly EVENT_MY_COURSES_REFRESHED = CORE_COURSES_MY_COURSES_REFRESHED_EVENT;
    /**
     * @deprecated since 5.0. Use CORE_COURSES_DASHBOARD_DOWNLOAD_ENABLED_CHANGED_EVENT instead.
     */
    static readonly EVENT_DASHBOARD_DOWNLOAD_ENABLED_CHANGED = CORE_COURSES_DASHBOARD_DOWNLOAD_ENABLED_CHANGED_EVENT;

    /**
     * @deprecated since 5.0. Use CoreCoursesMyCoursesUpdatedEventAction.ENROL instead.
     */
    static readonly ACTION_ENROL = CoreCoursesMyCoursesUpdatedEventAction.ENROL;
    /**
     * @deprecated since 5.0. Use CoreCoursesMyCoursesUpdatedEventAction.STATE_CHANGED instead.
     */
    static readonly ACTION_STATE_CHANGED = CoreCoursesMyCoursesUpdatedEventAction.STATE_CHANGED;
    /**
     * @deprecated since 5.0. Use CoreCoursesMyCoursesUpdatedEventAction.VIEW instead.
     */
    static readonly ACTION_VIEW = CoreCoursesMyCoursesUpdatedEventAction.VIEW;

    /**
     * @deprecated since 5.0. Use CORE_COURSES_STATE_HIDDEN instead.
     */
    static readonly STATE_HIDDEN = CORE_COURSES_STATE_HIDDEN;
    /**
     * @deprecated since 5.0. Use CORE_COURSES_STATE_FAVOURITE instead.
     */
    static readonly STATE_FAVOURITE = CORE_COURSES_STATE_FAVOURITE;

    protected userCoursesIds?: Set<number>;
    protected downloadOptionsEnabled = false;

    /**
     * Get categories. They can be filtered by id.
     *
     * @param categoryId Category ID to get.
     * @param addSubcategories If it should add subcategories to the list.
     * @param siteId Site to get the courses from. If not defined, use current site.
     * @returns Promise resolved with the categories.
     */
    async getCategories(
        categoryId: number,
        addSubcategories: boolean = false,
        siteId?: string,
    ): Promise<CoreCourseGetCategoriesWSResponse> {
        const site = await CoreSites.getSite(siteId);

        // Get parent when id is the root category.
        const criteriaKey = categoryId === 0 ? 'parent' : 'id';
        const params: CoreCourseGetCategoriesWSParams = {
            criteria: [
                {
                    key: criteriaKey,
                    value: categoryId,
                },
            ],
            addsubcategories: addSubcategories,
        };

        const preSets = {
            cacheKey: this.getCategoriesCacheKey(categoryId, addSubcategories),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
        };

        return site.read('core_course_get_categories', params, preSets);
    }

    /**
     * Get cache key for get categories methods WS call.
     *
     * @param categoryId Category ID to get.
     * @param addSubcategories If add subcategories to the list.
     * @returns Cache key.
     */
    protected getCategoriesCacheKey(categoryId: number, addSubcategories?: boolean): string {
        return `${CoreCoursesProvider.ROOT_CACHE_KEY}categories:${categoryId}:${!!addSubcategories}`;
    }

    /**
     * Given a list of course IDs to get course admin and nav options, return the list of courseIds to use.
     *
     * @param courseIds Course IDs.
     * @param siteId Site Id. If not defined, use current site.
     * @returns Promise resolved with the list of course IDs.
     */
    protected async getCourseIdsForAdminAndNavOptions(courseIds: number[], siteId?: string): Promise<number[]> {
        const site = await CoreSites.getSite(siteId);

        const siteHomeId = site.getSiteHomeId();
        if (courseIds.length === 1) {
            // Only 1 course, check if it belongs to the user courses. If so, use all user courses.
            return this.getCourseIdsIfEnrolled(courseIds[0], siteId);
        }

        if (courseIds.length > 1 && courseIds.indexOf(siteHomeId) == -1) {
            courseIds.push(siteHomeId);
        }

        // Sort the course IDs.
        courseIds.sort((a, b) => b - a);

        return courseIds;
    }

    /**
     * Given a course ID, if user is enrolled in the course it will return the IDs of all enrolled courses and site home.
     * Return only the course ID otherwise.
     *
     * @param courseId Course Id.
     * @param siteId Site Id. If not defined, use current site.
     * @returns Promise resolved with the list of course IDs.
     */
    async getCourseIdsIfEnrolled(courseId: number, siteId?: string): Promise<number[]> {
        const site = await CoreSites.getSite(siteId);
        const siteHomeId = site.getSiteHomeId();

        try {
            // Check if user is enrolled in the course.
            const courses = await this.getUserCourses(true, siteId);
            let useAllCourses = false;

            if (courseId === siteHomeId) {
                // It's site home, use all courses.
                useAllCourses = true;
            } else {
                useAllCourses = !!courses.find((course) => course.id === courseId);
            }

            if (useAllCourses) {
                // User is enrolled, return all the courses.
                const courseIds = courses.map((course) => course.id);

                // Always add the site home ID.
                courseIds.push(siteHomeId);

                // Sort the course IDs.
                courseIds.sort((a, b) => b - a);

                return courseIds;
            }
        } catch {
            // Ignore errors.
        }

        return [courseId];
    }

    /**
     * Check if download a whole course is disabled in a certain site.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @returns Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    async isDownloadCourseDisabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return this.isDownloadCoursesDisabledInSite(site);
    }

    /**
     * Check if download a whole course is disabled in a certain site.
     *
     * @param site Site. If not defined, use current site.
     * @returns Whether it's disabled.
     */
    isDownloadCourseDisabledInSite(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return !site || site.isOfflineDisabled() || site.isFeatureDisabled(CORE_COURSE_DOWNLOAD_FEATURE_NAME);
    }

    /**
     * Check if download all courses is disabled in a certain site.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @returns Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    async isDownloadCoursesDisabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return this.isDownloadCoursesDisabledInSite(site);
    }

    /**
     * Check if download all courses is disabled in a certain site.
     *
     * @param site Site. If not defined, use current site.
     * @returns Whether it's disabled.
     */
    isDownloadCoursesDisabledInSite(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return !site || site.isOfflineDisabled() || site.isFeatureDisabled(CORE_COURSES_DOWNLOAD_FEATURE_NAME);
    }

    /**
     * Check if My Courses is disabled in a certain site.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @returns Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    async isMyCoursesDisabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return this.isMyCoursesDisabledInSite(site);
    }

    /**
     * Check if My Courses is disabled in a certain site.
     *
     * @param site Site. If not defined, use current site.
     * @returns Whether it's disabled.
     */
    isMyCoursesDisabledInSite(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return !site || site.isFeatureDisabled(CORE_COURSES_MYCOURSES_MENU_FEATURE_NAME);
    }

    /**
     * Check if Search Courses is disabled in a certain site.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @returns Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    async isSearchCoursesDisabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return this.isSearchCoursesDisabledInSite(site);
    }

    /**
     * Check if Search Courses is disabled in a certain site.
     *
     * @param site Site. If not defined, use current site.
     * @returns Whether it's disabled.
     */
    isSearchCoursesDisabledInSite(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return !site || site.isFeatureDisabled(CORE_COURSES_SEARCH_FEATURE_NAME);
    }

    /**
     * Get course information if user has persmissions to view.
     *
     * @param id ID of the course to get.
     * @param siteId Site to get the courses from. If not defined, use current site.
     * @returns Promise resolved with the course.
     */
    async getCourse(id: number, siteId?: string): Promise<CoreCourseGetCoursesData> {
        const courses = await this.getCourses([id], siteId);

        if (courses?.length > 0) {
            return courses[0];
        }

        throw Error('Course not found on core_course_get_courses');
    }

    /**
     * Get the enrolment methods from a course.
     *
     * @param courseId ID of the course.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved with the methods.
     * @deprecated since 4.3. Use CoreEnrol.getSupportedCourseEnrolmentMethods instead.
     */
    async getCourseEnrolmentMethods(courseId: number, siteId?: string): Promise<CoreEnrolEnrolmentMethod[]> {
        const { CoreEnrol } = await import('@features/enrol/services/enrol');

        return CoreEnrol.getSupportedCourseEnrolmentMethods(courseId, { siteId });
    }

    /**
     * Get info from a course guest enrolment method.
     *
     * @param instanceId Guest instance ID.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved when the info is retrieved.
     * @deprecated since 4.3 use AddonEnrolGuest.getCourseGuestEnrolmentInfo instead.
     */
    async getCourseGuestEnrolmentInfo(instanceId: number, siteId?: string): Promise<AddonEnrolGuestInfo> {
        const { AddonEnrolGuest } = await import('@addons/enrol/guest/services/guest');

        return AddonEnrolGuest.getGuestEnrolmentInfo(instanceId, siteId);
    }

    /**
     * Get courses.
     * Warning: if the user doesn't have permissions to view some of the courses passed the WS call will fail.
     * The user must be able to view ALL the courses passed.
     *
     * @param ids List of IDs of the courses to get.
     * @param siteId Site to get the courses from. If not defined, use current site.
     * @returns Promise resolved with the courses.
     */
    async getCourses(ids: number[], siteId?: string): Promise<CoreCourseGetCoursesWSResponse> {
        if (ids.length === 0) {
            return [];
        }

        const site = await CoreSites.getSite(siteId);

        const params: CoreCourseGetCoursesWSParams = {
            options: {
                ids: ids,
            },
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCoursesCacheKey(ids),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
        };

        return site.read('core_course_get_courses', params, preSets);
    }

    /**
     * Get cache key for get courses WS call.
     *
     * @param ids Courses IDs.
     * @returns Cache key.
     */
    protected getCoursesCacheKey(ids: number[]): string {
        return `${CoreCoursesProvider.ROOT_CACHE_KEY}course:${JSON.stringify(ids)}`;
    }

    /**
     * This function is meant to decrease WS calls.
     * When requesting a single course that belongs to enrolled courses, request all enrolled courses because
     * the WS call is probably cached.
     *
     * @param field The field to search.
     * @param value The value to match.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved with the field and value to use.
     */
    protected async fixCoursesByFieldParams(
        field = '',
        value: number | string = '',
        siteId?: string,
    ): Promise<{ field: string; value: number | string }> {

        if (field === 'id' || field === 'ids') {
            let courseIds: number[];
            if (typeof value === 'string') {
                courseIds = value.split(',').map((id) => parseInt(id, 10));
            } else {
                courseIds = [value];
            }

            // Use the same optimization as in get admin and nav options. This will return the course IDs to use.
            courseIds = await this.getCourseIdsForAdminAndNavOptions(courseIds, siteId);

            if (courseIds.length > 1) {
                return { field: 'ids', value: courseIds.join(',') };
            } else {
                return { field: 'id', value: Number(courseIds[0]) };
            }
        } else {
            // Nothing to do.
            return { field: field, value: value };
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
     *              sectionid: section id that belongs to a course, since 4.5.
     * @param value The value to match.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved with the first course.
     */
    async getCourseByField(field?: string, value?: string | number, siteId?: string): Promise<CoreCourseSearchedData> {
        const courses = await this.getCoursesByField(field, value, siteId);

        if (courses?.length > 0) {
            return courses[0];
        }

        throw Error('Course not found on core_course_get_courses_by_field');
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
     *              sectionid: section id that belongs to a course, since 4.5.
     * @param value The value to match.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved with the courses.
     */
    async getCoursesByField(
        field: string = '',
        value: string | number = '',
        siteId?: string,
    ): Promise<CoreCourseSearchedData[]> {
        return await firstValueFrom(this.getCoursesByFieldObservable(field, value, { siteId }));
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
     *              sectionid: section id that belongs to a course, since 4.5.
     * @param value The value to match.
     * @param options Other options.
     * @returns Observable that returns the courses.
     */
    getCoursesByFieldObservable(
        field: string = '',
        value: string | number = '',
        options: CoreSitesCommonWSOptions = {},
    ): WSObservable<CoreCourseSearchedData[]> {
        return asyncObservable(async () => {
            const siteId = options.siteId || CoreSites.getCurrentSiteId();
            const originalValue = value;

            const site = await CoreSites.getSite(siteId);

            // Fix params. Tries to use cached data, no need to use observer.
            const fieldParams = await this.fixCoursesByFieldParams(field, value, siteId);

            const hasChanged = fieldParams.field !== field || fieldParams.value !== value;
            field = fieldParams.field;
            value = fieldParams.value;
            const data: CoreCourseGetCoursesByFieldWSParams = {
                field: field,
                value: field ? value : '',
            };
            const preSets: CoreSiteWSPreSets = {
                cacheKey: this.getCoursesByFieldCacheKey(field, value),
                updateFrequency: CoreCacheUpdateFrequency.RARELY,
                ...CoreSites.getReadingStrategyPreSets(options.readingStrategy),
            };

            const observable = site.readObservable<CoreCourseGetCoursesByFieldWSResponse>(
                'core_course_get_courses_by_field',
                data,
                preSets,
            );

            return observable.pipe(map(response => {
                if (!response.courses) {
                    throw Error('WS core_course_get_courses_by_field failed');
                }

                if (field === 'ids' && hasChanged) {
                    // The list of courses requestes was changed to optimize it.
                    // Return only the ones that were being requested.
                    const courseIds = String(originalValue).split(',').map((id) => parseInt(id, 10));

                    // Only courses from the original selection.
                    response.courses = response.courses.filter((course) => courseIds.indexOf(course.id) >= 0);
                }

                // Courses will be sorted using sortorder if available.
                return response.courses.sort((a, b) => {
                    if (a.sortorder === undefined && b.sortorder === undefined) {
                        return b.id - a.id;
                    }

                    if (a.sortorder === undefined) {
                        return 1;
                    }

                    if (b.sortorder === undefined) {
                        return -1;
                    }

                    return a.sortorder - b.sortorder;
                });
            }));
        });
    }

    /**
     * Get cache key for get courses WS call.
     *
     * @param field The field to search.
     * @param value The value to match.
     * @returns Cache key.
     */
    protected getCoursesByFieldCacheKey(field: string = '', value: string | number = ''): string {
        return `${CoreCoursesProvider.ROOT_CACHE_KEY}coursesbyfield:${field}:${value}`;
    }

    /**
     * Get courses matching the given custom field. By default it will try not to use cache.
     *
     * @param customFieldName Custom field name.
     * @param customFieldValue Custom field value.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the list of courses.
     * @since 3.8
     */
    async getEnrolledCoursesByCustomField(
        customFieldName: string,
        customFieldValue: string,
        siteId?: string,
    ): Promise<CoreCourseSummaryData[]> {
        return await firstValueFrom(this.getEnrolledCoursesByCustomFieldObservable(customFieldName, customFieldValue, {
            readingStrategy: CoreSitesReadingStrategy.PREFER_NETWORK,
            siteId,
        }));
    }

    /**
     * Get courses matching the given custom field.
     *
     * @param customFieldName Custom field name.
     * @param customFieldValue Custom field value.
     * @param options Common options.
     * @returns Promise resolved with the list of courses.
     * @since 3.8
     */
    getEnrolledCoursesByCustomFieldObservable(
        customFieldName: string,
        customFieldValue: string,
        options: CoreSitesCommonWSOptions,
    ): WSObservable<CoreCourseSummaryData[]> {
        return asyncObservable(async () => {
            const site = await CoreSites.getSite(options. siteId);

            const params: CoreCourseGetEnrolledCoursesByTimelineClassificationWSParams = {
                classification: 'customfield',
                customfieldname: customFieldName,
                customfieldvalue: customFieldValue,
            };
            const preSets: CoreSiteWSPreSets = {
                ...CoreSites.getReadingStrategyPreSets(options.readingStrategy ?? CoreSitesReadingStrategy.PREFER_NETWORK),
            };

            return site.readObservable<CoreCourseGetEnrolledCoursesByTimelineClassificationWSResponse>(
                'core_course_get_enrolled_courses_by_timeline_classification',
                params,
                preSets,
            ).pipe(map(response => response.courses));
        });
    }

    /**
     * Get the navigation and administration options for the given courses.
     *
     * @param courseIds IDs of courses to get.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the options for each course.
     */
    async getCoursesAdminAndNavOptions(
        courseIds: number[],
        siteId?: string,
    ): Promise<{
            navOptions: CoreCourseUserAdminOrNavOptionCourseIndexed;
            admOptions: CoreCourseUserAdminOrNavOptionCourseIndexed;
        }> {
        return await firstValueFrom(this.getCoursesAdminAndNavOptionsObservable(courseIds, { siteId }));
    }

    /**
     * Get the navigation and administration options for the given courses.
     *
     * @param courseIds IDs of courses to get.
     * @param options Options.
     * @returns Observable that returns the options for each course.
     */
    getCoursesAdminAndNavOptionsObservable(
        courseIds: number[],
        options: CoreSitesCommonWSOptions = {},
    ): WSObservable<{
            navOptions: CoreCourseUserAdminOrNavOptionCourseIndexed;
            admOptions: CoreCourseUserAdminOrNavOptionCourseIndexed;
        }> {

        return asyncObservable(async () => {
            const siteId = options.siteId || CoreSites.getCurrentSiteId();

            // Get the list of courseIds to use based on the param. Tries to use cached data, no need to use observer.
            courseIds = await this.getCourseIdsForAdminAndNavOptions(courseIds, siteId);

            // Get user navigation and administration options.
            return zipIncludingComplete(
                ignoreErrors(this.getUserNavigationOptionsObservable(courseIds, options), {}),
                ignoreErrors(this.getUserAdministrationOptionsObservable(courseIds, options), {}),
            ).pipe(
                map(([navOptions, admOptions]) => ({
                    navOptions: navOptions as CoreCourseUserAdminOrNavOptionCourseIndexed,
                    admOptions: admOptions as CoreCourseUserAdminOrNavOptionCourseIndexed,
                })),
            );
        });
    }

    /**
     * Get cache key for get recent courses WS call.
     *
     * @param userId User ID.
     * @returns Cache key.
     */
    protected getRecentCoursesCacheKey(userId: number): string {
        return `${CoreCoursesProvider.ROOT_CACHE_KEY}:recentcourses:${userId}`;
    }

    /**
     * Get recent courses.
     *
     * @param options Options.
     * @returns Promise resolved with courses.
     * @since 3.6
     */
    async getRecentCourses(options: CoreCourseGetRecentCoursesOptions = {}): Promise<CoreCourseSummaryData[]> {
        const site = await CoreSites.getSite(options.siteId);

        const userId = options.userId || site.getUserId();
        const params: CoreCourseGetRecentCoursesWSParams = {
            userid: userId,
            offset: options.offset || 0,
            limit: options.limit || CoreCoursesProvider.RECENT_PER_PAGE,
            sort: options.sort,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getRecentCoursesCacheKey(userId),
        };

        return site.read<CoreCourseSummaryData[]>('core_course_get_recent_courses', params, preSets);
    }

    /**
     * Get the common part of the cache keys for user administration options WS calls.
     *
     * @returns Cache key.
     */
    protected getUserAdministrationOptionsCommonCacheKey(): string {
        return `${CoreCoursesProvider.ROOT_CACHE_KEY}administrationOptions:`;
    }

    /**
     * Get cache key for get user administration options WS call.
     *
     * @param courseIds IDs of courses to get.
     * @returns Cache key.
     */
    protected getUserAdministrationOptionsCacheKey(courseIds: number[]): string {
        return this.getUserAdministrationOptionsCommonCacheKey() + courseIds.join(',');
    }

    /**
     * Get user administration options for a set of courses.
     *
     * @param courseIds IDs of courses to get.
     * @param options Options.
     * @returns Promise resolved with administration options for each course.
     */
    async getUserAdministrationOptions(
        courseIds: number[],
        options?: CoreSitesCommonWSOptions,
    ): Promise<CoreCourseUserAdminOrNavOptionCourseIndexed> {
        return await firstValueFrom(this.getUserAdministrationOptionsObservable(courseIds, options));
    }

    /**
     * Get user administration options for a set of courses.
     *
     * @param courseIds IDs of courses to get.
     * @param options Options.
     * @returns Observable that returns administration options for each course.
     */
    getUserAdministrationOptionsObservable(
        courseIds: number[],
        options: CoreSitesCommonWSOptions = {},
    ): WSObservable<CoreCourseUserAdminOrNavOptionCourseIndexed> {
        if (!courseIds || courseIds.length == 0) {
            return of({});
        }

        return asyncObservable(async () => {
            const site = await CoreSites.getSite(options.siteId);

            const params: CoreCourseGetUserAdminOrNavOptionsWSParams = {
                courseids: courseIds,
            };
            const preSets: CoreSiteWSPreSets = {
                cacheKey: this.getUserAdministrationOptionsCacheKey(courseIds),
                updateFrequency: CoreCacheUpdateFrequency.RARELY,
                ...CoreSites.getReadingStrategyPreSets(options.readingStrategy),
            };

            const observable = site.readObservable<CoreCourseGetUserAdminOrNavOptionsWSResponse>(
                'core_course_get_user_administration_options',
                params,
                preSets,
            );

            // Format returned data.
            return observable.pipe(map(response => this.formatUserAdminOrNavOptions(response.courses)));
        });
    }

    /**
     * Get the common part of the cache keys for user navigation options WS calls.
     *
     * @returns Cache key.
     */
    protected getUserNavigationOptionsCommonCacheKey(): string {
        return `${CoreCoursesProvider.ROOT_CACHE_KEY}navigationOptions:`;
    }

    /**
     * Get cache key for get user navigation options WS call.
     *
     * @returns Cache key.
     */
    protected getUserNavigationOptionsCacheKey(courseIds: number[]): string {
        return this.getUserNavigationOptionsCommonCacheKey() + courseIds.join(',');
    }

    /**
     * Get user navigation options for a set of courses.
     *
     * @param courseIds IDs of courses to get.
     * @param options Options.
     * @returns Promise resolved with navigation options for each course.
     */
    async getUserNavigationOptions(
        courseIds: number[],
        options?: CoreSitesCommonWSOptions,
    ): Promise<CoreCourseUserAdminOrNavOptionCourseIndexed> {
        return await firstValueFrom(this.getUserNavigationOptionsObservable(courseIds, options));
    }

    /**
     * Get user navigation options for a set of courses.
     *
     * @param courseIds IDs of courses to get.
     * @param options Options.
     * @returns Observable that returns navigation options for each course.
     */
    getUserNavigationOptionsObservable(
        courseIds: number[],
        options: CoreSitesCommonWSOptions = {},
    ): WSObservable<CoreCourseUserAdminOrNavOptionCourseIndexed> {
        if (!courseIds || courseIds.length == 0) {
            return of({});
        }

        return asyncObservable(async () => {
            const site = await CoreSites.getSite(options.siteId);

            const params: CoreCourseGetUserAdminOrNavOptionsWSParams = {
                courseids: courseIds,
            };
            const preSets: CoreSiteWSPreSets = {
                cacheKey: this.getUserNavigationOptionsCacheKey(courseIds),
                updateFrequency: CoreCacheUpdateFrequency.RARELY,
                ...CoreSites.getReadingStrategyPreSets(options.readingStrategy),
            };

            const observable = site.readObservable<CoreCourseGetUserAdminOrNavOptionsWSResponse>(
                'core_course_get_user_navigation_options',
                params,
                preSets,
            );

            // Format returned data.
            return observable.pipe(map(response => this.formatUserAdminOrNavOptions(response.courses)));
        });
    }

    /**
     * Format user navigation or administration options.
     *
     * @param courses Navigation or administration options for each course.
     * @returns Formatted options.
     */
    protected formatUserAdminOrNavOptions(courses: CoreCourseUserAdminOrNavOption[]): CoreCourseUserAdminOrNavOptionCourseIndexed {
        const result: CoreCourseUserAdminOrNavOptionCourseIndexed = {};

        courses.forEach((course) => {
            const options: CoreCourseUserAdminOrNavOptionIndexed = {};

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
     * @returns Promise resolved with the course.
     */
    async getUserCourse(id: number, preferCache?: boolean, siteId?: string): Promise<CoreEnrolledCourseData> {
        const courses = await this.getUserCourses(preferCache, siteId);

        const course = courses.find((course) => course.id === id);

        if (course) {
            return course;
        }

        throw Error('Course not found on core_enrol_get_users_courses');
    }

    /**
     * Get user courses.
     *
     * @param preferCache True if shouldn't call WS if data is cached, false otherwise.
     * @param siteId Site to get the courses from. If not defined, use current site.
     * @param strategy Reading strategy.
     * @returns Promise resolved with the courses.
     */
    async getUserCourses(
        preferCache: boolean = false,
        siteId?: string,
        strategy?: CoreSitesReadingStrategy,
    ): Promise<CoreEnrolledCourseData[]> {
        strategy = strategy ?? (preferCache ? CoreSitesReadingStrategy.PREFER_CACHE : undefined);

        return await firstValueFrom(this.getUserCoursesObservable({
            readingStrategy: strategy,
            siteId,
        }));
    }

    /**
     * Get user courses.
     *
     * @param options Options.
     * @returns Observable that returns the courses.
     */
    getUserCoursesObservable(options: CoreSitesCommonWSOptions = {}): WSObservable<CoreEnrolledCourseData[]> {
        return asyncObservable(async () => {
            const site = await CoreSites.getSite(options.siteId);

            const userId = site.getUserId();
            const wsParams: CoreEnrolGetUsersCoursesWSParams = {
                userid: userId,
            };

            const preSets: CoreSiteWSPreSets = {
                cacheKey: this.getUserCoursesCacheKey(),
                getCacheUsingCacheKey: true,
                updateFrequency: CoreCacheUpdateFrequency.RARELY,
                ...CoreSites.getReadingStrategyPreSets(options.readingStrategy),
            };

            if (site.isVersionGreaterEqualThan('3.7')) {
                wsParams.returnusercount = false;
            }

            const observable = site.readObservable<CoreEnrolGetUsersCoursesWSResponse>(
                'core_enrol_get_users_courses',
                wsParams,
                preSets,
            );

            return observable.pipe(map(courses => {
                if (this.userCoursesIds) {
                    // Check if the list of courses has changed.
                    const added: number[] = [];
                    const removed: number[] = [];
                    const previousIds = this.userCoursesIds;
                    const currentIds = new Set<number>();

                    courses.forEach((course) => {
                        // Move category field to categoryid on a course.
                        course.categoryid = course.category;
                        delete course.category;

                        currentIds.add(course.id);

                        if (!previousIds.has(course.id)) {
                            // Course added.
                            added.push(course.id);
                        }
                    });

                    if (courses.length - added.length !== previousIds.size) {
                        // A course was removed, check which one.
                        previousIds.forEach((id) => {
                            if (!currentIds.has(id)) {
                                // Course removed.
                                removed.push(Number(id));
                            }
                        });
                    }

                    if (added.length || removed.length) {
                        // At least 1 course was added or removed, trigger the event.
                        CoreEvents.trigger(CORE_COURSES_MY_COURSES_CHANGED_EVENT, {
                            added: added,
                            removed: removed,
                        }, site.getId());
                    }

                    this.userCoursesIds = currentIds;
                } else {
                    const coursesIds = new Set<number>();

                    // Store the list of courses.
                    courses.forEach((course) => {
                        coursesIds.add(course.id);

                        // Move category field to categoryid on a course.
                        course.categoryid = course.category;
                        delete course.category;
                    });

                    this.userCoursesIds = coursesIds;
                }

                return courses;
            }));
        });
    }

    /**
     * Get cache key for get user courses WS call.
     *
     * @returns Cache key.
     */
    protected getUserCoursesCacheKey(): string {
        return `${CoreCoursesProvider.ROOT_CACHE_KEY}usercourses`;
    }

    /**
     * Invalidates get categories WS call.
     *
     * @param categoryId Category ID to get.
     * @param addSubcategories If it should add subcategories to the list.
     * @param siteId Site Id. If not defined, use current site.
     */
    async invalidateCategories(categoryId: number, addSubcategories?: boolean, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getCategoriesCacheKey(categoryId, addSubcategories));
    }

    /**
     * Invalidates get course WS call.
     *
     * @param id Course ID.
     * @param siteId Site Id. If not defined, use current site.
     */
    async invalidateCourse(id: number, siteId?: string): Promise<void> {
        await this.invalidateCourses([id], siteId);
    }

    /**
     * Invalidates get course enrolment methods WS call.
     *
     * @param courseId Course ID.
     * @param siteId Site Id. If not defined, use current site.
     * @deprecated since 4.3 use CoreEnrol.invalidateCourseEnrolmentMethods instead.
     */
    async invalidateCourseEnrolmentMethods(courseId: number, siteId?: string): Promise<void> {
        const { CoreEnrol } = await import('@features/enrol/services/enrol');

        await CoreEnrol.invalidateCourseEnrolmentMethods(courseId, siteId);
    }

    /**
     * Invalidates get course guest enrolment info WS call.
     *
     * @param instanceId Guest instance ID.
     * @param siteId Site Id. If not defined, use current site.
     * @deprecated since 4.3 use CoreEnrolDelegate.invalidate instead.
     */
    async invalidateCourseGuestEnrolmentInfo(instanceId: number, siteId?: string): Promise<void> {
        const { AddonEnrolGuest } = await import('@addons/enrol/guest/services/guest');

        await AddonEnrolGuest.invalidateGuestEnrolmentInfo(instanceId, siteId);
    }

    /**
     * Invalidates the navigation and administration options for the given courses.
     *
     * @param courseIds IDs of courses to get.
     * @param siteId Site ID to invalidate. If not defined, use current site.
     */
    async invalidateCoursesAdminAndNavOptions(courseIds: number[], siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const ids = await this.getCourseIdsForAdminAndNavOptions(courseIds, siteId);

        const promises: Promise<void>[] = [];
        promises.push(this.invalidateUserAdministrationOptionsForCourses(ids, siteId));
        promises.push(this.invalidateUserNavigationOptionsForCourses(ids, siteId));

        await Promise.all(promises);
    }

    /**
     * Invalidates get courses WS call.
     *
     * @param ids Courses IDs.
     * @param siteId Site Id. If not defined, use current site.
     */
    async invalidateCourses(ids: number[], siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getCoursesCacheKey(ids));
    }

    /**
     * Invalidates get courses by field WS call.
     *
     * @param field See getCoursesByField for info.
     * @param value The value to match.
     * @param siteId Site Id. If not defined, use current site.
     */
    async invalidateCoursesByField(field: string = '', value: number | string = '', siteId?: string): Promise<void> {
        if (typeof value === 'string' && value.length === 0) {
            return;
        }

        siteId = siteId || CoreSites.getCurrentSiteId();

        const result = await this.fixCoursesByFieldParams(field, value, siteId);
        field = result.field;
        value = result.value;

        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getCoursesByFieldCacheKey(field, value));
    }

    /**
     * Invalidates get recent courses WS call.
     *
     * @param userId User ID. If not defined, current user.
     * @param siteId Site Id. If not defined, use current site.
     */
    async invalidateRecentCourses(userId?: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getRecentCoursesCacheKey(userId || site.getUserId()));
    }

    /**
     * Invalidates all user administration options.
     *
     * @param siteId Site ID to invalidate. If not defined, use current site.
     */
    async invalidateUserAdministrationOptions(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getUserAdministrationOptionsCommonCacheKey());
    }

    /**
     * Invalidates user administration options for certain courses.
     *
     * @param courseIds IDs of courses.
     * @param siteId Site ID to invalidate. If not defined, use current site.
     */
    async invalidateUserAdministrationOptionsForCourses(courseIds: number[], siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getUserAdministrationOptionsCacheKey(courseIds));
    }

    /**
     * Invalidates get user courses WS call.
     *
     * @param siteId Site ID to invalidate. If not defined, use current site.
     */
    async invalidateUserCourses(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getUserCoursesCacheKey());
    }

    /**
     * Invalidates all user navigation options.
     *
     * @param siteId Site ID to invalidate. If not defined, use current site.
     */
    async invalidateUserNavigationOptions(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getUserNavigationOptionsCommonCacheKey());
    }

    /**
     * Invalidates user navigation options for certain courses.
     *
     * @param courseIds IDs of courses.
     * @param siteId Site ID to invalidate. If not defined, use current site.
     */
    async invalidateUserNavigationOptionsForCourses(courseIds: number[], siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getUserNavigationOptionsCacheKey(courseIds));
    }

    /**
     * Report a dashboard or my courses page view event.
     *
     * @param page Page to view.
     */
    async logView(page: 'my' | 'dashboard'): Promise<void> {
        const site = CoreSites.getRequiredCurrentSite();
        if (!site.wsAvailable('core_my_view_page')) {
            return;
        }

        const params: CoreMyViewPageWSParams = { page };

        await site.write('core_my_view_page', params);
    }

    /**
     * Search courses.
     *
     * @param text Text to search.
     * @param page Page to get.
     * @param perPage Number of courses per page. Defaults to CoreCoursesProvider.SEARCH_PER_PAGE.
     * @param limitToEnrolled Limit to enrolled courses.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved with the courses and the total of matches.
     */
    async search(
        text: string,
        page: number = 0,
        perPage: number = CoreCoursesProvider.SEARCH_PER_PAGE,
        limitToEnrolled: boolean = false,
        siteId?: string,
    ): Promise<{ total: number; courses: CoreCourseBasicSearchedData[] }> {
        const site = await CoreSites.getSite(siteId);
        const params: CoreCourseSearchCoursesWSParams = {
            criterianame: 'search',
            criteriavalue: text,
            page: page,
            perpage: perPage,
            limittoenrolled: limitToEnrolled,
        };
        const preSets: CoreSiteWSPreSets = {
            getFromCache: false,
        };

        const response = await site.read<CoreCourseSearchCoursesWSResponse>('core_course_search_courses', params, preSets);

        return ({ total: response.total, courses: response.courses });
    }

    /**
     * Self enrol current user in a certain course.
     *
     * @param courseId Course ID.
     * @param password Password to use.
     * @param instanceId Enrol instance ID.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved if the user is enrolled. If the password is invalid, the promise is rejected
     *         with an object with errorcode = CORE_COURSES_ENROL_INVALID_KEY.
     * @deprecated since 4.3 use CoreEnrolDelegate.enrol instead.
     */
    async selfEnrol(courseId: number, password: string = '', instanceId?: number, siteId?: string): Promise<boolean> {
        const { AddonEnrolSelf } = await import('@addons/enrol/self/services/self');

        return AddonEnrolSelf.selfEnrol(courseId, password, instanceId, siteId);
    }

    /**
     * Set favourite property on a course.
     *
     * @param courseId Course ID.
     * @param favourite If favourite or unfavourite.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved when done.
     */
    async setFavouriteCourse(courseId: number, favourite: boolean, siteId?: string): Promise<CoreWarningsWSResponse> {
        const site = await CoreSites.getSite(siteId);

        const params: CoreCourseSetFavouriteCoursesWSParams = {
            courses: [
                {
                    id: courseId,
                    favourite: favourite,
                },
            ],
        };

        return site.write('core_course_set_favourite_courses', params);
    }

    /**
     * Get download options enabled option.
     *
     * @returns True if enabled, false otherwise.
     */
    getCourseDownloadOptionsEnabled(): boolean {
        return this.downloadOptionsEnabled;
    }

    /**
     * Set trigger and save the download option.
     *
     * @param enable True to enable, false to disable.
     */
    setCourseDownloadOptionsEnabled(enable: boolean): void {
        if (this.downloadOptionsEnabled === enable) {
            return;
        }

        this.downloadOptionsEnabled = enable;
        CoreEvents.trigger(CORE_COURSES_DASHBOARD_DOWNLOAD_ENABLED_CHANGED_EVENT, { enabled: enable });
    }

}

export const CoreCourses = makeSingleton(CoreCoursesProvider);

/**
 * Data sent to the CORE_COURSES_MY_COURSES_UPDATED_EVENT.
 */
export type CoreCoursesMyCoursesUpdatedEventData = {
    action: CoreCoursesMyCoursesUpdatedEventAction; // Action performed.
    courseId?: number; // Course ID affected (if any).
    course?: CoreCourseAnyCourseData; // Course affected (if any).
    state?: string; // Only for ACTION_STATE_CHANGED. The state that changed (hidden, favourite).
    value?: boolean; // The new value for the state changed.
};

/**
 * Data sent to the CORE_COURSES_MY_COURSES_CHANGED_EVENT.
 */
export type CoreCoursesMyCoursesChangedEventData = {
    added: number[];
    removed: number[];
};

/**
 * Data sent to the CORE_COURSES_DASHBOARD_DOWNLOAD_ENABLED_CHANGED_EVENT.
 */
export type CoreCoursesDashboardDownloadEnabledChangedEventData = {
    enabled: boolean;
};

/**
 * Params of core_enrol_get_users_courses WS.
 */
type CoreEnrolGetUsersCoursesWSParams = {
    userid: number; // User id.
    returnusercount?: boolean; // Include count of enrolled users for each course? This can add several seconds to the response
    // time if a user is on several large courses, so set this to false if the value will not be used to improve performance.
};

/**
 * Data returned by core_enrol_get_users_courses WS.
 */
type CoreEnrolGetUsersCoursesWSResponse = (CoreEnrolledCourseData & {
    category?: number; // Course category id.
})[];

/**
 * Basic data obtained form any course.
 */
export type CoreCourseBasicData = {
    id: number; // Course id.
    fullname: string; // Course full name.
    displayname?: string; // Course display name.
    shortname: string; // Course short name.
    summary: string; // Summary.
    summaryformat: CoreTextFormat; // Summary format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    categoryid?: number; // Course category id.
};

/**
 * Basic data obtained from a course when the user is enrolled.
 */
export type CoreEnrolledCourseBasicData = CoreCourseBasicData & {
    idnumber?: string; // Id number of course.
    visible?: number; // 1 means visible, 0 means not yet visible course.
    format?: string; // Course format: weeks, topics, social, site.
    showgrades?: boolean; // True if grades are shown, otherwise false.
    lang?: string; // Forced course language.
    enablecompletion?: boolean; // True if completion is enabled, otherwise false.
    startdate?: number; // Timestamp when the course start.
    enddate?: number; // Timestamp when the course end.
};

/**
 * Course Data model received when the user is enrolled.
 */
export type CoreEnrolledCourseData = CoreEnrolledCourseBasicData & {
    enrolledusercount?: number; // Number of enrolled users in this course.
    completionhascriteria?: boolean; // If completion criteria is set.
    completionusertracked?: boolean; // If the user is completion tracked.
    progress?: number | null; // Progress percentage.
    completed?: boolean; //  @since 3.6. Whether the course is completed.
    marker?: number; //  @since 3.6. Course section marker.
    lastaccess?: number; // @since 3.6. Last access to the course (timestamp).
    isfavourite?: boolean; // If the user marked this course a favourite.
    hidden?: boolean; // If the user hide the course from the dashboard.
    overviewfiles?: CoreWSExternalFile[]; // @since 3.6.
    showactivitydates?: boolean; // @since 3.11. Whether the activity dates are shown or not.
    showcompletionconditions?: boolean; // @since 3.11. Whether the activity completion conditions are shown or not.
    timemodified?: number; // @since 4.0. Last time course settings were updated (timestamp).
};

/**
 * Basic course data received on search.
 */
export type CoreCourseBasicSearchedData = CoreCourseBasicData & {
    categoryid: number; // Category id.
    categoryname: string; // Category name.
    sortorder?: number; // Sort order in the category.
    summaryfiles?: CoreWSExternalFile[];
    overviewfiles: CoreWSExternalFile[];
    contacts: { // Contact users.
        id: number; // Contact user id.
        fullname: string; // Contact user fullname.
    }[];
    enrollmentmethods: string[]; // Enrollment methods list.
    customfields?: CoreCourseCustomField[]; // Custom fields and associated values.
    showactivitydates?: boolean; // @since 3.11. Whether the activity dates are shown or not.
    showcompletionconditions?: boolean; // @since 3.11. Whether the activity completion conditions are shown or not.
};

export type CoreCourseSearchedData = CoreCourseBasicSearchedData & {
    idnumber?: string; // Id number.
    format?: string; // Course format: weeks, topics, social, site,..
    showgrades?: number; // 1 if grades are shown, otherwise 0.
    newsitems?: number; // Number of recent items appearing on the course page.
    startdate?: number; // Timestamp when the course start.
    enddate?: number; // Timestamp when the course end.
    maxbytes?: number; // Largest size of file that can be uploaded into.
    showreports?: number; // Are activity report shown (yes = 1, no =0).
    visible?: number; // 1: available to student, 0:not available.
    groupmode?: number; // No group, separate, visible.
    groupmodeforce?: number; // 1: yes, 0: no.
    defaultgroupingid?: number; // Default grouping id.
    enablecompletion?: number; // Completion enabled? 1: yes 0: no.
    completionnotify?: number; // 1: yes 0: no.
    lang?: string; // Forced course language.
    theme?: string; // Name of the forced theme.
    marker?: number; // Current course marker.
    legacyfiles?: number; // If legacy files are enabled.
    calendartype?: string; // Calendar type.
    timecreated?: number; // Time when the course was created.
    timemodified?: number; // Last time the course was updated.
    requested?: number; // If is a requested course.
    cacherev?: number; // Cache revision number.
    filters?: { // Course filters.
        filter: string; // Filter plugin name.
        localstate: number; // Filter state: 1 for on, -1 for off, 0 if inherit.
        inheritedstate: number; // 1 or 0 to use when localstate is set to inherit.
    }[];
    courseformatoptions?: CoreCourseFormatOption[]; // Additional options for particular course format.
    communicationroomname?: string; // @since Moodle 4.4. Communication tool room name.
    communicationroomurl?: string; // @since Moodle 4.4. Communication tool room URL.
};

/**
 * Course to render as list item.
 */
export type CoreCourseListItem = ((CoreCourseSearchedData & CoreCourseWithImageAndColor) |
CoreCourseAnyCourseDataWithExtraInfoAndOptions) & {
    isfavourite?: boolean; // If the user marked this course a favourite.
    hidden?: boolean; // If the user hide the course from the dashboard.
    completionusertracked?: boolean; // If the user is completion tracked.
    progress?: number | null; // Progress percentage.
};

export type CoreCourseGetCoursesData = CoreEnrolledCourseBasicData & {
    categoryid: number; // Category id.
    categorysortorder?: number; // Sort order into the category.
    newsitems?: number; // Number of recent items appearing on the course page.
    /**
     * Number of weeks/topics.
     *
     * @deprecatedonmoodle since 2.4. Use courseformatoptions. This attribute is deprecated in moodle since 2.4 but still present.
     */
    numsections?: number;
    maxbytes?: number; // Largest size of file that can be uploaded into the course.
    showreports?: number; // Are activity report shown (yes = 1, no =0).
    /**
     * How the hidden sections in the course are displayed to students.
     *
     * @deprecatedonmoodle since 2.4. Use courseformatoptions. This attribute is deprecated in moodle since 2.4 but still present.
     */
    hiddensections?: number;
    groupmode?: number; // No group, separate, visible.
    groupmodeforce?: number; // 1: yes, 0: no.
    defaultgroupingid?: number; // Default grouping id.
    timecreated?: number; // Timestamp when the course have been created.
    timemodified?: number; // Timestamp when the course have been modified.
    completionnotify?: number; // 1: yes 0: no.
    forcetheme?: string; // Name of the force theme.
    courseformatoptions?: CoreCourseFormatOption[]; // Additional options for particular course format.
    customfields?: CoreCourseCustomField[]; // Custom fields and associated values.
    showactivitydates?: boolean; // @since 3.11. Whether the activity dates are shown or not.
    showcompletionconditions?: boolean; // @since 3.11. Whether the activity completion conditions are shown or not.
};

/**
 * Course custom fields and associated values.
 */
export type CoreCourseCustomField = {
    name: string; // The name of the custom field.
    shortname: string; // The shortname of the custom field.
    type: string; // The type of the custom field - text, checkbox...
    valueraw: string; // The raw value of the custom field.
    value: string; // The value of the custom field.
};

/**
 * Additional options for particular course format.
 */
export type CoreCourseFormatOption = {
    name: string; // Course format option name.
    value: string; // Course format option value.
};

/**
 * Indexed course format options.
 */
export type CoreCourseFormatOptionsIndexed = {
    [name: string]: string;
};

/**
 * Params of core_course_get_courses_by_field WS.
 */
type CoreCourseGetCoursesByFieldWSParams = {
    /**
     * The field to search can be left empty for all courses or:
     * id: course id
     * ids: comma separated course ids
     * shortname: course short name
     * idnumber: course id number
     * category: category id the course belongs to.
     */
    field?: string;
    value?: string | number; // The value to match.
};

/**
 * Data returned by core_course_get_courses_by_field WS.
 */
export type CoreCourseGetCoursesByFieldWSResponse = {
    courses: CoreCourseSearchedData[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of core_course_search_courses WS.
 */
type CoreCourseSearchCoursesWSParams = {
    criterianame: string; // Criteria name (search, modulelist (only admins), blocklist (only admins), tagid).
    criteriavalue: string; // Criteria value.
    page?: number; // Page number (0 based).
    perpage?: number; // Items per page.
    requiredcapabilities?: string[]; // Optional list of required capabilities (used to filter the list).
    limittoenrolled?: boolean; // Limit to enrolled courses.
    onlywithcompletion?: boolean; // Limit to courses where completion is enabled.
};

/**
 * Data returned by core_course_search_courses WS.
 */
export type CoreCourseSearchCoursesWSResponse = {
    total: number; // Total course count.
    courses: CoreCourseBasicSearchedData[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of core_course_get_courses WS.
 */
type CoreCourseGetCoursesWSParams = {
    options?: {
        ids?: number[]; // List of course id. If empty return all courses except front page course.
    }; // Options - operator OR is used.
};

/**
 * Data returned by core_course_get_courses WS.
 */
export type CoreCourseGetCoursesWSResponse = CoreCourseGetCoursesData[];

/**
 * Course data exported by course_summary_exporter;
 */
export type CoreCourseSummaryData = CoreCourseBasicData & { // Course.
    idnumber: string; // Idnumber.
    startdate: number; // Startdate.
    enddate: number; // Enddate.
    visible: boolean; // Visible.
    showactivitydates: boolean; // Showactivitydates.
    showcompletionconditions: boolean; // Showcompletionconditions.
    fullnamedisplay: string; // Fullnamedisplay.
    viewurl: string; // Viewurl.
    courseimage: string; // Courseimage.
    progress?: number; // Progress.
    hasprogress: boolean; // Hasprogress.
    isfavourite: boolean; // Isfavourite.
    hidden: boolean; // Hidden.
    timeaccess?: number; // Timeaccess.
    showshortname: boolean; // Showshortname.
    coursecategory: string; // Coursecategory.
};

/**
 * Params of core_course_get_enrolled_courses_by_timeline_classification WS.
 */
type CoreCourseGetEnrolledCoursesByTimelineClassificationWSParams = {
    classification: string; // Future, inprogress, or past.
    limit?: number; // Result set limit.
    offset?: number; // Result set offset.
    sort?: string; // Sort string.
    customfieldname?: string; // Used when classification = customfield.
    customfieldvalue?: string; // Used when classification = customfield.
};

/**
 * Data returned by core_course_get_enrolled_courses_by_timeline_classification WS.
 */
export type CoreCourseGetEnrolledCoursesByTimelineClassificationWSResponse = {
    courses: CoreCourseSummaryData[];
    nextoffset: number; // Offset for the next request.
};

/**
 * Params of core_course_get_categories WS.
 */
type CoreCourseGetCategoriesWSParams = {
    criteria?: { // Criteria.
        /**
         * The category column to search, expected keys (value format) are:
         * "id" (int) the category id,
         * "ids" (string) category ids separated by commas,
         * "name" (string) the category name,
         * "parent" (int) the parent category id,
         * "idnumber" (string) category idnumber - user must have 'moodle/category:manage' to search on idnumber,
         * "visible" (int) whether the returned categories must be visible or hidden.
         * If the key is not passed, then the function return all categories that the user can see..
         */
        key: string;
        value: string | number; // The value to match.
    }[];
    addsubcategories?: boolean; // Return the sub categories infos (1 - default) otherwise only the category info (0).
};

/**
 * Data returned by core_course_get_categories WS.
 */
export type CoreCourseGetCategoriesWSResponse = CoreCategoryData[];

/**
 * Category data model.
 */
export type CoreCategoryData = {
    id: number; // Category id.
    name: string; // Category name.
    idnumber?: string; // Category id number.
    description: string; // Category description.
    descriptionformat: CoreTextFormat; // Description format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    parent: number; // Parent category id.
    sortorder: number; // Category sorting order.
    coursecount: number; // Number of courses in this category.
    visible?: number; // 1: available, 0:not available.
    visibleold?: number; // 1: available, 0:not available.
    timemodified?: number; // Timestamp.
    depth: number; // Category depth.
    path: string; // Category path.
    theme?: string; // Category theme.
};

/**
 * Params of core_course_get_user_navigation_options and core_course_get_user_administration_options WS.
 */
type CoreCourseGetUserAdminOrNavOptionsWSParams = {
    courseids: number[];
};

/**
 * Data returned by core_course_get_user_navigation_options and core_course_get_user_administration_options WS.
 */
export type CoreCourseGetUserAdminOrNavOptionsWSResponse = {
    courses: CoreCourseUserAdminOrNavOption[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Admin or navigation option data.
 */
export type CoreCourseUserAdminOrNavOption = {
    id: number; // Course id.
    options: {
        name: string; // Option name.
        available: boolean; // Whether the option is available or not.
    }[];
};

/**
 * Indexed administration or navigation course options.
 */
export type CoreCourseUserAdminOrNavOptionCourseIndexed = {
    [id: number]: CoreCourseUserAdminOrNavOptionIndexed;
};

/**
 * Indexed administration or navigation options.
 */
export type CoreCourseUserAdminOrNavOptionIndexed = {
    [name: string]: // Option name.
    boolean; // Whether the option is available or not.
};

/**
 * Course enrolment basic info.
 *
 * @deprecated since 4.3. Use CoreEnrolEnrolmentInfo instead.
 */
export type CoreCourseEnrolmentInfo = CoreEnrolEnrolmentInfo;

/**
 * Course enrolment method.
 *
 * @deprecated since 4.3. Use CoreEnrolEnrolmentMethod instead.
 */
export type CoreCourseEnrolmentMethod = CoreEnrolEnrolmentMethod;

/**
 * Params of core_course_get_recent_courses WS.
 */
export type CoreCourseGetRecentCoursesWSParams = {
    userid?: number; // Id of the user, default to current user.
    limit?: number; // Result set limit.
    offset?: number; // Result set offset.
    sort?: string; // Sort string.
};

/**
 * Options for getRecentCourses.
 */
export type CoreCourseGetRecentCoursesOptions = CoreSitesCommonWSOptions & {
    userId?: number; // Id of the user, default to current user.
    limit?: number; // Result set limit.
    offset?: number; // Result set offset.
    sort?: string; // Sort string.
};

/**
 * Params of core_course_set_favourite_courses WS.
 */
type CoreCourseSetFavouriteCoursesWSParams = {
    courses: {
        id: number; // Course ID.
        favourite: boolean; // Favourite status.
    }[];
};

/**
 * Any of the possible course data.
 */
export type CoreCourseAnyCourseData = CoreEnrolledCourseData | CoreCourseSearchedData | CoreCourseGetCoursesData;

/**
 * Course data with admin and navigation option availability.
 */
export type CoreCourseAnyCourseDataWithOptions = CoreCourseAnyCourseData & {
    navOptions?: CoreCourseUserAdminOrNavOptionIndexed;
    admOptions?: CoreCourseUserAdminOrNavOptionIndexed;
};

/**
 * Params of core_my_view_page WS.
 */
type CoreMyViewPageWSParams = {
    page: 'my' | 'dashboard'; // My page to trigger a view event.
};
