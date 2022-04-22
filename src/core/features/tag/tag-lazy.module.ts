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

import { Injector, NgModule } from '@angular/core';
import { Route, RouterModule, ROUTES, Routes } from '@angular/router';

import { buildTabMainRoutes } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreTagMainMenuHandlerService } from './services/handlers/mainmenu';

export const CoreTagIndexAreaRoute: Route = {
    path: 'index-area',
    loadChildren: () =>
        import('@features/tag/pages/index-area/index-area.page.module').then(m => m.CoreTagIndexAreaPageModule),
};

function buildRoutes(injector: Injector): Routes {
    return [
        {
            path: 'index',
            loadChildren: () => import('@features/tag/pages/index/index.page.module').then(m => m.CoreTagIndexPageModule),
        },
        {
            path: 'search',
            data: {
                mainMenuTabRoot: CoreTagMainMenuHandlerService.PAGE_NAME,
            },
            loadChildren: () => import('@features/tag/pages/search/search.page.module').then(m => m.CoreTagSearchPageModule),
        },
        CoreTagIndexAreaRoute,
        ...buildTabMainRoutes(injector, {
            redirectTo: 'search',
            pathMatch: 'full',
        }),
    ];
}

@NgModule({
    exports: [RouterModule],
    providers: [
        {
            provide: ROUTES,
            multi: true,
            deps: [Injector],
            useFactory: buildRoutes,
        },
    ],
})
export class CoreTagLazyModule { }
