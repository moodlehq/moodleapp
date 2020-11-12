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

import { InjectionToken, Injector, ModuleWithProviders, NgModule } from '@angular/core';
import { RouterModule, ROUTES, Routes } from '@angular/router';

import { CoreArray } from '@/app/singletons/array';

import { CoreHomePage } from './home.page';

function buildHomeRoutes(injector: Injector): Routes {
    const routes = CoreArray.flatten(injector.get<Routes[]>(HOME_ROUTES, []));

    return [
        {
            path: '',
            component: CoreHomePage,
            children: [
                ...routes,
                // @todo handle 404.
            ],
        },
    ];
}

export const HOME_ROUTES = new InjectionToken('HOME_ROUTES');

@NgModule({
    providers: [
        { provide: ROUTES, multi: true, useFactory: buildHomeRoutes, deps: [Injector] },
    ],
    exports: [RouterModule],
})
export class CoreHomeRoutingModule {

    static forChild(routes: Routes): ModuleWithProviders<CoreHomeRoutingModule> {
        return {
            ngModule: CoreHomeRoutingModule,
            providers: [
                { provide: HOME_ROUTES, multi: true, useValue: routes },
            ],
        };
    }

}
