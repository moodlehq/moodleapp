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
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CorePushNotificationsClickHandler } from '@core/pushnotifications/providers/delegate';
import { CoreLoginHelperProvider } from '@core/login/providers/helper';
import { AddonBadgesProvider } from './badges';

/**
 * Handler for badges push notifications clicks.
 */
@Injectable()
export class AddonBadgesPushClickHandler implements CorePushNotificationsClickHandler {
    name = 'AddonBadgesPushClickHandler';
    priority = 200;
    featureName = 'CoreUserDelegate_AddonBadges';

    constructor(private utils: CoreUtilsProvider, private badgesProvider: AddonBadgesProvider,
            private loginHelper: CoreLoginHelperProvider) {}

    /**
     * Check if a notification click is handled by this handler.
     *
     * @param notification The notification to check.
     * @return Whether the notification click is handled by this handler
     */
    handles(notification: any): boolean | Promise<boolean> {
        const data = notification.customdata || {};

        if (this.utils.isTrueOrOne(notification.notif) && notification.moodlecomponent == 'moodle' &&
                (notification.name == 'badgerecipientnotice' || (notification.name == 'badgecreatornotice' && data.hash))) {
            return this.badgesProvider.isPluginEnabled(notification.site);
        }

        return false;
    }

    /**
     * Handle the notification click.
     *
     * @param notification The notification to check.
     * @return Promise resolved when done.
     */
    handleClick(notification: any): Promise<any> {
        const data = notification.customdata || {};

        if (data.hash) {
            // We have the hash, open the badge directly.
            return this.loginHelper.redirect('AddonBadgesIssuedBadgePage', {courseId: 0, badgeHash: data.hash}, notification.site);
        }

        // No hash, open the list of user badges.
        return this.badgesProvider.invalidateUserBadges(0, Number(notification.usertoid), notification.site).catch(() => {
            // Ignore errors.
        }).then(() => {
            return this.loginHelper.redirect('AddonBadgesUserBadgesPage', {}, notification.site);
        });
    }
}
