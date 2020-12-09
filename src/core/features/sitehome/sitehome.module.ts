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

import { CoreSiteHomeIndexLinkHandler } from './services/handlers/index-link';
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreSiteHomeHomeHandler, CoreSiteHomeHomeHandlerService } from './services/handlers/sitehome-home';
import { CoreMainMenuHomeDelegate } from '@features/mainmenu/services/home-delegate';
import { CoreMainMenuHomeRoutingModule } from '@features/mainmenu/pages/home/home-routing.module';

const mainMenuHomeRoutes: Routes = [
    {
        path: CoreSiteHomeHomeHandlerService.PAGE_NAME,
        loadChildren: () => import('./pages/index/index.module').then(m => m.CoreSiteHomeIndexPageModule),
    },
];

@NgModule({
    imports: [CoreMainMenuHomeRoutingModule.forChild({ children: mainMenuHomeRoutes })],
    exports: [CoreMainMenuHomeRoutingModule],
    providers: [
        {
            provide: APP_INITIALIZER,
            multi: true,
            deps: [],
            useFactory: () => () => {
                CoreContentLinksDelegate.instance.registerHandler(CoreSiteHomeIndexLinkHandler.instance);
                CoreMainMenuHomeDelegate.instance.registerHandler(CoreSiteHomeHomeHandler.instance);
            },
        },
    ],
})
export class CoreSiteHomeModule {}
