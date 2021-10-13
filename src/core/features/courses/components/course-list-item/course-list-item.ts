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

import { Component, Input, OnInit } from '@angular/core';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreEventCourseStatusChanged, CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreCourseListItem, CoreCourses } from '../../services/courses';
import { CoreCoursesHelper } from '../../services/courses-helper';

/**
 * This directive is meant to display an item for a list of courses.
 *
 * Example usage:
 *
 * <core-courses-course-list-item [course]="course"></core-courses-course-list-item>
 */
@Component({
    selector: 'core-courses-course-list-item',
    templateUrl: 'core-courses-course-list-item.html',
    styleUrls: ['course-list-item.scss'],
})
export class CoreCoursesCourseListItemComponent implements OnInit {

    @Input() course!: CoreCourseListItem; // The course to render.

    icons: CoreCoursesEnrolmentIcons[] = [];
    isEnrolled = false;

    /**
     * Component being initialized.
     */
    async ngOnInit(): Promise<void> {
        CoreCoursesHelper.loadCourseColorAndImage(this.course);

        this.isEnrolled = this.course.progress !== undefined;

        if (!this.isEnrolled) {
            try {
                const course = await CoreCourses.getUserCourse(this.course.id);
                this.course.progress = course.progress;
                this.course.completionusertracked = course.completionusertracked;

                this.isEnrolled = true;
            } catch {
                this.isEnrolled = false;
            }
        }

        if (!this.isEnrolled) {
            this.icons = [];

            this.course.enrollmentmethods.forEach((instance) => {
                if (instance === 'self') {
                    this.icons.push({
                        label: 'core.courses.selfenrolment',
                        icon: 'fas-key',
                    });
                } else if (instance === 'guest') {
                    this.icons.push({
                        label: 'core.courses.allowguests',
                        icon: 'fas-unlock',
                    });
                } else if (instance === 'paypal') {
                    this.icons.push({
                        label: 'core.courses.paypalaccepted',
                        icon: 'fab-paypal',
                    });
                }
            });

            if (this.icons.length == 0) {
                this.icons.push({
                    label: 'core.courses.notenrollable',
                    icon: 'fas-lock',
                });
            }
        }
    }

    /**
     * Open a course.
     *
     * @param course The course to open.
     */
    openCourse(): void {
        if (this.isEnrolled) {
            CoreCourseHelper.openCourse(this.course);
        } else {
            CoreNavigator.navigateToSitePath(
                '/course/' + this.course.id + '/preview',
                { params: { course: this.course } },
            );
        }
    }

}

/**
 * Enrolment icons to show on the list with a label.
 */
export type CoreCoursesEnrolmentIcons = {
    label: string;
    icon: string;
};
