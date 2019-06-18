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
import { CoreContentLinksHandlerBase } from '@core/contentlinks/classes/base-handler';
import { CoreContentLinksAction } from '@core/contentlinks/providers/delegate';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { CoreUserProvider } from './user';

/**
 * Handler to treat links to user participants page.
 */
@Injectable()
export class CoreUserParticipantsLinkHandler extends CoreContentLinksHandlerBase {
    name = 'CoreUserParticipants';
    featureName = 'CoreCourseOptionsDelegate_CoreUserParticipants';
    pattern = /\/user\/index\.php/;

    constructor(private userProvider: CoreUserProvider,
            private courseHelper: CoreCourseHelperProvider, private domUtils: CoreDomUtilsProvider,
            private linkHelper: CoreContentLinksHelperProvider, private courseProvider: CoreCourseProvider) {
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
        courseId = parseInt(params.id, 10) || courseId;

        return [{
            action: (siteId, navCtrl?): void => {
                // Check if we already are in the course index page.
                if (this.courseProvider.currentViewIsCourse(navCtrl, courseId)) {
                    // Current view is this course, just select the participants tab.
                    this.courseProvider.selectCourseTab('CoreUserParticipants');

                    return;
                }

                const modal = this.domUtils.showModalLoading();

                this.courseHelper.getCourse(courseId, siteId).then((result) => {
                    const params: any = {
                        course: result.course,
                        selectedTab: 'CoreUserParticipants'
                    };

                    return this.linkHelper.goInSite(navCtrl, 'CoreCourseSectionPage', params, siteId).catch(() => {
                        // Ignore errors.
                    });
                }).catch(() => {
                    // Cannot get course for some reason, just open the participants page.
                    return this.linkHelper.goInSite(navCtrl, 'CoreUserParticipantsPage', {courseId: courseId}, siteId);
                }).finally(() => {
                    modal.dismiss();
                });
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
        courseId = parseInt(params.id, 10) || courseId;

        if (!courseId || url.indexOf('/grade/report/') != -1) {
            return false;
        }

        return this.userProvider.isPluginEnabledForCourse(courseId, siteId);
    }
}
