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
import { CoreContentLinksModuleIndexHandler } from '@core/contentlinks/classes/module-index-handler';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { CoreContentLinksAction } from '@core/contentlinks/providers/delegate';

/**
 * Handler to treat links to book.
 */
@Injectable()
export class AddonModBookLinkHandler extends CoreContentLinksModuleIndexHandler {
    name = 'AddonModBookLinkHandler';

    constructor(courseHelper: CoreCourseHelperProvider) {
        super(courseHelper, 'AddonModBook', 'book');
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

        const modParams = params.chapterid ? {chapterId: params.chapterid} : undefined;
        courseId = courseId || params.courseid || params.cid;

        return [{
            action: (siteId, navCtrl?): void => {
                this.courseHelper.navigateToModule(parseInt(params.id, 10), siteId, courseId, undefined,
                    this.useModNameToGetModule ? this.modName : undefined, modParams, navCtrl);
            }
        }];
    }
}
