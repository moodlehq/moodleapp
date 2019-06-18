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
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { CoreCoursesProvider } from './courses';

/**
 * Handler to treat links to course index (list of courses).
 */
@Injectable()
export class CoreCoursesIndexLinkHandler extends CoreContentLinksHandlerBase {
    name = 'CoreCoursesIndexLinkHandler';
    featureName = 'CoreMainMenuDelegate_CoreCourses';
    pattern = /\/course\/?(index\.php.*)?$/;

    constructor(private coursesProvider: CoreCoursesProvider, private linkHelper: CoreContentLinksHelperProvider) {
        super();
    }

    /**
     * Get the list of actions for a link (url).
     *
     * @param {string[]} siteIds List of sites the URL belongs to.
     * @param {string} url The URL to treat.
     * @param {any} params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param {number} [courseId] Course ID related to the URL. Optional but recommended.
     * @return {CoreContentLinksAction[] | Promise<CoreContentLinksAction[]>} List of (or promise resolved with list of) actions.
     */
    getActions(siteIds: string[], url: string, params: any, courseId?: number):
            CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        return [{
            action: (siteId, navCtrl?): void => {
                let page = 'CoreCoursesMyCoursesPage'; // By default, go to My Courses.
                const pageParams: any = {};

                if (this.coursesProvider.isGetCoursesByFieldAvailable()) {
                    if (params.categoryid) {
                        page = 'CoreCoursesCategoriesPage';
                        pageParams.categoryId = parseInt(params.categoryid, 10);
                    } else {
                        page = 'CoreCoursesAvailableCoursesPage';
                    }
                }

                this.linkHelper.goInSite(navCtrl, page, pageParams, siteId);
            }
        }];
    }
}
