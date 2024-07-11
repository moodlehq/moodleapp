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
import { CoreContentLinksHandlerBase } from '@features/contentlinks/classes/base-handler';
import { CoreContentLinksAction } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreCourse } from '@features/course/services/course';
import { CoreNavigator } from '@services/navigator';
import { CoreSitesReadingStrategy } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { makeSingleton } from '@singletons';
import { ADDON_MOD_GLOSSARY_PAGE_NAME } from '../../constants';

/**
 * Content links handler for glossary new entry.
 * Match mod/glossary/edit.php?cmid=6 with a valid data.
 * Currently it only supports new entry.
 */
@Injectable({ providedIn: 'root' })
export class AddonModGlossaryEditLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonModGlossaryEditLinkHandler';
    featureName = 'CoreCourseModuleDelegate_AddonModGlossary';
    pattern = /\/mod\/glossary\/edit\.php.*([?&](cmid)=\d+)/;

    /**
     * @inheritdoc
     */
    getActions(siteIds: string[], url: string, params: Record<string, string>): CoreContentLinksAction[] {
        return [{
            action: async (siteId: string) => {
                const modal = await CoreDomUtils.showModalLoading();

                const cmId = Number(params.cmid);

                try {
                    const module = await CoreCourse.getModuleBasicInfo(
                        cmId,
                        { siteId, readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE },
                    );

                    await CoreNavigator.navigateToSitePath(
                        `${ADDON_MOD_GLOSSARY_PAGE_NAME}/${module.course}/${module.id}/entry/new`,
                        { siteId },
                    );
                } catch (error) {
                    CoreDomUtils.showErrorModalDefault(error, 'addon.mod_glossary.errorloadingglossary', true);
                } finally {
                    // Just in case. In fact we need to dismiss the modal before showing a toast or error message.
                    modal.dismiss();
                }
            },
        }];
    }

    /**
     * @inheritdoc
     */
    async isEnabled(siteId: string, url: string, params: Record<string, string>): Promise<boolean> {
        return params.cmid !== undefined;
    }

}

export const AddonModGlossaryEditLinkHandler = makeSingleton(AddonModGlossaryEditLinkHandlerService);
