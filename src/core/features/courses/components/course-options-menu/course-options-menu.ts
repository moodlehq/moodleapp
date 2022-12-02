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
import { CoreCourses } from '../../services/courses';
import { CoreEnrolledCourseDataWithExtraInfoAndOptions } from '../../services/courses-helper';
import { CorePrefetchStatusInfo } from '@features/course/services/course-helper';
import { PopoverController } from '@singletons';

/**
 * This component is meant to display a popover with the course options.
 */
@Component({
    selector: 'core-courses-course-options-menu',
    templateUrl: 'core-courses-course-options-menu.html',
})
export class CoreCoursesCourseOptionsMenuComponent implements OnInit {

    @Input() course!: CoreEnrolledCourseDataWithExtraInfoAndOptions; // The course.
    @Input() prefetch!: CorePrefetchStatusInfo; // The prefecth info.

    downloadCourseEnabled = false;

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.downloadCourseEnabled = !CoreCourses.isDownloadCourseDisabledInSite();
    }

    /**
     * Do an action over the course.
     *
     * @param action Action name to take.
     */
    action(action: string): void {
        PopoverController.dismiss(action);
    }

}
