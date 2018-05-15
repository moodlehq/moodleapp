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

import { Injector } from '@angular/core';
import { CoreSitePluginsProvider } from '../../providers/siteplugins';
import { CoreCourseOptionsHandler, CoreCourseOptionsHandlerData } from '@core/course/providers/options-delegate';
import { CoreSitePluginsBaseHandler } from './base-handler';
import { CoreSitePluginsCourseOptionComponent } from '../../components/course-option/course-option';

/**
 * Handler to display a site plugin in course options.
 */
export class CoreSitePluginsCourseOptionHandler extends CoreSitePluginsBaseHandler implements CoreCourseOptionsHandler {
    priority: number;

    constructor(name: string, protected title: string, protected plugin: any, protected handlerSchema: any,
            protected initResult: any, protected sitePluginsProvider: CoreSitePluginsProvider) {
        super(name);

        this.priority = handlerSchema.priority;
    }

    /**
     * Whether or not the handler is enabled for a certain course.
     *
     * @param {number} courseId The course ID.
     * @param {any} accessData Access type and data. Default, guest, ...
     * @param {any} [navOptions] Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param {any} [admOptions] Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @return {boolean|Promise<boolean>} True or promise resolved with true if enabled.
     */
    isEnabledForCourse(courseId: number, accessData: any, navOptions?: any, admOptions?: any): boolean | Promise<boolean> {
        return this.sitePluginsProvider.isHandlerEnabledForCourse(
                courseId, this.handlerSchema.restricttoenrolledcourses, this.initResult.restrict);
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @param {Injector} injector Injector.
     * @param {number} courseId The course ID.
     * @return {CoreCourseOptionsHandlerData|Promise<CoreCourseOptionsHandlerData>} Data or promise resolved with the data.
     */
    getDisplayData(injector: Injector, courseId: number): CoreCourseOptionsHandlerData | Promise<CoreCourseOptionsHandlerData> {
        return {
            title: this.title,
            class: this.handlerSchema.displaydata.class,
            component: CoreSitePluginsCourseOptionComponent,
            componentData: {
                handlerUniqueName: this.name
            }
        };
    }

    /**
     * Called when a course is downloaded. It should prefetch all the data to be able to see the plugin in offline.
     *
     * @param {any} course The course.
     * @return {Promise<any>} Promise resolved when done.
     */
    prefetch(course: any): Promise<any> {
        const args = {
                courseid: course.id,
            },
            component = this.plugin.component;

        return this.sitePluginsProvider.prefetchFunctions(component, args, this.handlerSchema, course.id, undefined, true);
    }
}
