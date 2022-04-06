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
import { CoreContentLinksHandlerBase } from '@features/contentlinks/classes/base-handler';
import { CoreContentLinksAction } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreCourse } from '@features/course/services/course';
import { CoreNavigator } from '@services/navigator';
import { CoreSitesReadingStrategy } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { makeSingleton } from '@singletons';
import { AddonModDataModuleHandlerService } from './module';

/**
 * Content links handler for database add or edit entry.
 * Match mod/data/edit.php?d=6&rid=6 with a valid data and optional record id.
 */
@Injectable({ providedIn: 'root' })
export class AddonModDataEditLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonModDataEditLinkHandler';
    featureName = 'CoreCourseModuleDelegate_AddonModData';
    pattern = /\/mod\/data\/edit\.php.*([?&](d|rid)=\d+)/;

    /**
     * @inheritdoc
     */
    getActions(siteIds: string[], url: string, params: Params): CoreContentLinksAction[] {
        return [{
            action: async (siteId): Promise<void> => {
                const modal = await CoreDomUtils.showModalLoading();
                const dataId = parseInt(params.d, 10);
                const rId = params.rid || '';

                try {
                    const module = await CoreCourse.getModuleBasicInfoByInstance(
                        dataId,
                        'data',
                        { siteId, readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE },
                    );
                    const pageParams: Params = {
                        title: module.name,
                    };

                    CoreNavigator.navigateToSitePath(
                        `${AddonModDataModuleHandlerService.PAGE_NAME}/${module.course}/${module.id}/edit/${rId}`,
                        { siteId, params: pageParams },
                    );
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
    async isEnabled(siteId: string, url: string, params: Params): Promise<boolean> {
        if (params.d === undefined) {
            // Id not defined. Cannot treat the URL.
            return false;
        }

        return true;
    }

}
export const AddonModDataEditLinkHandler = makeSingleton(AddonModDataEditLinkHandlerService);
