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

import { Injectable, Type } from '@angular/core';
import { Params } from '@angular/router';

import { CoreDelegate, CoreDelegateHandler } from '@classes/delegate';
import { CoreCourseAnyCourseData } from '@features/courses/services/courses';
import { makeSingleton } from '@singletons';
import { CoreCourseWSSection } from './course';
import { CoreCourseSection } from './course-helper';
import { CoreCourseFormatDefaultHandler } from './handlers/default-format';

/**
 * Interface that all course format handlers must implement.
 */
export interface CoreCourseFormatHandler extends CoreDelegateHandler {
    /**
     * Name of the format the handler supports. E.g. 'singleactivity'.
     */
    format: string;

    /**
     * Get the title to use in course page. If not defined, course fullname.
     * This function will be called without sections first, and then call it again when the sections are retrieved.
     *
     * @param course The course.
     * @param sections List of sections.
     * @return Title.
     */
    getCourseTitle?(course: CoreCourseAnyCourseData, sections?: CoreCourseWSSection[]): string;

    /**
     * Whether it allows seeing all sections at the same time. Defaults to true.
     *
     * @param course The course to check.
     * @return Whether it can view all sections.
     */
    canViewAllSections?(course: CoreCourseAnyCourseData): boolean;

    /**
     * Whether the option blocks should be displayed. Defaults to true.
     *
     * @param course The course to check.
     * @return Whether it can display blocks.
     */
    displayBlocks?(course: CoreCourseAnyCourseData): boolean;

    /**
     * Whether the option to enable section/module download should be displayed. Defaults to true.
     *
     * @param course The course to check.
     * @return Whether the option to enable section/module download should be displayed.
     */
    displayEnableDownload?(course: CoreCourseAnyCourseData): boolean;

    /**
     * Whether the default section selector should be displayed. Defaults to true.
     *
     * @param course The course to check.
     * @return Whether the default section selector should be displayed.
     */
    displaySectionSelector?(course: CoreCourseAnyCourseData): boolean;

    /**
     * Whether the course refresher should be displayed. If it returns false, a refresher must be included in the course format,
     * and the doRefresh method of CoreCourseSectionPage must be called on refresh. Defaults to true.
     *
     * @param course The course to check.
     * @param sections List of course sections.
     * @return Whether the refresher should be displayed.
     */
    displayRefresher?(course: CoreCourseAnyCourseData, sections: CoreCourseWSSection[]): boolean;

    /**
     * Given a list of sections, get the "current" section that should be displayed first. Defaults to first section.
     *
     * @param course The course to get the title.
     * @param sections List of sections.
     * @return Promise resolved with current section.
     */
    getCurrentSection?(course: CoreCourseAnyCourseData, sections: CoreCourseSection[]): Promise<CoreCourseSection>;

    /**
     * Open the page to display a course. If not defined, the page CoreCourseSectionPage will be opened.
     * Implement it only if you want to create your own page to display the course. In general it's better to use the method
     * getCourseFormatComponent because it will display the course handlers at the top.
     * Your page should include the course handlers using CoreCoursesDelegate.
     *
     * @param course The course to open. It should contain a "format" attribute.
     * @param params Params to pass to the course page.
     * @return Promise resolved when done.
     */
    openCourse?(course: CoreCourseAnyCourseData, params?: Params): Promise<void>;

    /**
     * Return the Component to use to display the course format instead of using the default one.
     * Use it if you want to display a format completely different from the default one.
     * If you want to customize the default format there are several methods to customize parts of it.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param course The course to render.
     * @return Promise resolved with component to use, undefined if not found.
     */
    getCourseFormatComponent?(course: CoreCourseAnyCourseData): Promise<Type<unknown> | undefined>;

    /**
     * Return the Component to use to display the course summary inside the default course format.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param course The course to render.
     * @return Promise resolved with component to use, undefined if not found.
     */
    getCourseSummaryComponent?(course: CoreCourseAnyCourseData): Promise<Type<unknown> | undefined>;

    /**
     * Return the Component to use to display the section selector inside the default course format.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param course The course to render.
     * @return Promise resolved with component to use, undefined if not found.
     */
    getSectionSelectorComponent?(course: CoreCourseAnyCourseData): Promise<Type<unknown> | undefined>;

