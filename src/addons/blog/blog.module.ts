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
import { CoreCourseIndexRoutingModule } from '@features/course/pages/index/index-routing.module';
import { CoreCourseOptionsDelegate } from '@features/course/services/course-options-delegate';
import { CoreMainMenuRoutingModule } from '@features/mainmenu/mainmenu-routing.module';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreMainMenuDelegate } from '@features/mainmenu/services/mainmenu-delegate';
import { CoreTagAreaDelegate } from '@features/tag/services/tag-area-delegate';
import { CoreUserDelegate } from '@features/user/services/user-delegate';
import { AddonBlogProvider } from './services/blog';
import { AddonBlogCourseOptionHandler } from './services/handlers/course-option';
import { AddonBlogIndexLinkHandler } from './services/handlers/index-link';
import { AddonBlogMainMenuHandler, AddonBlogMainMenuHandlerService } from './services/handlers/mainmenu';
import { AddonBlogTagAreaHandler } from './services/handlers/tag-area';
import { AddonBlogUserHandler } from './services/handlers/user';

export const ADDON_BLOG_SERVICES: Type<unknown>[] = [
    AddonBlogProvider,
];

const routes: Routes = [
    {
        path: AddonBlogMainMenuHandlerService.PAGE_NAME,
        loadChildren: () => import('@addons/blog/blog-lazy.module').then(m => m.AddonBlogLazyModule),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
        CoreMainMenuRoutingModule.forChild({ children: routes }),
        CoreCourseIndexRoutingModule.forChild({ children: routes }),
    ],
    exports: [CoreMainMenuRoutingModule],
    providers: [
        {
            provide: APP_INITIALIZER,
            multi: true,
            deps: [],
            useFactory: () => async () => {
                CoreContentLinksDelegate.registerHandler(AddonBlogIndexLinkHandler.instance);
                CoreMainMenuDelegate.registerHandler(AddonBlogMainMenuHandler.instance);
                CoreUserDelegate.registerHandler(AddonBlogUserHandler.instance);
                CoreTagAreaDelegate.registerHandler(AddonBlogTagAreaHandler.instance);
                CoreCourseOptionsDelegate.registerHandler(AddonBlogCourseOptionHandler.instance);
            },
        },
    ],
})
export class AddonBlogModule {}
