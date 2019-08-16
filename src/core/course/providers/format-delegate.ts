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

import { Injectable, Injector } from '@angular/core';
import { NavController } from 'ionic-angular';
import { CoreEventsProvider } from '@providers/events';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreCourseFormatDefaultHandler } from './default-format';
import { CoreDelegate, CoreDelegateHandler } from '@classes/delegate';

/**
 * Interface that all course format handlers must implement.
 */
export interface CoreCourseFormatHandler extends CoreDelegateHandler {
    /**
     * Name of the format the handler supports. E.g. 'singleactivity'.
     * @type {string}
     */
    format: string;

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
     * Whether the course refresher should be displayed. If it returns false, a refresher must be included in the course format,
     * and the doRefresh method of CoreCourseSectionPage must be called on refresh. Defaults to true.
     *
     * @param {any} course The course to check.
     * @param {any[]} sections List of course sections.
     * @type {boolean} Whether the refresher should be displayed.
     */
    displayRefresher?(course: any, sections: any[]): boolean;

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
     * @param {any} [params] Params to pass to the course page.
     * @return {Promise<any>} Promise resolved when done.
     */
    openCourse?(navCtrl: NavController, course: any, params?: any): Promise<any>;

    /**
     * Return the Component to use to display the course format instead of using the default one.
     * Use it if you want to display a format completely different from the default one.
     * If you want to customize the default format there are several methods to customize parts of it.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param {Injector} injector Injector.
     * @param {any} course The course to render.
     * @return {any|Promise<any>} The component (or promise resolved with component) to use, undefined if not found.
     */
    getCourseFormatComponent?(injector: Injector, course: any): any | Promise<any>;

    /**
     * Return the Component to use to display the course summary inside the default course format.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param {Injector} injector Injector.
     * @param {any} course The course to render.
     * @return {any|Promise<any>} The component (or promise resolved with component) to use, undefined if not found.
     */
    getCourseSummaryComponent?(injector: Injector, course: any): any | Promise<any>;

    /**
     * Return the Component to use to display the section selector inside the default course format.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param {Injector} injector Injector.
     * @param {any} course The course to render.
     * @return {any|Promise<any>} The component (or promise resolved with component) to use, undefined if not found.
     */
    getSectionSelectorComponent?(injector: Injector, course: any): any | Promise<any>;

    /**
     * Return the Component to use to display a single section. This component will only be used if the user is viewing a
     * single section. If all the sections are displayed at once then it won't be used.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param {Injector} injector Injector.
     * @param {any} course The course to render.
     * @return {any|Promise<any>} The component (or promise resolved with component) to use, undefined if not found.
     */
    getSingleSectionComponent?(injector: Injector, course: any): any | Promise<any>;

    /**
     * Return the Component to use to display all sections in a course.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param {Injector} injector Injector.
     * @param {any} course The course to render.
     * @return {any|Promise<any>} The component (or promise resolved with component) to use, undefined if not found.
     */
    getAllSectionsComponent?(injector: Injector, course: any): any | Promise<any>;

    /**
     * Invalidate the data required to load the course format.
     *
     * @param {any} course The course to get the title.
     * @param {any[]} sections List of sections.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateData?(course: any, sections: any[]): Promise<any>;

    /**
     * Whether the view should be refreshed when completion changes. If your course format doesn't display
     * activity completion then you should return false.
     *
     * @param {any} course The course.
     * @return {boolean|Promise<boolean>} Whether course view should be refreshed when an activity completion changes.
     */
    shouldRefreshWhenCompletionChanges?(course: any): boolean | Promise<boolean>;
}

/**
 * Service to interact with course formats. Provides the functions to register and interact with the addons.
 */
