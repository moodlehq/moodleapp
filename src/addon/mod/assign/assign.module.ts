// (C) Copyright 2015 Martin Dougiamas
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

import { NgModule } from '@angular/core';
import { AddonModAssignProvider } from './providers/assign';
import { AddonModAssignOfflineProvider } from './providers/assign-offline';
import { AddonModAssignFeedbackDelegate } from './providers/feedback-delegate';
import { AddonModAssignSubmissionDelegate } from './providers/submission-delegate';
import { AddonModAssignDefaultFeedbackHandler } from './providers/default-feedback-handler';
import { AddonModAssignDefaultSubmissionHandler } from './providers/default-submission-handler';

@NgModule({
    declarations: [
    ],
    providers: [
        AddonModAssignProvider,
        AddonModAssignOfflineProvider,
        AddonModAssignFeedbackDelegate,
        AddonModAssignSubmissionDelegate,
        AddonModAssignDefaultFeedbackHandler,
        AddonModAssignDefaultSubmissionHandler
    ]
})
export class AddonModAssignModule { }
