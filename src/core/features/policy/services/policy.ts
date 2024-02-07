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
import { CoreError } from '@classes/errors/error';
import { CoreWSError } from '@classes/errors/wserror';
import { CoreLoginHelper } from '@features/login/services/login-helper';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreWSExternalWarning } from '@services/ws';
import { makeSingleton } from '@singletons';
import { POLICY_PAGE_NAME, SITE_POLICY_PAGE_NAME } from '../constants';

/**
 * Service that provides some common features regarding policies.
 */
@Injectable({ providedIn: 'root' })
export class CorePolicyService {

    /**
     * Accept all mandatory site policies.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if success, rejected if failure.
     */
    async acceptMandatorySitePolicies(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const result = await site.write<AgreeSitePolicyResult>('core_user_agree_site_policy', {});

        if (result.status) {
            return;
        }

        if (!result.warnings?.length) {
            throw new CoreError('Cannot agree site policy');
        }

        // Check if there is a warning 'alreadyagreed'.
        const found = result.warnings.some((warning) => warning.warningcode === 'alreadyagreed');
        if (found) {
            // Policy already agreed, treat it as a success.
            return;
        }

        // Another warning, reject.
        throw new CoreWSError(result.warnings[0]);
    }

    /**
     * Get the URL to view the site policy (or all the site policies in a single page if there's more than one).
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the site policy.
     */
    async getSitePoliciesURL(siteId?: string): Promise<string> {
        const site = await CoreSites.getSite(siteId);

        let sitePolicy: string | undefined;

        try {
            // Try to get the latest config, maybe the site policy was just added or has changed.
            sitePolicy = await site.getConfig('sitepolicy', true);
        } catch (error) {
            // Cannot get config, try to get the site policy using signup settings.
            const settings = await CoreLoginHelper.getEmailSignupSettings(site.getURL());

            sitePolicy = settings.sitepolicy;
        }

        if (!sitePolicy) {
            throw new CoreError('Cannot retrieve site policy');
        }

        return sitePolicy;
    }

    /**
     * Open page to accept site policies.
     *
     * @param siteId Site ID. If not defined, current site.
     */
    goToAcceptSitePolicies(siteId?: string): void {
        siteId = siteId || CoreSites.getCurrentSiteId();
        if (!siteId || siteId != CoreSites.getCurrentSiteId()) {
            // Only current site allowed.
            return;
        }

        const routePath = `/${POLICY_PAGE_NAME}/${SITE_POLICY_PAGE_NAME}`;

        // If current page is already site policy, stop.
        if (CoreNavigator.isCurrent(routePath)) {
            return;
        }

        CoreNavigator.navigate(routePath, { params: { siteId }, reset: true });
    }

}

export const CorePolicy = makeSingleton(CorePolicyService);

/**
 * Result of WS core_user_agree_site_policy.
 */
type AgreeSitePolicyResult = {
    status: boolean; // Status: true only if we set the policyagreed to 1 for the user.
    warnings?: CoreWSExternalWarning[];
};
