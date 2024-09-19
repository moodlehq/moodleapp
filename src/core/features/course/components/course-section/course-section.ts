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
    HostBinding,
    Input,
    OnChanges,
    OnInit,
    SimpleChange,
} from '@angular/core';
import {
    CoreCourseModuleData,
    CoreCourseSection,
} from '@features/course/services/course-helper';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreCourseComponentsModule } from '../components.module';
import { toBoolean } from '@/core/transforms/boolean';
import { CoreCourseAnyCourseData } from '@features/courses/services/courses';
import { CoreCourseViewedModulesDBRecord } from '@features/course/services/database/course';
import { CoreCourseModuleCompletionStatus } from '@features/course/services/course';
import { CoreCourseFormatDelegate } from '@features/course/services/format-delegate';

/**
 * Component to display course section.
 */
@Component({
    selector: 'core-course-section',
    templateUrl: 'course-section.html',
    styleUrl: 'course-section.scss',
    standalone: true,
    imports: [
        CoreSharedModule,
        CoreCourseComponentsModule,
    ],
})
export class CoreCourseSectionComponent implements OnInit, OnChanges {

    @Input({ required: true }) course!: CoreCourseAnyCourseData; // The course to render.
    @Input({ required: true }) section!: CoreCourseSectionToDisplay;
    @Input() subSections: CoreCourseSectionToDisplay[] = []; // List of subsections in the course.
    @Input({ transform: toBoolean }) collapsible = true; // Whether the section can be collapsed.
    @Input() lastModuleViewed?: CoreCourseViewedModulesDBRecord;
    @Input() viewedModules: Record<number, boolean> = {};

    @HostBinding('class')
        get collapsibleClass(): string {
            return this.collapsible ? 'collapsible' : 'non-collapsible';
        }

    modules: CoreCourseModuleToDisplay[] = [];
    completionStatusIncomplete = CoreCourseModuleCompletionStatus.COMPLETION_INCOMPLETE;
    highlightedName?: string; // Name to highlight.

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.highlightedName = this.section.highlighted && this.highlightedName === undefined
            ? CoreCourseFormatDelegate.getSectionHightlightedName(this.course)
            : undefined;
    }

    /**
     * @inheritdoc
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        if (changes.section && this.section) {
            this.modules = this.section.modules;

            this.modules.forEach((module) => {
                if (module.modname === 'subsection') {
                    module.subSection = this.subSections.find((section) =>
                        section.component === 'mod_subsection' && section.itemid === module.instance);
                }
            });
        }
    }

}

type CoreCourseModuleToDisplay = CoreCourseModuleData & {
    subSection?: CoreCourseSectionToDisplay;
};

export type CoreCourseSectionToDisplay = CoreCourseSection & {
    highlighted?: boolean;
    expanded?: boolean; // The aim of this property is to avoid DOM overloading.
};
