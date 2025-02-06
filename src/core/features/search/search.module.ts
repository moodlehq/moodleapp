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
import { CoreMainMenuRoutingModule } from '@features/mainmenu/mainmenu-routing.module';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreMainMenuDelegate } from '@features/mainmenu/services/mainmenu-delegate';
import { CoreSearchMainMenuHandler, CORE_SEARCH_PAGE_NAME } from '@features/search/services/handlers/mainmenu';

import { CORE_SITE_SCHEMAS } from '@services/sites';

import { SITE_SCHEMA } from './services/search-history-db';
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreSearchGlobalSearchLinkHandler } from '@features/search/services/handlers/global-search-link';

/**
 * Get search services.
 *
 * @returns Returns search services.
 */
export async function getSearchServices(): Promise<Type<unknown>[]> {
    const { CoreSearchHistoryProvider } = await import('@features/search/services/search-history.service');
    const { CoreSearchGlobalSearchService } = await import('@features/search/services/global-search');

    return [
        CoreSearchHistoryProvider,
        CoreSearchGlobalSearchService,
    ];
}

const mainMenuChildrenRoutes: Routes = [
    {
        path: CORE_SEARCH_PAGE_NAME,
        loadChildren: () => import('./search-lazy.module'),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(mainMenuChildrenRoutes),
        CoreMainMenuRoutingModule.forChild({ children: mainMenuChildrenRoutes }),
    ],
    providers: [
        { provide: CORE_SITE_SCHEMAS, useValue: [SITE_SCHEMA], multi: true },
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue() {
                CoreMainMenuDelegate.registerHandler(CoreSearchMainMenuHandler.instance);
                CoreContentLinksDelegate.registerHandler(CoreSearchGlobalSearchLinkHandler.instance);
            },
        },
    ],
})
export class CoreSearchModule {}
