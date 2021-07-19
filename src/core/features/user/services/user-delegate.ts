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
import { Subject, BehaviorSubject } from 'rxjs';

import { CoreDelegate, CoreDelegateHandler } from '@classes/delegate';
import { CoreUtils } from '@services/utils/utils';
import { CoreEvents } from '@singletons/events';
import { CoreUserProfile, CoreUserProvider } from './user';
import { makeSingleton } from '@singletons';
import { CoreCourses, CoreCourseUserAdminOrNavOptionIndexed } from '@features/courses/services/courses';
import { CoreSites } from '@services/sites';

/**
 * Interface that all user profile handlers must implement.
 */
export interface CoreUserProfileHandler extends CoreDelegateHandler {
    /**
     * The highest priority is displayed first.
     */
    priority: number;

    /**
     * A type should be specified among these:
     * - TYPE_COMMUNICATION: will be displayed under the user avatar. Should have icon. Spinner not used.
     * - TYPE_NEW_PAGE: will be displayed as a list of items. Should have icon. Spinner not used.
     *     Default value if none is specified.
     * - TYPE_ACTION: will be displayed as a button and should not redirect to any state. Spinner use is recommended.
     */
    type: string;

    /**
     * If isEnabledForUser Cache should be enabled.
     */
    cacheEnabled?: boolean;

    /**
     * Whether or not the handler is enabled for a course.
     *
     * @param courseId Course ID where to show.
     * @param navOptions Navigation options for the course.
     * @param admOptions Admin options for the course.
     * @return Whether or not the handler is enabled for a user.
     */
    isEnabledForCourse?(
        courseId?: number,
        navOptions?: CoreCourseUserAdminOrNavOptionIndexed,
        admOptions?: CoreCourseUserAdminOrNavOptionIndexed,
    ): Promise<boolean>;

    /**
     * Whether or not the handler is enabled for a user.
     *
     * @param user User object.
     * @param courseId Course ID where to show.
     * @return Whether or not the handler is enabled for a user.
     */
    isEnabledForUser?(
        user: CoreUserProfile,
        courseId?: number,
    ): Promise<boolean>;

    /**
     * Returns the data needed to render the handler.
     *
     * @param user User object.
     * @param courseId Course ID where to show.
     * @return Data to be shown.
     */
    getDisplayData(user: CoreUserProfile, courseId?: number): CoreUserProfileHandlerData;
}

/**
 * Data needed to render a user profile handler. It's returned by the handler.
 */
export interface CoreUserProfileHandlerData {
    /**
     * Title to display.
     */
    title: string;

    /**
     * Name of the icon to display. Mandatory for TYPE_COMMUNICATION.
     */
    icon?: string;

    /**
     * Additional class to add to the HTML.
     */
    class?: string;

    /**
     * If enabled, element will be hidden. Only for TYPE_NEW_PAGE and TYPE_ACTION.
     */
    hidden?: boolean;

    /**
     * If enabled will show an spinner. Only for TYPE_ACTION.
     */
    spinner?: boolean;

    /**
     * Action to do when clicked.
     *
     * @param event Click event.
     * @param user User object.
     * @param courseId Course ID being viewed. If not defined, site context.
     */
    action(event: Event, user: CoreUserProfile, courseId?: number): void;
}

/**
 * Data returned by the delegate for each handler.
 */
export interface CoreUserProfileHandlerToDisplay {
    /**
     * Name of the handler.
     */
    name?: string;

    /**
     * Data to display.
     */
    data: CoreUserProfileHandlerData;

    /**
     * The highest priority is displayed first.
     */
    priority?: number;

    /**
     * The type of the handler. See CoreUserProfileHandler.
     */
    type: string;
}

/**
 * Service to interact with plugins to be shown in user profile. Provides functions to register a plugin
 * and notify an update in the data.
 */
@Injectable({ providedIn: 'root' })
export class CoreUserDelegateService extends CoreDelegate<CoreUserProfileHandler> {

