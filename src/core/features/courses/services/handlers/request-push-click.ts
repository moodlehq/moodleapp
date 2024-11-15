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
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CorePushNotificationsClickHandler } from '@features/pushnotifications/services/push-delegate';
import { CorePushNotificationsNotificationBasicData } from '@features/pushnotifications/services/pushnotifications';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton } from '@singletons';
import { CorePath } from '@singletons/path';
import { CoreCourses } from '../courses';
import { CoreLoadings } from '@services/loadings';
import { CorePromiseUtils } from '@singletons/promise-utils';

/**
 * Handler for course request push notifications clicks.
 */
@Injectable({ providedIn: 'root' })
export class CoreCoursesRequestPushClickHandlerService implements CorePushNotificationsClickHandler {

    name = 'CoreCoursesRequestPushClickHandler';
    priority = 200;

    /**
     * Check if a notification click is handled by this handler.
     *
     * @param notification The notification to check.
     * @returns Whether the notification click is handled by this handler
     */
    async handles(notification: CorePushNotificationsNotificationBasicData): Promise<boolean> {
        // Don't support 'courserequestrejected', that way the app will open the notifications page.
        return CoreUtils.isTrueOrOne(notification.notif) && notification.moodlecomponent == 'moodle' &&
            (notification.name == 'courserequested' || notification.name == 'courserequestapproved');
    }

    /**
     * Handle the notification click.
     *
     * @param notification The notification to check.
     * @returns Promise resolved when done.
     */
    async handleClick(notification: CoreCoursesRequestNotificationData): Promise<void> {
        const courseId = notification.courseid;

        if (notification.name == 'courserequested') {
            // Feature not supported in the app, open in browser.
            const site = await CoreSites.getSite(notification.site);
            const url = CorePath.concatenatePaths(site.getURL(), 'course/pending.php');

            await site.openInBrowserWithAutoLogin(url);

            return;
        }

        // Open the course.
        const modal = await CoreLoadings.show();

        await CorePromiseUtils.ignoreErrors(CoreCourses.invalidateUserCourses(notification.site));

        try {
            const result = await CoreCourseHelper.getCourse(courseId, notification.site);
            const params: Params = {
                course: result.course,
            };
            let page = 'course/' + courseId;

            if (!result.enrolled) {
                // User not enrolled (shouldn't happen), open the preview page.
                page += '/summary';
            }

            await CoreNavigator.navigateToSitePath(page, { params, siteId: notification.site });
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error getting course.');
        } finally {
            modal.dismiss();
        }
    }

}

export const CoreCoursesRequestPushClickHandler = makeSingleton(CoreCoursesRequestPushClickHandlerService);

type CoreCoursesRequestNotificationData = CorePushNotificationsNotificationBasicData & {
    courseid: number; // Course ID related to the notification.
};
