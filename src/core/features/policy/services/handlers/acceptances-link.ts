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
import { CoreNavigator } from '@services/navigator';
import { makeSingleton } from '@singletons';
import { ACCEPTANCES_PAGE_NAME, CORE_POLICY_FEATURE_NAME, POLICY_PAGE_NAME } from '@features/policy/constants';
import { CoreSites } from '@services/sites';

/**
 * Handler to treat links to policy acceptances page.
 */
@Injectable({ providedIn: 'root' })
export class CorePolicyAcceptancesLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'CorePolicyAcceptancesLinkHandler';
    pattern = /\/admin\/tool\/policy\/user\.php/;
    featureName = CORE_POLICY_FEATURE_NAME;

    /**
     * @inheritdoc
     */
    getActions(): CoreContentLinksAction[] {
        return [{
            action: async (siteId: string): Promise<void> => {
                await CoreNavigator.navigateToSitePath(`/${POLICY_PAGE_NAME}/${ACCEPTANCES_PAGE_NAME}`, { siteId });
            },
        }];
    }

    /**
     * @inheritdoc
     */
    async isEnabled(siteId: string, url: string, params: Record<string, string>): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);
        const userId = Number(params.userid);

        if (userId && userId !== site.getUserId()) {
            // Only viewing your own policies is supported.
            return false;
        }

        const { CorePolicy } = await import('@features/policy/services/policy');

        return CorePolicy.isManageAcceptancesAvailable(siteId);
    }

}

export const CorePolicyAcceptancesLinkHandler = makeSingleton(CorePolicyAcceptancesLinkHandlerService);
