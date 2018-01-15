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
import { CoreDelegate, CoreDelegateHandler } from '../../../classes/delegate';
import { CoreCoursesProvider } from '../../../core/courses/providers/courses';
import { CoreLoggerProvider } from '../../../providers/logger';
import { CoreSitesProvider } from '../../../providers/sites';
import { CoreEventsProvider } from '../../../providers/events';

export interface CoreUserProfileHandler extends CoreDelegateHandler  {
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
    isEnabledForUser(user: any, courseId: number, navOptions?: any, admOptions?: any): boolean|Promise<boolean>;

    /**
     * Returns the data needed to render the handler.
     * @param  {any}     user       User object.
     * @param  {number}  courseId   Course ID where to show.
     * @return {CoreUserProfileHandlerData}    Data to be shown.
     */
    getDisplayData(user: any, courseId: number): CoreUserProfileHandlerData;
};

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
    class: string;

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
     * @param  {any}    $event
     * @param  {any}     user       User object.
     * @param  {number}  courseId   Course ID where to show.
     * @return {any}        Action to be done.
     */
    action?($event: any, user: any, courseId: number): any;
};

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
    public static TYPE_COMMUNICATION = 'communication';

    /**
     * User profile handler type for new page.
     * @type {string}
     */
    public static TYPE_NEW_PAGE = 'newpage';
    /**
     * User profile handler type for actions.
     * @type {string}
     */
    public static TYPE_ACTION = 'action';

    protected handlers: {[s: string]: CoreUserProfileHandler} = {};
    protected enabledHandlers: {[s: string]: CoreUserProfileHandler} = {};
    protected featurePrefix = '$mmUserDelegate_';

    constructor(protected loggerProvider: CoreLoggerProvider, protected sitesProvider: CoreSitesProvider,
        private coursesProvider: CoreCoursesProvider, protected eventsProvider: CoreEventsProvider) {
        super('CoreUserDelegate', loggerProvider, sitesProvider, eventsProvider);
    }

    /**
     * Get the profile handlers for a user.
     *
     * @param {any} user The user object.
     * @param {number} courseId The course ID.
     * @return {Promise<any>} Resolved with an array of objects containing 'priority', 'data' and 'type'.
     */
    getProfileHandlersFor(user: any, courseId): Promise<any> {
        let handlers = [],
            promises = [];

        // Retrieve course options forcing cache.
        return this.coursesProvider.getUserCourses(true).then((courses) => {
            let courseIds = courses.map((course) => {
                return course.id;
            });

            return this.coursesProvider.getCoursesOptions(courseIds).then((options) => {
                // For backwards compatibility we don't modify the courseId.
                let courseIdForOptions = courseId || this.sitesProvider.getSiteHomeId(),
                    navOptions = options.navOptions[courseIdForOptions],
                    admOptions = options.admOptions[courseIdForOptions];

                for (let name in this.enabledHandlers) {
                    // Checks if the handler is enabled for the user.
                    let handler = this.handlers[name],
                        isEnabledForUser = handler.isEnabledForUser(user, courseId, navOptions, admOptions),
                        promise = Promise.resolve(isEnabledForUser).then((enabled) => {
                            if (enabled) {
                                handlers.push({
                                    data: handler.getDisplayData(user, courseId),
                                    priority: handler.priority,
                                    type: handler.type || CoreUserDelegate.TYPE_NEW_PAGE
                                });
                            } else {
                                return Promise.reject(null);
                            }
                        }).catch(function() {
                            // Nothing to do here, it is not enabled for this user.
                        });
                        promises.push(promise);
                }

                return Promise.all(promises).then(() => {
                    return handlers;
                });
            });
        }).catch(function() {
            // Never fails.
            return handlers;
        });
    }
}
