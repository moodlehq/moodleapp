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
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { AddonModUrlIndexLinkHandler } from './services/handlers/index-link';
import { AddonModUrlListLinkHandler } from './services/handlers/list-link';
import { AddonModUrlModuleHandler } from './services/handlers/module';
import { AddonModUrlPrefetchHandler } from './services/handlers/prefetch';
import { ADDON_MOD_URL_PAGE_NAME } from './constants';

const routes: Routes = [
    {
        path: ADDON_MOD_URL_PAGE_NAME,
        loadChildren: () => import('./url-lazy.module'),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
    ],
    providers: [
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: () => {
                CoreCourseModuleDelegate.registerHandler(AddonModUrlModuleHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModUrlIndexLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModUrlListLinkHandler.instance);
                CoreCourseModulePrefetchDelegate.registerHandler(AddonModUrlPrefetchHandler.instance);
            },
        },
    ],
})
export class AddonModUrlModule {}
