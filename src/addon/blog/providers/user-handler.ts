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

import { Injectable } from '@angular/core';
import { CoreUserDelegate, CoreUserProfileHandler, CoreUserProfileHandlerData } from '@core/user/providers/user-delegate';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { AddonBlogProvider } from './blog';

/**
 * Profile item handler.
 */
@Injectable()
export class AddonBlogUserHandler implements CoreUserProfileHandler {
    name = 'AddonBlog:blogs';
    priority = 300;
    type = CoreUserDelegate.TYPE_NEW_PAGE;

    constructor(protected linkHelper: CoreContentLinksHelperProvider, protected blogProvider: AddonBlogProvider) {
    }

    /**
     * Whether or not the handler is enabled on a site level.
     * @return {boolean|Promise<boolean>} Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean | Promise<boolean> {
        return this.blogProvider.isPluginEnabled();
    }

    /**
     * Check if handler is enabled for this user in this context.
     *
     * @param {any} user User to check.
     * @param {number} courseId Course ID.
     * @param {any} [navOptions] Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param {any} [admOptions] Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @return {boolean|Promise<boolean>} Promise resolved with true if enabled, resolved with false otherwise.
     */
    isEnabledForUser(user: any, courseId: number, navOptions?: any, admOptions?: any): boolean | Promise<boolean> {
        return true;
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @return {CoreUserProfileHandlerData} Data needed to render the handler.
     */
    getDisplayData(user: any, courseId: number): CoreUserProfileHandlerData {
        return {
            icon: 'fa-newspaper-o',
            title: 'addon.blog.blogentries',
            class: 'addon-blog-handler',
            action: (event, navCtrl, user, courseId): void => {
                event.preventDefault();
                event.stopPropagation();
                // Always use redirect to make it the new history root (to avoid "loops" in history).
                this.linkHelper.goInSite(navCtrl, 'AddonBlogEntriesPage', { userId: user.id, courseId: courseId });
            }
        };
    }
}
