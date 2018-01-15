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

import { Injectable } from '@angular/core';
import { CoreEventsProvider } from '../../../providers/events';
import { CoreLoggerProvider } from '../../../providers/logger';
import { CoreSitesProvider } from '../../../providers/sites';
import { CoreUtilsProvider, PromiseDefer } from '../../../providers/utils/utils';
import { CoreCoursesProvider } from './courses';

/**
 * Interface that all courses handlers must implement.
 */
export interface CoreCoursesHandler {
    /**
     * Name of the handler.
     * @type {string}
     */
    name: string;

    /**
     * The highest priority is displayed first.
     * @type {number}
     */
    priority: number;

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return {boolean|Promise<boolean>} True or promise resolved with true if enabled.
     */
    isEnabled(): boolean|Promise<boolean>;

    /**
     * Whether or not the handler is enabled for a certain course.
     * For perfomance reasons, do NOT call WebServices in here, call them in shouldDisplayForCourse.
     *
     * @param {number} courseId The course ID.
     * @param {any} accessData Access type and data. Default, guest, ...
     * @param {any} [navOptions] Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param {any} [admOptions] Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @return {boolean|Promise<boolean>} True or promise resolved with true if enabled.
     */
    isEnabledForCourse(courseId: number, accessData: any, navOptions?: any, admOptions?: any) : boolean|Promise<boolean>;

    /**
     * Whether or not the handler should be displayed for a course. If not implemented, assume it's true.
     *
     * @param {number} courseId The course ID.
     * @param {any} accessData Access type and data. Default, guest, ...
     * @param {any} [navOptions] Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param {any} [admOptions] Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @return {boolean|Promise<boolean>} True or promise resolved with true if enabled.
     */
    shouldDisplayForCourse(courseId: number, accessData: any, navOptions?: any, admOptions?: any) : boolean|Promise<boolean>;

    /**
     * Returns the data needed to render the handler.
     *
     * @param {number} courseId The course ID.
     * @return {CoreCoursesHandlerData} Data.
     */
    getDisplayData?(courseId: number): CoreCoursesHandlerData;

    /**
     * Should invalidate the data to determine if the handler is enabled for a certain course.
     *
     * @param {number} courseId The course ID.
     * @param {any} [navOptions] Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param {any} [admOptions] Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @return {Promise<any>} Promise resolved when done.
     */
    invalidateEnabledForCourse?(courseId: number, navOptions?: any, admOptions?: any) : Promise<any>;

    /**
     * Called when a course is downloaded. It should prefetch all the data to be able to see the addon in offline.
     *
     * @param {any} course The course.
     * @return {Promise<any>} Promise resolved when done.
     */
    prefetch?(course: any) : Promise<any>;
};

/**
 * Data needed to render a course handler. It's returned by the handler.
 */
export interface CoreCoursesHandlerData {
    /**
     * Title to display for the handler.
     * @type {string}
     */
    title: string;

    /**
     * Name of the icon to display for the handler.
     * @type {string}
     */
    icon: string;

    /**
     * Class to add to the displayed handler.
     * @type {string}
     */
    class?: string;

    /**
     * Action to perform when the handler is clicked.
     *
     * @param {any} course The course.
     */
    action(course: any): void;
};

/**
 * Data returned by the delegate for each handler.
 */
export interface CoreCoursesHandlerToDisplay {
    /**
     * Data to display.
     * @type {CoreCoursesHandlerData}
     */
    data: CoreCoursesHandlerData;

    /**
     * The highest priority is displayed first.
     * @type {number}
     */
    priority?: number;

    /**
     * Called when a course is downloaded. It should prefetch all the data to be able to see the addon in offline.
     *
     * @param {any} course The course.
     * @return {Promise<any>} Promise resolved when done.
     */
    prefetch?(course: any) : Promise<any>;
};

/**
 * Service to interact with plugins to be shown in each course.
 */
