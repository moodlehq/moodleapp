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
import { makeSingleton } from '@singletons';
import { AddonModDataHelper } from '../data-helper';
import { AddonModDataDeleteLinkHandlerService } from '@addons/mod/data/services/handlers/delete-link';

/**
 * Content links handler for database delete entry.
 * Match mod/data/view.php?d=6&delete=5 with a valid data id and entryid.
 */
@Injectable({ providedIn: 'root' })
export class AddonModDataDeleteLinkHandlerLazyService extends AddonModDataDeleteLinkHandlerService {

    /**
     * @inheritdoc
     */
    async handleAction(siteId: string, params: Record<string, string>, courseId?: number): Promise<void> {
        const dataId = parseInt(params.d, 10);
        const entryId = parseInt(params.delete, 10);

        await AddonModDataHelper.showDeleteEntryModal(dataId, entryId, courseId, siteId);
    }

    /**
     * @inheritdoc
     */
    async isEnabled(siteId: string, url: string, params: Record<string, string>): Promise<boolean> {
        if (params.d === undefined || params.delete === undefined) {
            // Required fields not defined. Cannot treat the URL.
            return false;
        }

        return true;
    }

}
export const AddonModDataDeleteLinkHandler = makeSingleton(AddonModDataDeleteLinkHandlerLazyService);
