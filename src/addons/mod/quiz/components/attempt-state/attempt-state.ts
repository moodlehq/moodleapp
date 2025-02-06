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

import { Component, Input, OnChanges } from '@angular/core';
import { AddonModQuiz } from '../../services/quiz';
import { toBoolean } from '@/core/transforms/boolean';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Component that displays an attempt state.
 */
@Component({
    selector: 'addon-mod-quiz-attempt-state',
    templateUrl: 'attempt-state.html',
    styleUrl: 'attempt-state.scss',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class AddonModQuizAttemptStateComponent implements OnChanges {

    @Input() state = '';
    @Input({ transform: toBoolean }) finishedOffline = false;

    readableState = '';
    color = '';

    /**
     * @inheritdoc
     */
    async ngOnChanges(): Promise<void> {
        this.readableState = AddonModQuiz.getAttemptReadableStateName(this.state, this.finishedOffline);
        this.color = AddonModQuiz.getAttemptStateColor(this.state, this.finishedOffline);
    }

}