@Injectable()
export class CoreCoursesDelegate {
    protected logger;
    protected handlers: {[s: string]: CoreCoursesHandler} = {}; // All registered handlers.
    protected enabledHandlers: {[s: string]: CoreCoursesHandler} = {}; // Handlers enabled for the current site.
    protected loaded: {[courseId: number]: boolean} = {};
    protected lastUpdateHandlersStart: number;
    protected lastUpdateHandlersForCoursesStart: any = {};
    protected coursesHandlers: {[courseId: number]: {
        access?: any, navOptions?: any, admOptions?: any, deferred?: PromiseDefer, enabledHandlers?: CoreCoursesHandler[]}} = {};

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private eventsProvider: CoreEventsProvider,
            private coursesProvider: CoreCoursesProvider, private utils: CoreUtilsProvider) {
        this.logger = logger.getInstance('CoreMainMenuDelegate');

        eventsProvider.on(CoreEventsProvider.LOGIN, this.updateHandlers.bind(this));
        eventsProvider.on(CoreEventsProvider.SITE_UPDATED, this.updateHandlers.bind(this));
        eventsProvider.on(CoreEventsProvider.REMOTE_ADDONS_LOADED, this.updateHandlers.bind(this));
        eventsProvider.on(CoreEventsProvider.LOGOUT, () => {
            this.clearCoursesHandlers();
        });
    }

    /**
     * Check if handlers are loaded for a certain course.
     *
     * @param {number} courseId The course ID to check.
     * @return {boolean} True if handlers are loaded, false otherwise.
     */
    areHandlersLoaded(courseId: number) : boolean {
        return !!this.loaded[courseId];
    }

    /**
     * Clear all courses handlers.
     *
     * @param {number} [courseId] The course ID. If not defined, all handlers will be cleared.
     */
    protected clearCoursesHandlers(courseId?: number) : void {
        if (courseId) {
            this.loaded[courseId] = false;
            delete this.coursesHandlers[courseId];
        } else {
            this.loaded = {};
            this.coursesHandlers = {};
        }
    }

    /**
     * Clear all courses handlers and invalidate its options.
     *
     * @param {number} [courseId] The course ID. If not defined, all handlers will be cleared.
     * @return {Promise<any>} Promise resolved when done.
     */
    clearAndInvalidateCoursesOptions(courseId?: number) : Promise<any> {
        var promises = [];

        this.eventsProvider.trigger(CoreCoursesProvider.EVENT_MY_COURSES_REFRESHED);

        // Invalidate course enabled data for the handlers that are enabled at site level.
        if (courseId) {
            // Invalidate only options for this course.
            promises.push(this.coursesProvider.invalidateCoursesOptions([courseId]));
            promises.push(this.invalidateCourseHandlers(courseId));
        } else {
            // Invalidate all options.
            promises.push(this.coursesProvider.invalidateUserNavigationOptions());
            promises.push(this.coursesProvider.invalidateUserAdministrationOptions());

            for (let cId in this.coursesHandlers) {
                promises.push(this.invalidateCourseHandlers(parseInt(cId, 10)));
            }
        }

        this.clearCoursesHandlers(courseId);

        return Promise.all(promises);
    }

    /**
     * Get the handlers for a course using a certain access type.
     *
     * @param {number} courseId The course ID.
     * @param {boolean} refresh True if it should refresh the list.
     * @param {any} accessData Access type and data. Default, guest, ...
     * @param {any} [navOptions] Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param {any} [admOptions] Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @return {Promise<CoreCoursesHandler[]>} Promise resolved with array of handlers.
     */
    protected getHandlersForAccess(courseId: number, refresh: boolean, accessData: any, navOptions?: any,
            admOptions?: any) : Promise<CoreCoursesHandler[]> {

        // If the handlers aren't loaded, do not refresh.
        if (!this.loaded[courseId]) {
            refresh = false;
        }

        if (refresh || !this.coursesHandlers[courseId] || this.coursesHandlers[courseId].access.type != accessData.type) {
            if (!this.coursesHandlers[courseId]) {
                this.coursesHandlers[courseId] = {};
            }
            this.coursesHandlers[courseId].access = accessData;
            this.coursesHandlers[courseId].navOptions = navOptions;
            this.coursesHandlers[courseId].admOptions = admOptions;
            this.coursesHandlers[courseId].deferred = this.utils.promiseDefer();
            this.updateHandlersForCourse(courseId, accessData, navOptions, admOptions);
        }

        return this.coursesHandlers[courseId].deferred.promise.then(() => {
            return this.coursesHandlers[courseId].enabledHandlers;
        });
    }

    /**
     * Get the list of handlers that should be displayed for a course.
     * This function should be called only when the handlers need to be displayed, since it can call several WebServices.
     *
     * @param {any} course The course object.
     * @param {boolean} [refresh] True if it should refresh the list.
     * @param {boolean} [isGuest] Whether it's guest.
     * @param {any} [navOptions] Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param {any} [admOptions] Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @return {Promise<CoreCoursesHandlerToDisplay[]>} Promise resolved with array of handlers.
     */
    getHandlersToDisplay(course: any, refresh?: boolean, isGuest?: boolean, navOptions?: any, admOptions?: any) :
            Promise<CoreCoursesHandlerToDisplay[]> {
        course.id = parseInt(course.id, 10);

        let accessData = {
            type: isGuest ? CoreCoursesProvider.ACCESS_GUEST : CoreCoursesProvider.ACCESS_DEFAULT
        };

        if (navOptions) {
            course.navOptions = navOptions;
        }
        if (admOptions) {
            course.admOptions = admOptions;
        }

        return this.loadCourseOptions(course, refresh).then(() => {
            // Call getHandlersForAccess to make sure the handlers have been loaded.
            return this.getHandlersForAccess(course.id, refresh, accessData, course.navOptions, course.admOptions);
        }).then(() => {
            let handlersToDisplay: CoreCoursesHandlerToDisplay[] = [],
                promises = [],
                promise;

            this.coursesHandlers[course.id].enabledHandlers.forEach((handler) => {
                if (handler.shouldDisplayForCourse) {
                    promise = Promise.resolve(handler.shouldDisplayForCourse(
                            course.id, accessData, course.navOptions, course.admOptions));
                } else {
                    // Not implemented, assume it should be displayed.
                    promise = Promise.resolve(true);
                }

                promises.push(promise.then((enabled) => {
                    if (enabled) {
                        handlersToDisplay.push({
                            data: handler.getDisplayData(course),
                            priority: handler.priority,
                            prefetch: handler.prefetch
                        });
                    }
                }));
            });

            return this.utils.allPromises(promises).then(() => {
                // Sort them by priority.
                handlersToDisplay.sort((a, b) => {
                    return b.priority - a.priority;
                });

                return handlersToDisplay;
            });
        });
    }

    /**
     * Check if a course has any handler enabled for default access, using course object.
     *
     * @param {any} course The course object.
     * @param {boolean} [refresh] True if it should refresh the list.
     * @return {Promise<boolean>} Promise resolved with boolean: true if it has handlers, false otherwise.
     */
    hasHandlersForCourse(course: any, refresh?: boolean) : Promise<boolean> {
        // Load course options if missing.
        return this.loadCourseOptions(course, refresh).then(() => {
            return this.hasHandlersForDefault(course.id, refresh, course.navOptions, course.admOptions);
        });
    }

    /**
     * Check if a course has any handler enabled for default access.
     *
     * @param {number} courseId The course ID.
     * @param {boolean} [refresh] True if it should refresh the list.
     * @param {any} [navOptions] Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param {any} [admOptions] Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @return {Promise<boolean>} Promise resolved with boolean: true if it has handlers, false otherwise.
     */
    hasHandlersForDefault(courseId: number, refresh?: boolean, navOptions?: any, admOptions?: any) : Promise<boolean> {
        // Default access.
        let accessData = {
            type: CoreCoursesProvider.ACCESS_DEFAULT
        };
        return this.getHandlersForAccess(courseId, refresh, accessData, navOptions, admOptions).then((handlers) => {
            return !!(handlers && handlers.length);
        });
    }

    /**
     * Check if a course has any handler enabled for guest access.
     *
     * @param {number} courseId The course ID.
     * @param {boolean} [refresh] True if it should refresh the list.
     * @param {any} [navOptions] Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param {any} [admOptions] Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @return {Promise<boolean>} Promise resolved with boolean: true if it has handlers, false otherwise.
     */
    hasHandlersForGuest(courseId: number, refresh?: boolean, navOptions?: any, admOptions?: any) : Promise<boolean> {
        // Guest access.
        var accessData = {
            type: CoreCoursesProvider.ACCESS_GUEST
        };
        return this.getHandlersForAccess(courseId, refresh, accessData, navOptions, admOptions).then((handlers) => {
            return !!(handlers && handlers.length);
        });
    }

    /**
     * Invalidate the data to be able to determine if handlers are enabled for a certain course.
     *
     * @param {number} courseId Course ID.
     * @return {Promise<any>} Promise resolved when done.
     */
    invalidateCourseHandlers(courseId: number) : Promise<any> {
        let promises = [],
            courseData = this.coursesHandlers[courseId];

        if (!courseData) {
            return Promise.resolve();
        }

        courseData.enabledHandlers.forEach((handler) => {
            if (handler && handler.invalidateEnabledForCourse) {
                promises.push(Promise.resolve(
                        handler.invalidateEnabledForCourse(courseId, courseData.navOptions, courseData.admOptions)));
            }
        });

        return this.utils.allPromises(promises);
    }

    /**
     * Check if a time belongs to the last update handlers call.
     * This is to handle the cases where updateHandlers don't finish in the same order as they're called.
     *
     * @param {number} time Time to check.
     * @return {boolean} Whether it's the last call.
     */
    isLastUpdateCall(time: number) : boolean {
        if (!this.lastUpdateHandlersStart) {
            return true;
        }
        return time == this.lastUpdateHandlersStart;
    }

    /**
     * Check if a time belongs to the last update handlers for course call.
     * This is to handle the cases where updateHandlersForCourse don't finish in the same order as they're called.
     *
     * @param {number} courseId Course ID.
     * @param {number} time Time to check.
     * @return {boolean} Whether it's the last call.
     */
    isLastUpdateCourseCall(courseId: number, time: number) : boolean {
        if (!this.lastUpdateHandlersForCoursesStart[courseId]) {
            return true;
        }
        return time == this.lastUpdateHandlersForCoursesStart[courseId];
    }

    /**
     * Load course options if missing.
     *
     * @param {any} course The course object.
     * @param {boolean} [refresh] True if it should refresh the list.
     * @return {Promise<void>} Promise resolved when done.
     */
    protected loadCourseOptions(course: any, refresh?: boolean) : Promise<void> {
        if (typeof course.navOptions == 'undefined' || typeof course.admOptions == 'undefined' || refresh) {
            return this.coursesProvider.getCoursesOptions([course.id]).then((options) => {
                course.navOptions = options.navOptions[course.id];
                course.admOptions = options.admOptions[course.id];
            });
        } else {
            return Promise.resolve();
        }
    }

    /**
     * Register a handler.
     *
     * @param {CoreCoursesHandler} handler The handler to register.
     * @return {boolean} True if registered successfully, false otherwise.
     */
    registerHandler(handler: CoreCoursesHandler) : boolean {
        if (typeof this.handlers[handler.name] !== 'undefined') {
            this.logger.log(`Addon '${handler.name}' already registered`);
            return false;
        }
        this.logger.log(`Registered addon '${handler.name}'`);
        this.handlers[handler.name] = handler;
        return true;
    }

    /**
     * Update the handler for the current site.
     *
     * @param {CoreInitHandler} handler The handler to check.
     * @param {number} time Time this update process started.
     * @return {Promise<void>} Resolved when done.
     */
    protected updateHandler(handler: CoreCoursesHandler, time: number) : Promise<void> {
        let promise,
            siteId = this.sitesProvider.getCurrentSiteId(),
            currentSite = this.sitesProvider.getCurrentSite();

        if (!this.sitesProvider.isLoggedIn()) {
            promise = Promise.reject(null);
        } else if (currentSite.isFeatureDisabled('$mmCoursesDelegate_' + handler.name)) {
            promise = Promise.resolve(false);
        } else {
            promise = Promise.resolve(handler.isEnabled());
        }

        // Checks if the handler is enabled.
        return promise.catch(() => {
            return false;
        }).then((enabled: boolean) => {
            // Verify that this call is the last one that was started.
            // Check that site hasn't changed since the check started.
            if (this.isLastUpdateCall(time) && this.sitesProvider.getCurrentSiteId() === siteId) {
                if (enabled) {
                    this.enabledHandlers[handler.name] = handler;
                } else {
                    delete this.enabledHandlers[handler.name];
                }
            }
        });
    }

    /**
     * Update the handlers for the current site.
     *
     * @return {Promise<void>} Resolved when done.
     */
    protected updateHandlers() : Promise<void> {
        let promises = [],
            siteId = this.sitesProvider.getCurrentSiteId(),
            now = Date.now();

        this.logger.debug('Updating handlers for current site.');

        this.lastUpdateHandlersStart = now;

        // Loop over all the handlers.
        for (let name in this.handlers) {
            promises.push(this.updateHandler(this.handlers[name], now));
        }

        return Promise.all(promises).then(() => {
            return true;
        }, () => {
            // Never reject.
            return true;
        }).then(() => {
            // Verify that this call is the last one that was started.
            if (this.isLastUpdateCall(now) && this.sitesProvider.getCurrentSiteId() === siteId) {
                // Update handlers for all courses.
                for (let courseId in this.coursesHandlers) {
                    let handler = this.coursesHandlers[courseId];
                    this.updateHandlersForCourse(parseInt(courseId, 10), handler.access, handler.navOptions, handler.admOptions);
                }
            }
        });
    }

    /**
     * Update the handlers for a certain course.
     *
     * @param {number} courseId The course ID.
     * @param {any} accessData Access type and data. Default, guest, ...
     * @param {any} [navOptions] Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param {any} [admOptions] Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @return {Promise}             Resolved when updated.
     * @protected
     */
    updateHandlersForCourse(courseId: number, accessData: any, navOptions?: any, admOptions?: any) : Promise<any> {
        let promises = [],
            enabledForCourse = [],
            siteId = this.sitesProvider.getCurrentSiteId(),
            now = Date.now();

        this.lastUpdateHandlersForCoursesStart[courseId] = now;

        for (let name in this.enabledHandlers) {
            let handler = this.enabledHandlers[name];

            // Checks if the handler is enabled for the user.
            promises.push(Promise.resolve(handler.isEnabledForCourse(courseId, accessData, navOptions, admOptions))
                    .then(function(enabled) {
                if (enabled) {
                    enabledForCourse.push(handler);
                } else {
                    return Promise.reject(null);
                }
            }).catch(() => {
                // Nothing to do here, it is not enabled for this user.
            }));
        }

        return Promise.all(promises).then(() => {
            return true;
        }).catch(() => {
            // Never fails.
            return true;
        }).finally(() => {
            // Verify that this call is the last one that was started.
            // Check that site hasn't changed since the check started.
            if (this.isLastUpdateCourseCall(courseId, now) && this.sitesProvider.getCurrentSiteId() === siteId) {
                // Update the coursesHandlers array with the new enabled addons.
                this.coursesHandlers[courseId].enabledHandlers = enabledForCourse;
                this.loaded[courseId] = true;

                // Resolve the promise.
                this.coursesHandlers[courseId].deferred.resolve();
            }
        });
    };
}
