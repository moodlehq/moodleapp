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
import { AddonModDataProvider } from './data';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreDomUtilsProvider } from '@providers/utils/dom';

/**
 * Content links handler for database show entry.
 * Match mod/data/view.php?d=6&rid=5 with a valid data id and entryid.
 */
@Injectable()
export class AddonModDataShowLinkHandler extends CoreContentLinksHandlerBase {
    name = 'AddonModDataShowLinkHandler';
    featureName = 'CoreCourseModuleDelegate_AddonModData';
    pattern = /\/mod\/data\/view\.php.*([\?\&](d|rid|page|group|mode)=\d+)/;

    constructor(private linkHelper: CoreContentLinksHelperProvider, private dataProvider: AddonModDataProvider,
            private courseProvider: CoreCourseProvider, private domUtils: CoreDomUtilsProvider) {
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
        return [{
            action: (siteId, navCtrl?): void => {
                const modal = this.domUtils.showModalLoading(),
                    dataId = parseInt(params.d, 10),
                    rId = parseInt(params.rid, 10) || false,
                    group = parseInt(params.group, 10) || false,
                    page = parseInt(params.page, 10) || false;

                this.courseProvider.getModuleBasicInfoByInstance(dataId, 'data', siteId).then((module) => {
                    const pageParams = {
                        module: module,
                        courseId: module.course
                    };

                    if (group) {
                        pageParams['group'] = group;
                    }

                    if (params.mode && params.mode == 'single') {
                        pageParams['offset'] = page || 0;
                    } else if (rId) {
                        pageParams['entryId'] = rId;
                    }

                    return this.linkHelper.goInSite(navCtrl, 'AddonModDataEntryPage', pageParams, siteId);
                }).finally(() => {
                    // Just in case. In fact we need to dismiss the modal before showing a toast or error message.
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
        if (typeof params.d == 'undefined') {
            // Id not defined. Cannot treat the URL.
            return false;
        }

        if ((!params.mode || params.mode != 'single') && typeof params.rid == 'undefined') {
            return false;
        }

        return this.dataProvider.isPluginEnabled(siteId);
    }
}
