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

import { CoreMainMenuRoutingModule } from '@features/mainmenu/mainmenu-routing.module';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreMainMenuDelegate } from '@features/mainmenu/services/mainmenu-delegate';
import { CoreFinancialMainMenuHandler, CoreFinancialMainMenuHandlerService } from './services/handlers/mainmenu';
import { Type } from '@angular/core';

const mainMenuChildrenRoutes: Routes = [
    {
        path: CoreFinancialMainMenuHandlerService.PAGE_NAME,
        loadChildren: () => import('./financial-lazy.module').then(m => m.CoreFinancialLazyModule),
    },
];

/**
 * Get financial services.
 *
 * @returns Financial services.
 */
export async function getFinancialServices(): Promise<Type<unknown>[]> {
    const { CoreFinancialService } = await import('@features/financial/services/financial');
    const { CoreFinancialAPIService } = await import('@features/financial/services/financial-api');

    return [
        CoreFinancialService,
        CoreFinancialAPIService,
    ];
}

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(mainMenuChildrenRoutes),
        CoreMainMenuRoutingModule.forChild({ children: mainMenuChildrenRoutes }),
    ],
    providers: [
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: () => {
                CoreMainMenuDelegate.registerHandler(CoreFinancialMainMenuHandler.instance);
            },
        },
    ],
})
export class CoreFinancialModule {}