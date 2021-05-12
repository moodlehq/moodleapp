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

import { Component, Input } from '@angular/core';

import { CoreCourseModuleCompletionBaseComponent } from '@features/course/classes/module-completion';
import { CoreCourseModuleWSRuleDetails, CoreCourseProvider } from '@features/course/services/course';
import { CoreUser } from '@features/user/services/user';
import { Translate } from '@singletons';

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
    styleUrls: ['module-completion.scss'],
})
export class CoreCourseModuleCompletionComponent extends CoreCourseModuleCompletionBaseComponent {

    @Input() showCompletionConditions = false; // Whether to show activity completion conditions.
    @Input() showManualCompletion = false; // Whether to show manual completion.

    details?: CompletionRule[];
    accessibleDescription: string | null = null;

    /**
     * @inheritdoc
     */
    protected async calculateData(): Promise<void> {
        if (!this.completion?.details) {
            return;
        }

        // Format rules.
        this.details = await Promise.all(this.completion.details.map(async (rule: CompletionRule) => {
            rule.statuscomplete = rule.rulevalue.status == CoreCourseProvider.COMPLETION_COMPLETE ||
                    rule.rulevalue.status == CoreCourseProvider.COMPLETION_COMPLETE_PASS;
            rule.statuscompletefail = rule.rulevalue.status == CoreCourseProvider.COMPLETION_COMPLETE_FAIL;
            rule.statusincomplete = rule.rulevalue.status == CoreCourseProvider.COMPLETION_INCOMPLETE;
            rule.accessibleDescription = null;

            if (this.completion!.overrideby) {
                const fullName = await CoreUser.getUserFullNameWithDefault(this.completion!.overrideby, this.completion!.courseId);

                const setByData = {
                    $a: {
                        condition: rule.rulevalue.description,
                        setby: fullName,
                    },
                };
                const overrideStatus = rule.statuscomplete ? 'done' : 'todo';

                rule.accessibleDescription = Translate.instant('core.course.completion_setby:auto:' + overrideStatus, setByData);
            }

            return rule;
        }));
    }

}

type CompletionRule = CoreCourseModuleWSRuleDetails & {
    statuscomplete?: boolean;
    statuscompletefail?: boolean;
    statusincomplete?: boolean;
    accessibleDescription?: string | null;
};
