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
import {
    CoreCourseAccess,
    CoreCourseOptionsHandler,
    CoreCourseOptionsHandlerData,
} from '@features/course/services/course-options-delegate';
import { CoreCourseAnyCourseData, CoreCourses, CoreCourseUserAdminOrNavOptionIndexed } from '@features/courses/services/courses';
import { GRADES_PAGE_NAME } from '../../constants';
import { makeSingleton } from '@singletons';
import { CoreGrades } from '../grades';
import { CoreGradesHelper } from '../grades-helper';

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
    async invalidateEnabledForCourse(courseId: number, navOptions?: CoreCourseUserAdminOrNavOptionIndexed): Promise<void> {
        await CoreGrades.invalidateCourseGradesPermissionsData(courseId);

        if (navOptions?.grades !== undefined) {
            // No need to invalidate user courses.
            return;
        }

        await CoreCourses.invalidateUserCourses();
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
    async isEnabledForCourse(
        courseId: number,
        accessData: CoreCourseAccess,
        navOptions?: CoreCourseUserAdminOrNavOptionIndexed,
    ): Promise<boolean> {
        const showGradebook = await CoreGradesHelper.showGradebook(courseId, accessData, navOptions);

        if (!showGradebook) {
            return false;
        }

        const canViewAllGrades = await CoreGrades.canViewAllGrades(courseId);

        return !canViewAllGrades;
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreCourseOptionsHandlerData | Promise<CoreCourseOptionsHandlerData> {
        return {
            title: 'core.grades.grades',
            class: 'core-grades-course-handler',
            page: GRADES_PAGE_NAME,
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
