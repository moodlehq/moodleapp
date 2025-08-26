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

import { CoreRoutedItemsManagerSource } from '@classes/items-management/routed-items-manager-source';
import { CoreGrades } from '../services/grades';
import { CoreGradesGradeOverviewWithCourseData, CoreGradesHelper } from '../services/grades-helper';

/**
 * Provides a collection of courses.
 */
export class CoreGradesCoursesSource extends CoreRoutedItemsManagerSource<CoreGradesGradeOverviewWithCourseData> {

    /**
     * @inheritdoc
     */
    protected async loadPageItems(): Promise<{ items: CoreGradesGradeOverviewWithCourseData[] }> {
        console.log('[Grades Source] loadPageItems called');
        const grades = await CoreGrades.getCoursesGrades();
        console.log('[Grades Source] Grades received:', grades);
        console.log('[Grades Source] Number of grades:', grades?.length || 0);
        const courses = await CoreGradesHelper.getGradesCourseData(grades);
        console.log('[Grades Source] Courses with grade data:', courses);
        console.log('[Grades Source] Number of courses:', courses?.length || 0);

        return { items: courses };
    }

    /**
     * @inheritdoc
     */
    getItemPath(course: CoreGradesGradeOverviewWithCourseData): string {
        return course.courseid.toString();
    }

}
