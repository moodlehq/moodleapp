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

import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CoreCourse } from '@features/course/services/course';
import { CoreNavigator } from '@services/navigator';
import { CoreSitesReadingStrategy } from '@services/sites';
import { makeSingleton, Translate } from '@singletons';
import { AddonModWiki } from '../wiki';
import { ADDON_MOD_WIKI_MODNAME, ADDON_MOD_WIKI_PAGE_NAME } from '../../constants';
import { AddonModWikiCreateLinkHandlerService } from '@addons/mod/wiki/services/handlers/create-link';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreAlerts } from '@services/overlays/alerts';

/**
 * Handler to treat links to create a wiki page.
 */
@Injectable({ providedIn: 'root' })
export class AddonModWikiCreateLinkHandlerLazyService extends AddonModWikiCreateLinkHandlerService {

    /**
     * Check if the current view is a wiki page of the same wiki.
     *
     * @param route Activated route if current route is wiki index page, null otherwise.
     * @param subwikiId Subwiki ID to check.
     * @param siteId Site ID.
     * @returns Promise resolved with boolean: whether current view belongs to the same wiki.
     */
    protected async currentStateIsSameWiki(route: ActivatedRoute | null, subwikiId: number, siteId: string): Promise<boolean> {
        if (!route) {
            // Current view isn't wiki index.
            return false;
        }

        const params = CoreNavigator.getRouteParams(route);
        const queryParams = CoreNavigator.getRouteQueryParams(route);

        if (queryParams.subwikiId == subwikiId) {
            // Same subwiki, so it's same wiki.
            return true;
        }

        const options = {
            cmId: params.cmId,
            readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE,
            siteId,
        };

        if (queryParams.pageId) {
            // Get the page contents to check the subwiki.
            try {
                const page = await AddonModWiki.getPageContents(queryParams.pageId, options);

                return page.subwikiid == subwikiId;
            } catch {
                // Not found, check next case.
            }
        }

        try {
            // Get the wiki.
            const wiki = await AddonModWiki.getWiki(params.courseId, params.cmId, options);

            // Check if the subwiki belongs to this wiki.
            return await AddonModWiki.wikiHasSubwiki(wiki.id, subwikiId, options);
        } catch {
            // Not found, return false.
            return false;
        }
    }

    /**
     * @inheritdoc
     */
    async handleAction(siteId: string, courseId: number, params: Record<string, string>): Promise<void> {
        const modal = await CoreLoadings.show();
        const AddonModWikiIndexPage = await import('../../pages/index');

        try {
            const route = CoreNavigator.getCurrentRoute({ pageComponent: AddonModWikiIndexPage.default });
            if (!route) {
                // Current view isn't wiki index.
                return;
            }
            const subwikiId = parseInt(params.swid, 10);
            const wikiId = parseInt(params.wid, 10);
            let path = ADDON_MOD_WIKI_PAGE_NAME;

            // Check if the link is inside the same wiki.
            const isSameWiki = await this.currentStateIsSameWiki(route, subwikiId, siteId);

            if (isSameWiki) {
                // User is seeing the wiki, we can get the module from the wiki params.
                const routeParams = CoreNavigator.getRouteParams(route);

                path = `${path}/${routeParams.courseId}/${routeParams.cmId}/edit`;
            } else if (wikiId) {
                // The URL specifies which wiki it belongs to. Get the module.
                const module = await CoreCourse.getModuleBasicInfoByInstance(
                    wikiId,
                    ADDON_MOD_WIKI_MODNAME,
                    { siteId, readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE },
                );

                path = `${path}/${module.course}/${module.id}/edit`;
            } else {
                // Cannot get module ID.
                path = `${path}/${courseId || 0}/0/edit`;
            }

            // Open the page.
            CoreNavigator.navigateToSitePath(
                path,
                {
                    params: {
                        pageTitle: params.title,
                        subwikiId: subwikiId,
                    },
                    siteId,
                },
            );
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('addon.mod_wiki.errorloadingpage') });
        } finally {
            modal.dismiss();
        }
    }

}

export const AddonModWikiCreateLinkHandler = makeSingleton(AddonModWikiCreateLinkHandlerLazyService);
