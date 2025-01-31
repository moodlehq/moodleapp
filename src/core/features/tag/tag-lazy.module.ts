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

import { conditionalRoutes } from '@/app/app-routing.module';
import { Injector, NgModule } from '@angular/core';
import { Route, ROUTES, Routes } from '@angular/router';

import { buildTabMainRoutes } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreTagIndexAreaPage } from '@features/tag/pages/index-area/index-area';
import { CoreTagIndexPage } from '@features/tag/pages/index/index';
import { CoreTagSearchPage } from '@features/tag/pages/search/search';
import { CoreScreen } from '@services/screen';
import { CoreTagMainMenuHandlerService } from './services/handlers/mainmenu';

const indexAreaRoute: Route = {
    path: 'index-area',
    component: CoreTagIndexAreaPage,
};

/**
 * Build module routes.
 *
 * @param injector Injector.
 * @returns Routes.
 */
function buildRoutes(injector: Injector): Routes {
    const mobileRoutes: Routes = [
        {
            path: 'index',
            component: CoreTagIndexPage,
        },
        {
            ...indexAreaRoute,
            path: `index/${indexAreaRoute.path}`,
        },
    ];

    const tabletRoutes: Routes = [
        {
            path: 'index',
            component: CoreTagIndexPage,
            children: [
                indexAreaRoute,
            ],
        },
    ];

    return [
        ...conditionalRoutes(mobileRoutes, () => CoreScreen.isMobile),
        ...conditionalRoutes(tabletRoutes, () => CoreScreen.isTablet),
        {
            path: 'search',
            data: { mainMenuTabRoot: CoreTagMainMenuHandlerService.PAGE_NAME },
            component: CoreTagSearchPage,
        },
        indexAreaRoute,
        ...buildTabMainRoutes(injector, {
            redirectTo: 'search',
            pathMatch: 'full',
        }),
    ];
}

@NgModule({
    providers: [
        {
            provide: ROUTES,
            multi: true,
            deps: [Injector],
            useFactory: buildRoutes,
        },
    ],
})
export default class CoreTagLazyModule {}
