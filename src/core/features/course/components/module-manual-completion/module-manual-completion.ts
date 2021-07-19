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

import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChange } from '@angular/core';

import { CoreCourseHelper, CoreCourseModuleCompletionData } from '@features/course/services/course-helper';
import { CoreUser } from '@features/user/services/user';
import { Translate } from '@singletons';
import { CoreEventObserver, CoreEvents } from '@singletons/events';

/**
 * Component to display a button for manual completion.
 */
@Component({
    selector: 'core-course-module-manual-completion',
    templateUrl: 'core-course-module-manual-completion.html',
})
export class CoreCourseModuleManualCompletionComponent implements OnInit, OnChanges, OnDestroy {

    @Input() completion?: CoreCourseModuleCompletionData; // The completion status.
    @Input() moduleName?: string; // The name of the module this completion affects.
    @Output() completionChanged = new EventEmitter<CoreCourseModuleCompletionData>(); // Notify when completion changes.

    accessibleDescription: string | null = null;

    protected manualChangedObserver?: CoreEventObserver;

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.manualChangedObserver = CoreEvents.on(CoreEvents.MANUAL_COMPLETION_CHANGED, (data) => {
            if (!this.completion || this.completion.cmid != data.completion.cmid) {
                return;
            }

            this.completion = data.completion;
            this.calculateData();
            this.completionChanged.emit(this.completion);
        });
    }

    /**
     * @inheritdoc
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        if (changes.completion && this.completion) {
            this.calculateData();
        }
    }

    /**
     * @inheritdoc
     */
    protected async calculateData(): Promise<void> {
        if (!this.completion || this.completion.isautomatic) {
            return;
        }

        // Set an accessible description for manual completions with overridden completion state.
        if (this.completion.overrideby) {
            const fullName = await CoreUser.getUserFullNameWithDefault(this.completion.overrideby, this.completion.courseId);

            const setByData = {
                $a: {
                    activityname: this.moduleName,
                    setby: fullName,
                },
            };
            const setByLangKey = this.completion.state ? 'completion_setby:manual:done' : 'completion_setby:manual:markdone';
            this.accessibleDescription = Translate.instant('core.course.' + setByLangKey, setByData);
        } else {
            const langKey = this.completion.state ? 'completion_manual:aria:done' : 'completion_manual:aria:markdone';
            this.accessibleDescription = Translate.instant('core.course.' + langKey, { $a: this.moduleName });
        }
    }

    /**
     * Completion clicked.
     *
     * @param event The click event.
     */
    async completionClicked(event: Event): Promise<void> {
        if (!this.completion) {
            return;
        }

        await CoreCourseHelper.changeManualCompletion(this.completion, event);

        CoreEvents.trigger(CoreEvents.MANUAL_COMPLETION_CHANGED, { completion: this.completion });
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.manualChangedObserver?.off();
    }

}
