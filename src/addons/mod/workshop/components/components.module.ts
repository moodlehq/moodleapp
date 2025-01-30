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
import { AddonModWorkshopIndexComponent } from './index/index';
import { AddonModWorkshopSubmissionComponent } from './submission/submission';
import { CoreCourseComponentsModule } from '@features/course/components/components.module';
import { CoreEditorComponentsModule } from '@features/editor/components/components.module';
import { CoreSharedModule } from '@/core/shared.module';
import { AddonModWorkshopAssessmentComponentsModule } from '@addons/mod/workshop/assessment/assesment-components.module';
import { AddonModWorkshopAssessmentComponent } from './assessment/assessment';
import { AddonModWorkshopAssessmentStrategyComponent } from './assessment-strategy/assessment-strategy';

@NgModule({
    imports: [
        CoreSharedModule,
        CoreCourseComponentsModule,
        CoreEditorComponentsModule,
        AddonModWorkshopAssessmentComponentsModule,
        AddonModWorkshopIndexComponent,
        AddonModWorkshopSubmissionComponent,
        AddonModWorkshopAssessmentComponent,
        AddonModWorkshopAssessmentStrategyComponent,
    ],
    exports: [
        AddonModWorkshopIndexComponent,
        AddonModWorkshopSubmissionComponent,
        AddonModWorkshopAssessmentComponent,
        AddonModWorkshopAssessmentStrategyComponent,
    ],
})
export class AddonModWorkshopComponentsModule {}
