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
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreEvents } from '@singletons/events';
import { CoreUserProfile } from './user';
import { makeSingleton } from '@singletons';
import { CoreCourses, CoreCourseUserAdminOrNavOptionIndexed } from '@features/courses/services/courses';
import { CoreSites } from '@services/sites';
import { CORE_USER_PROFILE_REFRESHED } from '../constants';

export enum CoreUserProfileHandlerType {
    LIST_ITEM = 'listitem', // User profile handler type to be shown as a list item.
    LIST_ACCOUNT_ITEM = 'account_listitem', // User profile handler type to be shown as a list item and it's related to an account.
    BUTTON = 'button', // User profile handler type to be shown as a button.
}

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [USER_DELEGATE_UPDATE_HANDLER_EVENT]: CoreUserUpdateHandlerData;
    }

}

/**
 * Interface that all user profile handlers must implement.
 */
export interface CoreUserProfileHandler extends CoreDelegateHandler {
    /**
     * The highest priority is displayed first.
     */
    priority: number;

    /**
     * The type of Handler.
     *
     * @see CoreUserProfileHandlerType for more info.
     */
    type: CoreUserProfileHandlerType;

    /**
     * If isEnabledForUser Cache should be enabled.
     */
    cacheEnabled?: boolean;

    /**
     * Whether or not the handler is enabled for a context.
     *
     * @param context Context.
     * @param contextId Context ID.
     * @param navOptions Navigation options for the course.
     * @param admOptions Admin options for the course.
     * @returns Whether or not the handler is enabled for a user.
     */
    isEnabledForContext?(
        context: CoreUserDelegateContext,
        contextId: number,
        navOptions?: CoreCourseUserAdminOrNavOptionIndexed,
        admOptions?: CoreCourseUserAdminOrNavOptionIndexed,
    ): Promise<boolean>;

    /**
     * Whether or not the handler is enabled for a user.
     *
     * @param user User object.
     * @param context Context.
     * @param contextId Context ID.
     * @returns Whether or not the handler is enabled for a user.
     */
    isEnabledForUser?(user: CoreUserProfile, context: CoreUserDelegateContext, contextId: number): Promise<boolean>;

    /**
     * Returns the data needed to render the handler.
     *
     * @param user User object.
     * @param context Context.
     * @param contextId Context ID.
     * @returns Data to be shown.
     */
    getDisplayData(user: CoreUserProfile, context: CoreUserDelegateContext, contextId: number): CoreUserProfileHandlerData;
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
     * Name of the icon to display. Mandatory for CoreUserProfileHandlerType.BUTTON.
     */
    icon?: string;

    /**
     * Additional class to add to the HTML.
     */
    class?: string;

    /**
     * If enabled, element will be hidden. Only for CoreUserProfileHandlerType.LIST_ITEM.
     */
    hidden?: boolean;

    /**
     * If enabled will show an spinner.
     *
     * @deprecated since 4.4. Not used anymore.
     */
    spinner?: boolean;

    /**
     * If the handler has badge to show or not. Only for CoreUserProfileHandlerType.LIST_ITEM.
     */
    showBadge?: boolean;

    /**
     * Text to display on the badge. Only used if showBadge is true and only for CoreUserProfileHandlerType.LIST_ITEM.
     */
    badge?: string;

    /**
     * Accessibility text to add on the badge. Only used if showBadge is true and only for CoreUserProfileHandlerType.LIST_ITEM.
     */
    badgeA11yText?: string;

    /**
     * If true, the badge number is being loaded. Only used if showBadge is true and only for CoreUserProfileHandlerType.LIST_ITEM.
     */
    loading?: boolean;

    /**
     * Action to do when clicked.
     *
     * @param event Click event.
     * @param user User object.
     * @param context Context.
     * @param contextId Context ID.
     */
    action(event: Event, user: CoreUserProfile, context: CoreUserDelegateContext, contextId?: number): void;
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
 * Delegate update handler event.
 */
export const USER_DELEGATE_UPDATE_HANDLER_EVENT = 'CoreUserDelegate_update_handler_event';

/**
 * Service to interact with plugins to be shown in user profile. Provides functions to register a plugin
 * and notify an update in the data.
 */
@Injectable({ providedIn: 'root' })
export class CoreUserDelegateService extends CoreDelegate<CoreUserProfileHandler> {

    /**
     * User profile handler type for communication.
     *
     * @deprecated since 4.4. Use CoreUserProfileHandlerType.BUTTON instead.
     */
    static readonly TYPE_COMMUNICATION = 'communication';
    /**
     * User profile handler type for new page.
     *
     * @deprecated since 4.4. Use CoreUserProfileHandlerType.LIST_ITEM instead.
     */
    static readonly TYPE_NEW_PAGE = 'newpage';
    /**
     * User profile handler type for actions.
     *
     * @deprecated since 4.4. Use CoreUserProfileHandlerType.BUTTON instead.
     */
    static readonly TYPE_ACTION = 'action';

