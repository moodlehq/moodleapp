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
import { RouterModule, ROUTES, Routes } from '@angular/router';

import { resolveModuleRoutes } from '@/app/app-routing.module';
import { CoreSharedModule } from '@/core/shared.module';

import { CoreMainMenuHomePage } from './home';
import { MAIN_MENU_HOME_ROUTES } from './home-routing.module';
import { buildTabMainRoutes } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreMainMenuHomeHandlerService } from '@features/mainmenu/services/handlers/mainmenu';
import { CoreMainMenuComponentsModule } from '@features/mainmenu/components/components.module';

function buildRoutes(injector: Injector): Routes {
    const routes = resolveModuleRoutes(injector, MAIN_MENU_HOME_ROUTES);

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
    ],
    providers: [
        { provide: ROUTES, multi: true, useFactory: buildRoutes, deps: [Injector] },
    ],
    declarations: [
        CoreMainMenuHomePage,
    ],
    exports: [
        RouterModule,
    ],
})
export class CoreMainMenuHomePageModule {}
