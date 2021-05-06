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

import { CoreDomUtils } from '@services/utils/dom';
import { CoreCourse } from '@features/course/services/course';
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
     * Detect changes on input properties.
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

    /**
     * Completion clicked.
     *
     * @param e The click event.
     */
    async completionClicked(e: Event): Promise<void> {
        if (!this.completion) {
            return;
        }

        if (typeof this.completion.cmid == 'undefined' || this.completion.tracking !== 1) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        const modal = await CoreDomUtils.showModalLoading();
        this.completion.state = this.completion.state === 1 ? 0 : 1;

        try {
            const response = await CoreCourse.markCompletedManually(
                this.completion.cmid,
                this.completion.state === 1,
                this.completion.courseId!,
                this.completion.courseName,
            );

            if (this.completion.valueused === false) {
                this.calculateData();
                if (response.offline) {
                    this.completion.offline = true;
                }
            }
            this.completionChanged.emit(this.completion);
        } catch (error) {
            this.completion.state = this.completion.state === 1 ? 0 : 1;
            CoreDomUtils.showErrorModalDefault(error, 'core.errorchangecompletion', true);
        } finally {
            modal.dismiss();
        }
    }

}
