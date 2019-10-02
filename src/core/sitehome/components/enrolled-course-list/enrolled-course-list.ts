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

import { Component, OnInit } from '@angular/core';
import { CoreCoursesProvider } from '@core/courses/providers/courses';

/**
 * Component to open the page to view the list of courses the user is enrolled in.
 */
@Component({
    selector: 'core-sitehome-enrolled-course-list',
    templateUrl: 'core-sitehome-enrolled-course-list.html',
})
export class CoreSiteHomeEnrolledCourseListComponent implements OnInit {
    show: boolean;

    constructor(private coursesProvider: CoreCoursesProvider) { }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        if (this.coursesProvider.isMyCoursesDisabledInSite()) {
            this.show = false;
        } else {
            this.coursesProvider.getUserCourses().then((courses) => {
                this.show = courses.length > 0;
            });
        }
    }
}
