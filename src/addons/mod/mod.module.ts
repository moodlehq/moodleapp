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
import { AddonModBookModule } from './book/book.module';
import { AddonModDataModule } from './data/data.module';
import { AddonModFolderModule } from './folder/folder.module';
import { AddonModForumModule } from './forum/forum.module';
import { AddonModLabelModule } from './label/label.module';
import { AddonModImscpModule } from './imscp/imscp.module';
import { AddonModLessonModule } from './lesson/lesson.module';
import { AddonModPageModule } from './page/page.module';
import { AddonModQuizModule } from './quiz/quiz.module';
import { AddonModResourceModule } from './resource/resource.module';
import { AddonModUrlModule } from './url/url.module';
import { AddonModLtiModule } from './lti/lti.module';
import { AddonModH5PActivityModule } from './h5pactivity/h5pactivity.module';
import { AddonModSurveyModule } from './survey/survey.module';
import { AddonModScormModule } from './scorm/scorm.module';
import { AddonModChoiceModule } from './choice/choice.module';
import { AddonModWikiModule } from './wiki/wiki.module';
import { AddonModGlossaryModule } from './glossary/glossary.module';
import { AddonModChatModule } from './chat/chat.module';

@NgModule({
    imports: [
        AddonModAssignModule,
        AddonModBookModule,
        AddonModDataModule,
        AddonModForumModule,
        AddonModLessonModule,
        AddonModPageModule,
        AddonModQuizModule,
        AddonModUrlModule,
        AddonModLabelModule,
        AddonModResourceModule,
        AddonModFolderModule,
        AddonModImscpModule,
        AddonModLtiModule,
        AddonModH5PActivityModule,
        AddonModSurveyModule,
        AddonModScormModule,
        AddonModChoiceModule,
        AddonModWikiModule,
        AddonModGlossaryModule,
        AddonModChatModule,
    ],
})
export class AddonModModule { }
