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
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CorePushNotificationsClickHandler } from '@features/pushnotifications/services/push-delegate';
import { CorePushNotificationsNotificationBasicData } from '@features/pushnotifications/services/pushnotifications';
import { CoreUrlUtils } from '@services/utils/url';
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton } from '@singletons';
import { AddonModAssign } from '../assign';

/**
 * Handler for assign push notifications clicks.
 */
@Injectable({ providedIn: 'root' })
export class AddonModAssignPushClickHandlerService implements CorePushNotificationsClickHandler {

    name = 'AddonModAssignPushClickHandler';
    priority = 200;
    featureName = 'CoreCourseModuleDelegate_AddonModAssign';

    /**
     * Check if a notification click is handled by this handler.
     *
     * @param notification The notification to check.
     * @returns Whether the notification click is handled by this handler
     */
    async handles(notification: NotificationData): Promise<boolean> {
        return CoreUtils.isTrueOrOne(notification.notif) && notification.moodlecomponent == 'mod_assign' &&
                notification.name == 'assign_notification';
    }

    /**
     * Handle the notification click.
     *
     * @param notification The notification to check.
     * @returns Promise resolved when done.
     */
    async handleClick(notification: NotificationData): Promise<void> {
        const contextUrlParams = CoreUrlUtils.extractUrlParams(notification.contexturl);
        const courseId = Number(notification.courseid);
        const moduleId = Number(contextUrlParams.id);

        await CoreUtils.ignoreErrors(AddonModAssign.invalidateContent(moduleId, courseId, notification.site));
        await CoreCourseHelper.navigateToModule(moduleId, {
            courseId,
            siteId: notification.site,
        });
    }

}
export const AddonModAssignPushClickHandler = makeSingleton(AddonModAssignPushClickHandlerService);

type NotificationData = CorePushNotificationsNotificationBasicData & {
    courseid: number;
    contexturl: string;
};
