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

import { CoreSharedModule } from '@/core/shared.module';
import { NgModule, Injector } from '@angular/core';
import { RouterModule, Routes, ROUTES } from '@angular/router';
import { CoreSearchGlobalSearchPage } from './pages/global-search/global-search';
import { CoreSearchComponentsModule } from '@features/search/components/components.module';
import { CoreMainMenuComponentsModule } from '@features/mainmenu/components/components.module';
import { buildTabMainRoutes } from '@features/mainmenu/mainmenu-tab-routing.module';

/**
 * Build module routes.
 *
 * @param injector Injector.
 * @returns Routes.
 */
function buildRoutes(injector: Injector): Routes {
    return buildTabMainRoutes(injector, {
        component: CoreSearchGlobalSearchPage,
    });
}

@NgModule({
    imports: [
        CoreSharedModule,
        CoreSearchComponentsModule,
        CoreMainMenuComponentsModule,
    ],
    exports: [RouterModule],
    declarations: [
        CoreSearchGlobalSearchPage,
    ],
    providers: [
        {
            provide: ROUTES,
            multi: true,
            deps: [Injector],
            useFactory: buildRoutes,
        },
    ],
})
export class CoreSearchLazyModule {}
