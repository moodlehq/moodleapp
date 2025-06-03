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

import { Component, OnInit, Input } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';

import { AddonModQuizAttemptWSData, AddonModQuizQuizWSData } from '@addons/mod/quiz/services/quiz';
import { toBoolean } from '@/core/transforms/boolean';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Component to render the preflight for password.
 */
@Component({
    selector: 'addon-mod-quiz-access-password',
    templateUrl: 'addon-mod-quiz-access-password.html',
    imports: [
        CoreSharedModule,
    ],
})
export class AddonModQuizAccessPasswordComponent implements OnInit {

    @Input() rule?: string; // The name of the rule.
    @Input() quiz?: AddonModQuizQuizWSData; // The quiz the rule belongs to.
    @Input() attempt?: AddonModQuizAttemptWSData; // The attempt being started/continued.
    @Input({ transform: toBoolean }) prefetch = false; // Whether the user is prefetching the quiz.
    @Input() siteId?: string; // Site ID.
    @Input() form?: FormGroup; // Form where to add the form control.

    constructor(private fb: FormBuilder) { }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        // Add the control for the password.
        this.form?.addControl('quizpassword', this.fb.control(''));
    }

}
