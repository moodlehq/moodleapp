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

import { APP_INITIALIZER, NgModule, Type } from '@angular/core';
import { Routes } from '@angular/router';

import { CoreSiteHomeIndexLinkHandler } from './services/handlers/index-link';
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreSiteHomeHomeHandler, CoreSiteHomeHomeHandlerService } from './services/handlers/sitehome-home';
import { CoreMainMenuHomeDelegate } from '@features/mainmenu/services/home-delegate';
import { CoreMainMenuHomeRoutingModule } from '@features/mainmenu/mainmenu-home-routing.module';

/**
 * Get site home services.
 *
 * @returns Returns site home services.
 */
export async function getSiteHomeServices(): Promise<Type<unknown>[]> {
    const { CoreSiteHomeProvider } = await import('@features/sitehome/services/sitehome');

    return [
        CoreSiteHomeProvider,
    ];
}

const mainMenuHomeRoutes: Routes = [
    {
        path: CoreSiteHomeHomeHandlerService.PAGE_NAME,
        loadComponent: () => import('@features/sitehome/pages/index/index'),
    },
];

@NgModule({
    imports: [CoreMainMenuHomeRoutingModule.forChild({ children: mainMenuHomeRoutes })],
    providers: [
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: () => {
                CoreContentLinksDelegate.registerHandler(CoreSiteHomeIndexLinkHandler.instance);
                CoreMainMenuHomeDelegate.registerHandler(CoreSiteHomeHomeHandler.instance);
            },
        },
    ],
})
export class CoreSiteHomeModule {}
