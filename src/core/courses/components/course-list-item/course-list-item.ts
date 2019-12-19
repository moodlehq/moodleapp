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

import { Component, Input, OnInit, Optional } from '@angular/core';
import { NavController } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreCoursesProvider } from '../../providers/courses';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';

/**
 * This directive is meant to display an item for a list of courses.
 *
 * Example usage:
 *
 * <core-courses-course-list-item [course]="course"></core-courses-course-list-item>
 */
@Component({
    selector: 'core-courses-course-list-item',
    templateUrl: 'core-courses-course-list-item.html'
})
export class CoreCoursesCourseListItemComponent implements OnInit {
    @Input() course: any; // The course to render.

    constructor(@Optional() private navCtrl: NavController, private translate: TranslateService,
            private coursesProvider: CoreCoursesProvider, private courseHelper: CoreCourseHelperProvider) {
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        // Check if the user is enrolled in the course.
        this.coursesProvider.getUserCourse(this.course.id).then(() => {
            this.course.isEnrolled = true;
        }).catch(() => {
            this.course.isEnrolled = false;
            this.course.enrollment = [];

            this.course.enrollmentmethods.forEach((instance) => {
                if (instance === 'self') {
                    this.course.enrollment.push({
                        name: this.translate.instant('core.courses.selfenrolment'),
                        icon: 'unlock'
                    });
                } else if (instance === 'guest') {
                    this.course.enrollment.push({
                        name: this.translate.instant('core.courses.allowguests'),
                        icon: 'person'
                    });
                } else if (instance === 'paypal') {
                    this.course.enrollment.push({
                        name: this.translate.instant('core.courses.paypalaccepted'),
                        img: 'assets/img/icons/paypal.png'
                    });
                }
            });

            if (this.course.enrollment.length == 0) {
                this.course.enrollment.push({
                    name: this.translate.instant('core.courses.notenrollable'),
                    icon: 'lock'
                });
            }
        });
    }

    /**
     * Open a course.
     *
     * @param course The course to open.
     */
    openCourse(course: any): void {
        if (course.isEnrolled) {
            this.courseHelper.openCourse(this.navCtrl, course);
        } else {
            this.navCtrl.push('CoreCoursesCoursePreviewPage', {course: course});
        }
    }
}
