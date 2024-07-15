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
import { Params } from '@angular/router';

import { AddonModForum } from '@addons/mod/forum/services/forum';
import { CoreNavigator } from '@services/navigator';
import { CorePushNotificationsClickHandler } from '@features/pushnotifications/services/push-delegate';
import { CorePushNotificationsNotificationBasicData } from '@features/pushnotifications/services/pushnotifications';
import { CoreUrlUtils } from '@services/utils/url';
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton } from '@singletons';

import { isSafeNumber } from '@/core/utils/types';
import { ADDON_MOD_FORUM_PAGE_NAME } from '../../constants';

/**
 * Handler for forum push notifications clicks.
 */
@Injectable({ providedIn: 'root' })
export class AddonModForumPushClickHandlerService implements CorePushNotificationsClickHandler {

    name = 'AddonModForumPushClickHandler';
    priority = 200;
    featureName = 'CoreCourseModuleDelegate_AddonModForum';

    /**
     * Check if a notification click is handled by this handler.
     *
     * @param notification The notification to check.
     * @returns Whether the notification click is handled by this handler
     */
    async handles(notification: NotificationData): Promise<boolean> {
        return CoreUtils.isTrueOrOne(notification.notif)
            && notification.moodlecomponent == 'mod_forum'
            && notification.name == 'posts'
            && !!(notification.contexturl || notification.customdata?.discussionid);
    }

    /**
     * Handle the notification click.
     *
     * @param notification The notification to check.
     * @returns Promise resolved when done.
     */
    async handleClick(notification: NotificationData): Promise<void> {
        const contextUrlParams = CoreUrlUtils.extractUrlParams(notification.contexturl);
        const data = notification.customdata || {};
        const courseId = Number(notification.courseid);
        const discussionId = Number(contextUrlParams.d || data.discussionid);
        const cmId = data.cmid && Number(data.cmid);
        const pageParams: Params = {
            forumId: Number(data.instance),
            cmId,
            courseId,
        };

        if (!isSafeNumber(discussionId)) {
            return;
        }

        if (data.postid || contextUrlParams.urlHash) {
            pageParams.postId = Number(data.postid || contextUrlParams.urlHash.replace('p', ''));
        }

        await CoreUtils.ignoreErrors(
            AddonModForum.invalidateDiscussionPosts(discussionId, undefined, notification.site),
        );

        await CoreNavigator.navigateToSitePath(
            `${ADDON_MOD_FORUM_PAGE_NAME}/discussion/${discussionId}`,
            { siteId: notification.site, params: pageParams },
        );
    }

}

export const AddonModForumPushClickHandler = makeSingleton(AddonModForumPushClickHandlerService);

type NotificationData = CorePushNotificationsNotificationBasicData & {
    courseid: number;
    discussionid: number;
    contexturl: string;
};
