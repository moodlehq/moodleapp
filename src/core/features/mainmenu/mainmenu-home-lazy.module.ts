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
import { ROUTES, Routes } from '@angular/router';

import { CoreSharedModule } from '@/core/shared.module';

import { buildTabMainRoutes } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreMainMenuHomeHandlerService } from '@features/mainmenu/services/handlers/mainmenu';
import { CoreMainMenuComponentsModule } from '@features/mainmenu/components/components.module';
import { resolveHomeRoutes } from '@features/mainmenu/mainmenu-home-routing.module';
import { CoreMainMenuHomePage } from '@features/mainmenu/pages/home/home';
import { CoreSiteLogoComponent } from '@/core/components/site-logo/site-logo';

/**
 * Build module routes.
 *
 * @param injector Injector.
 * @returns Routes.
 */
function buildRoutes(injector: Injector): Routes {
    const routes = resolveHomeRoutes(injector);

    return [
        ...buildTabMainRoutes(injector, {
            path: '',
            data: {
                mainMenuTabRoot: CoreMainMenuHomeHandlerService.PAGE_NAME,
            },
            component: CoreMainMenuHomePage,
            children: routes.children,
        }),
        ...routes.siblings,
    ];
}

@NgModule({
    imports: [
        CoreSharedModule,
        CoreMainMenuComponentsModule,
        CoreSiteLogoComponent,
    ],
    providers: [
        { provide: ROUTES, multi: true, useFactory: buildRoutes, deps: [Injector] },
    ],
    declarations: [
        CoreMainMenuHomePage,
    ],
})
export default class CoreMainMenuHomeLazyModule {}
