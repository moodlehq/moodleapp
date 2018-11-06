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

import { NavController } from 'ionic-angular';
import { CoreUserDelegate, CoreUserProfileHandler, CoreUserProfileHandlerData } from '@core/user/providers/user-delegate';
import { CoreSitePluginsProvider } from '../../providers/siteplugins';
import { CoreSitePluginsBaseHandler } from './base-handler';

/**
 * Handler to display a site plugin in the user profile.
 */
export class CoreSitePluginsUserProfileHandler extends CoreSitePluginsBaseHandler implements CoreUserProfileHandler {
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

    constructor(name: string, protected title: string, protected plugin: any, protected handlerSchema: any,
            protected initResult: any, protected sitePluginsProvider: CoreSitePluginsProvider) {
        super(name);

        this.priority = handlerSchema.priority;

        // Only support TYPE_COMMUNICATION and TYPE_NEW_PAGE.
        this.type = handlerSchema.type != CoreUserDelegate.TYPE_COMMUNICATION ?
            CoreUserDelegate.TYPE_NEW_PAGE : CoreUserDelegate.TYPE_COMMUNICATION;
    }

    /**
     * Whether or not the handler is enabled for a user.
     * @param  {any}     user       User object.
     * @param  {number}  courseId   Course ID where to show.
     * @param  {any}     [navOptions] Navigation options for the course.
     * @param  {any}     [admOptions] Admin options for the course.
     * @return {boolean|Promise<boolean>}            Whether or not the handler is enabled for a user.
     */
    isEnabledForUser(user: any, courseId: number, navOptions?: any, admOptions?: any): boolean | Promise<boolean> {
        // First check if it's enabled for the user.
        const enabledForUser = this.sitePluginsProvider.isHandlerEnabledForUser(user.id, this.handlerSchema.restricttocurrentuser,
                this.initResult.restrict);
        if (!enabledForUser) {
            return false;
        }

        // Enabled for user, check if it's enabled for the course.
        return this.sitePluginsProvider.isHandlerEnabledForCourse(
                courseId, this.handlerSchema.restricttoenrolledcourses, this.initResult.restrict);
    }

    /**
     * Returns the data needed to render the handler.
     * @param  {any}     user       User object.
     * @param  {number}  courseId   Course ID where to show.
     * @return {CoreUserProfileHandlerData}    Data to be shown.
     */
    getDisplayData(user: any, courseId: number): CoreUserProfileHandlerData {
        return {
            title: this.title,
            icon: this.handlerSchema.displaydata.icon,
            class: this.handlerSchema.displaydata.class,
            action: (event: Event, navCtrl: NavController, user: any, courseId?: number): void => {
                event.preventDefault();
                event.stopPropagation();

                navCtrl.push('CoreSitePluginsPluginPage', {
                    title: this.title,
                    component: this.plugin.component,
                    method: this.handlerSchema.method,
                    args: {
                        courseid: courseId,
                        userid: user.id
                    },
                    initResult: this.initResult
                });
            }
        };
    }
}
