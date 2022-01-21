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
    CoreUserDelegateService,
    CoreUserProfileHandler,
    CoreUserProfileHandlerData,
} from '@features/user/services/user-delegate';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';
import { AddonBadges } from '../badges';

/**
 * Profile badges handler.
 */
@Injectable({ providedIn: 'root' })
export class AddonBadgesUserHandlerService implements CoreUserProfileHandler {

    name = 'AddonBadges:fakename'; // This name doesn't match any disabled feature, they'll be checked in isEnabledForContext.
    priority = 300;
    type = CoreUserDelegateService.TYPE_NEW_PAGE;

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
            if (currentSite.isFeatureDisabled('CoreUserDelegate_AddonBadges:account')) {
                return false;
            }
        } else if (currentSite.isFeatureDisabled('CoreUserDelegate_AddonBadges')) {
            return false;
        }

        if (navOptions && navOptions.badges !== undefined) {
            return navOptions.badges;
        }

        return true;
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreUserProfileHandlerData {
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
