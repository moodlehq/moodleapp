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
import { CoreCourseProvider } from '@features/course/services/course';
import {
    CoreCourseAccess,
    CoreCourseOptionsHandler,
    CoreCourseOptionsHandlerData,
} from '@features/course/services/course-options-delegate';
import { CoreCourseAnyCourseData, CoreCourses, CoreCourseUserAdminOrNavOptionIndexed } from '@features/courses/services/courses';
import { makeSingleton } from '@singletons';
import { CoreGrades } from '../grades';

/**
 * Course nav handler.
 */
@Injectable({ providedIn: 'root' })
export class CoreGradesCourseOptionHandlerService implements CoreCourseOptionsHandler {

    name = 'CoreGrades';
    priority = 400;

    /**
     * @inheritdoc
     */
    invalidateEnabledForCourse(courseId: number, navOptions?: CoreCourseUserAdminOrNavOptionIndexed): Promise<void> {
        if (navOptions && navOptions.grades !== undefined) {
            // No need to invalidate anything.
            return Promise.resolve();
        }

        return CoreCourses.invalidateUserCourses();
    }

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * @inheritdoc
     */
    isEnabledForCourse(
        courseId: number,
        accessData: CoreCourseAccess,
        navOptions?: CoreCourseUserAdminOrNavOptionIndexed,
    ): boolean | Promise<boolean> {
        if (accessData && accessData.type == CoreCourseProvider.ACCESS_GUEST) {
            return false; // Not enabled for guests.
        }

        if (navOptions && navOptions.grades !== undefined) {
            return navOptions.grades;
        }

        return CoreGrades.isPluginEnabledForCourse(courseId);
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreCourseOptionsHandlerData | Promise<CoreCourseOptionsHandlerData> {
        return {
            title: 'core.grades.grades',
            class: 'core-grades-course-handler',
            page: 'grades',
        };
    }

    /**
     * @inheritdoc
     */
    async prefetch(course: CoreCourseAnyCourseData): Promise<void> {
        try {
            await CoreGrades.getCourseGradesTable(course.id, undefined, undefined, true);
        } catch (error) {
            if (error.errorcode === 'notingroup') {
                // Don't fail the download because of this error.
                return;
            }

            throw error;
        }
    }

}

export const CoreGradesCourseOptionHandler = makeSingleton(CoreGradesCourseOptionHandlerService);
