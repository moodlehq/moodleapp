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

import { Injectable } from '@angular/core';
import { CoreMainMenuHandler, CoreMainMenuHandlerData } from '@features/mainmenu/services/mainmenu-delegate';
import { makeSingleton } from '@singletons';
import { ADDON_BLOG_MAINMENU_PAGE_NAME } from '@addons/blog/constants';

/**
 * Handler to inject an option into main menu.
 */
@Injectable({ providedIn: 'root' })
export class AddonBlogMainMenuHandlerService implements CoreMainMenuHandler {

    name = 'AddonBlog';
    priority = 500;

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        // Disabled for Aspire School - not appropriate for K-12 students
        return false;
        // Original code: return AddonBlog.isPluginEnabled();
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreMainMenuHandlerData {
        return {
            icon: 'far-newspaper',
            title: 'addon.blog.siteblogheading',
            page: ADDON_BLOG_MAINMENU_PAGE_NAME,
            class: 'addon-blog-handler',
        };
    }

}
export const AddonBlogMainMenuHandler = makeSingleton(AddonBlogMainMenuHandlerService);
