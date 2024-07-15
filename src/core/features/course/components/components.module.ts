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
import { CoreBlockComponentsModule } from '@features/block/components/components.module';
import { CoreCourseFormatComponent } from './course-format/course-format';
import { CoreCourseModuleComponent } from './module/module';
import { CoreCourseModuleCompletionComponent } from './module-completion/module-completion';
import { CoreCourseTagAreaComponent } from './tag-area/tag-area';
import { CoreCourseUnsupportedModuleComponent } from './unsupported-module/unsupported-module';
import { CoreCourseModuleCompletionLegacyComponent } from './module-completion-legacy/module-completion-legacy';
import { CoreCourseModuleInfoComponent } from './module-info/module-info';
import { CoreCourseModuleNavigationComponent } from './module-navigation/module-navigation';
import { CoreCourseModuleSummaryComponent } from './module-summary/module-summary';
import { CoreCourseCourseIndexTourComponent } from './course-index-tour/course-index-tour';
import { CoreRemindersComponentsModule } from '@features/reminders/components/components.module';
import { CoreCourseModuleCompletionDetailsComponent } from './module-completion-details/module-completion-details';

@NgModule({
    declarations: [
        CoreCourseFormatComponent,
        CoreCourseModuleComponent,
        CoreCourseModuleCompletionComponent,
        CoreCourseModuleCompletionLegacyComponent,
        CoreCourseModuleInfoComponent,
        CoreCourseCourseIndexTourComponent,
        CoreCourseTagAreaComponent,
        CoreCourseUnsupportedModuleComponent,
        CoreCourseModuleNavigationComponent,
        CoreCourseModuleSummaryComponent,
        CoreCourseModuleCompletionDetailsComponent,
    ],
    imports: [
        CoreBlockComponentsModule,
        CoreRemindersComponentsModule,
        CoreSharedModule,
    ],
    exports: [
        CoreCourseFormatComponent,
        CoreCourseModuleComponent,
        CoreCourseModuleCompletionComponent,
        CoreCourseModuleCompletionLegacyComponent,
        CoreCourseModuleInfoComponent,
        CoreCourseCourseIndexTourComponent,
        CoreCourseTagAreaComponent,
        CoreCourseUnsupportedModuleComponent,
        CoreCourseModuleNavigationComponent,
        CoreCourseModuleSummaryComponent,
        CoreCourseModuleCompletionDetailsComponent,
    ],
})
export class CoreCourseComponentsModule {}
