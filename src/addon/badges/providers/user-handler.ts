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
import { CoreUserDelegate, CoreUserProfileHandler, CoreUserProfileHandlerData } from '@core/user/providers/user-delegate';
import { AddonBadgesProvider } from './badges';

/**
 * Profile badges handler.
 */
@Injectable()
export class AddonBadgesUserHandler implements CoreUserProfileHandler {
    name = 'AddonBadges';
    priority = 50;
    type = CoreUserDelegate.TYPE_NEW_PAGE;

    constructor(protected badgesProvider: AddonBadgesProvider) { }

    /**
     * Check if handler is enabled.
     *
     * @return Always enabled.
     */
    isEnabled(): Promise<boolean> {
        return this.badgesProvider.isPluginEnabled();
    }

    /**
     * Check if handler is enabled for this user in this context.
     *
     * @param user User to check.
     * @param courseId Course ID.
     * @param navOptions Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param admOptions Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @return True if enabled, false otherwise.
     */
    isEnabledForUser(user: any, courseId: number, navOptions?: any, admOptions?: any): boolean {

        if (navOptions && typeof navOptions.badges != 'undefined') {
            return navOptions.badges;
        }

        // If we reach here, it means we are opening the user site profile.
        return true;
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @return Data needed to render the handler.
     */
    getDisplayData(user: any, courseId: number): CoreUserProfileHandlerData {
        return {
            icon: 'trophy',
            title: 'addon.badges.badges',
            class: '',
            action: (event, navCtrl, user, courseId): void => {
                event.preventDefault();
                event.stopPropagation();
                navCtrl.push('AddonBadgesUserBadgesPage', {courseId: courseId, userId: user.id });
            }
        };
    }
}
