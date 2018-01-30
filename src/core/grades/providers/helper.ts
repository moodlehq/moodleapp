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
import { CoreLoggerProvider } from '../../../providers/logger';
import { TranslateService } from '@ngx-translate/core';
import { CoreCoursesProvider } from '../../courses/providers/courses';

/**
 * Service that provides some features regarding users information.
 */
@Injectable()
export class CoreGradesHelperProvider {
    protected logger;

    constructor(logger: CoreLoggerProvider, private coursesProvider: CoreCoursesProvider) {
        this.logger = logger.getInstance('CoreGradesHelperProvider');
    }

    /**
     * Get course data for grades since they only have courseid.
     *
     * @param  {Object[]} grades  Grades to get the data for.
     * @return {Promise<any>}         Promise always resolved. Resolve param is the formatted grades.
     */
    getGradesCourseData(grades: any): Promise<any> {
        // We ommit to use $mmCourses.getUserCourse for performance reasons.
        return this.coursesProvider.getUserCourses(true).then((courses) => {
            const indexedCourses = {};
            courses.forEach((course) => {
                indexedCourses[course.id] = course;
            });

            grades.forEach((grade) => {
                if (typeof indexedCourses[grade.courseid] != 'undefined') {
                    grade.coursefullname = indexedCourses[grade.courseid].fullname;
                }
            });

            return grades;
        });
    }

}
