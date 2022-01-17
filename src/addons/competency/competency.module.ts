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

import { APP_INITIALIZER, NgModule, Type } from '@angular/core';
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreCourseOptionsDelegate } from '@features/course/services/course-options-delegate';
import { CorePushNotificationsDelegate } from '@features/pushnotifications/services/push-delegate';
import { CoreUserDelegate } from '@features/user/services/user-delegate';
import { AddonCompetencyProvider } from './services/competency';
import { AddonCompetencyHelperProvider } from './services/competency-helper';
import { AddonCompetencyCompetencyLinkHandler } from './services/handlers/competency-link';
import { AddonCompetencyCourseOptionHandler } from './services/handlers/course-option';
import { AddonCompetencyPlanLinkHandler } from './services/handlers/plan-link';
import { AddonCompetencyPlansLinkHandler } from './services/handlers/plans-link';
import { AddonCompetencyPushClickHandler } from './services/handlers/push-click';
import { AddonCompetencyUserCompetencyLinkHandler } from './services/handlers/user-competency-link';
import { AddonCompetencyUserHandler } from './services/handlers/user';
import { Routes } from '@angular/router';
import { CoreMainMenuRoutingModule } from '@features/mainmenu/mainmenu-routing.module';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreCourseIndexRoutingModule } from '@features/course/pages/index/index-routing.module';
import { COURSE_PAGE_NAME } from '@features/course/course.module';
import { PARTICIPANTS_PAGE_NAME } from '@features/user/user.module';

// List of providers (without handlers).
export const ADDON_COMPETENCY_SERVICES: Type<unknown>[] = [
    AddonCompetencyProvider,
    AddonCompetencyHelperProvider,
];

export const ADDON_COMPETENCY_LEARNING_PLANS_PAGE = 'learning-plans';
export const ADDON_COMPETENCY_COMPETENCIES_PAGE = 'competencies';
export const ADDON_COMPETENCY_SUMMARY_PAGE = 'summary';

const mainMenuChildrenRoutes: Routes = [
    {
        path: ADDON_COMPETENCY_LEARNING_PLANS_PAGE,
        loadChildren: () => import('./competency-learning-plans-lazy.module').then(m => m.AddonCompetencyLearningPlansLazyModule),
    },
    {
        path: `${COURSE_PAGE_NAME}/:courseId/${ADDON_COMPETENCY_COMPETENCIES_PAGE}`,
        loadChildren: () => import('./competency-course-details-lazy.module').then(m => m.AddonCompetencyCourseDetailsLazyModule),
    },
    {
        path: `${COURSE_PAGE_NAME}/:courseId/${PARTICIPANTS_PAGE_NAME}/:userId/${ADDON_COMPETENCY_COMPETENCIES_PAGE}`,
        loadChildren: () => import('./competency-course-details-lazy.module').then(m => m.AddonCompetencyCourseDetailsLazyModule),
    },
];

const courseIndexRoutes: Routes = [
    {
        path: ADDON_COMPETENCY_COMPETENCIES_PAGE,
        loadChildren: () => import('./competency-course-contents-lazy.module').then(m => m.AddonCompetencyCourseContentsLazyModule),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(mainMenuChildrenRoutes),
        CoreCourseIndexRoutingModule.forChild({ children: courseIndexRoutes }),
    ],
    exports: [CoreMainMenuRoutingModule],
    providers: [
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: () => {
                CoreContentLinksDelegate.registerHandler(AddonCompetencyCompetencyLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonCompetencyPlanLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonCompetencyPlansLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonCompetencyUserCompetencyLinkHandler.instance);
                CoreUserDelegate.registerHandler(AddonCompetencyUserHandler.instance);
                CoreCourseOptionsDelegate.registerHandler(AddonCompetencyCourseOptionHandler.instance);
                CorePushNotificationsDelegate.registerClickHandler(AddonCompetencyPushClickHandler.instance);
            },
        },
    ],
})
export class AddonCompetencyModule {}
