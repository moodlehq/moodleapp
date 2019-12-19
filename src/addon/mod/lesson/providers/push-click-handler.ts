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
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CorePushNotificationsClickHandler } from '@core/pushnotifications/providers/delegate';
import { CoreGradesProvider } from '@core/grades/providers/grades';
import { CoreGradesHelperProvider } from '@core/grades/providers/helper';

/**
 * Handler for lesson push notifications clicks.
 */
@Injectable()
export class AddonModLessonPushClickHandler implements CorePushNotificationsClickHandler {
    name = 'AddonModLessonPushClickHandler';
    priority = 200;
    featureName = 'CoreCourseModuleDelegate_AddonModLesson';

    constructor(private utils: CoreUtilsProvider, private gradesHelper: CoreGradesHelperProvider,
            private gradesProvider: CoreGradesProvider) {}

    /**
     * Check if a notification click is handled by this handler.
     *
     * @param notification The notification to check.
     * @return Whether the notification click is handled by this handler
     */
    handles(notification: any): boolean | Promise<boolean> {
        if (this.utils.isTrueOrOne(notification.notif) && notification.moodlecomponent == 'mod_lesson' &&
                notification.name == 'graded_essay') {

            return this.gradesProvider.isPluginEnabledForCourse(Number(notification.courseid), notification.site);
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
        const data = notification.customdata || {},
            courseId = Number(notification.courseid),
            moduleId = Number(data.cmid);

        return this.gradesHelper.goToGrades(courseId, undefined, moduleId, undefined, notification.site);
    }
}
