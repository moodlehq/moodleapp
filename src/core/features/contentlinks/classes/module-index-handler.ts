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

import { CoreContentLinksHandlerBase } from './base-handler';
import { CoreContentLinksAction } from '../services/contentlinks-delegate';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreNavigationOptions } from '@services/navigator';

/**
 * Handler to handle URLs pointing to the index of a module.
 */
export class CoreContentLinksModuleIndexHandler extends CoreContentLinksHandlerBase {

    /**
     * If this boolean is set to true, the app will retrieve all modules with this modName with a single WS call.
     * This reduces the number of WS calls, but it isn't recommended for modules that can return a lot of contents.
     */
    protected useModNameToGetModule = false;

    /**
     * Construct the handler.
     *
     * @param addon Name of the addon as it's registered in course delegate. It'll be used to check if it's disabled.
     * @param modName Name of the module (assign, book, ...).
     * @param instanceIdParam Param name for instance ID gathering. Only if set.
     */
    constructor(
        public addon: string,
        public modName: string,
        protected instanceIdParam?: string,
    ) {
        super();

        // Match the view.php URL with an id or instance id param.
        const pattern = instanceIdParam ?
            '/mod/' + modName + '/view.php.*([&?](' + instanceIdParam + '|id)=\\d+)' :
            '/mod/' + modName + '/view.php.*([&?]id=\\d+)';

        this.pattern = new RegExp(pattern);
        this.featureName = 'CoreCourseModuleDelegate_' + addon;
    }

    /**
     * Get the navigation options to open the module.
     *
     * @param url The URL to treat.
     * @param params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param siteId The site ID.
     * @param courseId Course ID related to the URL. Optional but recommended.
     * @returns Navigation options to open the module.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getModNavOptions(url: string, params: Record<string, string>, siteId: string, courseId?: number): CoreNavigationOptions {
        return {};
    }

    /**
     * Get the list of actions for a link (url).
     *
     * @param siteIds List of sites the URL belongs to.
     * @param url The URL to treat.
     * @param params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param courseId Course ID related to the URL. Optional but recommended.
     * @returns List of (or promise resolved with list of) actions.
     */
    getActions(
        siteIds: string[],
        url: string,
        params: Record<string, string>,
        courseId?: number,
    ): CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {

        courseId = Number(courseId || params.courseid || params.cid);

        if (this.instanceIdParam && params[this.instanceIdParam] !== undefined) {
            const instanceId = parseInt(params[this.instanceIdParam], 10);

            return [{
                action: (siteId) => {
                    CoreCourseHelper.navigateToModuleByInstance(
                        instanceId,
                        this.modName,
                        {
                            courseId,
                            useModNameToGetModule: this.useModNameToGetModule,
                            modNavOptions: this.getModNavOptions(url, params, siteId, courseId),
                            siteId,
                        },
                    );
                },
            }];
        }

        return [{
            action: (siteId) => {
                CoreCourseHelper.navigateToModule(
                    parseInt(params.id, 10),
                    {
                        courseId,
                        modName: this.useModNameToGetModule ? this.modName : undefined,
                        modNavOptions: this.getModNavOptions(url, params, siteId, courseId),
                        siteId,
                    },
                );
            },
        }];
    }

}
