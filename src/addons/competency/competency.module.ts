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
import { CoreMainMenuDelegate } from '@features/mainmenu/services/mainmenu-delegate';
import { CorePushNotificationsDelegate } from '@features/pushnotifications/services/push-delegate';
import { CoreUserDelegate } from '@features/user/services/user-delegate';
import { AddonCompetencyProvider } from './services/competency';
import { AddonCompetencyHelperProvider } from './services/competency-helper';
import { AddonCompetencyCompetencyLinkHandler } from './services/handlers/competency-link';
import { AddonCompetencyCourseOptionHandler } from './services/handlers/course-option';
import { AddonCompetencyMainMenuHandler, AddonCompetencyMainMenuHandlerService } from './services/handlers/mainmenu';
import { AddonCompetencyPlanLinkHandler } from './services/handlers/plan-link';
import { AddonCompetencyPlansLinkHandler } from './services/handlers/plans-link';
import { AddonCompetencyPushClickHandler } from './services/handlers/push-click';
import { AddonCompetencyUserCompetencyLinkHandler } from './services/handlers/user-competency-link';
import { AddonCompetencyUserHandler } from './services/handlers/user';
import { Routes } from '@angular/router';
import { CoreMainMenuRoutingModule } from '@features/mainmenu/mainmenu-routing.module';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreCourseIndexRoutingModule } from '@features/course/pages/index/index-routing.module';

// List of providers (without handlers).
export const ADDON_COMPETENCY_SERVICES: Type<unknown>[] = [
    AddonCompetencyProvider,
    AddonCompetencyHelperProvider,
];

const mainMenuChildrenRoutes: Routes = [
    {
        path: AddonCompetencyMainMenuHandlerService.PAGE_NAME,
        loadChildren: () => import('./competency-lazy.module').then(m => m.AddonCompetencyLazyModule),
    },
];

const courseIndexRoutes: Routes = [
    {
        path: AddonCompetencyMainMenuHandlerService.PAGE_NAME,
        loadChildren: () => import('@addons/competency/competency-course-lazy.module').then(m => m.AddonCompetencyCourseLazyModule),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(mainMenuChildrenRoutes),
        CoreMainMenuRoutingModule.forChild({ children: mainMenuChildrenRoutes }),
        CoreCourseIndexRoutingModule.forChild({ children: courseIndexRoutes }),
    ],
    exports: [CoreMainMenuRoutingModule],
    providers: [
        {
            provide: APP_INITIALIZER,
            multi: true,
            deps: [],
            useFactory: () => async () => {
                CoreContentLinksDelegate.registerHandler(AddonCompetencyCompetencyLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonCompetencyPlanLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonCompetencyPlansLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonCompetencyUserCompetencyLinkHandler.instance);
                CoreMainMenuDelegate.registerHandler(AddonCompetencyMainMenuHandler.instance);
                CoreUserDelegate.registerHandler(AddonCompetencyUserHandler.instance);
                CoreCourseOptionsDelegate.registerHandler(AddonCompetencyCourseOptionHandler.instance);
                CorePushNotificationsDelegate.registerClickHandler(AddonCompetencyPushClickHandler.instance);
            },
        },
    ],
})
export class AddonCompetencyModule {}