@Injectable()
export class CoreCourseFormatDelegate extends CoreDelegate {
    protected featurePrefix = 'CoreCourseFormatDelegate_';
    protected handlerNameProperty = 'format';

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
        return this.executeFunctionOnEnabled(course.format, 'canViewAllSections', [course]);
    }

    /**
     * Whether the option to enable section/module download should be displayed. Defaults to true.
     *
     * @param {any} course The course to check.
     * @return {boolean} Whether the option to enable section/module download should be displayed
     */
    displayEnableDownload(course: any): boolean {
        return this.executeFunctionOnEnabled(course.format, 'displayEnableDownload', [course]);
    }

    /**
     * Whether the course refresher should be displayed. If it returns false, a refresher must be included in the course format,
     * and the doRefresh method of CoreCourseSectionPage must be called on refresh. Defaults to true.
     *
     * @param {any} course The course to check.
     * @param {any[]} sections List of course sections.
     * @return {boolean} Whether the refresher should be displayed.
     */
    displayRefresher(course: any, sections: any[]): boolean {
        return this.executeFunctionOnEnabled(course.format, 'displayRefresher', [course, sections]);
    }

    /**
     * Whether the default section selector should be displayed. Defaults to true.
     *
     * @param {any} course The course to check.
     * @return {boolean} Whether the section selector should be displayed.
     */
    displaySectionSelector(course: any): boolean {
        return this.executeFunctionOnEnabled(course.format, 'displaySectionSelector', [course]);
    }

    /**
     * Get the component to use to display all sections in a course.
     *
     * @param {Injector} injector Injector.
     * @param {any} course The course to render.
     * @return {Promise<any>} Promise resolved with component to use, undefined if not found.
     */
    getAllSectionsComponent(injector: Injector, course: any): Promise<any> {
        return Promise.resolve(this.executeFunctionOnEnabled(course.format, 'getAllSectionsComponent', [injector, course]))
                .catch((e) => {
            this.logger.error('Error getting all sections component', e);
        });
    }

    /**
     * Get the component to use to display a course format.
     *
     * @param {Injector} injector Injector.
     * @param {any} course The course to render.
     * @return {Promise<any>} Promise resolved with component to use, undefined if not found.
     */
    getCourseFormatComponent(injector: Injector, course: any): Promise<any> {
        return Promise.resolve(this.executeFunctionOnEnabled(course.format, 'getCourseFormatComponent', [injector, course]))
                .catch((e) => {
            this.logger.error('Error getting course format component', e);
        });
    }

    /**
     * Get the component to use to display the course summary in the default course format.
     *
     * @param {Injector} injector Injector.
     * @param {any} course The course to render.
     * @return {Promise<any>} Promise resolved with component to use, undefined if not found.
     */
    getCourseSummaryComponent(injector: Injector, course: any): Promise<any> {
        return Promise.resolve(this.executeFunctionOnEnabled(course.format, 'getCourseSummaryComponent', [injector, course]))
                .catch((e) => {
            this.logger.error('Error getting course summary component', e);
        });
    }

    /**
     * Given a course, return the title to use in the course page.
     *
     * @param {any} course The course to get the title.
     * @param {any[]} [sections] List of sections.
     * @return {string} Course title.
     */
    getCourseTitle(course: any, sections?: any[]): string {
        return this.executeFunctionOnEnabled(course.format, 'getCourseTitle', [course, sections]);
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
        return Promise.resolve(this.executeFunctionOnEnabled(course.format, 'getCurrentSection', [course, sections])).catch(() => {
            // This function should never fail. Just return all the sections.
            return sections[0];
        });
    }

    /**
     * Get the component to use to display the section selector inside the default course format.
     *
     * @param {Injector} injector Injector.
     * @param {any} course The course to render.
     * @return {Promise<any>} Promise resolved with component to use, undefined if not found.
     */
    getSectionSelectorComponent(injector: Injector, course: any): Promise<any> {
        return Promise.resolve(this.executeFunctionOnEnabled(course.format, 'getSectionSelectorComponent', [injector, course]))
                .catch((e) => {
            this.logger.error('Error getting section selector component', e);
        });
    }

    /**
     * Get the component to use to display a single section. This component will only be used if the user is viewing
     * a single section. If all the sections are displayed at once then it won't be used.
     *
     * @param {Injector} injector Injector.
     * @param {any} course The course to render.
     * @return {Promise<any>} Promise resolved with component to use, undefined if not found.
     */
    getSingleSectionComponent(injector: Injector, course: any): Promise<any> {
        return Promise.resolve(this.executeFunctionOnEnabled(course.format, 'getSingleSectionComponent', [injector, course]))
                .catch((e) => {
            this.logger.error('Error getting single section component', e);
        });
    }

    /**
     * Invalidate the data required to load the course format.
     *
     * @param {any} course The course to get the title.
     * @param {any[]} sections List of sections.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateData(course: any, sections: any[]): Promise<any> {
        return this.executeFunctionOnEnabled(course.format, 'invalidateData', [course, sections]);
    }

    /**
     * Open a course.
     *
     * @param {NavController} navCtrl The NavController instance to use.
     * @param {any} course The course to open. It should contain a "format" attribute.
     * @param {any} [params] Params to pass to the course page.
     * @return {Promise<any>} Promise resolved when done.
     */
    openCourse(navCtrl: NavController, course: any, params?: any): Promise<any> {
        return this.executeFunctionOnEnabled(course.format, 'openCourse', [navCtrl, course, params]);
    }

    /**
     * Whether the view should be refreshed when completion changes. If your course format doesn't display
     * activity completion then you should return false.
     *
     * @param {any} course The course.
     * @return {Promise<boolean>} Whether course view should be refreshed when an activity completion changes.
     */
    shouldRefreshWhenCompletionChanges(course: any): Promise<boolean> {
        return Promise.resolve(this.executeFunctionOnEnabled(course.format, 'shouldRefreshWhenCompletionChanges', [course]));
    }
}