    /**
     * Return the Component to use to display a single section. This component will only be used if the user is viewing a
     * single section. If all the sections are displayed at once then it won't be used.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param course The course to render.
     * @return Promise resolved with component to use, undefined if not found.
     */
    getSingleSectionComponent?(course: CoreCourseAnyCourseData): Promise<Type<unknown> | undefined>;

    /**
     * Return the Component to use to display all sections in a course.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param course The course to render.
     * @return Promise resolved with component to use, undefined if not found.
     */
    getAllSectionsComponent?(course: CoreCourseAnyCourseData): Promise<Type<unknown> | undefined>;

    /**
     * Invalidate the data required to load the course format.
     *
     * @param course The course to get the title.
     * @param sections List of sections.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateData?(course: CoreCourseAnyCourseData, sections: CoreCourseWSSection[]): Promise<void>;

    /**
     * Whether the view should be refreshed when completion changes. If your course format doesn't display
     * activity completion then you should return false.
     *
     * @param course The course.
     * @return Whether course view should be refreshed when an activity completion changes.
     */
    shouldRefreshWhenCompletionChanges?(course: CoreCourseAnyCourseData): Promise<boolean>;
}

/**
 * Service to interact with course formats.
 */
@Injectable({ providedIn: 'root' })
export class CoreCourseFormatDelegateService extends CoreDelegate<CoreCourseFormatHandler> {

    protected featurePrefix = 'CoreCourseFormatDelegate_';
    protected handlerNameProperty = 'format';

    constructor(protected defaultHandler: CoreCourseFormatDefaultHandler) {
        super('CoreCoursesCourseFormatDelegate', true);
    }

    /**
     * Whether it allows seeing all sections at the same time. Defaults to true.
     *
     * @param course The course to check.
     * @return Whether it allows seeing all sections at the same time.
     */
    canViewAllSections(course: CoreCourseAnyCourseData): boolean {
        return !!this.executeFunctionOnEnabled<boolean>(course.format || '', 'canViewAllSections', [course]);
    }

    /**
     * Whether the option blocks should be displayed. Defaults to true.
     *
     * @param course The course to check.
     * @return Whether it can display blocks.
     */
    displayBlocks(course: CoreCourseAnyCourseData): boolean {
        return !!this.executeFunctionOnEnabled<boolean>(course.format || '', 'displayBlocks', [course]);
    }

    /**
     * Whether the option to enable section/module download should be displayed. Defaults to true.
     *
     * @param course The course to check.
     * @return Whether the option to enable section/module download should be displayed
     */
    displayEnableDownload(course: CoreCourseAnyCourseData): boolean {
        return !!this.executeFunctionOnEnabled<boolean>(course.format || '', 'displayEnableDownload', [course]);
    }

    /**
     * Whether the course refresher should be displayed. If it returns false, a refresher must be included in the course format,
     * and the doRefresh method of CoreCourseSectionPage must be called on refresh. Defaults to true.
     *
     * @param course The course to check.
     * @param sections List of course sections.
     * @return Whether the refresher should be displayed.
     */
    displayRefresher(course: CoreCourseAnyCourseData, sections: CoreCourseWSSection[]): boolean {
        return !!this.executeFunctionOnEnabled<boolean>(course.format || '', 'displayRefresher', [course, sections]);
    }

    /**
     * Whether the default section selector should be displayed. Defaults to true.
     *
     * @param course The course to check.
     * @return Whether the section selector should be displayed.
     */
    displaySectionSelector(course: CoreCourseAnyCourseData): boolean {
        return !!this.executeFunctionOnEnabled<boolean>(course.format || '', 'displaySectionSelector', [course]);
    }

    /**
     * Get the component to use to display all sections in a course.
     *
     * @param course The course to render.
     * @return Promise resolved with component to use, undefined if not found.
     */
    async getAllSectionsComponent(course: CoreCourseAnyCourseData): Promise<Type<unknown> | undefined> {
        try {
            return await this.executeFunctionOnEnabled<Type<unknown>>(course.format || '', 'getAllSectionsComponent', [course]);
        } catch (error) {
            this.logger.error('Error getting all sections component', error);
        }
    }

