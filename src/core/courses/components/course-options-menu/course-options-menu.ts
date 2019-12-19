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
import { NavParams, ViewController } from 'ionic-angular';
import { CoreCoursesProvider } from '../../providers/courses';

/**
 * This component is meant to display a popover with the course options.
 */
@Component({
    selector: 'core-courses-course-options-menu',
    templateUrl: 'core-courses-course-options-menu.html'
})
export class CoreCoursesCourseOptionsMenuComponent implements OnInit {
    course: any; // The course.
    prefetch: any; // The prefecth info.

    downloadCourseEnabled: boolean;

    constructor(navParams: NavParams, private viewCtrl: ViewController, private coursesProvider: CoreCoursesProvider) {
        this.course = navParams.get('course') || {};
        this.prefetch = navParams.get('prefetch') || {};
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.downloadCourseEnabled = !this.coursesProvider.isDownloadCourseDisabledInSite();
    }

    /**
     * Do an action over the course.
     * @param action Action name to take.
     */
    action(action: string): void {
        this.viewCtrl.dismiss(action);
    }
}
