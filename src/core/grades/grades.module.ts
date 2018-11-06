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
import { CoreGradesProvider } from './providers/grades';
import { CoreGradesHelperProvider } from './providers/helper';
import { CoreMainMenuDelegate } from '@core/mainmenu/providers/delegate';
import { CoreGradesMainMenuHandler } from './providers/mainmenu-handler';
import { CoreGradesCourseOptionHandler } from './providers/course-option-handler';
import { CoreGradesComponentsModule } from './components/components.module';
import { CoreCourseOptionsDelegate } from '@core/course/providers/options-delegate';
import { CoreGradesUserLinkHandler } from './providers/user-link-handler';
import { CoreGradesOverviewLinkHandler } from './providers/overview-link-handler';
import { CoreContentLinksDelegate } from '@core/contentlinks/providers/delegate';
import { CoreGradesUserHandler } from './providers/user-handler';
import { CoreUserDelegate } from '@core/user/providers/user-delegate';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreUserProvider } from '@core/user/providers/user';

// List of providers (without handlers).
export const CORE_GRADES_PROVIDERS: any[] = [
    CoreGradesProvider,
    CoreGradesHelperProvider
];

@NgModule({
    declarations: [
    ],
    imports: [
        CoreGradesComponentsModule
    ],
    providers: [
        CoreGradesProvider,
        CoreGradesHelperProvider,
        CoreGradesMainMenuHandler,
        CoreGradesCourseOptionHandler,
        CoreGradesUserLinkHandler,
        CoreGradesOverviewLinkHandler,
        CoreGradesUserHandler
    ]
})
export class CoreGradesModule {
    constructor(mainMenuDelegate: CoreMainMenuDelegate, gradesMenuHandler: CoreGradesMainMenuHandler,
            courseOptionHandler: CoreGradesCourseOptionHandler, courseOptionsDelegate: CoreCourseOptionsDelegate,
            contentLinksDelegate: CoreContentLinksDelegate, userLinkHandler: CoreGradesUserLinkHandler,
            overviewLinkHandler: CoreGradesOverviewLinkHandler, userHandler: CoreGradesUserHandler,
            userDelegate: CoreUserDelegate, eventsProvider: CoreEventsProvider, sitesProvider: CoreSitesProvider) {

        // Register handlers.
        mainMenuDelegate.registerHandler(gradesMenuHandler);
        courseOptionsDelegate.registerHandler(courseOptionHandler);
        contentLinksDelegate.registerHandler(userLinkHandler);
        contentLinksDelegate.registerHandler(overviewLinkHandler);
        userDelegate.registerHandler(userHandler);

        // Clear user profile handler cache.
        eventsProvider.on(CoreUserProvider.PROFILE_REFRESHED, (data) => {
            userHandler.clearViewGradesCache(data.courseId, data.userId);
        }, sitesProvider.getCurrentSiteId());

        eventsProvider.on(CoreEventsProvider.LOGOUT, () => {
            userHandler.clearViewGradesCache();
        }, sitesProvider.getCurrentSiteId());
    }
}
