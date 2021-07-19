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

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CoreCourseModule, CoreCourseModuleCompletionData } from '@features/course/services/course-helper';

/**
 * Display info about a module: dates and completion.
 */
@Component({
    selector: 'core-course-module-info',
    templateUrl: 'core-course-module-info.html',
})
export class CoreCourseModuleInfoComponent {

    @Input() module!: CoreCourseModule; // The module to render.
    @Input() showManualCompletion = false; // Whether to show manual completion.
    @Output() completionChanged = new EventEmitter<CoreCourseModuleCompletionData>(); // Notify when completion changes.

}
