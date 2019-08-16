// (C) Copyright 2015 Martin Dougiamas
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
import { AddonModQuizProvider } from './quiz';
import { AddonModQuizHelperProvider } from './helper';

/**
 * Handler for quiz push notifications clicks.
 */
@Injectable()
export class AddonModQuizPushClickHandler implements CorePushNotificationsClickHandler {
    name = 'AddonModQuizPushClickHandler';
    priority = 200;
    featureName = 'CoreCourseModuleDelegate_AddonModQuiz';

    protected SUPPORTED_NAMES = ['submission', 'confirmation', 'attempt_overdue'];

    constructor(private utils: CoreUtilsProvider, private quizProvider: AddonModQuizProvider,
            private urlUtils: CoreUrlUtilsProvider, private courseHelper: CoreCourseHelperProvider,
            private quizHelper: AddonModQuizHelperProvider) {}

    /**
     * Check if a notification click is handled by this handler.
     *
     * @param {any} notification The notification to check.
     * @return {boolean} Whether the notification click is handled by this handler
     */
    handles(notification: any): boolean | Promise<boolean> {
        return this.utils.isTrueOrOne(notification.notif) && notification.moodlecomponent == 'mod_quiz' &&
                this.SUPPORTED_NAMES.indexOf(notification.name) != -1;
    }

    /**
     * Handle the notification click.
     *
     * @param {any} notification The notification to check.
     * @return {Promise<any>} Promise resolved when done.
     */
    handleClick(notification: any): Promise<any> {
        const contextUrlParams = this.urlUtils.extractUrlParams(notification.contexturl),
            data = notification.customdata || {},
            courseId = Number(notification.courseid);

        if (notification.name == 'submission') {
            // A student made a submission, go to view the attempt.
            return this.quizHelper.handleReviewLink(undefined, Number(contextUrlParams.attempt), Number(contextUrlParams.page),
                    courseId, Number(data.instance), notification.site);
        } else {
            // Open the activity.
            const moduleId = Number(contextUrlParams.id);

            return this.quizProvider.invalidateContent(moduleId, courseId, notification.site).catch(() => {
                // Ignore errors.
            }).then(() => {
                return this.courseHelper.navigateToModule(moduleId, notification.site, courseId);
            });
        }
    }
}
