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

import { CommonModule } from '@angular/common';
import { Injector, NgModule } from '@angular/core';
import { ROUTES, Routes } from '@angular/router';
import { CoreComponentsModule } from '@components/components.module';
import { CoreDirectivesModule } from '@directives/directives.module';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { CorePipesModule } from '@pipes/pipes.module';

import { resolveModuleRoutes } from '@/app/app-routing.module';

import { MAIN_MENU_ROUTES } from './mainmenu-routing.module';
import { CoreMainMenuPage } from './pages/menu/menu';
import { CoreMainMenuHomeHandler } from './services/handlers/mainmenu';

function buildRoutes(injector: Injector): Routes {
    const routes = resolveModuleRoutes(injector, MAIN_MENU_ROUTES);

    return [
        {
            path: '',
            component: CoreMainMenuPage,
            children: [
                {
                    path: '',
                    pathMatch: 'full',
                    redirectTo: CoreMainMenuHomeHandler.PAGE_NAME,
                },
                {
                    path: CoreMainMenuHomeHandler.PAGE_NAME,
                    loadChildren: () => import('./pages/home/home.module').then(m => m.CoreMainMenuHomePageModule),
                },
                {
                    path: 'more',
                    loadChildren: () => import('./pages/more/more.module').then(m => m.CoreMainMenuMorePageModule),
                },
                ...routes.children,
            ],
        },
        ...routes.siblings,
    ];
}

@NgModule({
    imports: [
        CommonModule,
        IonicModule,
        TranslateModule,
        CoreComponentsModule,
        CoreDirectivesModule,
        CorePipesModule,
    ],
    declarations: [
        CoreMainMenuPage,
    ],
    providers: [
        CoreMainMenuHomeHandler,
        { provide: ROUTES, multi: true, useFactory: buildRoutes, deps: [Injector] },
    ],
})
export class CoreMainMenuLazyModule {}
