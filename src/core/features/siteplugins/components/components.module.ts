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
import { CoreCompileHtmlComponentModule } from '@features/compile/components/compile-html/compile-html.module';
import { CoreSitePluginsPluginContentComponent } from './plugin-content/plugin-content';
import { CoreSitePluginsModuleIndexComponent } from './module-index/module-index';
import { CoreSitePluginsCourseFormatComponent } from './course-format/course-format';
import { CoreSitePluginsUserProfileFieldComponent } from './user-profile-field/user-profile-field';
import { CoreSitePluginsQuestionComponent } from './question/question';
import { CoreSitePluginsQuestionBehaviourComponent } from './question-behaviour/question-behaviour';
import { CoreSitePluginsQuizAccessRuleComponent } from './quiz-access-rule/quiz-access-rule';
import { CoreSitePluginsAssignFeedbackComponent } from './assign-feedback/assign-feedback';
import { CoreSitePluginsAssignSubmissionComponent } from './assign-submission/assign-submission';
import { CoreSitePluginsWorkshopAssessmentStrategyComponent } from './workshop-assessment-strategy/workshop-assessment-strategy';
import { CoreSitePluginsBlockComponent } from './block/block';
import { CoreSitePluginsOnlyTitleBlockComponent } from './only-title-block/only-title-block';

@NgModule({
    declarations: [
        CoreSitePluginsPluginContentComponent,
        CoreSitePluginsModuleIndexComponent,
        CoreSitePluginsBlockComponent,
        CoreSitePluginsOnlyTitleBlockComponent,
        CoreSitePluginsCourseFormatComponent,
        CoreSitePluginsUserProfileFieldComponent,
        CoreSitePluginsQuestionComponent,
        CoreSitePluginsQuestionBehaviourComponent,
        CoreSitePluginsQuizAccessRuleComponent,
        CoreSitePluginsAssignFeedbackComponent,
        CoreSitePluginsAssignSubmissionComponent,
        CoreSitePluginsWorkshopAssessmentStrategyComponent,
    ],
    imports: [
        CoreSharedModule,
        CoreCompileHtmlComponentModule,
    ],
    exports: [
        CoreSitePluginsPluginContentComponent,
        CoreSitePluginsModuleIndexComponent,
        CoreSitePluginsBlockComponent,
        CoreSitePluginsOnlyTitleBlockComponent,
        CoreSitePluginsCourseFormatComponent,
        CoreSitePluginsUserProfileFieldComponent,
        CoreSitePluginsQuestionComponent,
        CoreSitePluginsQuestionBehaviourComponent,
        CoreSitePluginsQuizAccessRuleComponent,
        CoreSitePluginsAssignFeedbackComponent,
        CoreSitePluginsAssignSubmissionComponent,
        CoreSitePluginsWorkshopAssessmentStrategyComponent,
    ],
})
export class CoreSitePluginsComponentsModule {}
