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
import { CoreDelegate, CoreDelegateHandler, CoreDelegateToDisplay } from '@classes/delegate';
import { CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import {
    CoreCourseAnyCourseData,
    CoreCourseAnyCourseDataWithOptions,
    CoreCourses,
    CoreCourseUserAdminOrNavOptionIndexed,
} from '@features/courses/services/courses';
import { CoreCourseAccessDataType } from './course';
import { Params } from '@angular/router';
import { makeSingleton } from '@singletons';
import { CorePromisedValue } from '@classes/promised-value';
import { CORE_COURSES_MY_COURSES_REFRESHED_EVENT } from '@features/courses/constants';

/**
 * Interface that all course options handlers must implement.
 */
export interface CoreCourseOptionsHandler extends CoreDelegateHandler {
    /**
     * The highest priority is displayed first.
     */
    priority: number;

    /**
     * True if this handler should appear in menu rather than as a tab.
     */
    isMenuHandler?: boolean;

    /**
     * Whether or not the handler is enabled for a certain course.
     *
     * @param courseId The course ID.
     * @param accessData Access type and data. Default, guest, ...
     * @param navOptions Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param admOptions Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @returns True or promise resolved with true if enabled.
     */
    isEnabledForCourse(
        courseId: number,
        accessData: CoreCourseAccess,
        navOptions?: CoreCourseUserAdminOrNavOptionIndexed,
        admOptions?: CoreCourseUserAdminOrNavOptionIndexed,
    ): boolean | Promise<boolean>;

    /**
     * Returns the data needed to render the handler.
     *
     * @param course The course.
     * @returns Data or promise resolved with the data.
     */
    getDisplayData?(
        course: CoreCourseAnyCourseDataWithOptions,
    ): CoreCourseOptionsHandlerData | Promise<CoreCourseOptionsHandlerData>;

    /**
     * Should invalidate the data to determine if the handler is enabled for a certain course.
     *
     * @param courseId The course ID.
     * @param navOptions Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param admOptions Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @returns Promise resolved when done.
     */
    invalidateEnabledForCourse?(
        courseId: number,
        navOptions?: CoreCourseUserAdminOrNavOptionIndexed,
        admOptions?: CoreCourseUserAdminOrNavOptionIndexed,
    ): Promise<void>;

    /**
     * Called when a course is downloaded. It should prefetch all the data to be able to see the addon in offline.
     *
     * @param course The course.
     * @returns Promise resolved when done.
     */
    prefetch?(course: CoreCourseAnyCourseData): Promise<void>;
}

/**
 * Interface that course options handlers implement if they appear in the menu rather than as a tab.
 */
export interface CoreCourseOptionsMenuHandler extends CoreCourseOptionsHandler {
    /**
     * Returns the data needed to render the handler.
     *
     * @param course The course.
     * @returns Data or promise resolved with data.
     */
    getMenuDisplayData(
        course: CoreCourseAnyCourseDataWithOptions,
    ): CoreCourseOptionsMenuHandlerData | Promise<CoreCourseOptionsMenuHandlerData>;
}

/**
 * Data needed to render a course handler. It's returned by the handler.
 */
export interface CoreCourseOptionsHandlerData {
    /**
     * Title to display for the handler.
     */
    title: string;

    /**
     * Class to add to the displayed handler.
     */
    class?: string;

    /**
     * Path of the page to load for the handler.
     */
    page: string;

    /**
     * Params to pass to the page (other than 'courseId' which is always sent).
     */
    pageParams?: Params;
}

/**
 * Data needed to render a course menu handler. It's returned by the handler.
 */
export interface CoreCourseOptionsMenuHandlerData {
    /**
     * Title to display for the handler.
     */
    title: string;

    /**
     * Class to add to the displayed handler.
     */
    class?: string;

    /**
     * Path of the page to load for the handler.
     */
    page: string;

    /**
     * Params to pass to the page (other than 'course' which is always sent).
     */
    pageParams?: Params;

    /**
     * Name of the icon to display for the handler.
     */
    icon: string; // Name of the icon to display in the tab.
}

/**
 * Data returned by the delegate for each handler.
 */
export interface CoreCourseOptionsHandlerToDisplay extends CoreDelegateToDisplay {
    /**
     * Data to display.
     */
    data: CoreCourseOptionsHandlerData;

    /**
     * Called when a course is downloaded. It should prefetch all the data to be able to see the addon in offline.
     *
     * @param course The course.
     * @returns Promise resolved when done.
     */
    prefetch?(course: CoreCourseAnyCourseData): Promise<void>;
}

/**
 * Additional data returned if it is a menu item.
 */
export interface CoreCourseOptionsMenuHandlerToDisplay {
    /**
     * Data to display.
     */
    data: CoreCourseOptionsMenuHandlerData;

    /**
     * Name of the handler, or name and sub context (AddonMessages, AddonMessages:blockContact, ...).
     */
    name: string;

    /**
     * The highest priority is displayed first.
     */
    priority?: number;

    /**
     * Called when a course is downloaded. It should prefetch all the data to be able to see the addon in offline.
     *
     * @param course The course.
     * @returns Promise resolved when done.
     */
    prefetch?(course: CoreCourseAnyCourseData): Promise<void>;
}

/**
 * Service to interact with plugins to be shown in each course (participants, learning plans, ...).
 */
@Injectable( { providedIn: 'root' })
export class CoreCourseOptionsDelegateService extends CoreDelegate<CoreCourseOptionsHandler> {

    protected loaded: { [courseId: number]: boolean } = {};
    protected lastUpdateHandlersForCoursesStart: {
        [courseId: number]: number;
    } = {};

    protected coursesHandlers: {
        [courseId: number]: {
            access: CoreCourseAccess;
            navOptions?: CoreCourseUserAdminOrNavOptionIndexed;
            admOptions?: CoreCourseUserAdminOrNavOptionIndexed;
            deferred: CorePromisedValue<void>;
            enabledHandlers: CoreCourseOptionsHandler[];
            enabledMenuHandlers: CoreCourseOptionsMenuHandler[];
        };
    } = {};

    protected featurePrefix = 'CoreCourseOptionsDelegate_';

    constructor() {
        super('CoreCourseOptionsDelegate');

        CoreEvents.on(CoreEvents.LOGOUT, () => {
            this.clearCoursesHandlers();
        });
    }

    /**
     * Check if handlers are loaded for a certain course.
     *
     * @param courseId The course ID to check.
     * @returns True if handlers are loaded, false otherwise.
     */
    areHandlersLoaded(courseId: number): boolean {
        return !!this.loaded[courseId];
    }

    /**
     * Clear all course options handlers.
     *
     * @param courseId The course ID. If not defined, all handlers will be cleared.
     */
    protected clearCoursesHandlers(courseId?: number): void {
        if (courseId) {
            if (!this.loaded[courseId]) {
                // Don't clear if not loaded, it's probably an ongoing load and it could cause JS errors.
                return;
            }

            this.loaded[courseId] = false;
            delete this.coursesHandlers[courseId];
        } else {
            for (const courseId in this.coursesHandlers) {
                this.clearCoursesHandlers(Number(courseId));
            }
        }
    }

    /**
     * Clear all courses handlers and invalidate its options.
     *
     * @param courseId The course ID. If not defined, all handlers will be cleared.
     * @returns Promise resolved when done.
     */
    async clearAndInvalidateCoursesOptions(courseId?: number): Promise<void> {
        const promises: Promise<void>[] = [];

        CoreEvents.trigger(CORE_COURSES_MY_COURSES_REFRESHED_EVENT);

        // Invalidate course enabled data for the handlers that are enabled at site level.
        if (courseId) {
            // Invalidate only options for this course.
            promises.push(CoreCourses.invalidateCoursesAdminAndNavOptions([courseId]));
            promises.push(this.invalidateCourseHandlers(courseId));
        } else {
            // Invalidate all options.
            promises.push(CoreCourses.invalidateUserNavigationOptions());
            promises.push(CoreCourses.invalidateUserAdministrationOptions());

            for (const cId in this.coursesHandlers) {
                promises.push(this.invalidateCourseHandlers(parseInt(cId, 10)));
            }
        }

        this.clearCoursesHandlers(courseId);

        await Promise.all(promises);
    }

    /**
     * Get the handlers for a course using a certain access type.
     *
     * @param courseId The course ID.
     * @param refresh True if it should refresh the list.
     * @param accessData Access type and data. Default, guest, ...
     * @param navOptions Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param admOptions Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @returns Promise resolved with array of handlers.
     */
    protected async updateHandlersForAccess(
        courseId: number,
        refresh: boolean,
        accessData: CoreCourseAccess,
        navOptions?: CoreCourseUserAdminOrNavOptionIndexed,
        admOptions?: CoreCourseUserAdminOrNavOptionIndexed,
    ): Promise<void> {

        // If the handlers aren't loaded, do not refresh.
        if (!this.loaded[courseId]) {
            refresh = false;
        }

        if (refresh || !this.coursesHandlers[courseId] || this.coursesHandlers[courseId].access.type !== accessData.type) {
            if (!this.coursesHandlers[courseId]) {
                this.coursesHandlers[courseId] = {
                    access: accessData,
                    navOptions,
                    admOptions,
                    deferred: new CorePromisedValue(),
                    enabledHandlers: [],
                    enabledMenuHandlers: [],
                };
            } else {
                this.coursesHandlers[courseId].access = accessData;
                this.coursesHandlers[courseId].navOptions = navOptions;
                this.coursesHandlers[courseId].admOptions = admOptions;
                this.coursesHandlers[courseId].deferred = new CorePromisedValue();
            }

            this.updateHandlersForCourse(courseId, accessData, navOptions, admOptions);
        }

        await this.coursesHandlers[courseId].deferred;
    }

    /**
     * Get the list of handlers that should be displayed for a course.
     * This function should be called only when the handlers need to be displayed, since it can call several WebServices.
     *
     * @param course The course object.
     * @param refresh True if it should refresh the list.
     * @param isGuest Whether user is using an ACCESS_GUEST enrolment method.
     * @returns Promise resolved with array of handlers.
     */
    getHandlersToDisplay(
        course: CoreCourseAnyCourseData,
        refresh = false,
        isGuest = false,
    ): Promise<CoreCourseOptionsHandlerToDisplay[]> {
        return this.getHandlersToDisplayInternal(false, course, refresh, isGuest) as
            Promise<CoreCourseOptionsHandlerToDisplay[]>;
    }

    /**
     * Get the list of menu handlers that should be displayed for a course.
     * This function should be called only when the handlers need to be displayed, since it can call several WebServices.
     *
     * @param course The course object.
     * @param refresh True if it should refresh the list.
     * @param isGuest Whether user is using an ACCESS_GUEST enrolment method.
     * @returns Promise resolved with array of handlers.
     */
    getMenuHandlersToDisplay(
        course: CoreCourseAnyCourseData,
        refresh = false,
        isGuest = false,
    ): Promise<CoreCourseOptionsMenuHandlerToDisplay[]> {
        return this.getHandlersToDisplayInternal(true, course, refresh, isGuest) as
            Promise<CoreCourseOptionsMenuHandlerToDisplay[]>;
    }

    /**
     * Get the list of menu handlers that should be displayed for a course.
     * This function should be called only when the handlers need to be displayed, since it can call several WebServices.
     *
     * @param menu If true, gets menu handlers; false, gets tab handlers
     * @param course The course object.
     * @param refresh True if it should refresh the list.
     * @param isGuest Whether user is using an ACCESS_GUEST enrolment method.
     * @returns Promise resolved with array of handlers.
     */
    protected async getHandlersToDisplayInternal(
        menu: boolean,
        course: CoreCourseAnyCourseData,
        refresh = false,
        isGuest = false,
    ): Promise<CoreCourseOptionsHandlerToDisplay[] | CoreCourseOptionsMenuHandlerToDisplay[]> {

        const courseWithOptions: CoreCourseAnyCourseDataWithOptions = course;
        const accessData = {
            type: isGuest ? CoreCourseAccessDataType.ACCESS_GUEST : CoreCourseAccessDataType.ACCESS_DEFAULT,
        };
        const handlersToDisplay: CoreCourseOptionsHandlerToDisplay[] | CoreCourseOptionsMenuHandlerToDisplay[] = [];

        await this.loadCourseOptions(courseWithOptions, refresh);

        // Call updateHandlersForAccess to make sure the handlers have been loaded.
        await this.updateHandlersForAccess(
            course.id,
            refresh,
            accessData,
            courseWithOptions.navOptions,
            courseWithOptions.admOptions,
        );

        const promises: Promise<void>[] = [];

        const handlerList = menu
            ? this.coursesHandlers[course.id].enabledMenuHandlers
            : this.coursesHandlers[course.id].enabledHandlers;

        handlerList.forEach((handler: CoreCourseOptionsMenuHandler | CoreCourseOptionsHandler) => {
            const getFunction = menu
                ? (handler as CoreCourseOptionsMenuHandler).getMenuDisplayData
                : (handler as CoreCourseOptionsHandler).getDisplayData;

            if (!getFunction) {
                return;
            }

            promises.push(Promise.resolve(getFunction.call(handler, courseWithOptions)).then((data) => {
                handlersToDisplay.push({
                    data: data,
                    priority: handler.priority || 0,
                    prefetch: async (course) => await handler.prefetch?.(course),
                    name: handler.name,
                });

                return;
            }).catch((error) => {
                this.logger.error(`Error getting data for handler ${handler.name}`, error);
            }));
        });

        await Promise.all(promises);

        // Sort them by priority.
        handlersToDisplay.sort((
            a: CoreCourseOptionsHandlerToDisplay | CoreCourseOptionsMenuHandlerToDisplay,
            b: CoreCourseOptionsHandlerToDisplay | CoreCourseOptionsMenuHandlerToDisplay,
        ) => (b.priority || 0) - (a.priority || 0));

        return handlersToDisplay;
    }

    /**
     * Get the handlers for a course using a certain access type.
     *
     * @param courseId The course ID.
     * @param refresh True if it should refresh the list.
     * @param accessData Access type and data. Default, guest, ...
     * @param navOptions Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param admOptions Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @returns Promise resolved with array of handlers.
     * @deprecated since 4.4.
     */
    protected async hasHandlersForAccess(
        courseId: number,
        refresh: boolean,
        accessData: CoreCourseAccess,
        navOptions?: CoreCourseUserAdminOrNavOptionIndexed,
        admOptions?: CoreCourseUserAdminOrNavOptionIndexed,
    ): Promise<boolean> {
        await this.updateHandlersForAccess(courseId, refresh, accessData, navOptions, admOptions);

        const handlers = this.coursesHandlers[courseId].enabledHandlers;

        return !!(handlers && handlers.length);
    }

    /**
     * Check if a course has any handler enabled for default access, using course object.
     *
     * @param course The course object.
     * @param refresh True if it should refresh the list.
     * @returns Promise resolved with boolean: true if it has handlers, false otherwise.
     * @deprecated since 4.4.
     */
    async hasHandlersForCourse(course: CoreCourseAnyCourseDataWithOptions, refresh = false): Promise<boolean> {
        // Load course options if missing.
        await this.loadCourseOptions(course, refresh);

        // eslint-disable-next-line deprecation/deprecation
        return this.hasHandlersForDefault(course.id, refresh, course.navOptions, course.admOptions);
    }

    /**
     * Check if a course has any handler enabled for default access.
     *
     * @param courseId The course ID.
     * @param refresh True if it should refresh the list.
     * @param navOptions Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param admOptions Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @returns Promise resolved with boolean: true if it has handlers, false otherwise.
     * @deprecated since 4.4.
     */
    async hasHandlersForDefault(
        courseId: number,
        refresh = false,
        navOptions?: CoreCourseUserAdminOrNavOptionIndexed,
        admOptions?: CoreCourseUserAdminOrNavOptionIndexed,
    ): Promise<boolean> {
        // eslint-disable-next-line deprecation/deprecation
        return await this.hasHandlersForAccess(
            courseId,
            refresh,
            { type: CoreCourseAccessDataType.ACCESS_DEFAULT },
            navOptions,
            admOptions,
        );
    }

    /**
     * Check if a course has any handler enabled for guest access.
     *
     * @param courseId The course ID.
     * @param refresh True if it should refresh the list.
     * @param navOptions Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param admOptions Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @returns Promise resolved with boolean: true if it has handlers, false otherwise.
     * @deprecated since 4.4.
     */
    async hasHandlersForGuest(
        courseId: number,
        refresh = false,
        navOptions?: CoreCourseUserAdminOrNavOptionIndexed,
        admOptions?: CoreCourseUserAdminOrNavOptionIndexed,
    ): Promise<boolean> {
        // eslint-disable-next-line deprecation/deprecation
        return await this.hasHandlersForAccess(
            courseId,
            refresh,
            { type: CoreCourseAccessDataType.ACCESS_GUEST },
            navOptions,
            admOptions,
        );
    }

    /**
     * Invalidate the data to be able to determine if handlers are enabled for a certain course.
     *
     * @param courseId Course ID.
     * @returns Promise resolved when done.
     */
    protected async invalidateCourseHandlers(courseId: number): Promise<void> {
        const promises: Promise<void>[] = [];
        const courseData = this.coursesHandlers[courseId];

        if (!courseData || !courseData.enabledHandlers) {
            return;
        }

        courseData.enabledHandlers.forEach((handler) => {
            if (handler.invalidateEnabledForCourse) {
                promises.push(
                    handler.invalidateEnabledForCourse(courseId, courseData.navOptions, courseData.admOptions),
                );
            }
        });

        await CoreUtils.allPromises(promises);
    }

    /**
     * Check if a time belongs to the last update handlers for course call.
     * This is to handle the cases where updateHandlersForCourse don't finish in the same order as they're called.
     *
     * @param courseId Course ID.
     * @param time Time to check.
     * @returns Whether it's the last call.
     */
    isLastUpdateCourseCall(courseId: number, time: number): boolean {
        if (!this.lastUpdateHandlersForCoursesStart[courseId]) {
            return true;
        }

        return time === this.lastUpdateHandlersForCoursesStart[courseId];
    }

    /**
     * Load course options if missing.
     *
     * @param course The course object.
     * @param refresh True if it should refresh the list.
     * @returns Promise resolved when done.
     */
    protected async loadCourseOptions(course: CoreCourseAnyCourseDataWithOptions, refresh = false): Promise<void> {
        if (!refresh && course.navOptions !== undefined && course.admOptions !== undefined) {
            return;
        }

        const options = await CoreCourses.getCoursesAdminAndNavOptions([course.id]);
        course.navOptions = options.navOptions[course.id];
        course.admOptions = options.admOptions[course.id];
    }

    /**
     * Update handlers for each course.
     */
    updateData(): void {
        // Update handlers for all courses.
        for (const courseId in this.coursesHandlers) {
            const handler = this.coursesHandlers[courseId];
            this.updateHandlersForCourse(parseInt(courseId, 10), handler.access, handler.navOptions, handler.admOptions);
        }
    }

    /**
     * Update the handlers for a certain course.
     *
     * @param courseId The course ID.
     * @param accessData Access type and data. Default, guest, ...
     * @param navOptions Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param admOptions Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @returns Resolved when updated.
     */
    protected async updateHandlersForCourse(
        courseId: number,
        accessData: CoreCourseAccess,
        navOptions?: CoreCourseUserAdminOrNavOptionIndexed,
        admOptions?: CoreCourseUserAdminOrNavOptionIndexed,
    ): Promise<void> {
        const promises: Promise<void>[] = [];
        const enabledForCourse: CoreCourseOptionsHandler[] = [];
        const enabledForCourseMenu: CoreCourseOptionsMenuHandler[] = [];
        const siteId = CoreSites.getCurrentSiteId();
        const now = Date.now();

        this.lastUpdateHandlersForCoursesStart[courseId] = now;

        for (const name in this.enabledHandlers) {
            const handler = this.enabledHandlers[name];

            // Checks if the handler is enabled for the user.
            promises.push(Promise.resolve(handler.isEnabledForCourse(courseId, accessData, navOptions, admOptions))
                .then((enabled) => {
                    if (enabled) {
                        if (handler.isMenuHandler) {
                            enabledForCourseMenu.push(<CoreCourseOptionsMenuHandler> handler);
                        } else {
                            enabledForCourse.push(handler);
                        }
                    }

                    return;
                }).catch(() => {
                    // Nothing to do here, it is not enabled for this user.
                }));
        }

        try {
            await Promise.all(promises);
        } catch {
            // Never fails.
        }

        // Verify that this call is the last one that was started.
        // Check that site hasn't changed since the check started.
        if (this.isLastUpdateCourseCall(courseId, now) && CoreSites.getCurrentSiteId() === siteId) {
            // Update the coursesHandlers array with the new enabled addons.
            this.coursesHandlers[courseId].enabledHandlers = enabledForCourse;
            this.coursesHandlers[courseId].enabledMenuHandlers = enabledForCourseMenu;
            this.loaded[courseId] = true;

            // Resolve the promise.
            this.coursesHandlers[courseId].deferred.resolve();
        }
    }

}

export const CoreCourseOptionsDelegate = makeSingleton(CoreCourseOptionsDelegateService);

export type CoreCourseAccess = {
    type: CoreCourseAccessDataType;
};
