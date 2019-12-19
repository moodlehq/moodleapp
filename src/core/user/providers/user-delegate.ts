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
import { NavController } from 'ionic-angular';
import { CoreDelegate, CoreDelegateHandler } from '@classes/delegate';
import { CoreCoursesProvider } from '@core/courses/providers/courses';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreEventsProvider } from '@providers/events';
import { Subject, BehaviorSubject } from 'rxjs';

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
     * Whether or not the handler is enabled for a user.
     * @param user User object.
     * @param courseId Course ID where to show.
     * @param navOptions Navigation options for the course.
     * @param admOptions Admin options for the course.
     * @return Whether or not the handler is enabled for a user.
     */
    isEnabledForUser(user: any, courseId: number, navOptions?: any, admOptions?: any): boolean | Promise<boolean>;

    /**
     * Returns the data needed to render the handler.
     * @param user User object.
     * @param courseId Course ID where to show.
     * @return Data to be shown.
     */
    getDisplayData(user: any, courseId: number): CoreUserProfileHandlerData;
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
     * @param Nav controller to use to navigate.
     * @param user User object.
     * @param courseId Course ID being viewed. If not defined, site context.
     */
    action?(event: Event, navCtrl: NavController, user: any, courseId?: number): void;
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
@Injectable()
export class CoreUserDelegate extends CoreDelegate {
    /**
     * User profile handler type for communication.
     */
    static TYPE_COMMUNICATION = 'communication';
    /**
     * User profile handler type for new page.
     */
    static TYPE_NEW_PAGE = 'newpage';
    /**
     * User profile handler type for actions.
     */
    static TYPE_ACTION = 'action';

    /**
     * Update handler information event.
     */
    static UPDATE_HANDLER_EVENT = 'CoreUserDelegate_update_handler_event';

    protected featurePrefix = 'CoreUserDelegate_';

    // Hold the handlers and the observable to notify them for each user.
    protected userHandlers: {
        [userId: number]: {
            loaded: boolean, // Whether the handlers are loaded.
            handlers: CoreUserProfileHandlerToDisplay[], // List of handlers.
            observable: Subject<CoreUserProfileHandlerToDisplay[]> // Observale to notify the handlers.
        }} = {};

    constructor(protected loggerProvider: CoreLoggerProvider, protected sitesProvider: CoreSitesProvider,
            private coursesProvider: CoreCoursesProvider, protected eventsProvider: CoreEventsProvider,
            protected utils: CoreUtilsProvider) {
        super('CoreUserDelegate', loggerProvider, sitesProvider, eventsProvider);

        eventsProvider.on(CoreUserDelegate.UPDATE_HANDLER_EVENT, (data) => {
            if (data && data.handler && this.userHandlers[data.userId]) {
                const userData = this.userHandlers[data.userId],
                    handler = userData.handlers.find((userHandler) => {
                        return userHandler.name == data.handler;
                    });

                if (handler) {
                    for (const x in data.data) {
                        handler.data[x] = data.data[x];
                    }
                    userData.observable.next(userData.handlers);
                }
            }
        });
    }

    /**
     * Check if handlers are loaded.
     *
     * @return True if handlers are loaded, false otherwise.
     */
    areHandlersLoaded(userId: number): boolean {
        return this.userHandlers[userId] && this.userHandlers[userId].loaded;
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
    getProfileHandlersFor(user: any, courseId: number): Subject<CoreUserProfileHandlerToDisplay[]> {
        let promise,
            navOptions,
            admOptions;

        if (this.coursesProvider.canGetAdminAndNavOptions()) {
            // Get course options.
            promise = this.coursesProvider.getUserCourses(true).then((courses) => {
                const courseIds = courses.map((course) => {
                    return course.id;
                });

                return this.coursesProvider.getCoursesAdminAndNavOptions(courseIds).then((options) => {
                    // For backwards compatibility we don't modify the courseId.
                    const courseIdForOptions = courseId || this.sitesProvider.getCurrentSiteHomeId();

                    navOptions = options.navOptions[courseIdForOptions];
                    admOptions = options.admOptions[courseIdForOptions];
                });
            });
        } else {
            promise = Promise.resolve();
        }

        // Initialize the user handlers if it isn't initialized already.
        if (!this.userHandlers[user.id]) {
            this.userHandlers[user.id] = {
                loaded: false,
                handlers: [],
                observable: new BehaviorSubject<CoreUserProfileHandlerToDisplay[]>([])
            };
        }

        const userData = this.userHandlers[user.id];
        userData.handlers = [];

        promise.then(() => {
            const promises = [];

            for (const name in this.enabledHandlers) {
                // Checks if the handler is enabled for the user.
                const handler = <CoreUserProfileHandler> this.handlers[name],
                    isEnabledForUser = handler.isEnabledForUser(user, courseId, navOptions, admOptions);

                promises.push(Promise.resolve(isEnabledForUser).then((enabled) => {
                    if (enabled) {
                        userData.handlers.push({
                            name: name,
                            data: handler.getDisplayData(user, courseId),
                            priority: handler.priority,
                            type: handler.type || CoreUserDelegate.TYPE_NEW_PAGE
                        });
                    }
                }).catch(() => {
                    // Nothing to do here, it is not enabled for this user.
                }));
            }

            return this.utils.allPromises(promises).then(() => {
                // Sort them by priority.
                userData.handlers.sort((a, b) => {
                    return b.priority - a.priority;
                });
                userData.loaded = true;
                userData.observable.next(userData.handlers);
            });
        }).catch(() => {
            // Never fails.
            userData.loaded = true;
            userData.observable.next(userData.handlers);
        });

        return userData.observable;
    }
}
