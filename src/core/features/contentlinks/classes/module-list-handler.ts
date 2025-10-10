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
import { Translate } from '@singletons';

import { CoreContentLinksAction } from '../services/contentlinks-delegate';
import { CORE_COURSE_MODULE_FEATURE_PREFIX } from '@features/course/constants';
import { CoreCourseOverview } from '@features/course/services/course-overview';

/**
 * Handler to handle URLs pointing to a list of a certain type of modules.
 */
export class CoreContentLinksModuleListHandler extends CoreContentLinksHandlerBase {

    /**
     * The title to use in the new page. If not defined, the app will try to calculate it.
     */
    protected title = '';

    constructor(
        public addon: string,
        public modName: string,
    ) {
        super();

        // Match the index.php URL with an id param.
        this.pattern = new RegExp(`/mod/${modName}/index.php.*([&?]id=\\d+)`);
        this.featureName = CORE_COURSE_MODULE_FEATURE_PREFIX + addon;
    }

    /**
     * @inheritdoc
     */
    getActions(
        siteIds: string[],
        url: string,
        params: Record<string, string>,
    ): CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        return [{
            action: async (siteId): Promise<void> => {
                const title = this.title || Translate.instant(`addon.mod_${this.modName}.modulenameplural`);
                await CoreCourseOverview.navigateToCourseOverview(parseInt(params.id), this.modName, title, siteId);
            },
        }];
    }

}
