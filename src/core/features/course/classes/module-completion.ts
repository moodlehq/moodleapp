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

import { Component, Input, Output, EventEmitter, OnChanges, SimpleChange } from '@angular/core';

import { CoreCourseModuleCompletionData } from '@features/course/services/course-helper';

/**
 * Base class for completion components.
 */
@Component({
    template: '',
})
export class CoreCourseModuleCompletionBaseComponent implements OnChanges {

    @Input() completion?: CoreCourseModuleCompletionData; // The completion status.
    @Input() moduleId?: number; // The name of the module this completion affects.
    @Input() moduleName?: string; // The name of the module this completion affects.
    @Output() completionChanged = new EventEmitter<CoreCourseModuleCompletionData>(); // Notify when completion changes.

    /**
     * @inheritdoc
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        if (changes.completion && this.completion) {
            this.calculateData();
        }
    }

    /**
     * Calculate data to render the completion.
     */
    protected calculateData(): void {
        return;
    }

}
