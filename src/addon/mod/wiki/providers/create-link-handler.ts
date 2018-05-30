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
import { NavController, ViewController } from 'ionic-angular';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreContentLinksHandlerBase } from '@core/contentlinks/classes/base-handler';
import { CoreContentLinksAction } from '@core/contentlinks/providers/delegate';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { AddonModWikiProvider } from './wiki';

/**
 * Handler to treat links to create a wiki page.
 */
@Injectable()
export class AddonModWikiCreateLinkHandler extends CoreContentLinksHandlerBase {
    name = 'AddonModWikiCreateLinkHandler';
    featureName = 'CoreCourseModuleDelegate_AddonModWiki';
    pattern = /\/mod\/wiki\/create\.php.*([\&\?]swid=\d+)/;

    constructor(protected domUtils: CoreDomUtilsProvider, protected wikiProvider: AddonModWikiProvider,
            protected courseHelper: CoreCourseHelperProvider, protected linkHelper: CoreContentLinksHelperProvider,
            protected courseProvider: CoreCourseProvider) {
        super();
    }

    /**
     * Check if the current view is a wiki page of the same wiki.
     *
     * @param {ViewController} activeView Active view.
     * @param {number} subwikiId Subwiki ID to check.
     * @param {string} siteId Site ID.
     * @return {Promise<boolean>} Promise resolved with boolean: whether current view belongs to the same wiki.
     */
    protected currentStateIsSameWiki(activeView: ViewController, subwikiId: number, siteId: string): Promise<boolean> {

        if (activeView && activeView.component.name == 'AddonModWikiIndexPage') {
            if (activeView.data.subwikiId == subwikiId) {
                // Same subwiki, so it's same wiki.
                return Promise.resolve(true);

            } else if (activeView.data.pageId) {
                // Get the page contents to check the subwiki.
                return this.wikiProvider.getPageContents(activeView.data.pageId, false, false, siteId).then((page) => {
                    return page.subwikiid == subwikiId;
                }).catch(() => {
                    // Not found, return false.
                    return false;
                });

            } else if (activeView.data.wikiId) {
                // Check if the subwiki belongs to this wiki.
                return this.wikiProvider.wikiHasSubwiki(activeView.data.wikiId, subwikiId, false, false, siteId);

            } else if (activeView.data.courseId && activeView.data.module) {
                const moduleId = activeView.data.module && activeView.data.module.id;
                if (moduleId) {
                    // Get the wiki.
                    return this.wikiProvider.getWiki(activeView.data.courseId, moduleId, false, siteId).then((wiki) => {
                        // Check if the subwiki belongs to this wiki.
                        return this.wikiProvider.wikiHasSubwiki(wiki.id, subwikiId, false, false, siteId);
                    }).catch(() => {
                        // Not found, return false.
                        return false;
                    });
                }
            }
        }

        return Promise.resolve(false);
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
            action: (siteId, navCtrl?: NavController): void => {
                const modal = this.domUtils.showModalLoading(),
                    subwikiId = parseInt(params.swid, 10),
                    activeView = navCtrl && navCtrl.getActive();

                // Check if the link is inside the same wiki.
                this.currentStateIsSameWiki(activeView, subwikiId, siteId).then((isSameWiki) => {
                    if (isSameWiki) {
                        // User is seeing the wiki, we can get the module from the wiki params.
                        if (activeView && activeView.data.module && activeView.data.module.id) {
                            // We already have it in the params.
                            return activeView.data.module;
                        } else if (activeView && activeView.data.wikiId) {
                            return this.courseProvider.getModuleBasicInfoByInstance(activeView.data.wikiId, 'wiki', siteId)
                                    .catch(() => {
                                // Not found.
                            });
                        }
                    }
                }).then((module) => {
                    // Return the params.
                    const pageParams = {
                        module: module,
                        courseId: courseId || (module && module.course) || (activeView && activeView.data.courseId),
                        pageTitle: params.title,
                        subwikiId: subwikiId
                    };

                    this.linkHelper.goInSite(navCtrl, 'AddonModWikiEditPage', pageParams, siteId);
                }).finally(() => {
                    modal.dismiss();
                });
            }
        }];
    }
}