    /**
     * User profile handler type for communication.
     */
    static readonly TYPE_COMMUNICATION = 'communication';
    /**
     * User profile handler type for new page.
     */
    static readonly TYPE_NEW_PAGE = 'newpage';
    /**
     * User profile handler type for actions.
     */
    static readonly TYPE_ACTION = 'action';

    /**
     * Update handler information event.
     */
    static readonly UPDATE_HANDLER_EVENT = 'CoreUserDelegate_update_handler_event';

    /**
     * Cache object that checks enabled for use.
     */
    protected enabledForUserCache: Record<string, Record<string, boolean>> = {};

    protected featurePrefix = 'CoreUserDelegate_';

    // Hold the handlers and the observable to notify them for each user.
    protected userHandlers: {
        [userId: number]: {
            loaded: boolean; // Whether the handlers are loaded.
            handlers: CoreUserProfileHandlerToDisplay[]; // List of handlers.
            observable: Subject<CoreUserProfileHandlerToDisplay[]>; // Observale to notify the handlers.
        };
    } = {};

    constructor() {
        super('CoreUserDelegate', true);

        CoreEvents.on(CoreUserDelegateService.UPDATE_HANDLER_EVENT, (data) => {
            if (!data || !data.handler || !this.userHandlers[data.userId]) {
                return;
            }

            // Search the handler.
            const handler = this.userHandlers[data.userId].handlers.find((userHandler) => userHandler.name == data.handler);

            if (!handler) {
                return;
            }

            // Update the data and notify.
            Object.assign(handler.data, data.data);
            this.userHandlers[data.userId].observable.next(this.userHandlers[data.userId].handlers);
        });

        CoreEvents.on(CoreEvents.LOGOUT, () => {
            this.clearHandlerCache();
        });

        CoreEvents.on(CoreUserProvider.PROFILE_REFRESHED, (data) => {
            this.clearHandlerCache(data.courseId, data.userId);
        });
    }

    /**
     * Check if handlers are loaded.
     *
     * @return True if handlers are loaded, false otherwise.
     */
    areHandlersLoaded(userId: number): boolean {
        return this.userHandlers[userId]?.loaded;
    }

    /**
     * Clear current user handlers.
     *
     * @param userId The user to clear.
     */
    clearUserHandlers(userId: number): void {
        const userData = this.userHandlers[userId];

        if (userData) {
            userData.handlers = [];
            userData.observable.next([]);
            userData.loaded = false;
        }
    }

    /**
     * Get the profile handlers for a user.
     *
     * @param user The user object.
     * @param courseId The course ID.
     * @return Resolved with the handlers.
     */
    getProfileHandlersFor(user: CoreUserProfile, courseId?: number): Subject<CoreUserProfileHandlerToDisplay[]> {
        // Initialize the user handlers if it isn't initialized already.
        if (!this.userHandlers[user.id]) {
            this.userHandlers[user.id] = {
                loaded: false,
                handlers: [],
                observable: new BehaviorSubject<CoreUserProfileHandlerToDisplay[]>([]),
            };
        }

        this.calculateUserHandlers(user, courseId);

        return this.userHandlers[user.id].observable;
    }

