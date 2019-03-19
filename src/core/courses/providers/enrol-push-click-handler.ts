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
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CorePushNotificationsClickHandler } from '@core/pushnotifications/providers/delegate';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { CoreLoginHelperProvider } from '@core/login/providers/helper';

/**
 * Handler for enrol push notifications clicks.
 */
@Injectable()
export class CoreCoursesEnrolPushClickHandler implements CorePushNotificationsClickHandler {
    name = 'CoreCoursesEnrolPushClickHandler';
    priority = 200;

    constructor(private utils: CoreUtilsProvider, private domUtils: CoreDomUtilsProvider,
            private courseHelper: CoreCourseHelperProvider, private loginHelper: CoreLoginHelperProvider) {}

    /**
     * Check if a notification click is handled by this handler.
     *
     * @param {any} notification The notification to check.
     * @return {boolean} Whether the notification click is handled by this handler
     */
    handles(notification: any): boolean | Promise<boolean> {
        return this.utils.isTrueOrOne(notification.notif) && notification.moodlecomponent.indexOf('enrol_') === 0 &&
                notification.name == 'expiry_notification';
    }

    /**
     * Handle the notification click.
     *
     * @param {any} notification The notification to check.
     * @return {Promise<any>} Promise resolved when done.
     */
    handleClick(notification: any): Promise<any> {
        const courseId = Number(notification.courseid),
            modal = this.domUtils.showModalLoading();

        return this.courseHelper.getCourse(courseId, notification.site).then((result) => {
            const params: any = {
                course: result.course
            };
            let page;

            if (notification.contexturl && notification.contexturl.indexOf('user/index.php') != -1) {
                // Open the participants tab.
                page = 'CoreCourseSectionPage';
                params.selectedTab = 'CoreUserParticipants';
            } else if (result.enrolled) {
                // User is still enrolled, open the course.
                page = 'CoreCourseSectionPage';
            } else {
                // User not enrolled anymore, open the preview page.
                page = 'CoreCoursesCoursePreviewPage';
            }

            return this.loginHelper.redirect(page, params, notification.site);
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error getting course.');
        }).finally(() => {
            modal.dismiss();
        });
    }
}
