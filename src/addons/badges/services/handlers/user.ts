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
import { CoreCourseUserAdminOrNavOptionIndexed } from '@features/courses/services/courses';
import {
    CoreUserDelegateContext,
    CoreUserProfileHandler,
    CoreUserProfileListHandlerData,
    CoreUserProfileHandlerType,
} from '@features/user/services/user-delegate';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';
import { AddonBadges } from '../badges';
import {
    ADDONS_BADGES_USER_MENU_FEATURE_NAME,
    ADDONS_BADGES_COMPONENT_NAME,
    ADDONS_BADGES_USER_PROFILE_FEATURE_NAME,
} from '@addons/badges/constants';

/**
 * Profile badges handler.
 */
@Injectable({ providedIn: 'root' })
export class AddonBadgesUserHandlerService implements CoreUserProfileHandler {

    readonly type = CoreUserProfileHandlerType.LIST_ITEM;
    // This name doesn't match any disabled feature, they'll be checked in isEnabledForContext.
    name = `${ADDONS_BADGES_COMPONENT_NAME}:fakename`;
    priority = 300;

    /**
     * @inheritdoc
     */
    isEnabled(): Promise<boolean> {
        return AddonBadges.isPluginEnabled();
    }

    /**
     * @inheritdoc
     */
    async isEnabledForContext(
        context: CoreUserDelegateContext,
        courseId: number,
        navOptions?: CoreCourseUserAdminOrNavOptionIndexed,
    ): Promise<boolean> {
        // Check if feature is disabled.
        const currentSite = CoreSites.getCurrentSite();
        if (!currentSite) {
            return false;
        }

        if (context === CoreUserDelegateContext.USER_MENU) {
            if (currentSite.isFeatureDisabled(ADDONS_BADGES_USER_MENU_FEATURE_NAME)) {
                return false;
            }
        } else if (currentSite.isFeatureDisabled(ADDONS_BADGES_USER_PROFILE_FEATURE_NAME)) {
            return false;
        }

        if (navOptions?.badges !== undefined) {
            return navOptions.badges;
        }

        return true;
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreUserProfileListHandlerData {
        return {
            icon: 'fas-trophy',
            title: 'addon.badges.badges',
            action: (event, user, context, contextId): void => {
                event.preventDefault();
                event.stopPropagation();
                CoreNavigator.navigateToSitePath('/badges', {
                    params: { courseId: contextId, userId: user.id },
                });
            },
        };
    }

}

export const AddonBadgesUserHandler = makeSingleton(AddonBadgesUserHandlerService);
