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
import { CoreSharedModule } from '@/core/shared.module';
import { AddonModH5PActivityAttempt } from '../../services/h5pactivity';
import { AddonModH5PActivityAttemptCompletionComponent } from '../attempt-completion/attempt-completion';
import { AddonModH5PActivityAttemptSuccessComponent } from '../attempt-success/attempt-success';

/**
 * Component that displays information of an attempt.
 */
@Component({
    selector: 'addon-mod-h5pactivity-attempt-summary',
    templateUrl: 'attempt-summary.html',
    styleUrl: 'attempt-summary.scss',
    imports: [
        CoreSharedModule,
        AddonModH5PActivityAttemptCompletionComponent,
        AddonModH5PActivityAttemptSuccessComponent,
    ],
})
export class AddonModH5PActivityAttemptSummaryComponent  {

    @Input({ required: true }) attempt!: AddonModH5PActivityAttempt;

}
