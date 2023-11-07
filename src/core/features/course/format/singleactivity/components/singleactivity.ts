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

import { Component, Input, OnChanges, SimpleChange, ViewChild, Output, EventEmitter, Type } from '@angular/core';

import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreCourseUnsupportedModuleComponent } from '@features/course/components/unsupported-module/unsupported-module';
import { CoreDynamicComponent } from '@components/dynamic-component/dynamic-component';
import { CoreCourseAnyCourseData } from '@features/courses/services/courses';
import { CoreCourseModuleCompletionData, CoreCourseSection } from '@features/course/services/course-helper';
import { CoreCourse } from '@features/course/services/course';
import type { CoreCourseModuleMainActivityComponent } from '@features/course/classes/main-activity-component';

/**
 * Component to display single activity format. It will determine the right component to use and instantiate it.
 *
 * The instantiated component will receive the course and the module as inputs.
 */
@Component({
    selector: 'core-course-format-single-activity',
    templateUrl: 'core-course-format-single-activity.html',
    styleUrls: ['single-activity.scss'],
})
export class CoreCourseFormatSingleActivityComponent implements OnChanges {

    @Input() course?: CoreCourseAnyCourseData; // The course to render.
    @Input() sections?: CoreCourseSection[]; // List of course sections.
    @Input() initialSectionId?: number; // The section to load first (by ID).
    @Input() initialSectionNumber?: number; // The section to load first (by number).
    @Input() moduleId?: number; // The module ID to scroll to. Must be inside the initial selected section.
    @Output() completionChanged = new EventEmitter<CoreCourseModuleCompletionData>(); // Notify when any module completion changes.

    @ViewChild(CoreDynamicComponent) dynamicComponent?: CoreDynamicComponent<CoreCourseModuleMainActivityComponent>;

    componentClass?: Type<unknown>; // The class of the component to render.
    data: Record<string | number, unknown> = {}; // Data to pass to the component.

    /**
     * @inheritdoc
     */
    async ngOnChanges(changes: { [name: string]: SimpleChange }): Promise<void> {
        if (!changes.course && !changes.sections) {
            return;
        }

        if (!this.course || !this.sections || !this.sections.length) {
            return;
        }

        // In single activity the module should only have 1 section and 1 module. Get the module.
        const module = this.sections?.[0].modules?.[0];

        this.data.courseId = this.course.id;
        this.data.module = module;

        if (module && !this.componentClass) {
            // We haven't obtained the class yet. Get it now.
            const component = await CoreCourseModuleDelegate.getMainComponent(this.course, module);
            this.componentClass = component || CoreCourseUnsupportedModuleComponent;
        }
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @param done Function to call when done.
     * @param afterCompletionChange Whether the refresh is due to a completion change.
     * @returns Promise resolved when done.
     */
    async doRefresh(refresher?: HTMLIonRefresherElement, done?: () => void, afterCompletionChange?: boolean): Promise<void> {
        if (afterCompletionChange) {
            // Don't refresh the view after a completion change since completion isn't displayed.
            return;
        }

        await this.dynamicComponent?.callComponentMethod('doRefresh', refresher);

        if (this.course) {
            const courseId = this.course.id;
            await CoreCourse.invalidateCourseBlocks(courseId);
        }
    }

    /**
     * User entered the page that contains the component.
     */
    ionViewDidEnter(): void {
        this.dynamicComponent?.callComponentMethod('ionViewDidEnter');
    }

    /**
     * User left the page that contains the component.
     */
    ionViewDidLeave(): void {
        this.dynamicComponent?.callComponentMethod('ionViewDidLeave');
    }

}
