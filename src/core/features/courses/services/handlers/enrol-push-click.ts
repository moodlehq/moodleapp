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
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreNavigator } from '@services/navigator';
import { CoreUtils } from '@static/utils';
import { makeSingleton } from '@singletons';
import { CoreAlerts } from '@services/overlays/alerts';

/**
 * Handler for enrol push notifications clicks.
 */
@Injectable({ providedIn: 'root' })
export class CoreCoursesEnrolPushClickHandlerService implements CorePushNotificationsClickHandler {

    name = 'CoreCoursesEnrolPushClickHandler';
    priority = 200;

    /**
     * Check if a notification click is handled by this handler.
     *
     * @param notification The notification to check.
     * @returns Whether the notification click is handled by this handler
     */
    async handles(notification: CorePushNotificationsNotificationBasicData): Promise<boolean> {
        return CoreUtils.isTrueOrOne(notification.notif) && notification.moodlecomponent?.indexOf('enrol_') === 0 &&
            notification.name == 'expiry_notification';
    }

    /**
     * Handle the notification click.
     *
     * @param notification The notification to check.
     * @returns Promise resolved when done.
     */
    async handleClick(notification: CoreCoursesEnrolNotificationData): Promise<void> {
        const courseId = notification.courseid;

        const modal = await CoreLoadings.show();

        try {
            const result = await CoreCourseHelper.getCourse(courseId, notification.site);

            const params: Params = {
                course: result.course,
            };
            let page = `course/${courseId}`;

            if (notification.contexturl?.indexOf('user/index.php') != -1) {
                // Open the participants tab.
                params.selectedTab = 'participants'; // @todo Set this when participants is done.
            } else if (!result.enrolled) {
                // User not enrolled anymore, open the preview page.
                page += '/summary';
            }

            await CoreNavigator.navigateToSitePath(page, { params, siteId: notification.site });
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error getting course.' });
        } finally {
            modal.dismiss();
        }
    }

}

export const CoreCoursesEnrolPushClickHandler = makeSingleton(CoreCoursesEnrolPushClickHandlerService);

type CoreCoursesEnrolNotificationData = CorePushNotificationsNotificationBasicData & {
    courseid: number; // Course ID related to the notification.
    contexturl?: string; // Context URL related to the notification.
};