    /**
     * Get the component to use to display a course format.
     *
     * @param course The course to render.
     * @return Promise resolved with component to use, undefined if not found.
     */
    async getCourseFormatComponent(course: CoreCourseAnyCourseData): Promise<Type<unknown> | undefined> {
        try {
            return await this.executeFunctionOnEnabled<Type<unknown>>(course.format || '', 'getCourseFormatComponent', [course]);
        } catch (error) {
            this.logger.error('Error getting course format component', error);
        }
    }

    /**
     * Get the component to use to display the course summary in the default course format.
     *
     * @param course The course to render.
     * @return Promise resolved with component to use, undefined if not found.
     */
    async getCourseSummaryComponent(course: CoreCourseAnyCourseData): Promise<Type<unknown> | undefined> {
        try {
            return await this.executeFunctionOnEnabled<Type<unknown>>(course.format || '', 'getCourseSummaryComponent', [course]);
        } catch (error) {
            this.logger.error('Error getting course summary component', error);
        }
    }

    /**
     * Given a course, return the title to use in the course page.
     *
     * @param course The course to get the title.
     * @param sections List of sections.
     * @return Course title.
     */
    getCourseTitle(course: CoreCourseAnyCourseData, sections?: CoreCourseWSSection[]): string | undefined {
        return this.executeFunctionOnEnabled(course.format || '', 'getCourseTitle', [course, sections]);
    }

    /**
     * Given a course and a list of sections, return the current section that should be displayed first.
     *
     * @param course The course to get the title.
     * @param sections List of sections.
     * @return Promise resolved with current section.
     */
    async getCurrentSection(course: CoreCourseAnyCourseData, sections: CoreCourseSection[]): Promise<CoreCourseSection> {
        try {
            const section = await this.executeFunctionOnEnabled<CoreCourseSection>(
                course.format || '',
                'getCurrentSection',
                [course, sections],
            );

            return section || sections[0];
        } catch {
            // This function should never fail. Just return the first section (usually, "All sections").
            return sections[0];
        }
    }

    /**
     * Get the component to use to display the section selector inside the default course format.
     *
     * @param course The course to render.
     * @return Promise resolved with component to use, undefined if not found.
     */
    async getSectionSelectorComponent(course: CoreCourseAnyCourseData): Promise<Type<unknown> | undefined> {
        try {
            return await this.executeFunctionOnEnabled<Type<unknown>>(course.format || '', 'getSectionSelectorComponent', [course]);
        } catch (error) {
            this.logger.error('Error getting section selector component', error);
        }
    }

    /**
     * Get the component to use to display a single section. This component will only be used if the user is viewing
     * a single section. If all the sections are displayed at once then it won't be used.
     *
     * @param course The course to render.
     * @return Promise resolved with component to use, undefined if not found.
     */
    async getSingleSectionComponent(course: CoreCourseAnyCourseData): Promise<Type<unknown> | undefined> {
        try {
            return await this.executeFunctionOnEnabled<Type<unknown>>(course.format || '', 'getSingleSectionComponent', [course]);
        } catch (error) {
            this.logger.error('Error getting single section component', error);
        }
    }

    /**
     * Invalidate the data required to load the course format.
     *
     * @param course The course to get the title.
     * @param sections List of sections.
     * @return Promise resolved when the data is invalidated.
     */
    async invalidateData(course: CoreCourseAnyCourseData, sections: CoreCourseWSSection[]): Promise<void> {
        await this.executeFunctionOnEnabled(course.format || '', 'invalidateData', [course, sections]);
    }

    /**
     * Open a course. Should not be called directly. Call CoreCourseHelper.openCourse instead.
     *
     * @param course The course to open. It should contain a "format" attribute.
     * @param params Params to pass to the course page.
     * @return Promise resolved when done.
     */
    async openCourse(course: CoreCourseAnyCourseData, params?: Params): Promise<void> {
        await this.executeFunctionOnEnabled(course.format || '', 'openCourse', [course, params]);
    }

    /**
     * Whether the view should be refreshed when completion changes. If your course format doesn't display
     * activity completion then you should return false.
     *
     * @param course The course.
     * @return Whether course view should be refreshed when an activity completion changes.
     */
    async shouldRefreshWhenCompletionChanges(course: CoreCourseAnyCourseData): Promise<boolean | undefined> {
        return await this.executeFunctionOnEnabled(course.format || '', 'shouldRefreshWhenCompletionChanges', [course]);
    }

}

export const CoreCourseFormatDelegate = makeSingleton(CoreCourseFormatDelegateService);
