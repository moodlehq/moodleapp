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
import { CoreCoursesProvider } from './providers/courses';
import { CoreCoursesHelperProvider } from './providers/helper';
import { CoreDashboardMainMenuHandler } from './providers/mainmenu-handler';
import { CoreCoursesDashboardProvider } from './providers/dashboard';
import { CoreCoursesCourseLinkHandler } from './providers/course-link-handler';
import { CoreCoursesIndexLinkHandler } from './providers/courses-index-link-handler';
import { CoreCoursesDashboardLinkHandler } from './providers/dashboard-link-handler';
import { CoreCoursesEnrolPushClickHandler } from './providers/enrol-push-click-handler';
import { CoreCoursesRequestPushClickHandler } from './providers/request-push-click-handler';
import { CoreMainMenuDelegate } from '@core/mainmenu/providers/delegate';
import { CoreContentLinksDelegate } from '@core/contentlinks/providers/delegate';
import { CorePushNotificationsDelegate } from '@core/pushnotifications/providers/delegate';

// List of providers (without handlers).
export const CORE_COURSES_PROVIDERS: any[] = [
    CoreCoursesProvider,
    CoreCoursesDashboardProvider,
    CoreCoursesHelperProvider
];

@NgModule({
    declarations: [],
    imports: [
    ],
    providers: [
        CoreCoursesProvider,
        CoreCoursesDashboardProvider,
        CoreCoursesHelperProvider,
        CoreDashboardMainMenuHandler,
        CoreCoursesCourseLinkHandler,
        CoreCoursesIndexLinkHandler,
        CoreCoursesDashboardLinkHandler,
        CoreCoursesEnrolPushClickHandler,
        CoreCoursesRequestPushClickHandler
    ],
    exports: []
})
export class CoreCoursesModule {
    constructor(mainMenuDelegate: CoreMainMenuDelegate, contentLinksDelegate: CoreContentLinksDelegate,
            mainMenuHandler: CoreDashboardMainMenuHandler, courseLinkHandler: CoreCoursesCourseLinkHandler,
            indexLinkHandler: CoreCoursesIndexLinkHandler, dashboardLinkHandler: CoreCoursesDashboardLinkHandler,
            pushNotificationsDelegate: CorePushNotificationsDelegate, enrolPushClickHandler: CoreCoursesEnrolPushClickHandler,
            requestPushClickHandler: CoreCoursesRequestPushClickHandler) {
        mainMenuDelegate.registerHandler(mainMenuHandler);

        contentLinksDelegate.registerHandler(courseLinkHandler);
        contentLinksDelegate.registerHandler(indexLinkHandler);
        contentLinksDelegate.registerHandler(dashboardLinkHandler);
        pushNotificationsDelegate.registerClickHandler(enrolPushClickHandler);
        pushNotificationsDelegate.registerClickHandler(requestPushClickHandler);
    }
}
