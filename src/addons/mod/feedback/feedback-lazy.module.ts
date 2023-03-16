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
import { AddonModFeedbackComponentsModule } from './components/components.module';
import { AddonModFeedbackIndexPage } from './pages/index/index';
import { AddonModFeedbackAttemptsPage } from './pages/attempts/attempts';
import { conditionalRoutes } from '@/app/app-routing.module';
import { CoreScreen } from '@services/screen';
import { AddonModFeedbackAttemptPage } from '@addons/mod/feedback/pages/attempt/attempt';
import { AddonModFeedbackFormPage } from '@addons/mod/feedback/pages/form/form';
import { CanLeaveGuard } from '@guards/can-leave';
import { AddonModFeedbackNonRespondentsPage } from '@addons/mod/feedback/pages/nonrespondents/nonrespondents';

const commonRoutes: Routes = [
    {
        path: ':courseId/:cmId',
        component: AddonModFeedbackIndexPage,
    },
    {
        path: ':courseId/:cmId/form',
        component: AddonModFeedbackFormPage,
        canDeactivate: [CanLeaveGuard],
    },
    {
        path: ':courseId/:cmId/nonrespondents',
        component: AddonModFeedbackNonRespondentsPage,
    },
];

const mobileRoutes: Routes = [
    ...commonRoutes,
    {
        path: ':courseId/:cmId/attempts',
        component: AddonModFeedbackAttemptsPage,
    },
    {
        path: ':courseId/:cmId/attempts/:attemptId',
        component: AddonModFeedbackAttemptPage,
    },
];

const tabletRoutes: Routes = [
    ...commonRoutes,
    {
        path: ':courseId/:cmId/attempts',
        component: AddonModFeedbackAttemptsPage,
        children: [
            {
                path: ':attemptId',
                component: AddonModFeedbackAttemptPage,
            },
        ],
    },
];

const routes: Routes = [
    ...conditionalRoutes(mobileRoutes, () => CoreScreen.isMobile),
    ...conditionalRoutes(tabletRoutes, () => CoreScreen.isTablet),
];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
        CoreSharedModule,
        AddonModFeedbackComponentsModule,
    ],
    declarations: [
        AddonModFeedbackAttemptsPage,
        AddonModFeedbackFormPage,
        AddonModFeedbackIndexPage,
        AddonModFeedbackNonRespondentsPage,
        AddonModFeedbackAttemptPage,
    ],
})
export class AddonModFeedbackLazyModule {}
