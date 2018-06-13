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

import { Component } from '@angular/core';
import { CoreCoursesProvider } from '@core/courses/providers/courses';

/**
 * Component to open the page to view the list of all courses.
 */
@Component({
    selector: 'core-sitehome-all-course-list',
    templateUrl: 'core-sitehome-all-course-list.html',
})
export class CoreSiteHomeAllCourseListComponent {
    show: boolean;

    constructor(coursesProvider: CoreCoursesProvider) {
        this.show = coursesProvider.isGetCoursesByFieldAvailable();
    }
}