    /**
     * Cache object that checks enabled for use.
     */
    protected enabledForUserCache: Record<string, Record<string, boolean>> = {};

    protected featurePrefix = 'CoreUserDelegate_';

    // Hold the handlers and the observable to notify them for each user.
    protected userHandlers: Record<number, Record<string, CoreUserDelegateHandlersData>> = {};

    constructor() {
        super('CoreUserDelegate');

        CoreEvents.on(USER_DELEGATE_UPDATE_HANDLER_EVENT, (data) => {
            const handlersData = this.getHandlersData(data.userId, data.context, data.contextId);

            // Search the handler.
            const handler = handlersData.handlers.find((userHandler) => userHandler.name == data.handler);

            if (!handler) {
                return;
            }

            // Update the data and notify.
            Object.assign(handler.data, data.data);
            handlersData.observable.next(handlersData.handlers);
        });

        CoreEvents.on(CoreEvents.LOGOUT, () => {
            this.clearHandlerCache();
        });

        CoreEvents.on(CORE_USER_PROFILE_REFRESHED, (data) => {
            const context = data.courseId ? CoreUserDelegateContext.COURSE : CoreUserDelegateContext.SITE;
            this.clearHandlerCache(data.userId, context, data.courseId);
        });
    }

    /**
     * Check if handlers are loaded for a certain user and context.
     *
     * @param userId User ID.
     * @param context Context.
     * @param contextId Context ID.
     * @returns True if handlers are loaded, false otherwise.
     */
    areHandlersLoaded(userId: number, context: CoreUserDelegateContext, contextId?: number): boolean {
        return this.getHandlersData(userId, context, contextId).loaded;
    }

    /**
     * Clear current user handlers.
     *
     * @param userId The user to clear. Undefined for all users.
     * @param context Context.
     * @param contextId Context ID.
     */
    clearUserHandlers(userId?: number, context?: CoreUserDelegateContext, contextId?: number): void {
        if (!userId) {
            this.userHandlers = {};
        } else if (!context) {
            delete this.userHandlers[userId];
        } else {
            const handlersData = this.getHandlersData(userId, context, contextId);

            handlersData.handlers = [];
            handlersData.observable.next([]);
            handlersData.loaded = false;
        }
    }

    /**
     * Get the profile handlers for a user.
     *
     * @param user The user object.
     * @param context Context.
     * @param contextId Context ID.
     * @returns Resolved with the handlers.
     */
    getProfileHandlersFor(
        user: CoreUserProfile,
        context: CoreUserDelegateContext,
        contextId?: number,
    ): Subject<CoreUserProfileHandlerToDisplay[]> {
        this.calculateUserHandlers(user, context, contextId);

        return this.getHandlersData(user.id, context, contextId).observable;
    }

    /**
     * Get the profile handlers for a user.
     *
     * @param user The user object.
     * @param context Context.
     * @param contextId Context ID.
     * @returns Promise resolved when done.
     */
    protected async calculateUserHandlers(
        user: CoreUserProfile,
        context: CoreUserDelegateContext,
        contextId?: number,
    ): Promise<void> {
        // Get course options.
        const courses = await CoreCourses.getUserCourses(true);
        const courseIds = courses.map((course) => course.id);

        const options = await CoreCourses.getCoursesAdminAndNavOptions(courseIds);

        const courseId = context === CoreUserDelegateContext.COURSE && contextId ? contextId : CoreSites.getCurrentSiteHomeId();

        const navOptions = options.navOptions[courseId];
        const admOptions = options.admOptions[courseId];

        const handlersData = this.getHandlersData(user.id, context, contextId);
        handlersData.handlers = [];

        await CorePromiseUtils.allPromises(Object.keys(this.enabledHandlers).map(async (name) => {
            // Checks if the handler is enabled for the user.
            const handler = this.handlers[name];

            try {
                const enabled = await this.getAndCacheEnabledForUserFromHandler(
                    handler,
                    user,
                    context,
                    courseId,
                    navOptions,
                    admOptions,
                );

                if (enabled) {
                    handlersData.handlers.push({
                        name: name,
                        data: handler.getDisplayData(user, context, courseId),
                        priority: handler.priority || 0,
                        type: handler.type || CoreUserProfileHandlerType.LIST_ITEM,
                    });
                }
            } catch {
                // Nothing to do here, it is not enabled for this user.
            }
        }));

        // Sort them by priority.
        handlersData.handlers.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
        handlersData.loaded = true;
        handlersData.observable.next(handlersData.handlers);
    }

