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
import { CoreCourse } from '@features/course/services/course';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import {
    CoreCourseAccess,
    CoreCourseOptionsHandler,
    CoreCourseOptionsHandlerData,
} from '@features/course/services/course-options-delegate';
import { CoreCourseAnyCourseData, CoreCourseUserAdminOrNavOptionIndexed } from '@features/courses/services/courses';
import { CoreFilepool } from '@services/filepool';
import { CoreSites } from '@services/sites';
import { CoreWSFile } from '@services/ws';
import { makeSingleton } from '@singletons';
import { AddonBlog } from '../blog';
import { AddonBlogMainMenuHandlerService } from './mainmenu';

/**
 * Course nav handler.
 */
@Injectable({ providedIn: 'root' })
export class AddonBlogCourseOptionHandlerService implements CoreCourseOptionsHandler {

    name = 'AddonBlog';
    priority = 100;

    /**
     * @inheritdoc
     */
    invalidateEnabledForCourse(courseId: number): Promise<void> {
        return CoreCourse.invalidateCourseBlocks(courseId);
    }

    /**
     * @inheritdoc
     */
    isEnabled(): Promise<boolean> {
        return AddonBlog.isPluginEnabled();
    }

    /**
     * @inheritdoc
     */
    async isEnabledForCourse(
        courseId: number,
        accessData: CoreCourseAccess,
        navOptions?: CoreCourseUserAdminOrNavOptionIndexed,
    ): Promise<boolean> {
        const enabled = await CoreCourseHelper.hasABlockNamed(courseId, 'blog_menu');

        if (enabled && navOptions && navOptions.blogs !== undefined) {
            return navOptions.blogs;
        }

        return enabled;
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreCourseOptionsHandlerData | Promise<CoreCourseOptionsHandlerData> {
        return {
            title: 'addon.blog.blog',
            class: 'addon-blog-handler',
            page: AddonBlogMainMenuHandlerService.PAGE_NAME,
        };
    }

    /**
     * @inheritdoc
     */
    async prefetch(course: CoreCourseAnyCourseData): Promise<void> {
        const siteId = CoreSites.getCurrentSiteId();

        const result = await AddonBlog.getEntries({ courseid: course.id });

        await Promise.all(result.entries.map(async (entry) => {
            let files: CoreWSFile[] = [];

            if (entry.attachmentfiles && entry.attachmentfiles.length) {
                files = entry.attachmentfiles;
            }

            if (entry.summaryfiles && entry.summaryfiles.length) {
                files = files.concat(entry.summaryfiles);
            }

            if (files.length > 0) {
                await CoreFilepool.addFilesToQueue(siteId, files, entry.module, entry.id);
            }
        }));
    }

}
export const AddonBlogCourseOptionHandler = makeSingleton(AddonBlogCourseOptionHandlerService);
