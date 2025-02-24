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
import { makeSingleton } from '@singletons';
import { AddonModFeedbackHelper } from '../feedback-helper';
import { ADDON_MOD_FEEDBACK_FEATURE_NAME } from '../../constants';

/**
 * Content links handler for feedback show entries questions.
 * Match mod/feedback/show_entries.php with a valid feedback id.
 */
@Injectable({ providedIn: 'root' })
export class AddonModFeedbackShowEntriesLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonModFeedbackShowEntriesLinkHandler';
    featureName = ADDON_MOD_FEEDBACK_FEATURE_NAME;
    pattern = /\/mod\/feedback\/show_entries\.php.*([?&](id|showcompleted)=\d+)/;

    /**
     * @inheritdoc
     */
    getActions(siteIds: string[], url: string, params: Record<string, string>): CoreContentLinksAction[] {
        return [{
            action: async (siteId: string) => {
                await AddonModFeedbackHelper.handleShowEntriesLink(params, siteId);
            },
        }];
    }

    /**
     * @inheritdoc
     */
    async isEnabled(siteId: string, url: string, params: Record<string, string>): Promise<boolean> {
        if (params.id === undefined) {
            // Cannot treat the URL.
            return false;
        }

        return true;
    }

}

export const AddonModFeedbackShowEntriesLinkHandler = makeSingleton(AddonModFeedbackShowEntriesLinkHandlerService);
