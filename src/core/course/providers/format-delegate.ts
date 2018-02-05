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
import { CoreEventsProvider } from '../../../providers/events';
import { CoreLoggerProvider } from '../../../providers/logger';
import { CoreSitesProvider } from '../../../providers/sites';
import { CoreCourseProvider } from './course';
import { CoreCourseFormatDefaultHandler } from './default-format';
import { CoreDelegate, CoreDelegateHandler } from '../../../classes/delegate';

/**
 * Interface that all course format handlers must implement.
 */
export interface CoreCourseFormatHandler extends CoreDelegateHandler {
    /**
     * Get the title to use in course page. If not defined, course fullname.
     * This function will be called without sections first, and then call it again when the sections are retrieved.
     *
     * @param {any} course The course.
     * @param {any[]} [sections] List of sections.
     * @return {string} Title.
     */
    getCourseTitle?(course: any, sections?: any[]): string;

    /**
     * Whether it allows seeing all sections at the same time. Defaults to true.
     *
     * @param {any} course The course to check.
     * @type {boolean} Whether it can view all sections.
     */
    canViewAllSections?(course: any): boolean;

    /**
     * Whether the option to enable section/module download should be displayed. Defaults to true.
     *
     * @param {any} course The course to check.
     * @type {boolean} Whether the option to enable section/module download should be displayed.
     */
    displayEnableDownload?(course: any): boolean;

    /**
     * Whether the default section selector should be displayed. Defaults to true.
     *
     * @param {any} course The course to check.
     * @type {boolean} Whether the default section selector should be displayed.
     */
    displaySectionSelector?(course: any): boolean;

    /**
     * Given a list of sections, get the "current" section that should be displayed first. Defaults to first section.
     *
     * @param {any} course The course to get the title.
     * @param {any[]} sections List of sections.
     * @return {any|Promise<any>} Current section (or promise resolved with current section). If a promise is returned, it should
     *                            never fail.
     */
    getCurrentSection?(course: any, sections: any[]): any | Promise<any>;

    /**
     * Open the page to display a course. If not defined, the page CoreCourseSectionPage will be opened.
     * Implement it only if you want to create your own page to display the course. In general it's better to use the method
     * getCourseFormatComponent because it will display the course handlers at the top.
     * Your page should include the course handlers using CoreCoursesDelegate.
     *
     * @param {NavController} navCtrl The NavController instance to use.
     * @param {any} course The course to open. It should contain a "format" attribute.
     * @return {Promise<any>} Promise resolved when done.
     */
    openCourse?(navCtrl: NavController, course: any): Promise<any>;

    /**
     * Return the Component to use to display the course format instead of using the default one.
     * Use it if you want to display a format completely different from the default one.
     * If you want to customize the default format there are several methods to customize parts of it.
     *
     * @param {any} course The course to render.
     * @return {any} The component to use, undefined if not found.
     */
    getCourseFormatComponent?(course: any): any;

    /**
     * Return the Component to use to display the course summary inside the default course format.
     *
     * @param {any} course The course to render.
     * @return {any} The component to use, undefined if not found.
     */
    getCourseSummaryComponent?(course: any): any;

    /**
     * Return the Component to use to display the section selector inside the default course format.
     *
     * @param {any} course The course to render.
     * @return {any} The component to use, undefined if not found.
     */
    getSectionSelectorComponent?(course: any): any;

    /**
     * Return the Component to use to display a single section. This component will only be used if the user is viewing a
     * single section. If all the sections are displayed at once then it won't be used.
     *
     * @param {any} course The course to render.
     * @return {any} The component to use, undefined if not found.
     */
    getSingleSectionComponent?(course: any): any;

    /**
     * Return the Component to use to display all sections in a course.
     *
     * @param {any} course The course to render.
     * @return {any} The component to use, undefined if not found.
     */
    getAllSectionsComponent?(course: any): any;

    /**
     * Invalidate the data required to load the course format.
     *
     * @param {any} course The course to get the title.
     * @param {any[]} sections List of sections.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateData?(course: any, sections: any[]): Promise<any>;
}

/**
 * Service to interact with course formats. Provides the functions to register and interact with the addons.
 */
@Injectable()
export class CoreCourseFormatDelegate extends CoreDelegate {
    protected handlers: { [s: string]: CoreCourseFormatHandler } = {}; // All registered handlers.
    protected enabledHandlers: { [s: string]: CoreCourseFormatHandler } = {}; // Handlers enabled for the current site.
    protected featurePrefix = 'CoreCourseFormatHandler_';

    constructor(loggerProvider: CoreLoggerProvider, protected sitesProvider: CoreSitesProvider, eventsProvider: CoreEventsProvider,
            protected defaultHandler: CoreCourseFormatDefaultHandler) {
        super('CoreCoursesCourseFormatDelegate', loggerProvider, sitesProvider, eventsProvider);
    }

