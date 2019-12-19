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

import { Component } from '@angular/core';
import { NavParams, ViewController } from 'ionic-angular';

/**
 * Component to display a list of courses.
 */
@Component({
    selector: 'core-course-picker-menu-popover',
    templateUrl: 'core-course-picker-menu-popover.html'
})
export class CoreCoursePickerMenuPopoverComponent {
    courses: any[];
    courseId = -1;

    constructor(navParams: NavParams, private viewCtrl: ViewController) {
        this.courses = navParams.get('courses') || [];
        this.courseId = navParams.get('courseId') || -1;
    }

    /**
     * Function called when a course is clicked.
     *
     * @param event Click event.
     * @param course Course object clicked.
     * @return Return true if success, false if error.
     */
    coursePicked(event: Event, course: any): boolean {
        this.viewCtrl.dismiss(course);

        return true;
    }
}
