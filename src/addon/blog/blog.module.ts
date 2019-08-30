// (C) Copyright 2015 Martin Dougiamas
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

import { NgModule } from '@angular/core';
import { CoreMainMenuDelegate } from '@core/mainmenu/providers/delegate';
import { CoreUserDelegate } from '@core/user/providers/user-delegate';
import { CoreCourseOptionsDelegate } from '@core/course/providers/options-delegate';
import { CoreContentLinksDelegate } from '@core/contentlinks/providers/delegate';
import { CoreTagAreaDelegate } from '@core/tag/providers/area-delegate';
import { AddonBlogProvider } from './providers/blog';
import { AddonBlogMainMenuHandler } from './providers/mainmenu-handler';
import { AddonBlogUserHandler } from './providers/user-handler';
import { AddonBlogCourseOptionHandler } from './providers/course-option-handler';
import { AddonBlogComponentsModule } from './components/components.module';
import { AddonBlogIndexLinkHandler } from './providers/index-link-handler';
import { AddonBlogTagAreaHandler } from './providers/tag-area-handler';

@NgModule({
    declarations: [
    ],
    imports: [
        AddonBlogComponentsModule
    ],
    providers: [
        AddonBlogProvider,
        AddonBlogMainMenuHandler,
        AddonBlogUserHandler,
        AddonBlogCourseOptionHandler,
        AddonBlogIndexLinkHandler,
        AddonBlogTagAreaHandler
    ]
})
export class AddonBlogModule {
    constructor(mainMenuDelegate: CoreMainMenuDelegate, menuHandler: AddonBlogMainMenuHandler,
            userHandler: AddonBlogUserHandler, userDelegate: CoreUserDelegate,
            courseOptionHandler: AddonBlogCourseOptionHandler, courseOptionsDelegate: CoreCourseOptionsDelegate,
            linkHandler: AddonBlogIndexLinkHandler, contentLinksDelegate: CoreContentLinksDelegate,
            tagAreaDelegate: CoreTagAreaDelegate, tagAreaHandler: AddonBlogTagAreaHandler) {
        mainMenuDelegate.registerHandler(menuHandler);
        userDelegate.registerHandler(userHandler);
        courseOptionsDelegate.registerHandler(courseOptionHandler);
        contentLinksDelegate.registerHandler(linkHandler);
        tagAreaDelegate.registerHandler(tagAreaHandler);
    }
}
