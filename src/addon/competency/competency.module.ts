// (C) Copyright 2015 Martin Dougiamas
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
import { AddonCompetencyProvider } from './providers/competency';
import { AddonCompetencyHelperProvider } from './providers/helper';
import { AddonCompetencyCourseOptionHandler } from './providers/course-option-handler';
import { AddonCompetencyMainMenuHandler } from './providers/mainmenu-handler';
import { AddonCompetencyUserHandler } from './providers/user-handler';
import { AddonCompetencyCompetencyLinkHandler } from './providers/competency-link-handler';
import { AddonCompetencyPlanLinkHandler } from './providers/plan-link-handler';
import { AddonCompetencyPlansLinkHandler } from './providers/plans-link-handler';
import { AddonCompetencyUserCompetencyLinkHandler } from './providers/user-competency-link-handler';
import { AddonCompetencyPushClickHandler } from './providers/push-click-handler';
import { AddonCompetencyComponentsModule } from './components/components.module';
import { CoreCourseOptionsDelegate } from '@core/course/providers/options-delegate';
import { CoreMainMenuDelegate } from '@core/mainmenu/providers/delegate';
import { CoreUserDelegate } from '@core/user/providers/user-delegate';
import { CoreContentLinksDelegate } from '@core/contentlinks/providers/delegate';
import { CorePushNotificationsDelegate } from '@core/pushnotifications/providers/delegate';

// List of providers (without handlers).
export const ADDON_COMPETENCY_PROVIDERS: any[] = [
    AddonCompetencyProvider,
    AddonCompetencyHelperProvider
];

@NgModule({
    declarations: [
    ],
    imports: [
        AddonCompetencyComponentsModule
    ],
    providers: [
        AddonCompetencyProvider,
        AddonCompetencyHelperProvider,
        AddonCompetencyCourseOptionHandler,
        AddonCompetencyMainMenuHandler,
        AddonCompetencyUserHandler,
        AddonCompetencyCompetencyLinkHandler,
        AddonCompetencyPlanLinkHandler,
        AddonCompetencyPlansLinkHandler,
        AddonCompetencyUserCompetencyLinkHandler,
        AddonCompetencyPushClickHandler
    ]
})
export class AddonCompetencyModule {
    constructor(mainMenuDelegate: CoreMainMenuDelegate, mainMenuHandler: AddonCompetencyMainMenuHandler,
            courseOptionsDelegate: CoreCourseOptionsDelegate, courseOptionHandler: AddonCompetencyCourseOptionHandler,
            userDelegate: CoreUserDelegate, userHandler: AddonCompetencyUserHandler,
            contentLinksDelegate: CoreContentLinksDelegate, competencyLinkHandler: AddonCompetencyCompetencyLinkHandler,
            planLinkHandler: AddonCompetencyPlanLinkHandler, plansLinkHandler: AddonCompetencyPlansLinkHandler,
            userComptencyLinkHandler: AddonCompetencyUserCompetencyLinkHandler,
            pushNotificationsDelegate: CorePushNotificationsDelegate, pushClickHandler: AddonCompetencyPushClickHandler) {

        mainMenuDelegate.registerHandler(mainMenuHandler);
        courseOptionsDelegate.registerHandler(courseOptionHandler);
        userDelegate.registerHandler(userHandler);
        contentLinksDelegate.registerHandler(competencyLinkHandler);
        contentLinksDelegate.registerHandler(planLinkHandler);
        contentLinksDelegate.registerHandler(plansLinkHandler);
        contentLinksDelegate.registerHandler(userComptencyLinkHandler);
        pushNotificationsDelegate.registerClickHandler(pushClickHandler);
    }
}