    /**
     * Get the profile handlers for a user.
     *
     * @param user The user object.
     * @param courseId The course ID.
     * @return Promise resolved when done.
     */
    protected async calculateUserHandlers(user: CoreUserProfile, courseId?: number): Promise<void> {
        let navOptions: CoreCourseUserAdminOrNavOptionIndexed | undefined;
        let admOptions: CoreCourseUserAdminOrNavOptionIndexed | undefined;

        if (CoreCourses.canGetAdminAndNavOptions()) {
            // Get course options.
            const courses = await CoreCourses.getUserCourses(true);
            const courseIds = courses.map((course) => course.id);

            const options = await CoreCourses.getCoursesAdminAndNavOptions(courseIds);

            // For backwards compatibility we don't modify the courseId.
            const courseIdForOptions = courseId || CoreSites.getCurrentSiteHomeId();

            navOptions = options.navOptions[courseIdForOptions];
            admOptions = options.admOptions[courseIdForOptions];
        }

        const userData = this.userHandlers[user.id];
        userData.handlers = [];

        await CoreUtils.allPromises(Object.keys(this.enabledHandlers).map(async (name) => {
            // Checks if the handler is enabled for the user.
            const handler = this.handlers[name];

            try {
                const enabled = await this.getAndCacheEnabledForUserFromHandler(handler, user, courseId, navOptions, admOptions);

                if (enabled) {
                    userData.handlers.push({
                        name: name,
                        data: handler.getDisplayData(user, courseId),
                        priority: handler.priority || 0,
                        type: handler.type || CoreUserDelegateService.TYPE_NEW_PAGE,
                    });
                }
            } catch {
                // Nothing to do here, it is not enabled for this user.
            }
        }));

        // Sort them by priority.
        userData.handlers.sort((a, b) => b.priority! - a.priority!);
        userData.loaded = true;
        userData.observable.next(userData.handlers);
    }

    /**
     * Helper funtion to get enabled for user from the handler.
     *
     * @param handler Handler object.
     * @param user User object.
     * @param courseId Course ID where to show.
     * @param navOptions Navigation options for the course.
     * @param admOptions Admin options for the course.
     * @return Whether or not the handler is enabled for a user.
     */
    protected async getAndCacheEnabledForUserFromHandler(
        handler: CoreUserProfileHandler,
        user: CoreUserProfile,
        courseId?: number,
        navOptions?: CoreCourseUserAdminOrNavOptionIndexed,
        admOptions?: CoreCourseUserAdminOrNavOptionIndexed,
    ): Promise<boolean> {
        if (handler.isEnabledForCourse) {
            const enabledOnCourse = await handler.isEnabledForCourse(courseId, navOptions, admOptions);

            if (!enabledOnCourse) {
                // If is not enabled in the course, is not enabled for the user.
                // Do not cache if this is false.
                return false;
            }
        }

        if (!handler.cacheEnabled) {
            if (!handler.isEnabledForUser) {
                // True by default.
                return true;
            }

            return handler.isEnabledForUser(user, courseId);
        }

        if (typeof this.enabledForUserCache[handler.name] == 'undefined') {
            this.enabledForUserCache[handler.name] = {};
        }

        const cacheKey = this.getCacheKey(courseId, user.id);
        const cache = this.enabledForUserCache[handler.name][cacheKey];

        if (typeof cache != 'undefined') {
            return cache;
        }

        let enabled = true; // Default value.
        if (handler.isEnabledForUser) {
            enabled = await handler.isEnabledForUser(user, courseId);
        }

        this.enabledForUserCache[handler.name][cacheKey] = enabled;

        return enabled;
    }

    /**
     * Clear handler enabled for user cache.
     * If a courseId and userId are specified, it will only delete the entry for that user and course.
     *
     * @param courseId Course ID.
     * @param userId User ID.
     */
    protected clearHandlerCache(courseId?: number, userId?: number): void {
        if (courseId && userId) {
            Object.keys(this.enabledHandlers).forEach((name) => {
                delete this.enabledForUserCache[name][this.getCacheKey(courseId, userId)];
            });
        } else {
            this.enabledForUserCache = {};
        }
    }

    /**
     * Get a cache key to identify a course and a user.
     *
     * @param courseId Course ID.
     * @param userId User ID.
     * @return Cache key.
     */
    protected getCacheKey(courseId = 0, userId = 0): string {
        return courseId + '#' + userId;
    }

}

export const CoreUserDelegate = makeSingleton(CoreUserDelegateService);

/**
 * Data passed to UPDATE_HANDLER_EVENT event.
 */
export type CoreUserUpdateHandlerData = {
    handler: string; // Name of the handler.
    userId: number; // User affected.
    data: Record<string, unknown>; // Data to set to the handler.
};
