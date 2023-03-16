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

import { CoreCourseIndexRoutingModule } from '@features/course/course-routing.module';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreMainMenuHomeRoutingModule } from '@features/mainmenu/mainmenu-home-routing.module';
import { CoreSitePreferencesRoutingModule } from '@features/settings/settings-site-routing.module';
import { CoreSitePluginsComponentsModule } from './components/components.module';
import { CoreSitePluginsHelper } from './services/siteplugins-helper';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreSitePluginsPluginPage } from '@features/siteplugins/pages/plugin/plugin';
import { CanLeaveGuard } from '@guards/can-leave';
import { CoreSitePluginsCourseOptionPage } from '@features/siteplugins/pages/course-option/course-option';
import { CoreSitePluginsModuleIndexPage } from '@features/siteplugins/pages/module-index/module-index';

const routes: Routes = [
    {
        path: 'siteplugins/content/:component/:method/:hash',
        component: CoreSitePluginsPluginPage,
        canDeactivate: [CanLeaveGuard],
    },
];

const homeRoutes: Routes = [
    {
        path: 'siteplugins/homecontent/:component/:method',
        component: CoreSitePluginsPluginPage,
        canDeactivate: [CanLeaveGuard],
    },
];

const courseIndexRoutes: Routes = [
    {
        path: 'siteplugins/:handlerUniqueName',
        component: CoreSitePluginsCourseOptionPage,
        canDeactivate: [CanLeaveGuard],
    },
];

const moduleRoutes: Routes = [
    {
        path: 'siteplugins/module/:courseId/:cmId',
        component: CoreSitePluginsModuleIndexPage,
        canDeactivate: [CanLeaveGuard],
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(moduleRoutes.concat(routes)),
        CoreCourseIndexRoutingModule.forChild({ children: courseIndexRoutes }),
        CoreMainMenuHomeRoutingModule.forChild({ children: homeRoutes }),
        CoreSitePreferencesRoutingModule.forChild(routes),
        CoreSitePluginsComponentsModule,
        CoreSharedModule,
    ],
    declarations: [
        CoreSitePluginsPluginPage,
        CoreSitePluginsCourseOptionPage,
        CoreSitePluginsModuleIndexPage,
    ],
    providers: [
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: () => {
                CoreSitePluginsHelper.initialize();
            },
        },
    ],
})
export class CoreSitePluginsModule {}
