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

import { CoreCourseIndexRoutingModule } from '@features/course/pages/index/index-routing.module';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreMainMenuHomeRoutingModule } from '@features/mainmenu/pages/home/home-routing.module';
import { CoreSitePreferencesRoutingModule } from '@features/settings/pages/site/site-routing';
import { CoreSitePluginsComponentsModule } from './components/components.module';
import { CoreSitePluginsHelper } from './services/siteplugins-helper';

const routes: Routes = [
    {
        path: 'siteplugins/content/:component/:method/:hash',
        loadChildren: () => import('./pages/plugin-page/plugin-page.module').then( m => m.CoreSitePluginsPluginPageModule),
    },
];

const homeRoutes: Routes = [
    {
        path: 'siteplugins/homecontent/:component/:method',
        loadChildren: () => import('./pages/plugin-page/plugin-page.module').then( m => m.CoreSitePluginsPluginPageModule),
    },
];

const courseIndexRoutes: Routes = [
    {
        path: 'siteplugins/:handlerUniqueName',
        loadChildren: () => import('@features/siteplugins/pages/course-option/course-option.module')
            .then(m => m.CoreSitePluginsCourseOptionModule),
    },
];

const moduleRoutes: Routes = [
    {
        path: 'siteplugins/module/:courseId/:cmId',
        loadChildren: () => import('./pages/module-index/module-index.module').then( m => m.CoreSitePluginsModuleIndexPageModule),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(moduleRoutes.concat(routes)),
        CoreCourseIndexRoutingModule.forChild({ children: courseIndexRoutes }),
        CoreMainMenuHomeRoutingModule.forChild({ children: homeRoutes }),
        CoreSitePreferencesRoutingModule.forChild(routes),
        CoreSitePluginsComponentsModule,
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
