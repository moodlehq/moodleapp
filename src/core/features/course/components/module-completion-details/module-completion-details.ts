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

import { CoreSharedModule } from '@/core/shared.module';
import { Component, Input, OnInit } from '@angular/core';
import { CoreCourseModuleCompletionStatus } from '@features/course/constants';

import {
    CoreCourseModuleWSRuleDetails,
} from '@features/course/services/course';
import { CoreCourseModuleCompletionData } from '@features/course/services/course-helper';
import { CoreUser } from '@features/user/services/user';
import { Translate } from '@singletons';

/**
 * Component to show automatic completion details dialog.
 */
@Component({
    selector: 'core-course-module-completion-details',
    templateUrl: 'module-completion-details.html',
    styleUrl: 'module-completion-details.scss',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class CoreCourseModuleCompletionDetailsComponent implements OnInit {

    @Input() completion?: CoreCourseModuleCompletionData; // The completion status.

    isTrackedUser = false;
    isManual = false;
    completionDetails: CompletionRule[] = [];

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        if (!this.completion) {
            return;
        }

        this.isManual = !this.completion.isautomatic;
        this.isTrackedUser = !!this.completion.istrackeduser;

        if (!this.completion?.details) {
            return;
        }

        const details = this.completion.details;

        // Format rules.
        this.completionDetails = await Promise.all(details.map(async (rule: CompletionRule) => {
            rule.statusComplete = rule.rulevalue.status === CoreCourseModuleCompletionStatus.COMPLETION_COMPLETE ||
                    rule.rulevalue.status === CoreCourseModuleCompletionStatus.COMPLETION_COMPLETE_PASS;
            rule.statusCompleteFail = rule.rulevalue.status === CoreCourseModuleCompletionStatus.COMPLETION_COMPLETE_FAIL;
            rule.statusIncomplete = rule.rulevalue.status === CoreCourseModuleCompletionStatus.COMPLETION_INCOMPLETE;
            rule.accessibleDescription = null;

            if (this.completion?.overrideby) {
                const fullName = await CoreUser.getUserFullNameWithDefault(this.completion.overrideby, this.completion.courseId);

                const setByData = {
                    $a: {
                        condition: rule.rulevalue.description,
                        setby: fullName,
                    },
                };
                const overrideStatus = rule.statusComplete ? 'done' : 'todo';

                rule.accessibleDescription = Translate.instant('core.course.completion_setby:auto:' + overrideStatus, setByData);
            }

            return rule;
        }));
    }

}

type CompletionRule = CoreCourseModuleWSRuleDetails & {
    statusComplete?: boolean;
    statusCompleteFail?: boolean;
    statusIncomplete?: boolean;
    accessibleDescription?: string | null;
};
