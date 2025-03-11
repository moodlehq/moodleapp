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

import { Component, OnDestroy, OnInit } from '@angular/core';

import { CoreUser } from '@features/user/services/user';
import {
    CoreCourseModuleCompletionStatus,
    CoreCourseModuleCompletionTracking,
} from '@features/course/constants';
import { CoreFilterHelper } from '@features/filter/services/filter-helper';
import { Translate } from '@singletons';
import { CoreCourseModuleCompletionBaseComponent } from '@features/course/classes/module-completion';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { BehaviorSubject } from 'rxjs';
import { ContextLevel } from '@/core/constants';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Component to handle activity completion in sites previous to 3.11.
 * It shows a checkbox with the current status, and allows manually changing the completion if it's allowed.
 *
 * Example usage:
 *
 * <core-course-module-completion-legacy [completion]="module.completiondata" [moduleName]="module.name"
 *     (completionChanged)="completionChanged()"></core-course-module-completion-legacy>
 */
@Component({
    selector: 'core-course-module-completion-legacy',
    templateUrl: 'core-course-module-completion-legacy.html',
    styleUrl: 'module-completion-legacy.scss',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class CoreCourseModuleCompletionLegacyComponent extends CoreCourseModuleCompletionBaseComponent
    implements OnInit, OnDestroy {

    completionImage?: string;
    completionDescription$ = new BehaviorSubject('');

    protected completionObserver?: CoreEventObserver;

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.completionObserver = CoreEvents.on(CoreEvents.MANUAL_COMPLETION_CHANGED, (data) => {
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
    protected async calculateData(): Promise<void> {
        if (!this.completion) {
            return;
        }

        const moduleName = this.moduleName || '';
        let langKey: string | undefined;
        let image: string | undefined;

        if (this.completion.tracking === CoreCourseModuleCompletionTracking.MANUAL) {
            if (this.completion.state === CoreCourseModuleCompletionStatus.COMPLETION_INCOMPLETE) {
                image = 'completion-manual-n';
                langKey = 'core.completion-alt-manual-n';
            } else if (this.completion.state === CoreCourseModuleCompletionStatus.COMPLETION_COMPLETE) {
                image = 'completion-manual-y';
                langKey = 'core.completion-alt-manual-y';
            }
        } else if (this.completion.tracking === CoreCourseModuleCompletionTracking.AUTOMATIC) {
            if (this.completion.state === CoreCourseModuleCompletionStatus.COMPLETION_INCOMPLETE) {
                image = 'completion-auto-n';
                langKey = 'core.completion-alt-auto-n';
            } else if (this.completion.state === CoreCourseModuleCompletionStatus.COMPLETION_COMPLETE) {
                image = 'completion-auto-y';
                langKey = 'core.completion-alt-auto-y';
            } else if (this.completion.state === CoreCourseModuleCompletionStatus.COMPLETION_COMPLETE_PASS) {
                image = 'completion-auto-pass';
                langKey = 'core.completion-alt-auto-pass';
            } else if (this.completion.state === CoreCourseModuleCompletionStatus.COMPLETION_COMPLETE_FAIL) {
                image = 'completion-auto-fail';
                langKey = 'core.completion-alt-auto-fail';
            }
        }

        if (image) {
            if (this.completion.overrideby && this.completion.overrideby > 0) {
                image += '-override';
            }
            this.completionImage = `assets/img/completion/${image}.svg`;
        }

        if (!moduleName || !this.moduleId || !langKey) {
            return;
        }

        const result = await CoreFilterHelper.getFiltersAndFormatText(
            moduleName,
            ContextLevel.MODULE,
            this.moduleId,
            { clean: true, singleLine: true, shortenLength: 50, courseId: this.completion.courseId },
        );

        let translateParams: Record<string, unknown> = {
            $a: result.text,
        };

        if (this.completion.overrideby && this.completion.overrideby > 0) {
            langKey += '-override';

            const profile = await CoreUser.getProfile(this.completion.overrideby, this.completion.courseId, true);

            translateParams = {
                $a: {
                    overrideuser: profile.fullname,
                    modname: result.text,
                },
            };
        }

        this.completionDescription$.next(Translate.instant(langKey, translateParams));
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

        event.stopPropagation();
        event.preventDefault();

        await CoreCourseHelper.changeManualCompletion(this.completion);

        CoreEvents.trigger(CoreEvents.MANUAL_COMPLETION_CHANGED, { completion: this.completion });
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.completionObserver?.off();
    }

}
