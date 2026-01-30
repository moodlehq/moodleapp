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

import { CoreUtils } from '@static/utils';
import { CorePushNotificationsClickHandler } from '@features/pushnotifications/services/push-delegate';
import { AddonBadges } from '../badges';
import { makeSingleton } from '@singletons';
import { CorePushNotificationsNotificationBasicData } from '@features/pushnotifications/services/pushnotifications';
import { CoreNavigator } from '@services/navigator';
import { AddonBadgesHelper } from '../badges-helper';
import { CorePromiseUtils } from '@static/promise-utils';
import { ADDONS_BADGES_USER_PROFILE_FEATURE_NAME } from '@addons/badges/constants';

/**
 * Handler for badges push notifications clicks.
 */
@Injectable({ providedIn: 'root' })
export class AddonBadgesPushClickHandlerService implements CorePushNotificationsClickHandler {

    name = 'AddonBadgesPushClickHandler';
    priority = 200;
    featureName = ADDONS_BADGES_USER_PROFILE_FEATURE_NAME;

    /**
     * @inheritdoc
     */
    async handles(notification: CorePushNotificationsNotificationBasicData): Promise<boolean> {
        const data = notification.customdata || {};

        if (CoreUtils.isTrueOrOne(notification.notif) && notification.moodlecomponent == 'moodle' &&
                (notification.name == 'badgerecipientnotice' || (notification.name == 'badgecreatornotice' && data.hash))) {
            if (notification.customdata?.hash) {
                return await AddonBadgesHelper.canOpenBadge(String(notification.customdata?.hash), notification.site);
            }

            return AddonBadges.isPluginEnabled(notification.site);
        }

        return false;
    }

    /**
     * @inheritdoc
     */
    async handleClick(notification: CorePushNotificationsNotificationBasicData): Promise<void> {
        const data = notification.customdata || {};

        if (data.hash) {
            // We have the hash, open the badge directly.
            await CoreNavigator.navigateToSitePath(`/badge/${data.hash}`, {
                siteId: notification.site,
            });

            return;
        }

        // No hash, open the list of user badges.
        await CorePromiseUtils.ignoreErrors(
            AddonBadges.invalidateUserBadges(
                0,
                Number(notification.usertoid),
                notification.site,
            ),
        );

        await CoreNavigator.navigateToSitePath('/badges', { siteId: notification.site });
    }

}

export const AddonBadgesPushClickHandler = makeSingleton(AddonBadgesPushClickHandlerService);
