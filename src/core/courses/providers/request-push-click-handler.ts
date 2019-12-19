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
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CorePushNotificationsClickHandler } from '@core/pushnotifications/providers/delegate';
import { CoreCoursesProvider } from '@core/courses/providers/courses';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { CoreLoginHelperProvider } from '@core/login/providers/helper';

/**
 * Handler for course request push notifications clicks.
 */
@Injectable()
export class CoreCoursesRequestPushClickHandler implements CorePushNotificationsClickHandler {
    name = 'CoreCoursesRequestPushClickHandler';
    priority = 200;

    protected SUPPORTED_NAMES = ['courserequested', 'courserequestapproved', 'courserequestrejected'];

    constructor(private utils: CoreUtilsProvider, private domUtils: CoreDomUtilsProvider, private sitesProvider: CoreSitesProvider,
            private courseHelper: CoreCourseHelperProvider, private loginHelper: CoreLoginHelperProvider,
            private textUtils: CoreTextUtilsProvider, private coursesProvider: CoreCoursesProvider) {}

    /**
     * Check if a notification click is handled by this handler.
     *
     * @param notification The notification to check.
     * @return Whether the notification click is handled by this handler
     */
    handles(notification: any): boolean | Promise<boolean> {
        // Don't support 'courserequestrejected', that way the app will open the notifications page.
        return this.utils.isTrueOrOne(notification.notif) && notification.moodlecomponent == 'moodle' &&
                (notification.name == 'courserequested' || notification.name == 'courserequestapproved');
    }

    /**
     * Handle the notification click.
     *
     * @param notification The notification to check.
     * @return Promise resolved when done.
     */
    handleClick(notification: any): Promise<any> {
        const courseId = Number(notification.courseid);

        if (notification.name == 'courserequested') {
            // Feature not supported in the app, open in browser.
            return this.sitesProvider.getSite(notification.site).then((site) => {
                const url = this.textUtils.concatenatePaths(site.getURL(), 'course/pending.php');

                return site.openInBrowserWithAutoLogin(url);
            });
        } else {
            // Open the course.
            const modal = this.domUtils.showModalLoading();

            return this.coursesProvider.invalidateUserCourses(notification.site).catch(() => {
                // Ignore errors.
            }).then(() => {
                return this.courseHelper.getCourse(courseId, notification.site);
            }).then((result) => {
                const params: any = {
                    course: result.course
                };
                let page;

                if (result.enrolled) {
                    // User is still enrolled, open the course.
                    page = 'CoreCourseSectionPage';
                } else {
                    // User not enrolled (shouldn't happen), open the preview page.
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
}
