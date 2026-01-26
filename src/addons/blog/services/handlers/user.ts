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
import {
    CoreUserProfileHandler,
    CoreUserProfileHandlerData,
    CoreUserProfileHandlerType,
    CoreUserDelegateContext,
} from '@features/user/services/user-delegate';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';

/**
 * Profile item handler.
 */
@Injectable({ providedIn: 'root' })
export class AddonBlogUserHandlerService implements CoreUserProfileHandler {

    name = 'AddonBlog'; // This name doesn't match any disabled feature, they'll be checked in isEnabledForContext.
    priority = 200;
    type = CoreUserProfileHandlerType.LIST_ITEM;

    /**
     * @inheritdoc
     */
    isEnabled(): Promise<boolean> {
        // Blog entries disabled as per requirement
        return Promise.resolve(false);
        // Original: return AddonBlog.isPluginEnabled();
    }

    /**
     * @inheritdoc
     */
    async isEnabledForContext(context: CoreUserDelegateContext): Promise<boolean> {
        // Check if feature is disabled.
        const currentSite = CoreSites.getCurrentSite();
        if (!currentSite) {
            return false;
        }

        if (context === CoreUserDelegateContext.USER_MENU) {
            if (currentSite.isFeatureDisabled('CoreUserDelegate_AddonBlog:account')) {
                return false;
            }
        } else if (currentSite.isFeatureDisabled('CoreUserDelegate_AddonBlog:blogs')) {
            return false;
        }

        return true;
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreUserProfileHandlerData {
        return {
            icon: 'far-newspaper',
            title: 'addon.blog.blogentries',
            class: 'addon-blog-handler',
            action: (event, user, context, contextId): void => {
                event.preventDefault();
                event.stopPropagation();
                CoreNavigator.navigateToSitePath('/blog/index', {
                    params: { courseId: contextId, userId: user.id },
                });
            },
        };
    }

}
export const AddonBlogUserHandler = makeSingleton(AddonBlogUserHandlerService);