    /**
     * Whether it allows seeing all sections at the same time. Defaults to true.
     *
     * @param {any} course The course to check.
     * @return {boolean} Whether it allows seeing all sections at the same time.
     */
    canViewAllSections(course: any): boolean {
        return this.executeFunction(course.format, 'canViewAllSections', [course]);
    }

    /**
     * Whether the option to enable section/module download should be displayed. Defaults to true.
     *
     * @param {any} course The course to check.
     * @return {boolean} Whether the option to enable section/module download should be displayed
     */
    displayEnableDownload(course: any): boolean {
        return this.executeFunction(course.format, 'displayEnableDownload', [course]);
    }

    /**
     * Whether the default section selector should be displayed. Defaults to true.
     *
     * @param {any} course The course to check.
     * @return {boolean} Whether the section selector should be displayed.
     */
    displaySectionSelector(course: any): boolean {
        return this.executeFunction(course.format, 'displaySectionSelector', [course]);
    }

    /**
     * Execute a certain function in a course format handler.
     * If the handler isn't found or function isn't defined, call the same function in the default handler.
     *
     * @param {string} format The format name.
     * @param {string} fnName Name of the function to execute.
     * @param {any[]} params Parameters to pass to the function.
     * @return {any} Function returned value or default value.
     */
    protected executeFunction(format: string, fnName: string, params?: any[]): any {
        const handler = this.enabledHandlers[format];
        if (handler && handler[fnName]) {
            return handler[fnName].apply(handler, params);
        } else if (this.defaultHandler[fnName]) {
            return this.defaultHandler[fnName].apply(this.defaultHandler, params);
        }
    }

    /**
     * Get the component to use to display all sections in a course.
     *
     * @param {any} course The course to render.
     * @return {any} The component to use, undefined if not found.
     */
    getAllSectionsComponent(course: any): any {
        return this.executeFunction(course.format, 'getAllSectionsComponent', [course]);
    }

    /**
     * Get the component to use to display a course format.
     *
     * @param {any} course The course to render.
     * @return {any} The component to use, undefined if not found.
     */
    getCourseFormatComponent(course: any): any {
        return this.executeFunction(course.format, 'getCourseFormatComponent', [course]);
    }

    /**
     * Get the component to use to display the course summary in the default course format.
     *
     * @param {any} course The course to render.
     * @return {any} The component to use, undefined if not found.
     */
    getCourseSummaryComponent(course: any): any {
        return this.executeFunction(course.format, 'getCourseSummaryComponent', [course]);
    }

    /**
     * Given a course, return the title to use in the course page.
     *
     * @param {any} course The course to get the title.
     * @param {any[]} [sections] List of sections.
     * @return {string} Course title.
     */
    getCourseTitle(course: any, sections?: any[]): string {
        return this.executeFunction(course.format, 'getCourseTitle', [course, sections]);
    }

    /**
     * Given a course and a list of sections, return the current section that should be displayed first.
     *
     * @param {any} course The course to get the title.
     * @param {any[]} sections List of sections.
     * @return {Promise<any>} Promise resolved with current section.
     */
    getCurrentSection(course: any, sections: any[]): Promise<any> {
        // Convert the result to a Promise if it isn't.
        return Promise.resolve(this.executeFunction(course.format, 'getCurrentSection', [course, sections])).catch(() => {
            // This function should never fail. Just return the first section.
            if (sections[0].id != CoreCourseProvider.ALL_SECTIONS_ID) {
                return sections[0];
            }

            return sections[1];
        });
    }

    /**
     * Get the component to use to display the section selector inside the default course format.
     *
     * @param {any} course The course to render.
     * @return {any} The component to use, undefined if not found.
     */
    getSectionSelectorComponent(course: any): any {
        return this.executeFunction(course.format, 'getSectionSelectorComponent', [course]);
    }

    /**
     * Get the component to use to display a single section. This component will only be used if the user is viewing
     * a single section. If all the sections are displayed at once then it won't be used.
     *
     * @param {any} course The course to render.
     * @return {any} The component to use, undefined if not found.
     */
    getSingleSectionComponent(course: any): any {
        return this.executeFunction(course.format, 'getSingleSectionComponent', [course]);
    }

    /**
     * Invalidate the data required to load the course format.
     *
     * @param {any} course The course to get the title.
     * @param {any[]} sections List of sections.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateData(course: any, sections: any[]): Promise<any> {
        return this.executeFunction(course.format, 'invalidateData', [course, sections]);
    }

    /**
     * Open a course.
     *
     * @param {NavController} navCtrl The NavController instance to use.
     * @param {any} course The course to open. It should contain a "format" attribute.
     * @return {Promise<any>} Promise resolved when done.
     */
    openCourse(navCtrl: NavController, course: any): Promise<any> {
        if (this.enabledHandlers[course.format] && this.enabledHandlers[course.format].openCourse) {
            return this.enabledHandlers[course.format].openCourse(navCtrl, course);
        }

        return navCtrl.push('CoreCourseSectionPage', { course: course });
    }
}
