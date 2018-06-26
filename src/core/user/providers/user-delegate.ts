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
import { NavController } from 'ionic-angular';
import { CoreDelegate, CoreDelegateHandler } from '@classes/delegate';
import { CoreCoursesProvider } from '@core/courses/providers/courses';
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
     * @type {number}
     */
    priority: number;

    /**
     * A type should be specified among these:
     * - TYPE_COMMUNICATION: will be displayed under the user avatar. Should have icon. Spinner not used.
     * - TYPE_NEW_PAGE: will be displayed as a list of items. Should have icon. Spinner not used.
     *     Default value if none is specified.
     * - TYPE_ACTION: will be displayed as a button and should not redirect to any state. Spinner use is recommended.
     * @type {string}
     */
    type: string;

    /**
     * Whether or not the handler is enabled for a user.
     * @param  {any}     user       User object.
     * @param  {number}  courseId   Course ID where to show.
     * @param  {any}     [navOptions] Navigation options for the course.
     * @param  {any}     [admOptions] Admin options for the course.
     * @return {boolean|Promise<boolean>}            Whether or not the handler is enabled for a user.
     */
    isEnabledForUser(user: any, courseId: number, navOptions?: any, admOptions?: any): boolean | Promise<boolean>;

    /**
     * Returns the data needed to render the handler.
     * @param  {any}     user       User object.
     * @param  {number}  courseId   Course ID where to show.
     * @return {CoreUserProfileHandlerData}    Data to be shown.
     */
    getDisplayData(user: any, courseId: number): CoreUserProfileHandlerData;
}

/**
 * Data needed to render a user profile handler. It's returned by the handler.
 */
export interface CoreUserProfileHandlerData {
    /**
     * Title to display.
     * @type {string}
     */
    title: string;

    /**
     * Name of the icon to display. Mandatory for TYPE_COMMUNICATION.
     * @type {string}
     */
    icon?: string;

    /**
     * Additional class to add to the HTML.
     * @type {string}
     */
    class?: string;

    /**
     * If enabled, element will be hidden. Only for TYPE_NEW_PAGE and TYPE_ACTION.
     * @type {boolean}
     */
    hidden?: boolean;

    /**
     * If enabled will show an spinner. Only for TYPE_ACTION.
     * @type {boolean}
     */
    spinner?: boolean;

    /**
     * Action to do when clicked.
     *
     * @param {Event} event Click event.
     * @param {NavController} Nav controller to use to navigate.
     * @param {any} user User object.
     * @param {number} [courseId] Course ID being viewed. If not defined, site context.
     */
    action?(event: Event, navCtrl: NavController, user: any, courseId?: number): void;
}

/**
 * Data returned by the delegate for each handler.
 */
export interface CoreUserProfileHandlerToDisplay {
    /**
     * Name of the handler.
     * @type {string}
     */
    name?: string;

    /**
     * Data to display.
     * @type {CoreUserProfileHandlerData}
     */
    data: CoreUserProfileHandlerData;

    /**
     * The highest priority is displayed first.
     * @type {number}
     */
    priority?: number;

    /**
     * The type of the handler. See CoreUserProfileHandler.
     * @type {string}
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
     * @type {string}
     */
    static TYPE_COMMUNICATION = 'communication';
    /**
     * User profile handler type for new page.
     * @type {string}
     */
    static TYPE_NEW_PAGE = 'newpage';
    /**
     * User profile handler type for actions.
     * @type {string}
     */
    static TYPE_ACTION = 'action';

    /**
     * Update handler information event.
     * @type {string}
     */
    static UPDATE_HANDLER_EVENT = 'CoreUserDelegate_update_handler_event';

    protected observableHandlers: Subject<CoreUserProfileHandlerToDisplay[]> =
        new BehaviorSubject<CoreUserProfileHandlerToDisplay[]>([]);
    protected userHandlers: CoreUserProfileHandlerToDisplay[] = [];
    protected featurePrefix = 'CoreUserDelegate_';
    protected loaded = false;

    constructor(protected loggerProvider: CoreLoggerProvider, protected sitesProvider: CoreSitesProvider,
            private coursesProvider: CoreCoursesProvider, protected eventsProvider: CoreEventsProvider) {
        super('CoreUserDelegate', loggerProvider, sitesProvider, eventsProvider);

        eventsProvider.on(CoreUserDelegate.UPDATE_HANDLER_EVENT, (data) => {
            if (data && data.handler) {
                const handler = this.userHandlers.find((userHandler) => {
                    return userHandler.name == data.handler;
                });
                if (handler) {
                    for (const x in data.data) {
                        handler.data[x] = data.data[x];
                    }
                    this.observableHandlers.next(this.userHandlers);
                }
            }
        });
    }

    /**
     * Check if handlers are loaded.
     *
     * @return {boolean} True if handlers are loaded, false otherwise.
     */
    areHandlersLoaded(): boolean {
        return this.loaded;
    }

    /**
     * Clear current user handlers.
     */
    clearUserHandlers(): void {
        this.loaded = false;
        this.userHandlers = [];
        this.observableHandlers.next(this.userHandlers);
    }

    /**
     * Get the profile handlers for a user.
     *
     * @param {any} user The user object.
     * @param {number} courseId The course ID.
     * @return {Subject<CoreUserProfileHandlerToDisplay[]>} Resolved with the handlers.
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

        this.userHandlers = [];

        promise.then(() => {
            const promises = [];

            for (const name in this.enabledHandlers) {
                // Checks if the handler is enabled for the user.
                const handler = <CoreUserProfileHandler> this.handlers[name],
                    isEnabledForUser = handler.isEnabledForUser(user, courseId, navOptions, admOptions),
                    promise = Promise.resolve(isEnabledForUser).then((enabled) => {
                        if (enabled) {
                            this.userHandlers.push({
                                name: name,
                                data: handler.getDisplayData(user, courseId),
                                priority: handler.priority,
                                type: handler.type || CoreUserDelegate.TYPE_NEW_PAGE
                            });
                        } else {
                            return Promise.reject(null);
                        }
                    }).catch(() => {
                        // Nothing to do here, it is not enabled for this user.
                    });
                promises.push(promise);
            }

            return Promise.all(promises).then(() => {
                // Sort them by priority.
                this.userHandlers.sort((a, b) => {
                    return b.priority - a.priority;
                });
                this.loaded = true;
                this.observableHandlers.next(this.userHandlers);
            });
        }).catch(() => {
            // Never fails.
            this.loaded = true;
            this.observableHandlers.next(this.userHandlers);
        });

        return this.observableHandlers;
    }
}