    /**
     * Helper funtion to get enabled for user from the handler.
     *
     * @param handler Handler object.
     * @param user User object.
     * @param context Context.
     * @param contextId Context ID.
     * @param navOptions Navigation options for the course.
     * @param admOptions Admin options for the course.
     * @returns Whether or not the handler is enabled for a user.
     */
    protected async getAndCacheEnabledForUserFromHandler(
        handler: CoreUserProfileHandler,
        user: CoreUserProfile,
        context: CoreUserDelegateContext,
        contextId: number,
        navOptions: CoreCourseUserAdminOrNavOptionIndexed = {},
        admOptions: CoreCourseUserAdminOrNavOptionIndexed = {},
    ): Promise<boolean> {
        if (handler.isEnabledForContext) {
            const enabledOnCourse = await handler.isEnabledForContext(context, contextId, navOptions, admOptions);

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

            return handler.isEnabledForUser(user, context, contextId);
        }

        if (this.enabledForUserCache[handler.name] === undefined) {
            this.enabledForUserCache[handler.name] = {};
        }

        const cacheKey = this.getCacheKey(user.id, context, contextId);
        const cache = this.enabledForUserCache[handler.name][cacheKey];

        if (cache !== undefined) {
            return cache;
        }

        let enabled = true; // Default value.
        if (handler.isEnabledForUser) {
            enabled = await handler.isEnabledForUser(user, context, contextId);
        }

        this.enabledForUserCache[handler.name][cacheKey] = enabled;

        return enabled;
    }

    /**
     * Clear handler enabled for user cache.
     * If a userId and context are specified, it will only delete the entry for that user and context.
     *
     * @param userId User ID.
     * @param context Context.
     * @param contextId Context ID.
     */
    protected clearHandlerCache(userId?: number, context?: CoreUserDelegateContext, contextId?: number): void {
        if (userId && context) {
            const cacheKey = this.getCacheKey(userId, context, contextId);

            Object.keys(this.enabledHandlers).forEach((name) => {
                const cache = this.enabledForUserCache[name];

                if (cache) {
                    delete cache[cacheKey];
                }
            });
        } else {
            this.enabledForUserCache = {};
        }
    }

    /**
     * Get a cache key to identify a user and context.
     *
     * @param userId User ID.
     * @param context Context.
     * @param contextId Context ID.
     * @returns Cache key.
     */
    protected getCacheKey(userId: number, context: CoreUserDelegateContext, contextId?: number): string {
        return `${userId}#${this.getContextKey(context, contextId)}`;
    }

    /**
     * Get a string to identify a context.
     *
     * @param context Context.
     * @param contextId Context ID.
     * @returns String to identify the context.
     */
    protected getContextKey(context: CoreUserDelegateContext, contextId?: number): string {
        return `${context}#${contextId ?? 0}`;
    }

    /**
     * Get handlers data for a user and context.
     *
     * @param userId User ID.
     * @param context Context.
     * @param contextId Context ID.
     * @returns Handlers data.
     */
    protected getHandlersData(userId: number, context: CoreUserDelegateContext, contextId?: number): CoreUserDelegateHandlersData {
        // Initialize the data if it doesn't exist.
        const contextKey = this.getContextKey(context, contextId);
        this.userHandlers[userId] = this.userHandlers[userId] || {};

        if (!this.userHandlers[userId][contextKey]) {
            this.userHandlers[userId][contextKey] = {
                loaded: false,
                handlers: [],
                observable: new BehaviorSubject<CoreUserProfileHandlerToDisplay[]>([]),
            };
        }

        return this.userHandlers[userId][contextKey];
    }

    /**
     * @inheritdoc
     */
    registerHandler(handler: CoreUserProfileHandler): boolean {
        const type = handler.type as string;

        // eslint-disable-next-line @typescript-eslint/no-deprecated
        if (type === CoreUserDelegateService.TYPE_COMMUNICATION || type === CoreUserDelegateService.TYPE_ACTION) {
            handler.type = CoreUserProfileHandlerType.BUTTON;
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        } else if (type === CoreUserDelegateService.TYPE_NEW_PAGE) {
            handler.type = CoreUserProfileHandlerType.LIST_ITEM;

        }

        return super.registerHandler(handler);
    }

}

export const CoreUserDelegate = makeSingleton(CoreUserDelegateService);

/**
 * Handlers data for a user and context.
 */
type CoreUserDelegateHandlersData = {
    loaded: boolean; // Whether the handlers are loaded.
    handlers: CoreUserProfileHandlerToDisplay[]; // List of handlers.
    observable: Subject<CoreUserProfileHandlerToDisplay[]>; // Observable to notify the handlers.
};

/**
 * Context levels enumeration.
 */
export enum CoreUserDelegateContext {
    SITE = 'site',
    COURSE = 'course',
    USER_MENU = 'user_menu',
}

/**
 * Data passed to UPDATE_HANDLER_EVENT event.
 */
export type CoreUserUpdateHandlerData = {
    handler: string; // Name of the handler.
    userId: number; // User affected.
    context: CoreUserDelegateContext; // Context affected.
    contextId?: number; // ID related to the context.
    data: Record<string, unknown>; // Data to set to the handler.
};
