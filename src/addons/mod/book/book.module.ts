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
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreTagAreaDelegate } from '@features/tag/services/tag-area-delegate';
import { AddonModBookComponentsModule } from './components/components.module';
import { AddonModBookModuleHandler, AddonModBookModuleHandlerService } from './services/handlers/module';
import { AddonModBookIndexLinkHandler } from './services/handlers/index-link';
import { AddonModBookListLinkHandler } from './services/handlers/list-link';
import { AddonModBookPrefetchHandler } from './services/handlers/prefetch';
import { AddonModBookTagAreaHandler } from './services/handlers/tag-area';
import { AddonModBookProvider } from './services/book';
import { CORE_SITE_SCHEMAS } from '@services/sites';
import { BOOK_SITE_SCHEMA } from './services/database/book';

export const ADDON_MOD_BOOK_SERVICES: Type<unknown>[] = [
    AddonModBookProvider,
];

const routes: Routes = [
    {
        path: AddonModBookModuleHandlerService.PAGE_NAME,
        loadChildren: () => import('./book-lazy.module').then(m => m.AddonModBookLazyModule),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
        AddonModBookComponentsModule,
    ],
    providers: [
        {
            provide: CORE_SITE_SCHEMAS,
            useValue: [BOOK_SITE_SCHEMA],
            multi: true,
        },
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: () => {
                CoreCourseModuleDelegate.registerHandler(AddonModBookModuleHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModBookIndexLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModBookListLinkHandler.instance);
                CoreCourseModulePrefetchDelegate.registerHandler(AddonModBookPrefetchHandler.instance);
                CoreTagAreaDelegate.registerHandler(AddonModBookTagAreaHandler.instance);
            },
        },
    ],
})
export class AddonModBookModule {}
