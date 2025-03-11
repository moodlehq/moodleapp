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

import { CoreDelegate, CoreDelegateHandler } from '@classes/delegate';
import { CoreCourseAnyCourseData } from '@features/courses/services/courses';
import { CoreNavigationOptions } from '@services/navigator';
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
     * @returns Title.
     */
    getCourseTitle?(course: CoreCourseAnyCourseData, sections?: CoreCourseWSSection[]): string;

    /**
     * Whether it allows seeing all sections at the same time. Defaults to true.
     *
     * @param course The course to check.
     * @returns Whether it can view all sections.
     */
    canViewAllSections?(course: CoreCourseAnyCourseData): boolean;

    /**
     * Whether the option blocks should be displayed. Defaults to true.
     *
     * @param course The course to check.
     * @returns Whether it can display blocks.
     */
    displayBlocks?(course: CoreCourseAnyCourseData): boolean;

    /**
     * Whether the default section selector should be displayed. Defaults to true.
     *
     * @param course The course to check.
     * @returns Whether the default section selector should be displayed.
     */
    displayCourseIndex?(course: CoreCourseAnyCourseData): boolean;

    /**
     * Whether the course refresher should be displayed. If it returns false, a refresher must be included in the course format,
     * and the doRefresh method of CoreCourseSectionPage must be called on refresh. Defaults to true.
     *
     * @param course The course to check.
     * @param sections List of course sections.
     * @returns Whether the refresher should be displayed.
     */
    displayRefresher?(course: CoreCourseAnyCourseData, sections: CoreCourseWSSection[]): boolean;

    /**
     * Given a list of sections, get the "current" section that should be displayed first. Defaults to first section.
     *
     * @param course The course to get the title.
     * @param sections List of sections.
     * @returns Promise resolved with current section and whether the section should be selected. If only the section is returned,
     *         forceSelected will default to false.
     */
    getCurrentSection?(
        course: CoreCourseAnyCourseData,
        sections: CoreCourseSection[],
    ): Promise<CoreCourseFormatCurrentSectionData<CoreCourseSection> | CoreCourseSection>;

    /**
     * Returns the name for the highlighted section.
     *
     * @returns The name for the highlighted section based on the given course format.
     */
    getSectionHightlightedName?(): string;

    /**
     * Open the page to display a course. If not defined, the page CoreCourseSectionPage will be opened.
     * Implement it only if you want to create your own page to display the course. In general it's better to use the method
     * getCourseFormatComponent because it will display the course handlers at the top.
     * Your page should include the course handlers using CoreCoursesDelegate.
     *
     * @param course The course to open. It should contain a "format" attribute.
     * @param navOptions Navigation options that includes params to pass to the page.
     * @returns Promise resolved when done.
     */
    openCourse?(course: CoreCourseAnyCourseData, navOptions?: CoreNavigationOptions): Promise<void>;

    /**
     * Return the Component to use to display the course format instead of using the default one.
     * Use it if you want to display a format completely different from the default one.
     * If you want to customize the default format there are several methods to customize parts of it.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param course The course to render.
     * @returns Promise resolved with component to use, undefined if not found.
     */
    getCourseFormatComponent?(course: CoreCourseAnyCourseData): Promise<Type<unknown> | undefined>;

    /**
     * Return the Component to use to display a single section. This component will only be used if the user is viewing a
     * single section. If all the sections are displayed at once then it won't be used.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param course The course to render.
     * @returns Promise resolved with component to use, undefined if not found.
     */
    getSingleSectionComponent?(course: CoreCourseAnyCourseData): Promise<Type<unknown> | undefined>;

    /**
     * Return the Component to use to display all sections in a course.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param course The course to render.
     * @returns Promise resolved with component to use, undefined if not found.
     */
    getAllSectionsComponent?(course: CoreCourseAnyCourseData): Promise<Type<unknown> | undefined>;

    /**
     * Invalidate the data required to load the course format.
     *
     * @param course The course to get the title.
     * @param sections List of sections.
     */
    invalidateData?(course: CoreCourseAnyCourseData, sections: CoreCourseWSSection[]): Promise<void>;

    /**
     * Whether the view should be refreshed when completion changes. If your course format doesn't display
     * activity completion then you should return false.
     *
     * @param course The course.
     * @returns Whether course view should be refreshed when an activity completion changes.
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
        super('CoreCoursesCourseFormatDelegate');
    }

    /**
     * Whether it allows seeing all sections at the same time. Defaults to true.
     *
     * @param course The course to check.
     * @returns Whether it allows seeing all sections at the same time.
     */
    canViewAllSections(course: CoreCourseAnyCourseData): boolean {
        return !!this.executeFunctionOnEnabled<boolean>(course.format || '', 'canViewAllSections', [course]);
    }

    /**
     * Whether the option blocks should be displayed. Defaults to true.
     *
     * @param course The course to check.
     * @returns Whether it can display blocks.
     */
    displayBlocks(course: CoreCourseAnyCourseData): boolean {
        return !!this.executeFunctionOnEnabled<boolean>(course.format || '', 'displayBlocks', [course]);
    }

    /**
     * Whether the course refresher should be displayed. If it returns false, a refresher must be included in the course format,
     * and the doRefresh method of CoreCourseSectionPage must be called on refresh. Defaults to true.
     *
     * @param course The course to check.
     * @param sections List of course sections.
     * @returns Whether the refresher should be displayed.
     */
    displayRefresher(course: CoreCourseAnyCourseData, sections: CoreCourseWSSection[]): boolean {
        return !!this.executeFunctionOnEnabled<boolean>(course.format || '', 'displayRefresher', [course, sections]);
    }

    /**
     * Whether the default course index should be displayed. Defaults to true.
     *
     * @param course The course to check.
     * @returns Whether the course index should be displayed.
     */
    displayCourseIndex(course: CoreCourseAnyCourseData): boolean {
        const display = this.executeFunctionOnEnabled<boolean>(course.format || '', 'displayCourseIndex', [course]);

        if (display !== undefined) {
            return display;
        }

        // Use displaySectionSelector while is not completely deprecated.
        return !!this.executeFunctionOnEnabled<boolean>(course.format || '', 'displaySectionSelector', [course]);
    }

    /**
     * Get the component to use to display all sections in a course.
     *
     * @param course The course to render.
     * @returns Promise resolved with component to use, undefined if not found.
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
     * @returns Promise resolved with component to use, undefined if not found.
     */
    async getCourseFormatComponent(course: CoreCourseAnyCourseData): Promise<Type<unknown> | undefined> {
        try {
            return await this.executeFunctionOnEnabled<Type<unknown>>(course.format || '', 'getCourseFormatComponent', [course]);
        } catch (error) {
            this.logger.error('Error getting course format component', error);
        }
    }

    /**
     * Given a course, return the title to use in the course page.
     *
     * @param course The course to get the title.
     * @param sections List of sections.
     * @returns Course title.
     */
    getCourseTitle(course: CoreCourseAnyCourseData, sections?: CoreCourseWSSection[]): string {
        return this.executeFunctionOnEnabled(course.format || '', 'getCourseTitle', [course, sections]) || '';
    }

    /**
     * Given a course and a list of sections, return the current section that should be displayed first.
     *
     * @param course The course to get the title.
     * @param sections List of sections.
     * @returns Promise.
     */
    async getCurrentSection<T = CoreCourseSection>(
        course: CoreCourseAnyCourseData,
        sections: T[],
    ): Promise<CoreCourseFormatCurrentSectionData<T>> {
        try {
            const sectionData = await this.executeFunctionOnEnabled<CoreCourseFormatCurrentSectionData<T> | T>(
                course.format || '',
                'getCurrentSection',
                [course, sections],
            );

            if (sectionData && typeof sectionData === 'object' && 'forceSelected' in sectionData) {
                return sectionData;
            } else if (sectionData) {
                // Function just returned the section, don't force selecting it.
                return {
                    section: sectionData,
                    forceSelected: false,
                };
            }
        } catch {
            // This function should never fail.
        }

        // Return the first section (usually, "All sections").
        return {
            section: sections[0],
            forceSelected: false,
        };
    }

    /**
     * Returns the name for the highlighted section.
     *
     * @param course The course to get the text.
     * @returns The name for the highlighted section based on the given course format.
     */
    getSectionHightlightedName(course: CoreCourseAnyCourseData): string | undefined {
        return this.executeFunctionOnEnabled<string>(
            course.format || '',
            'getSectionHightlightedName',
        );
    }

    /**
     * Get the component to use to display a single section. This component will only be used if the user is viewing
     * a single section. If all the sections are displayed at once then it won't be used.
     *
     * @param course The course to render.
     * @returns Promise resolved with component to use, undefined if not found.
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
     */
    async invalidateData(course: CoreCourseAnyCourseData, sections: CoreCourseWSSection[]): Promise<void> {
        await this.executeFunctionOnEnabled(course.format || '', 'invalidateData', [course, sections]);
    }

    /**
     * Open a course. Should not be called directly. Call CoreCourseHelper.openCourse instead.
     *
     * @param course The course to open. It should contain a "format" attribute.
     * @param navOptions Navigation options that includes params to pass to the page.
     * @returns Promise resolved when done.
     */
    async openCourse(course: CoreCourseAnyCourseData, navOptions?: CoreNavigationOptions): Promise<void> {
        await this.executeFunctionOnEnabled(course.format || '', 'openCourse', [course, navOptions]);
    }

    /**
     * Whether the view should be refreshed when completion changes. If your course format doesn't display
     * activity completion then you should return false.
     *
     * @param course The course.
     * @returns Whether course view should be refreshed when an activity completion changes.
     */
    async shouldRefreshWhenCompletionChanges(course: CoreCourseAnyCourseData): Promise<boolean | undefined> {
        return this.executeFunctionOnEnabled(course.format || '', 'shouldRefreshWhenCompletionChanges', [course]);
    }

}

export const CoreCourseFormatDelegate = makeSingleton(CoreCourseFormatDelegateService);

export type CoreCourseFormatCurrentSectionData<T = CoreCourseSection> = {
    section: T; // Current section.
    forceSelected: boolean; // If true, the app will force selecting the section when opening the course.
};
