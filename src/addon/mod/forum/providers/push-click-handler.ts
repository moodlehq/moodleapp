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
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CorePushNotificationsClickHandler } from '@core/pushnotifications/providers/delegate';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { AddonModForumProvider } from './forum';

/**
 * Handler for forum push notifications clicks.
 */
@Injectable()
export class AddonModForumPushClickHandler implements CorePushNotificationsClickHandler {
    name = 'AddonModForumPushClickHandler';
    priority = 200;
    featureName = 'CoreCourseModuleDelegate_AddonModForum';

    constructor(private utils: CoreUtilsProvider, private forumProvider: AddonModForumProvider,
            private urlUtils: CoreUrlUtilsProvider, private linkHelper: CoreContentLinksHelperProvider) {}

    /**
     * Check if a notification click is handled by this handler.
     *
     * @param notification The notification to check.
     * @return Whether the notification click is handled by this handler
     */
    handles(notification: any): boolean | Promise<boolean> {
        return this.utils.isTrueOrOne(notification.notif) && notification.moodlecomponent == 'mod_forum' &&
                notification.name == 'posts';
    }

    /**
     * Handle the notification click.
     *
     * @param notification The notification to check.
     * @return Promise resolved when done.
     */
    handleClick(notification: any): Promise<any> {
        const contextUrlParams = this.urlUtils.extractUrlParams(notification.contexturl),
            data = notification.customdata || {},
            pageParams: any = {
                courseId: Number(notification.courseid),
                discussionId: Number(contextUrlParams.d || data.discussionid),
                cmId: Number(data.cmid),
                forumId: Number(data.instance)
            };

        if (data.postid || contextUrlParams.urlHash) {
            pageParams.postId = Number(data.postid || contextUrlParams.urlHash.replace('p', ''));
        }

        return this.forumProvider.invalidateDiscussionPosts(pageParams.discussionId, undefined, notification.site).catch(() => {
            // Ignore errors.
        }).then(() => {
            return this.linkHelper.goInSite(undefined, 'AddonModForumDiscussionPage', pageParams, notification.site);
        });
    }
}
