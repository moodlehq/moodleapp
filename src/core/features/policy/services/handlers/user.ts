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
import {
    CoreUserDelegateContext,
    CoreUserProfileHandlerType,
    CoreUserProfileHandler,
    CoreUserProfileListHandlerData,
} from '@features/user/services/user-delegate';
import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';
import { CoreNavigator } from '@services/navigator';
import { CoreUserProfile } from '@features/user/services/user';
import { ACCEPTANCES_PAGE_NAME, POLICY_PAGE_NAME } from '@features/policy/constants';

/**
 * Handler to inject an option into user menu.
 */
@Injectable({ providedIn: 'root' })
export class CorePolicyUserHandlerService implements CoreUserProfileHandler {

    readonly type = CoreUserProfileHandlerType.LIST_ACCOUNT_ITEM;
    name = 'CorePolicy';
    priority = 50;

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        const { CorePolicy } = await import('@features/policy/services/policy');

        const wsAvailable = await CorePolicy.isManageAcceptancesAvailable();
        if (!wsAvailable) {
            return false;
        }

        const policyHandler = await CoreSites.getCurrentSite()?.getConfig('sitepolicyhandler');

        return policyHandler === 'tool_policy';
    }

    /**
     * @inheritdoc
     */
    async isEnabledForContext(context: CoreUserDelegateContext): Promise<boolean> {
        return context === CoreUserDelegateContext.USER_MENU;
    }

    /**
     * @inheritdoc
     */
    async isEnabledForUser(user: CoreUserProfile): Promise<boolean> {
        return user.id == CoreSites.getCurrentSiteUserId();
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreUserProfileListHandlerData {
        return {
            icon: 'fas-file-shield',
            title: 'core.policy.policiesagreements',
            class: 'core-policy-user-handler',
            action: (event): void => {
                event.preventDefault();
                event.stopPropagation();
                CoreNavigator.navigateToSitePath(`/${POLICY_PAGE_NAME}/${ACCEPTANCES_PAGE_NAME}`);
            },
        };
    }

}

export const CorePolicyUserHandler = makeSingleton(CorePolicyUserHandlerService);
