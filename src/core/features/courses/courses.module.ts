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
import { Routes } from '@angular/router';
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreMainMenuRoutingModule } from '@features/mainmenu/mainmenu-routing.module';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';

import { CoreMainMenuHomeRoutingModule } from '@features/mainmenu/pages/home/home-routing.module';
import { CoreMainMenuHomeDelegate } from '@features/mainmenu/services/home-delegate';
import { CoreMainMenuDelegate } from '@features/mainmenu/services/mainmenu-delegate';
import { CorePushNotificationsDelegate } from '@features/pushnotifications/services/push-delegate';
import { CoreRemindersPushNotificationData } from '@features/reminders/services/reminders';
import { CoreLocalNotifications } from '@services/local-notifications';
import { ApplicationInit } from '@singletons';
import { CoreCoursesProvider } from './services/courses';
import { CoreCoursesHelperProvider } from './services/courses-helper';
import { CoreCoursesDashboardProvider } from './services/dashboard';
import { CoreCoursesCourseLinkHandler } from './services/handlers/course-link';
import { CoreCoursesIndexLinkHandler } from './services/handlers/courses-index-link';

import { CoreDashboardHomeHandler, CoreDashboardHomeHandlerService } from './services/handlers/dashboard-home';
import { CoreCoursesDashboardLinkHandler } from './services/handlers/dashboard-link';
import { CoreCoursesEnrolPushClickHandler } from './services/handlers/enrol-push-click';
import {
    CoreCoursesMyCoursesHomeHandler,
    CoreCoursesMyCoursesMainMenuHandlerService,
} from './services/handlers/my-courses-mainmenu';
import { CoreCoursesRequestPushClickHandler } from './services/handlers/request-push-click';

export const CORE_COURSES_SERVICES: Type<unknown>[] = [
    CoreCoursesProvider,
    CoreCoursesDashboardProvider,
    CoreCoursesHelperProvider,
];

const mainMenuHomeChildrenRoutes: Routes = [
    {
        path: CoreDashboardHomeHandlerService.PAGE_NAME,
        loadChildren: () => import('./pages/dashboard/dashboard.module').then(m => m.CoreCoursesDashboardPageModule),
    },
];

const routes: Routes = [
    {
        path: CoreCoursesMyCoursesMainMenuHandlerService.PAGE_NAME,
        loadChildren: () => import('./courses-lazy.module').then(m => m.CoreCoursesLazyModule),
    },
];

@NgModule({
    imports: [
        CoreMainMenuHomeRoutingModule.forChild({
            children: mainMenuHomeChildrenRoutes,
        }),
        CoreMainMenuRoutingModule.forChild({ children: routes }),
        CoreMainMenuTabRoutingModule.forChild(routes),
    ],
    exports: [CoreMainMenuRoutingModule],
    providers: [
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: () => {
                CoreMainMenuHomeDelegate.registerHandler(CoreDashboardHomeHandler.instance);
                CoreMainMenuDelegate.registerHandler(CoreCoursesMyCoursesHomeHandler.instance);
                CoreContentLinksDelegate.registerHandler(CoreCoursesCourseLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(CoreCoursesIndexLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(CoreCoursesDashboardLinkHandler.instance);
                CorePushNotificationsDelegate.registerClickHandler(CoreCoursesEnrolPushClickHandler.instance);
                CorePushNotificationsDelegate.registerClickHandler(CoreCoursesRequestPushClickHandler.instance);

                CoreLocalNotifications.registerClick<CoreRemindersPushNotificationData>(
                    'course',
                    async (notification) => {
                        await ApplicationInit.donePromise;

                        CoreCourseHelper.getAndOpenCourse(notification.instanceId, {}, notification.siteId);
                    },
                );
            },
        },
    ],
})
export class CoreCoursesModule {}
