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
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CorePushNotificationsClickHandler } from '@core/pushnotifications/providers/delegate';
import { CoreLoginHelperProvider } from '@core/login/providers/helper';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { CoreGradesProvider } from '@core/grades/providers/grades';
import { AddonModLessonProvider } from './lesson';

/**
 * Handler for lesson push notifications clicks.
 */
@Injectable()
export class AddonModLessonPushClickHandler implements CorePushNotificationsClickHandler {
    name = 'AddonModLessonPushClickHandler';
    priority = 200;
    featureName = 'CoreCourseModuleDelegate_AddonModLesson';

    constructor(private utils: CoreUtilsProvider, private lessonProvider: AddonModLessonProvider,
            private loginHelper: CoreLoginHelperProvider, private domUtils: CoreDomUtilsProvider,
            private courseHelper: CoreCourseHelperProvider, private gradesProvider: CoreGradesProvider) {}

    /**
     * Check if a notification click is handled by this handler.
     *
     * @param {any} notification The notification to check.
     * @return {boolean} Whether the notification click is handled by this handler
     */
    handles(notification: any): boolean | Promise<boolean> {
        if (this.utils.isTrueOrOne(notification.notif) && notification.moodlecomponent == 'mod_lesson' &&
                notification.name == 'graded_essay') {

            return this.lessonProvider.isPluginEnabled(notification.site);
        }

        return false;
    }

    /**
     * Handle the notification click.
     *
     * @param {any} notification The notification to check.
     * @return {Promise<any>} Promise resolved when done.
     */
    handleClick(notification: any): Promise<any> {
        const data = notification.customdata || {},
            courseId = Number(notification.courseid),
            moduleId = Number(data.cmid),
            modal = this.domUtils.showModalLoading();
        let promise;

        if (moduleId) {
            // Try to open the module grade directly. Check if it's possible.
            promise = this.gradesProvider.isGradeItemsAvalaible(notification.site).catch(() => {
                return false;
            });
        } else {
            promise = Promise.resolve(false);
        }

        return promise.then((getGrades) => {

            if (getGrades) {
                return this.gradesProvider.getGradeItems(courseId, undefined, undefined, notification.site).then((items) => {
                    // Find the item of th module.
                    const item = items.find((item) => {
                        return moduleId == item.cmid;
                    });

                    if (item) {
                        // Open the item directly.
                        const pageParams: any = {
                            courseId: courseId,
                            gradeId: item.id
                        };

                        this.loginHelper.redirect('CoreGradesGradePage', pageParams, notification.site);
                    }

                    return Promise.reject(null);
                });
            } else {
                return Promise.reject(null);
            }

        }).catch(() => {
            // Cannot get grade items or there's no need to. Open the course with the grades tab selected.
            return this.courseHelper.getCourse(courseId, notification.site).then((result) => {
                const pageParams: any = {
                    course: result.course,
                    selectedTab: 'CoreGrades'
                };

                this.loginHelper.redirect('CoreCourseSectionPage', pageParams, notification.site);
            });
        }).catch(() => {
            // Cannot get course for some reason, just open the grades page.
            return this.loginHelper.redirect('CoreGradesCoursePage', {course: {id: courseId}}, notification.site);
        }).finally(() => {
            modal.dismiss();
        });
    }
}
