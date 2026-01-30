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

import { isSafeNumber } from '@/core/utils/types';
import { Injectable } from '@angular/core';

import { CoreGrades } from '@features/grades/services/grades';
import { CoreGradesHelper } from '@features/grades/services/grades-helper';
import { CorePushNotificationsClickHandler } from '@features/pushnotifications/services/push-delegate';
import { CorePushNotificationsNotificationBasicData } from '@features/pushnotifications/services/pushnotifications';
import { CoreUtils } from '@static/utils';
import { makeSingleton } from '@singletons';
import { ADDON_MOD_LESSON_FEATURE_NAME } from '../../constants';

/**
 * Handler for lesson push notifications clicks.
 */
@Injectable({ providedIn: 'root' })
export class AddonModLessonPushClickHandlerService implements CorePushNotificationsClickHandler {

    name = 'AddonModLessonPushClickHandler';
    priority = 200;
    featureName = ADDON_MOD_LESSON_FEATURE_NAME;

    /**
     * Check if a notification click is handled by this handler.
     *
     * @param notification The notification to check.
     * @returns Whether the notification click is handled by this handler.
     */
    async handles(notification: NotificationData): Promise<boolean> {
        if (
            CoreUtils.isTrueOrOne(notification.notif) &&
            notification.moodlecomponent == 'mod_lesson' &&
            notification.name == 'graded_essay' &&
            notification.customdata?.cmid
        ) {

            return CoreGrades.isPluginEnabledForCourse(Number(notification.courseid), notification.site);
        }

        return false;
    }

    /**
     * Handle the notification click.
     *
     * @param notification The notification to check.
     * @returns Promise resolved when done.
     */
    async handleClick(notification: NotificationData): Promise<void> {
        const data = notification.customdata || {};
        const courseId = Number(notification.courseid);
        const moduleId = Number(data.cmid);

        if (!isSafeNumber(moduleId)) {
            return;
        }

        return CoreGradesHelper.goToGrades(courseId, undefined, moduleId, notification.site);
    }

}

export const AddonModLessonPushClickHandler = makeSingleton(AddonModLessonPushClickHandlerService);

type NotificationData = CorePushNotificationsNotificationBasicData & {
    courseid: number;
};
