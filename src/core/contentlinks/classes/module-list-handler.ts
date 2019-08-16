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
import { CoreContentLinksHelperProvider } from '../providers/helper';
import { CoreContentLinksHandlerBase } from './base-handler';
import { TranslateService } from '@ngx-translate/core';

/**
 * Handler to handle URLs pointing to a list of a certain type of modules.
 */
export class CoreContentLinksModuleListHandler extends CoreContentLinksHandlerBase {

    /**
     * The title to use in the new page. If not defined, the app will try to calculate it.
     * @type {string}
     */
    protected title: string;

    /**
     * Construct the handler.
     *
     * @param {CoreContentLinksHelperProvider} linkHelper The CoreContentLinksHelperProvider instance.
     * @param {TranslateService} translate The TranslateService instance.
     * @param {string} addon Name of the addon as it's registered in course delegate. It'll be used to check if it's disabled.
     * @param {string} modName Name of the module (assign, book, ...).
     */
    constructor(protected linkHelper: CoreContentLinksHelperProvider, protected translate: TranslateService, public addon: string,
            public modName: string) {
        super();

        // Match the view.php URL with an id param.
        this.pattern = new RegExp('\/mod\/' + modName + '\/index\.php.*([\&\?]id=\\d+)');
        this.featureName = 'CoreCourseModuleDelegate_' + addon;
    }

    /**
     * Get the list of actions for a link (url).
     *
     * @param {string[]} siteIds List of sites the URL belongs to.
     * @param {string} url The URL to treat.
     * @param {any} params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @return {CoreContentLinksAction[]|Promise<CoreContentLinksAction[]>} List of (or promise resolved with list of) actions.
     */
    getActions(siteIds: string[], url: string, params: any): CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {

        return [{
            action: (siteId, navCtrl?): void => {
                const stateParams = {
                        courseId: params.id,
                        modName: this.modName,
                        title: this.title || this.translate.instant('addon.mod_' + this.modName + '.modulenameplural')
                    };

                // Always use redirect to make it the new history root (to avoid "loops" in history).
                this.linkHelper.goInSite(navCtrl, 'CoreCourseListModTypePage', stateParams, siteId);
            }
        }];
    }
}
