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
import {
  Component,
  computed,
  input,
} from '@angular/core';
import {
    CoreCourseSection,
} from '@features/course/services/course-helper';
import { CoreSharedModule } from '@/core/shared.module';
import { toBoolean } from '@/core/transforms/boolean';
import { CoreCourseAnyCourseData } from '@features/courses/services/courses';
import { CoreCourseViewedModulesDBRecord } from '@features/course/services/database/course';
import { sectionContentIsModule } from '@features/course/services/course';
import { CoreCourseFormatDelegate } from '@features/course/services/format-delegate';
import { CoreCourseModuleCompletionStatus } from '@features/course/constants';
import { CoreCourseModuleComponent } from '../module/module';

/**
 * Component to display course section.
 */
@Component({
    selector: 'core-course-section',
    templateUrl: 'course-section.html',
    styleUrl: 'course-section.scss',
    imports: [
        CoreSharedModule,
        CoreCourseModuleComponent,
    ],
    host: {
        '[class]': 'collapsible() ? "collapsible" : "non-collapsible"',
    },
})
export class CoreCourseSectionComponent {

    readonly course = input.required<CoreCourseAnyCourseData>(); // The course to render.
    readonly section = input.required<CoreCourseSectionToDisplay>();
    readonly collapsible = input(true, { transform: toBoolean }); // Whether the section can be collapsed.
    readonly lastModuleViewed = input<CoreCourseViewedModulesDBRecord>();
    readonly viewedModules = input<Record<number, boolean>>({});

    readonly highlightedName = computed(() =>
        this.section().highlighted && this.highlightedName === undefined
            ? CoreCourseFormatDelegate.getSectionHightlightedName(this.course())
            : undefined);

    readonly completionStatusIncomplete = CoreCourseModuleCompletionStatus.COMPLETION_INCOMPLETE;
    readonly isModule = sectionContentIsModule;

}

export type CoreCourseSectionToDisplay = CoreCourseSection & {
    highlighted?: boolean;
    expanded?: boolean; // The aim of this property is to avoid DOM overloading.
};
