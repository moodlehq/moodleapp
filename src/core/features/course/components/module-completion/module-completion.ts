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

import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChange } from '@angular/core';

import { CoreCourseModuleCompletionBaseComponent } from '@features/course/classes/module-completion';
import { CoreCourseModuleCompletionStatus } from '@features/course/constants';
import { CorePopovers } from '@services/overlays/popovers';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreUser } from '@features/user/services/user';
import { Translate } from '@singletons';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { toBoolean } from '@/core/transforms/boolean';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Component to handle activity completion. It shows a checkbox with the current status, and allows manually changing
 * the completion if it's allowed.
 *
 * Example usage:
 *
 * <core-course-module-completion [completion]="module.completiondata" [moduleName]="module.name"
 *     (completionChanged)="completionChanged()"></core-course-module-completion>
 */
@Component({
    selector: 'core-course-module-completion',
    templateUrl: 'core-course-module-completion.html',
    styleUrl: 'module-completion.scss',
    imports: [
        CoreSharedModule,
    ],
})
export class CoreCourseModuleCompletionComponent
    extends CoreCourseModuleCompletionBaseComponent
    implements OnInit, OnChanges, OnDestroy {

    @Input({ transform: toBoolean }) showCompletionConditions = false; // Whether to show activity completion conditions.
    @Input({ transform: toBoolean }) showManualCompletion = false; // Whether to show manual completion.

    completed = false;
    accessibleDescription: string | null = null;
    showCompletionInfo = false;
    protected completionObserver?: CoreEventObserver;

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        if (!this.completion) {
            return;
        }

        this.showCompletionInfo = this.showCompletionConditions || this.showManualCompletion;
        if (!this.showCompletionInfo) {
            return;
        }

        if (!this.completion.isautomatic && this.completion.istrackeduser) {
            this.completionObserver = CoreEvents.on(CoreEvents.MANUAL_COMPLETION_CHANGED, (data) => {
                if (!this.completion || this.completion.cmid != data.completion.cmid) {
                    return;
                }

                this.completion = data.completion;
                this.calculateData();
                this.completionChanged.emit(this.completion);
            });
        }
    }

    /**
     * @inheritdoc
     */
    protected async calculateData(): Promise<void> {
        if (!this.completion || !this.completion.istrackeduser) {
            return;
        }

        const completionStatus = CoreCourseHelper.getCompletionStatus(this.completion);

        this.completed = completionStatus !== CoreCourseModuleCompletionStatus.COMPLETION_INCOMPLETE &&
            completionStatus !== CoreCourseModuleCompletionStatus.COMPLETION_COMPLETE_FAIL;

        if (!this.completion.isautomatic) {
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
                this.accessibleDescription = Translate.instant(`core.course.${setByLangKey}`, setByData);
            } else {
                const langKey = this.completion.state ? 'completion_manual:aria:done' : 'completion_manual:aria:markdone';
                this.accessibleDescription = Translate.instant(`core.course.${langKey}`, { $a: this.moduleName });
            }
        }
    }

    /**
     * Completion clicked.
     *
     * @param event The click event.
     */
    async completionClicked(event: Event): Promise<void> {
        if (!this.completion || !this.showCompletionInfo) {
            return;
        }

        event.stopPropagation();
        event.preventDefault();

        if (this.completion.isautomatic || !this.completion.istrackeduser) {
            // Fake clicked element to correct position of the popover.
            let target: HTMLElement | null = event.target as HTMLElement;
            if (target && target.tagName !== 'ION-BUTTON') {
                target = target.parentElement;
            }

            const { CoreCourseModuleCompletionDetailsComponent } =
                await import('../module-completion-details/module-completion-details');

            CorePopovers.openWithoutResult({
                component: CoreCourseModuleCompletionDetailsComponent,
                componentProps: {
                    completion: this.completion,
                },
                event: { target } as Event,
            });
        } else {
            await CoreCourseHelper.changeManualCompletion(this.completion);

            CoreEvents.trigger(CoreEvents.MANUAL_COMPLETION_CHANGED, { completion: this.completion });

        }
    }

    /**
     * @inheritdoc
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        if (changes.completion && this.completion && this.completion.istrackeduser) {
            this.calculateData();
        }
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.completionObserver?.off();
    }

}
