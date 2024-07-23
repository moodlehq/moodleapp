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
import { CoreCourse } from '@features/course/services/course';
import { CoreNavigator } from '@services/navigator';
import { CoreSitesReadingStrategy } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { makeSingleton } from '@singletons';
import { AddonModWiki } from '../wiki';
import { ADDON_MOD_WIKI_PAGE_NAME } from '../../constants';
import { AddonModWikiEditLinkHandlerService } from '@addons/mod/wiki/services/handlers/edit-link';

/**
 * Handler to treat links to edit a wiki page.
 */
@Injectable({ providedIn: 'root' })
export class AddonModWikiEditLinkHandlerLazyService extends AddonModWikiEditLinkHandlerService {

    /**
     * @inheritdoc
     */
    async handleAction(siteId: string, params: Record<string, string>): Promise<void> {
        const modal = await CoreDomUtils.showModalLoading();

        try {
            const pageId = Number(params.pageid);

            const pageContents = await AddonModWiki.getPageContents(pageId, { siteId });

            const module = await CoreCourse.getModuleBasicInfoByInstance(
                pageContents.wikiid,
                'wiki',
                { siteId, readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE },
            );

            let section = '';
            if (params.section !== undefined) {
                section = params.section.replace(/\+/g, ' ');
            }

            await CoreNavigator.navigateToSitePath(
                `${ADDON_MOD_WIKI_PAGE_NAME}/${module.course}/${module.id}/edit`,
                {
                    params: {
                        section: section,
                        pageId: pageId,
                    },
                    siteId,
                },
            );
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.mod_wiki.errorloadingpage', true);
        } finally {
            modal.dismiss();
        }
    }

}

export const AddonModWikiEditLinkHandler = makeSingleton(AddonModWikiEditLinkHandlerLazyService);
