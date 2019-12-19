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
import { AddonModAssignProvider } from './assign';

/**
 * Handler for assign push notifications clicks.
 */
@Injectable()
export class AddonModAssignPushClickHandler implements CorePushNotificationsClickHandler {
    name = 'AddonModAssignPushClickHandler';
    priority = 200;
    featureName = 'CoreCourseModuleDelegate_AddonModAssign';

    constructor(private utils: CoreUtilsProvider, private assignProvider: AddonModAssignProvider,
            private urlUtils: CoreUrlUtilsProvider, private courseHelper: CoreCourseHelperProvider) {}

    /**
     * Check if a notification click is handled by this handler.
     *
     * @param notification The notification to check.
     * @return Whether the notification click is handled by this handler
     */
    handles(notification: any): boolean | Promise<boolean> {
        return this.utils.isTrueOrOne(notification.notif) && notification.moodlecomponent == 'mod_assign' &&
                notification.name == 'assign_notification';
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

        return this.assignProvider.invalidateContent(moduleId, courseId, notification.site).catch(() => {
            // Ignore errors.
        }).then(() => {
            return this.courseHelper.navigateToModule(moduleId, notification.site, courseId);
        });
    }
}
