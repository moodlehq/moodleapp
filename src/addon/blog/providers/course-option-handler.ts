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
import { CoreSitesProvider } from '@providers/sites';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreCourseOptionsHandler, CoreCourseOptionsHandlerData } from '@core/course/providers/options-delegate';
import { CoreCoursesProvider } from '@core/courses/providers/courses';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { AddonBlogEntriesComponent } from '../components/entries/entries';
import { AddonBlogProvider } from './blog';

/**
 * Course nav handler.
 */
@Injectable()
export class AddonBlogCourseOptionHandler implements CoreCourseOptionsHandler {
    name = 'AddonBlog';
    priority = 100;

    constructor(protected coursesProvider: CoreCoursesProvider, protected blogProvider: AddonBlogProvider,
        protected courseHelper: CoreCourseHelperProvider, protected courseProvider: CoreCourseProvider,
        protected sitesProvider: CoreSitesProvider, protected filepoolProvider: CoreFilepoolProvider) {}

    /**
     * Should invalidate the data to determine if the handler is enabled for a certain course.
     *
     * @param {number} courseId The course ID.
     * @param {any} [navOptions] Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param {any} [admOptions] Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @return {Promise<any>} Promise resolved when done.
     */
    invalidateEnabledForCourse(courseId: number, navOptions?: any, admOptions?: any): Promise<any> {
        return this.courseProvider.invalidateCourseBlocks(courseId);
    }

    /**
     * Check if the handler is enabled on a site level.
     *
     * @return {boolean} Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean | Promise<boolean> {
        return this.blogProvider.isPluginEnabled();
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
        return this.courseHelper.hasABlockNamed(courseId, 'blog_menu').then((enabled) => {
            if (enabled && navOptions && typeof navOptions.blogs != 'undefined') {
                return navOptions.blogs;
            }

            return enabled;
        });
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @param {Injector} injector Injector.
     * @param {number} course The course.
     * @return {CoreCourseOptionsHandlerData|Promise<CoreCourseOptionsHandlerData>} Data or promise resolved with the data.
     */
    getDisplayData(injector: Injector, course: any): CoreCourseOptionsHandlerData | Promise<CoreCourseOptionsHandlerData> {
        return {
            title: 'addon.blog.blog',
            class: 'addon-blog-handler',
            component: AddonBlogEntriesComponent
        };
    }

    /**
     * Called when a course is downloaded. It should prefetch all the data to be able to see the addon in offline.
     *
     * @param {any} course The course.
     * @return {Promise<any>} Promise resolved when done.
     */
    prefetch(course: any): Promise<any> {
        const siteId = this.sitesProvider.getCurrentSiteId();

        return this.blogProvider.getEntries({courseid: course.id}).then((result) => {
            return result.entries.map((entry) => {
                let files = [];

                if (entry.attachmentfiles && entry.attachmentfiles.length) {
                    files = entry.attachmentfiles;
                }
                if (entry.summaryfiles && entry.summaryfiles.length) {
                    files = files.concat(entry.summaryfiles);
                }

                if (files.length > 0) {
                    return this.filepoolProvider.addFilesToQueue(siteId, files, entry.module, entry.id);
                }

                return Promise.resolve();
            });
        });
    }
}
