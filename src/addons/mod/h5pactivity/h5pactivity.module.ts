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
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreCronDelegate } from '@services/cron';
import { AddonModH5PActivityIndexLinkHandler } from './services/handlers/index-link';
import { AddonModH5PActivityModuleHandler } from './services/handlers/module';
import { AddonModH5PActivityPrefetchHandler } from './services/handlers/prefetch';
import { AddonModH5PActivityReportLinkHandler } from './services/handlers/report-link';
import { AddonModH5PActivitySyncCronHandler } from './services/handlers/sync-cron';
import { ADDON_MOD_H5PACTIVITY_PAGE_NAME } from './constants';
import { canLeaveGuard } from '@guards/can-leave';

const routes: Routes = [
    {
        path: ADDON_MOD_H5PACTIVITY_PAGE_NAME,
        children: [
            {
                path: ':courseId/:cmId',
                loadComponent: () => import('./pages/index/index'),
                canDeactivate: [canLeaveGuard],
            },
            {
                path: ':courseId/:cmId/userattempts/:userId',
                loadComponent: () => import('./pages/user-attempts/user-attempts'),
            },
            {
                path: ':courseId/:cmId/attemptresults/:attemptId',
                loadComponent: () => import('./pages/attempt-results/attempt-results'),
            },
            {
                path: ':courseId/:cmId/users',
                loadComponent: () => import('./pages/users-attempts/users-attempts'),
            },
        ],
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
    ],
    providers: [
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: () => {
                CoreCourseModuleDelegate.registerHandler(AddonModH5PActivityModuleHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModH5PActivityIndexLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModH5PActivityReportLinkHandler.instance);
                CoreCourseModulePrefetchDelegate.registerHandler(AddonModH5PActivityPrefetchHandler.instance);
                CoreCronDelegate.register(AddonModH5PActivitySyncCronHandler.instance);
            },
        },
    ],
})
export class AddonModH5PActivityModule {}
