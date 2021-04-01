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
import { makeSingleton } from '@singletons';
import { AddonModData } from '../data';
import { AddonModDataHelper } from '../data-helper';

/**
 * Content links handler for database delete entry.
 * Match mod/data/view.php?d=6&delete=5 with a valid data id and entryid.
 */
@Injectable({ providedIn: 'root' })
export class AddonModDataDeleteLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonModDataDeleteLinkHandler';
    featureName = 'CoreCourseModuleDelegate_AddonModData';
    pattern = /\/mod\/data\/view\.php.*([?&](d|delete)=\d+)/;

    /**
     * @inheritdoc
     */
    getActions(siteIds: string[], url: string, params: Params, courseId?: number): CoreContentLinksAction[] {
        return [{
            action: (siteId): void => {
                const dataId = parseInt(params.d, 10);
                const entryId = parseInt(params.delete, 10);

                AddonModDataHelper.showDeleteEntryModal(dataId, entryId, courseId, siteId);
            },
        }];
    }

    /**
     * @inheritdoc
     */
    async isEnabled(siteId: string, url: string, params: Params): Promise<boolean> {
        if (typeof params.d == 'undefined' || typeof params.delete == 'undefined') {
            // Required fields not defined. Cannot treat the URL.
            return false;
        }

        return AddonModData.isPluginEnabled(siteId);
    }

}
export const AddonModDataDeleteLinkHandler = makeSingleton(AddonModDataDeleteLinkHandlerService);
