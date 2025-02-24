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
import { CoreNavigator } from '@services/navigator';
import { CORE_COURSE_MODULE_FEATURE_PREFIX } from '@features/course/constants';

/**
 * Handler to handle URLs pointing to a list of a certain type of modules.
 */
export class CoreContentLinksModuleListHandler extends CoreContentLinksHandlerBase {

    /**
     * The title to use in the new page. If not defined, the app will try to calculate it.
     */
    protected title = '';

    /**
     * Construct the handler.
     *
     * @param addon Name of the addon as it's registered in course delegate. It'll be used to check if it's disabled.
     * @param modName Name of the module (assign, book, ...).
     */
    constructor(
        public addon: string,
        public modName: string,
    ) {
        super();

        // Match the index.php URL with an id param.
        this.pattern = new RegExp('/mod/' + modName + '/index.php.*([&?]id=\\d+)');
        this.featureName = CORE_COURSE_MODULE_FEATURE_PREFIX + addon;
    }

    /**
     * Get the list of actions for a link (url).
     *
     * @param siteIds List of sites the URL belongs to.
     * @param url The URL to treat.
     * @param params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @returns List of (or promise resolved with list of) actions.
     */
    getActions(
        siteIds: string[],
        url: string,
        params: Record<string, string>,
    ): CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {

        return [{
            action: async (siteId): Promise<void> => {
                await CoreNavigator.navigateToSitePath('course/' + params.id + '/list-mod-type', {
                    params: {
                        modName: this.modName,
                        title: this.title || Translate.instant('addon.mod_' + this.modName + '.modulenameplural'),
                    },
                    siteId,
                });
            },
        }];
    }

}
