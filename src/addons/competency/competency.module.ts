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
import { AddonCompetencyCompetencyLinkHandler } from './services/handlers/competency-link';
import { AddonCompetencyCourseOptionHandler } from './services/handlers/course-option';
import { AddonCompetencyPlanLinkHandler } from './services/handlers/plan-link';
import { AddonCompetencyPlansLinkHandler } from './services/handlers/plans-link';
import { AddonCompetencyPushClickHandler } from './services/handlers/push-click';
import { AddonCompetencyUserCompetencyLinkHandler } from './services/handlers/user-competency-link';
import { AddonCompetencyUserHandler } from './services/handlers/user';
import { Routes } from '@angular/router';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreCourseIndexRoutingModule } from '@features/course/course-routing.module';
import { PARTICIPANTS_PAGE_NAME } from '@features/user/constants';
import { COURSE_PAGE_NAME } from '@features/course/constants';
import { ADDON_COMPETENCY_LEARNING_PLANS_PAGE, ADDON_COMPETENCY_COMPETENCIES_PAGE } from './constants';

/**
 * Get competency services.
 *
 * @returns Competency services.
 */
export async function getCompetencyServices(): Promise<Type<unknown>[]> {
    const { AddonCompetencyProvider } = await import('@addons/competency/services/competency');
    const { AddonCompetencyHelperProvider } = await import('@addons/competency/services/competency-helper');

    return [
        AddonCompetencyProvider,
        AddonCompetencyHelperProvider,
    ];
}

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
