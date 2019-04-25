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
import { CoreContentLinksHandlerBase } from '@core/contentlinks/classes/base-handler';
import { CoreContentLinksAction } from '@core/contentlinks/providers/delegate';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { CoreLoginHelperProvider } from '@core/login/providers/helper';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreGradesProvider } from './grades';

/**
 * Handler to treat links to user grades.
 */
@Injectable()
export class CoreGradesUserLinkHandler extends CoreContentLinksHandlerBase {
    name = 'CoreGradesUserLinkHandler';
    pattern = /\/grade\/report\/user\/index.php/;

    constructor(private linkHelper: CoreContentLinksHelperProvider, private gradesProvider: CoreGradesProvider,
            private domUtils: CoreDomUtilsProvider, private courseHelper: CoreCourseHelperProvider,
            private loginHelper: CoreLoginHelperProvider) {
        super();
    }

    /**
     * Get the list of actions for a link (url).
     *
     * @param {string[]} siteIds List of sites the URL belongs to.
     * @param {string} url The URL to treat.
     * @param {any} params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param {number} [courseId] Course ID related to the URL. Optional but recommended.
     * @return {CoreContentLinksAction[]|Promise<CoreContentLinksAction[]>} List of (or promise resolved with list of) actions.
     */
    getActions(siteIds: string[], url: string, params: any, courseId?: number):
            CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        courseId = courseId || params.id;

        return [{
            action: (siteId, navCtrl?): void => {
                const userId = params.userid ? parseInt(params.userid, 10) : false;

                if (userId) {
                    // Open the grades page directly.
                    const pageParams = {
                        course: {id: courseId},
                        userId: userId,
                    };

                    this.linkHelper.goInSite(navCtrl, 'CoreGradesCoursePage', pageParams, siteId);
                } else {
                    // No userid, open the course with the grades tab selected.
                    const modal = this.domUtils.showModalLoading();

                    this.courseHelper.getCourse(courseId, siteId).then((result) => {
                        const pageParams: any = {
                            course: result.course,
                            selectedTab: 'CoreGrades'
                        };

                        // Use redirect to prevent loops in the navigation.
                        return this.loginHelper.redirect('CoreCourseSectionPage', pageParams, siteId);
                    }).catch(() => {
                        // Cannot get course for some reason, just open the grades page.
                        return this.linkHelper.goInSite(navCtrl, 'CoreGradesCoursePage', {course: {id: courseId}}, siteId);
                    }).finally(() => {
                        modal.dismiss();
                    });
                }
            }
        }];
    }

    /**
     * Check if the handler is enabled for a certain site (site + user) and a URL.
     * If not defined, defaults to true.
     *
     * @param {string} siteId The site ID.
     * @param {string} url The URL to treat.
     * @param {any} params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param {number} [courseId] Course ID related to the URL. Optional but recommended.
     * @return {boolean|Promise<boolean>} Whether the handler is enabled for the URL and site.
     */
    isEnabled(siteId: string, url: string, params: any, courseId?: number): boolean | Promise<boolean> {
        if (!courseId && !params.id) {
            return false;
        }

        return this.gradesProvider.isPluginEnabledForCourse(courseId || params.id, siteId);
    }
}
