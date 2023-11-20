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

import { Component, HostBinding, Input } from '@angular/core';
import { CoreCourseListItem } from '@features/courses/services/courses';

/**
 * This component is meant to display a course for a list of courses with progress.
 *
 * Example usage:
 *
 * <core-courses-course-progress [course]="course">
 * </core-courses-course-progress>
 *
 * @deprecated since 4.0. Use core-courses-course-list-item instead.
 */
@Component({
    selector: 'core-courses-course-progress',
    templateUrl: 'core-courses-course-progress.html',
})
export class CoreCoursesCourseProgressComponent {

    @Input() course!: CoreCourseListItem; // The course to render.
    @Input() showAll = false; // If true, will show all actions, options, star and progress.
    @Input() showDownload = true; // If true, will show download button. Only works if the options menu is not shown.

    @HostBinding('class.deprecated') get isDeprecated(): boolean {
        return true;
    };

}
