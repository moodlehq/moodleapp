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

import { Input, Component, EventEmitter, Output } from '@angular/core';
import { CoreCourseAnyCourseData } from '@features/courses/services/courses';
import { CoreCourseFormatComponent } from '../components/course-format/course-format';
import { CoreCourseSection, CoreCourseModuleCompletionData } from '../services/course-helper';
import { CoreCourseSectionToDisplay } from '../components/course-section/course-section';

/**
 * Template class to easily create components for course formats.
 */
@Component({
    template: '',
})
export abstract class CoreCourseFormatDynamicComponent {

    @Input() course?: CoreCourseAnyCourseData; // The course to render.
    @Input() sections?: CoreCourseSection[]; // List of course sections.
    @Input() section?: CoreCourseSectionToDisplay; // Current section.
    @Input() initialSectionId?: number; // The section to load first (by ID).
    @Input() initialSectionNumber?: number; // The section to load first (by number).
    @Input() moduleId?: number; // The module ID to scroll to. Must be inside the initial selected section.

    // Special input, allows access to the parent instance properties and methods.
    // Please notice that all the other inputs/outputs are also accessible through this instance, so they could be removed.
    // However, we decided to keep them to support ngOnChanges and to make templates easier to read.
    @Input() coreCourseFormatComponent?: CoreCourseFormatComponent;

    @Output() completionChanged = new EventEmitter<CoreCourseModuleCompletionData>(); // Notify when any module completion changes.

}
