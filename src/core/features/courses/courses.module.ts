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

import { APP_INITIALIZER, NgModule } from '@angular/core';
import { Routes } from '@angular/router';
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';

import { CoreMainMenuHomeRoutingModule } from '@features/mainmenu/pages/home/home-routing.module';
import { CoreMainMenuHomeDelegate } from '@features/mainmenu/services/home-delegate';
import { CorePushNotificationsDelegate } from '@features/pushnotifications/services/push-delegate';
import { CoreCoursesCourseLinkHandler } from './services/handlers/course-link';
import { CoreCoursesIndexLinkHandler } from './services/handlers/courses-index-link';

import { CoreDashboardHomeHandler, CoreDashboardHomeHandlerService } from './services/handlers/dashboard-home';
import { CoreCoursesDashboardLinkHandler } from './services/handlers/dashboard-link';
import { CoreCoursesEnrolPushClickHandler } from './services/handlers/enrol-push-click';
import { CoreCoursesMyCoursesHomeHandler, CoreCoursesMyCoursesHomeHandlerService } from './services/handlers/my-courses-home';
import { CoreCoursesRequestPushClickHandler } from './services/handlers/request-push-click';

const mainMenuHomeChildrenRoutes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: CoreDashboardHomeHandlerService.PAGE_NAME,
    },
    {
        path: CoreDashboardHomeHandlerService.PAGE_NAME,
        loadChildren: () => import('./pages/dashboard/dashboard.module').then(m => m.CoreCoursesDashboardPageModule),
    },
    {
        path: CoreCoursesMyCoursesHomeHandlerService.PAGE_NAME,
        loadChildren: () => import('./pages/my-courses/my-courses.module').then(m => m.CoreCoursesMyCoursesPageModule),
    },
];

const mainMenuHomeSiblingRoutes: Routes = [
    {
        path: 'courses',
        loadChildren: () => import('./courses-lazy.module').then(m => m.CoreCoursesLazyModule),
    },
];

@NgModule({
    imports: [
        CoreMainMenuHomeRoutingModule.forChild({
            children: mainMenuHomeChildrenRoutes,
            siblings: mainMenuHomeSiblingRoutes,
        }),
    ],
    providers: [
        {
            provide: APP_INITIALIZER,
            multi: true,
            deps: [],
            useFactory: () => () => {
                CoreMainMenuHomeDelegate.instance.registerHandler(CoreDashboardHomeHandler.instance);
                CoreMainMenuHomeDelegate.instance.registerHandler(CoreCoursesMyCoursesHomeHandler.instance);
                CoreContentLinksDelegate.instance.registerHandler(CoreCoursesCourseLinkHandler.instance);
                CoreContentLinksDelegate.instance.registerHandler(CoreCoursesIndexLinkHandler.instance);
                CoreContentLinksDelegate.instance.registerHandler(CoreCoursesDashboardLinkHandler.instance);
                CorePushNotificationsDelegate.instance.registerClickHandler(CoreCoursesEnrolPushClickHandler.instance);
                CorePushNotificationsDelegate.instance.registerClickHandler(CoreCoursesRequestPushClickHandler.instance);
            },
        },
    ],
})
export class CoreCoursesModule {}
