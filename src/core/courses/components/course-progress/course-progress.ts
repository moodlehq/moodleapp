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
import { CoreUtilsProvider } from '../../../../providers/utils/utils';

/**
 * This component is meant to display a course for a list of courses with progress.
 *
 * Example usage:
 *
 * <core-courses-course-progress *ngFor="let course of filteredCourses" [course]="course" showSummary="true">
 * </core-courses-course-progress>
 */
@Component({
    selector: 'core-courses-course-progress',
    templateUrl: 'course-progress.html'
})
export class CoreCoursesCourseProgressComponent implements OnInit {
    @Input() course: any; // The course to render.
    @Input() roundProgress?: boolean|string; // Whether to show the progress.
    @Input() showSummary?: boolean|string; // Whether to show the summary.

    actionsLoaded = true;
    prefetchCourseIcon: string;

    protected obsStatus;
    protected downloadText;
    protected downloadingText;
    protected downloadButton = {
        isDownload: true,
        className: 'mm-download-course',
        priority: 1000
    };
    protected buttons;

    constructor(private navCtrl: NavController, private translate: TranslateService, private utils: CoreUtilsProvider) {
        this.downloadText = this.translate.instant('core.course.downloadcourse');
        this.downloadingText = this.translate.instant('core.downloading');
    }

    /**
     * Component being initialized.
     */
    ngOnInit() {
        // @todo: Handle course prefetch.
        // @todo: Handle course handlers (participants, etc.).
        this.roundProgress = this.utils.isTrueOrOne(this.roundProgress);
        this.showSummary = this.utils.isTrueOrOne(this.showSummary);
    }

    /**
     * Open a course.
     */
    openCourse(course) {
        this.navCtrl.push('CoreCourseSectionPage', {course: course});
    }

}
