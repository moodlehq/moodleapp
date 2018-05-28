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
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { AddonModWikiProvider } from './wiki';

/**
 * Handler to treat links to a wiki page or the wiki map.
 */
@Injectable()
export class AddonModWikiPageOrMapLinkHandler extends CoreContentLinksHandlerBase {
    name = 'AddonModWikiPageOrMapLinkHandler';
    featureName = 'CoreCourseModuleDelegate_AddonModWiki';
    pattern = /\/mod\/wiki\/(view|map)\.php.*([\&\?]pageid=\d+)/;

    constructor(protected domUtils: CoreDomUtilsProvider, protected wikiProvider: AddonModWikiProvider,
            protected courseHelper: CoreCourseHelperProvider, protected linkHelper: CoreContentLinksHelperProvider) {
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

        courseId = courseId || params.courseid || params.cid;

        return [{
            action: (siteId, navCtrl?): void => {
                const modal = this.domUtils.showModalLoading(),
                    pageId = parseInt(params.pageid, 10),
                    action = url.indexOf('mod/wiki/map.php') != -1 ? 'map' : 'page';

                // Get the page data to obtain wikiId, subwikiId, etc.
                this.wikiProvider.getPageContents(pageId, false, false, siteId).then((page) => {
                    let promise;
                    if (courseId) {
                        promise = Promise.resolve(courseId);
                    } else {
                        promise = this.courseHelper.getModuleCourseIdByInstance(page.wikiid, 'wiki', siteId);
                    }

                    return promise.then((courseId) => {
                        const pageParams = {
                            courseId: courseId,
                            pageId: page.id,
                            pageTitle: page.title,
                            wikiId: page.wikiid,
                            subwikiId: page.subwikiid,
                            action: action
                        };

                        this.linkHelper.goInSite(navCtrl, 'AddonModWikiIndexPage', pageParams, siteId);
                    });
                }).catch((error) => {

                    this.domUtils.showErrorModalDefault(error, 'addon.mod_wiki.errorloadingpage', true);
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
        const isMap = url.indexOf('mod/wiki/map.php') != -1;

        if (params.id && !isMap) {
            // ID param is more prioritary than pageid in index page, it's a index URL.
            return false;
        } else if (isMap && typeof params.option != 'undefined' && params.option != 5) {
            // Map link but the option isn't "Page list", not supported.
            return false;
        }

        return true;
    }
}
