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

import { CoreContentLinksAction } from '../providers/delegate';
import { CoreContentLinksHandlerBase } from './base-handler';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';

/**
 * Handler to handle URLs pointing to the index of a module.
 */
export class CoreContentLinksModuleIndexHandler extends CoreContentLinksHandlerBase {

    /**
     * If this boolean is set to true, the app will retrieve all modules with this modName with a single WS call.
     * This reduces the number of WS calls, but it isn't recommended for modules that can return a lot of contents.
     * @type {boolean}
     */
    protected useModNameToGetModule = false;

    /**
     * Construct the handler.
     *
     * @param {CoreCourseHelperProvider} courseHelper The CoreCourseHelperProvider instance.
     * @param {string} addon Name of the addon as it's registered in course delegate. It'll be used to check if it's disabled.
     * @param {string} modName Name of the module (assign, book, ...).
     */
    constructor(protected courseHelper: CoreCourseHelperProvider, public addon: string, public modName: string) {
        super();

        // Match the view.php URL with an id param.
        this.pattern = new RegExp('\/mod\/' + modName + '\/view\.php.*([\&\?]id=\\d+)');
        this.featureName = 'CoreCourseModuleDelegate_' + addon;
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

        courseId = courseId || params.courseid || params.cid;

        return [{
            action: (siteId, navCtrl?): void => {
                this.courseHelper.navigateToModule(parseInt(params.id, 10), siteId, courseId, undefined,
                    this.useModNameToGetModule ? this.modName : undefined);
            }
        }];
    }
}
