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
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { AddonModFeedbackProvider } from './feedback';
import { AddonModFeedbackHelperProvider } from './helper';

/**
 * Handler for feedback push notifications clicks.
 */
@Injectable()
export class AddonModFeedbackPushClickHandler implements CorePushNotificationsClickHandler {
    name = 'AddonModFeedbackPushClickHandler';
    priority = 200;
    featureName = 'CoreCourseModuleDelegate_AddonModFeedback';

    constructor(private utils: CoreUtilsProvider, private feedbackHelper: AddonModFeedbackHelperProvider,
            private urlUtils: CoreUrlUtilsProvider, private courseHelper: CoreCourseHelperProvider,
            private feedbackProvider: AddonModFeedbackProvider) {}

    /**
     * Check if a notification click is handled by this handler.
     *
     * @param notification The notification to check.
     * @return Whether the notification click is handled by this handler
     */
    handles(notification: any): boolean | Promise<boolean> {
        if (this.utils.isTrueOrOne(notification.notif) && notification.moodlecomponent == 'mod_feedback' &&
                (notification.name == 'submission' || notification.name == 'message')) {

            return this.feedbackProvider.isPluginEnabled(notification.site);
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
        const contextUrlParams = this.urlUtils.extractUrlParams(notification.contexturl),
            courseId = Number(notification.courseid),
            moduleId = Number(contextUrlParams.id);

        if (notification.name == 'submission') {
            return this.feedbackHelper.handleShowEntriesLink(undefined, contextUrlParams, notification.site);
        } else {
            return this.courseHelper.navigateToModule(moduleId, notification.site, courseId);
        }
    }
}
