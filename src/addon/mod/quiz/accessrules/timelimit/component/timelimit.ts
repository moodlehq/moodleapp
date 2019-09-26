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
import { FormGroup } from '@angular/forms';

/**
 * Component to render the preflight for time limit.
 */
@Component({
    selector: 'addon-mod-quiz-access-time-limit',
    templateUrl: 'addon-mod-quiz-access-time-limit.html'
})
export class AddonModQuizAccessTimeLimitComponent {

    @Input() rule: string; // The name of the rule.
    @Input() quiz: any; // The quiz the rule belongs to.
    @Input() attempt: any; // The attempt being started/continued.
    @Input() prefetch: boolean; // Whether the user is prefetching the quiz.
    @Input() siteId: string; // Site ID.
    @Input() form: FormGroup; // Form where to add the form control.

    constructor() {
        // Nothing to do, we don't need to send anything for time limit.
    }
}
