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

import { AddonModAssignModule } from './assign/assign.module';
import { AddonModBBBModule } from './bigbluebuttonbn/bigbluebuttonbn.module';
import { AddonModBookModule } from './book/book.module';
import { AddonModChatModule } from './chat/chat.module';
import { AddonModChoiceModule } from './choice/choice.module';
import { AddonModDataModule } from './data/data.module';
import { AddonModFeedbackModule } from './feedback/feedback.module';
import { AddonModFolderModule } from './folder/folder.module';
import { AddonModForumModule } from './forum/forum.module';
import { AddonModGlossaryModule } from './glossary/glossary.module';
import { AddonModH5PActivityModule } from './h5pactivity/h5pactivity.module';
import { AddonModImscpModule } from './imscp/imscp.module';
import { AddonModLabelModule } from './label/label.module';
import { AddonModLessonModule } from './lesson/lesson.module';
import { AddonModLtiModule } from './lti/lti.module';
import { AddonModPageModule } from './page/page.module';
import { AddonModQbankModule } from './qbank/qbank.module';
import { AddonModQuizModule } from './quiz/quiz.module';
import { AddonModResourceModule } from './resource/resource.module';
import { AddonModScormModule } from './scorm/scorm.module';
import { AddonModSubsectionModule } from './subsection/subsection.module';
import { AddonModSurveyModule } from './survey/survey.module';
import { AddonModUrlModule } from './url/url.module';
import { AddonModWikiModule } from './wiki/wiki.module';
import { AddonModWorkshopModule } from './workshop/workshop.module';

@NgModule({
    imports: [
        AddonModAssignModule,
        AddonModBBBModule,
        AddonModBookModule,
        AddonModChatModule,
        AddonModChoiceModule,
        AddonModDataModule,
        AddonModFeedbackModule,
        AddonModFolderModule,
        AddonModForumModule,
        AddonModGlossaryModule,
        AddonModH5PActivityModule,
        AddonModImscpModule,
        AddonModLabelModule,
        AddonModLessonModule,
        AddonModLtiModule,
        AddonModPageModule,
        AddonModQbankModule,
        AddonModQuizModule,
        AddonModResourceModule,
        AddonModScormModule,
        AddonModSubsectionModule,
        AddonModSurveyModule,
        AddonModUrlModule,
        AddonModWikiModule,
        AddonModWorkshopModule,
    ],
})
export class AddonModModule {}
