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
import { CoreUrl } from '@singletons/url';
import { CoreUtils } from '@singletons/utils';
import { makeSingleton } from '@singletons';
import { AddonModFeedbackHelper } from '../feedback-helper';
import { ADDON_MOD_FEEDBACK_FEATURE_NAME } from '../../constants';

/**
 * Handler for feedback push notifications clicks.
 */
@Injectable({ providedIn: 'root' })
export class AddonModFeedbackPushClickHandlerService implements CorePushNotificationsClickHandler {

    name = 'AddonModFeedbackPushClickHandler';
    priority = 200;
    featureName = ADDON_MOD_FEEDBACK_FEATURE_NAME;

    /**
     * @inheritdoc
     */
    async handles(notification: CorePushNotificationsNotificationBasicData): Promise<boolean> {
        if (CoreUtils.isTrueOrOne(notification.notif) && notification.moodlecomponent == 'mod_feedback' &&
                (notification.name == 'submission' || notification.name == 'message')) {

            return true;
        }

        return false;
    }

    /**
     * @inheritdoc
     */
    handleClick(notification: AddonModFeedbackPushNotificationData): Promise<void> {
        const contextUrlParams = CoreUrl.extractUrlParams(notification.contexturl!);
        const courseId = Number(notification.courseid);
        const moduleId = Number(contextUrlParams.id);

        if (notification.name == 'submission') {
            return AddonModFeedbackHelper.handleShowEntriesLink(contextUrlParams, notification.site);
        } else {
            return CoreCourseHelper.navigateToModule(moduleId, {
                courseId,
                siteId: notification.site,
            });
        }
    }

}

export const AddonModFeedbackPushClickHandler = makeSingleton(AddonModFeedbackPushClickHandlerService);

type AddonModFeedbackPushNotificationData = CorePushNotificationsNotificationBasicData & {
    contexturl?: string;
    courseid?: number | string;
};
