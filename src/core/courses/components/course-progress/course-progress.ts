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

import { Component, Input, OnInit } from '@angular/core';
import { NavController } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreCourseFormatDelegate } from '../../../course/providers/format-delegate';

/**
 * This component is meant to display a course for a list of courses with progress.
 *
 * Example usage:
 *
 * <core-courses-course-progress [course]="course">
 * </core-courses-course-progress>
 */
@Component({
    selector: 'core-courses-course-progress',
    templateUrl: 'course-progress.html'
})
export class CoreCoursesCourseProgressComponent implements OnInit {
    @Input() course: any; // The course to render.

    isDownloading: boolean;

    protected obsStatus;
    protected downloadText;
    protected downloadingText;
    protected downloadButton = {
        isDownload: true,
        className: 'core-download-course',
        priority: 1000
    };
    protected buttons;

    constructor(private navCtrl: NavController, private translate: TranslateService,
            private courseFormatDelegate: CoreCourseFormatDelegate) {
        this.downloadText = this.translate.instant('core.course.downloadcourse');
        this.downloadingText = this.translate.instant('core.downloading');
    }

    /**
     * Component being initialized.
     */
    ngOnInit() {
        // @todo: Handle course prefetch.
    }

    /**
     * Open a course.
     */
    openCourse(course) {
        this.courseFormatDelegate.openCourse(this.navCtrl, course);
    }

}
