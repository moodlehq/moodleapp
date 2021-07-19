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
import { CoreUserProfileHandler, CoreUserProfileHandlerData, CoreUserDelegateService } from '@features/user/services/user-delegate';
import { CoreNavigator } from '@services/navigator';
import { makeSingleton } from '@singletons';
import { AddonBlog } from '../blog';

/**
 * Profile item handler.
 */
@Injectable({ providedIn: 'root' })
export class AddonBlogUserHandlerService implements CoreUserProfileHandler {

    name = 'AddonBlog:blogs';
    priority = 300;
    type = CoreUserDelegateService.TYPE_NEW_PAGE;

    /**
     * @inheritdoc
     */
    isEnabled(): Promise<boolean> {
        return AddonBlog.isPluginEnabled();
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreUserProfileHandlerData {
        return {
            icon: 'far-newspaper',
            title: 'addon.blog.blogentries',
            class: 'addon-blog-handler',
            action: (event, user, courseId): void => {
                event.preventDefault();
                event.stopPropagation();
                CoreNavigator.navigateToSitePath('/blog', {
                    params: { courseId, userId: user.id },
                });
            },
        };
    }

}
export const AddonBlogUserHandler = makeSingleton(AddonBlogUserHandlerService);
