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
import { CoreCourses, CoreCourseUserAdminOrNavOptionIndexed } from '@features/courses/services/courses';
import { CoreGrades } from '@features/grades/services/grades';
import { CoreGradesHelper, GRADES_PARTICIPANTS_PAGE_NAME } from '@features/grades/services/grades-helper';
import { makeSingleton } from '@singletons';

/**
 * Course nav handler.
 */
@Injectable({ providedIn: 'root' })
export class CoreGradesCourseParticipantsOptionHandlerService implements CoreCourseOptionsHandler {

    name = 'CoreGradesParticipants';
    priority = 400;

    /**
     * @inheritdoc
     */
    async invalidateEnabledForCourse(courseId: number, navOptions?: CoreCourseUserAdminOrNavOptionIndexed): Promise<void> {
        await CoreGrades.invalidateCourseGradesPermissionsData(courseId);

        if (navOptions && navOptions.grades !== undefined) {
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

        return canViewAllGrades;
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreCourseOptionsHandlerData | Promise<CoreCourseOptionsHandlerData> {
        return {
            title: 'core.grades.grades',
            class: 'core-grades-course-participants-handler',
            page: GRADES_PARTICIPANTS_PAGE_NAME,
        };
    }

}

export const CoreGradesCourseParticipantsOptionHandler = makeSingleton(CoreGradesCourseParticipantsOptionHandlerService);
