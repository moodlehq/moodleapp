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
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreCronDelegate } from '@services/cron';
import { AddonModH5PActivityComponentsModule } from './components/components.module';
import { AddonModH5PActivityIndexLinkHandler } from './services/handlers/index-link';
import { AddonModH5PActivityModuleHandler, AddonModH5PActivityModuleHandlerService } from './services/handlers/module';
import { AddonModH5PActivityPrefetchHandler } from './services/handlers/prefetch';
import { AddonModH5PActivityReportLinkHandler } from './services/handlers/report-link';
import { AddonModH5PActivitySyncCronHandler } from './services/handlers/sync-cron';

/**
 * Get mod H5P activity services.
 *
 * @returns Returns mod H5P activity services.
 */
export async function getModH5PActivityServices(): Promise<Type<unknown>[]> {
    const { AddonModH5PActivityProvider } = await import('@addons/mod/h5pactivity/services/h5pactivity');
    const { AddonModH5PActivitySyncProvider } = await import('@addons/mod/h5pactivity/services/h5pactivity-sync');

    return [
        AddonModH5PActivityProvider,
        AddonModH5PActivitySyncProvider,
    ];
}

const routes: Routes = [
    {
        path: AddonModH5PActivityModuleHandlerService.PAGE_NAME,
        loadChildren: () => import('./h5pactivity-lazy.module').then(m => m.AddonModH5PActivityLazyModule),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
        AddonModH5PActivityComponentsModule,
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
