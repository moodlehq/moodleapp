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
import { AddonModFolderModule } from './folder/folder.module';
import { AddonModForumModule } from './forum/forum.module';
import { AddonModLabelModule } from './label/label.module';
import { AddonModLessonModule } from './lesson/lesson.module';
import { AddonModPageModule } from './page/page.module';
import { AddonModQuizModule } from './quiz/quiz.module';
import { AddonModUrlModule } from './url/url.module';

@NgModule({
    declarations: [],
    imports: [
        AddonModAssignModule,
        AddonModBookModule,
        AddonModForumModule,
        AddonModLessonModule,
        AddonModPageModule,
        AddonModQuizModule,
        AddonModUrlModule,
        AddonModLabelModule,
        AddonModFolderModule,
    ],
    providers: [],
    exports: [],
})
export class AddonModModule { }
