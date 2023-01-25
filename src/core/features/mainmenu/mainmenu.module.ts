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
import { CoreMainMenuAuthGuard } from '@features/mainmenu/guards/auth';

import { AppRoutingModule } from '@/app/app-routing.module';

import { CoreMainMenuDelegate, CoreMainMenuDelegateService } from './services/mainmenu-delegate';
import { CoreMainMenuHomeHandler } from './services/handlers/mainmenu';
import { CoreMainMenuProvider } from './services/mainmenu';
import { CoreMainMenuHomeDelegateService } from './services/home-delegate';

export const CORE_MAINMENU_SERVICES = [
    CoreMainMenuHomeDelegateService,
    CoreMainMenuDelegateService,
    CoreMainMenuProvider,
];

const appRoutes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'main',
    },
    {
        path: 'main',
        loadChildren: () => import('./mainmenu-lazy.module').then(m => m.CoreMainMenuLazyModule),
        canActivate: [CoreMainMenuAuthGuard],
        canLoad: [CoreMainMenuAuthGuard],
    },
    {
        path: 'reload',
        loadChildren: () => import('./mainmenu-reload-lazy.module').then( m => m.CoreMainMenuReloadLazyModule),
    },
];

@NgModule({
    imports: [AppRoutingModule.forChild(appRoutes)],
    providers: [
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: () => {
                CoreMainMenuDelegate.registerHandler(CoreMainMenuHomeHandler.instance);
            },
        },
    ],
})
export class CoreMainMenuModule {}
