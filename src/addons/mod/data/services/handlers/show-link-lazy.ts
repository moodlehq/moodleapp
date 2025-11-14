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
import { Params } from '@angular/router';
import { CoreCourse } from '@features/course/services/course';
import { CoreNavigator } from '@services/navigator';
import { CoreSitesReadingStrategy } from '@services/sites';
import { CoreLoadings } from '@services/overlays/loadings';
import { makeSingleton } from '@singletons';
import { ADDON_MOD_DATA_MODNAME, ADDON_MOD_DATA_PAGE_NAME } from '../../constants';
import { AddonModDataShowLinkHandlerService } from '@addons/mod/data/services/handlers/show-link';

/**
 * Content links handler for database show entry.
 * Match mod/data/view.php?d=6&rid=5 with a valid data id and entryid.
 */
@Injectable({ providedIn: 'root' })
export class AddonModDataShowLinkHandlerLazyService extends AddonModDataShowLinkHandlerService {

    /**
     * @inheritdoc
     */
    async handleAction(siteId: string, params: Record<string, string>): Promise<void> {
        const modal = await CoreLoadings.show();
        const dataId = parseInt(params.d, 10);
        const rId = params.rid || '0'; // If no rid, show the first entry.
        const group = parseInt(params.group, 10) || false;
        const page = parseInt(params.page, 10) || false;
        try {
            const module = await CoreCourse.getModuleBasicInfoByInstance(
                dataId,
                ADDON_MOD_DATA_MODNAME,
                { siteId, readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE },
            );
            const pageParams: Params = {
                title: module.name,
            };

            if (group) {
                pageParams.group = group;
            }

            if (params?.mode === 'single') {
                pageParams.offset = page || 0;
            }

            await CoreNavigator.navigateToSitePath(
                `${ADDON_MOD_DATA_PAGE_NAME}/${module.course}/${module.id}/${rId}`,
                { siteId, params: pageParams },
            );
        } finally {
            // Just in case. In fact we need to dismiss the modal before showing a toast or error message.
            modal.dismiss();
        }
    }

    /**
     * @inheritdoc
     */
    async isEnabled(siteId: string, url: string, params: Record<string, string>): Promise<boolean> {
        if (params.d === undefined) {
            // Id not defined. Cannot treat the URL.
            return false;
        }

        if ((!params.mode || params.mode != 'single') && params.rid === undefined) {
            return false;
        }

        return true;
    }

}
export const AddonModDataShowLinkHandler = makeSingleton(AddonModDataShowLinkHandlerLazyService);
