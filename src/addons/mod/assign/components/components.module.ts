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

import { NgModule } from '@angular/core';

import { CoreSharedModule } from '@/core/shared.module';
import { CoreCourseComponentsModule } from '@features/course/components/components.module';
import { AddonModAssignIndexComponent } from './index/index';
import { AddonModAssignSubmissionComponent } from './submission/submission';
import { AddonModAssignSubmissionPluginComponent } from './submission-plugin/submission-plugin';
import { AddonModAssignFeedbackPluginComponent } from './feedback-plugin/feedback-plugin';

@NgModule({
    declarations: [
        AddonModAssignIndexComponent,
        AddonModAssignSubmissionComponent,
        AddonModAssignSubmissionPluginComponent,
        AddonModAssignFeedbackPluginComponent,
    ],
    imports: [
        CoreSharedModule,
        CoreCourseComponentsModule,
    ],
    exports: [
        AddonModAssignIndexComponent,
        AddonModAssignSubmissionComponent,
        AddonModAssignSubmissionPluginComponent,
        AddonModAssignFeedbackPluginComponent,
    ],
})
export class AddonModAssignComponentsModule {}
