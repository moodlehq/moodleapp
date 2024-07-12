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
import { RouterModule, Routes } from '@angular/router';

import { CoreSharedModule } from '@/core/shared.module';
import { AddonModQuizComponentsModule } from './components/components.module';

import { AddonModQuizIndexPage } from './pages/index';
import { CoreQuestionComponentsModule } from '@features/question/components/components.module';
import { AddonModQuizPlayerPage } from '@addons/mod/quiz/pages/player/player';
import { canLeaveGuard } from '@guards/can-leave';
import { AddonModQuizReviewPage } from '@addons/mod/quiz/pages/review/review';

const routes: Routes = [
    {
        path: ':courseId/:cmId',
        component: AddonModQuizIndexPage,
    },
    {
        path: ':courseId/:cmId/player',
        component: AddonModQuizPlayerPage,
        canDeactivate: [canLeaveGuard],
    },
    {
        path: ':courseId/:cmId/review/:attemptId',
        component: AddonModQuizReviewPage,
    },
];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
        CoreSharedModule,
        AddonModQuizComponentsModule,
        CoreQuestionComponentsModule,
    ],
    declarations: [
        AddonModQuizIndexPage,
        AddonModQuizPlayerPage,
        AddonModQuizReviewPage,
    ],
})
export default class AddonModQuizLazyModule {}
