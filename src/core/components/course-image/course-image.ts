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

import { Component, Input, ElementRef, OnInit, OnChanges, HostBinding } from '@angular/core';
import { CoreCourseListItem } from '@features/courses/services/courses';
import { CoreCoursesHelper } from '@features/courses/services/courses-helper';
import { CoreColors } from '@singletons/colors';

@Component({
    selector: 'core-course-image',
    templateUrl: 'course-image.html',
    styleUrls: ['./course-image.scss'],
})
export class CoreCourseImageComponent implements OnInit, OnChanges {

    @Input({ required: true }) course!: CoreCourseListItem;
    @Input() fill = false;

    protected element: HTMLElement;

    constructor(element: ElementRef) {
        this.element = element.nativeElement;
    }

    @HostBinding('class.fill-container')
    get fillContainer(): boolean {
        return this.fill;
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.setCourseColor();
    }

    /**
     * @inheritdoc
     */
    ngOnChanges(): void {
        this.setCourseColor();
    }

    /**
     * Removes the course image set because it cannot be loaded and set the fallback icon color.
     */
    loadFallbackCourseIcon(): void {
        this.course.courseimage = undefined;

        // Set the color because it won't be set at this point.
        this.setCourseColor();
    }

    /**
     * Set course color.
     */
    protected async setCourseColor(): Promise<void> {
        await CoreCoursesHelper.loadCourseColorAndImage(this.course);

        if (this.course.color) {
            this.element.style.setProperty('--course-color', this.course.color);

            const tint = CoreColors.lighter(this.course.color, 50);
            this.element.style.setProperty('--course-color-tint', tint);
        } else if(this.course.colorNumber !== undefined) {
            this.element.classList.add('course-color-' + this.course.colorNumber);
        }
    }

}
