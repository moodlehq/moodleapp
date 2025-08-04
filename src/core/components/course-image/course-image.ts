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

import { toBoolean } from '@/core/transforms/boolean';
import { Component, ElementRef, input, effect, inject } from '@angular/core';
import { CoreCourseListItem } from '@features/courses/services/courses';
import { CoreCoursesHelper } from '@features/courses/services/courses-helper';
import { CoreColors } from '@singletons/colors';
import { CoreBaseModule } from '@/core/base.module';
import { CoreExternalContentDirective } from '@directives/external-content';
import { CoreFaIconDirective } from '@directives/fa-icon';

@Component({
    selector: 'core-course-image',
    templateUrl: 'course-image.html',
    styleUrl: './course-image.scss',
    imports: [
        CoreBaseModule,
        CoreFaIconDirective,
        CoreExternalContentDirective,
    ],
})
export class CoreCourseImageComponent {

    readonly course = input.required<CoreCourseListItem>();
    readonly fill = input(false, { transform: toBoolean });

    protected element: HTMLElement = inject(ElementRef).nativeElement;

    constructor() {
        effect(() => {
            this.setCourseColor();
        });
    }

    /**
     * Removes the course image set because it cannot be loaded and set the fallback icon color.
     */
    loadFallbackCourseIcon(): void {
        this.course().courseimage = undefined;

        // Set the color because it won't be set at this point.
        this.setCourseColor();
    }

    /**
     * Set course color.
     */
    protected async setCourseColor(): Promise<void> {
        const course = this.course();

        // Moodle 4.1 downwards geopatterns are embedded in b64 in only some WS, remove them to keep it coherent.
        if (course.courseimage?.startsWith('data')) {
            course.courseimage = undefined;
        }

        if (course.courseimage !== undefined) {
            return;
        }

        if (course.overviewfiles && course.overviewfiles[0]) {
            course.courseimage = course.overviewfiles[0].fileurl;

            return;
        }

        // If no image, set the color.
        const colors = await CoreCoursesHelper.getCourseSiteColors();
        const colorNumber = course.id % 10;
        const color = colors.length ? colors[colorNumber] : undefined;

        if (color) {
            this.element.style.setProperty('--course-color', color);

            const tint = CoreColors.lighter(color, 50);
            this.element.style.setProperty('--course-color-tint', tint);
        } else {
            this.element.classList.add(`course-color-${colorNumber}`);
        }
    }

}
