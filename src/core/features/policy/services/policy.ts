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
import { CoreSites, CoreSitesCommonWSOptions } from '@services/sites';
import { CoreWSExternalWarning } from '@services/ws';
import { makeSingleton } from '@singletons';
import { POLICY_PAGE_NAME, SITE_POLICY_PAGE_NAME } from '../constants';
import { CoreCacheUpdateFrequency } from '@/core/constants';
import { CoreTextFormat } from '@singletons/text';

/**
 * Service that provides some common features regarding policies.
 */
@Injectable({ providedIn: 'root' })
export class CorePolicyService {

    protected static readonly ROOT_CACHE_KEY = 'CorePolicy:';

    /**
     * Accept all mandatory site policies.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if success, rejected if failure.
     */
    async acceptMandatorySitePolicies(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const result = await site.write<CorePolicyAgreeSitePolicyResult>('core_user_agree_site_policy', {});

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
     * Get the next policies to accept.
     *
     * @param options Options
     * @returns Next pending policies
     */
    async getNextPendingPolicies(options: CoreSitesCommonWSOptions = {}): Promise<CorePolicySitePolicy[]> {
        const policies = await this.getUserAcceptances(options);

        const pendingPolicies: CorePolicySitePolicy[] = [];

        for (const i in policies) {
            const policy = policies[i];
            if (policy.status !== CorePolicyStatus.Active) {
                continue;
            }

            const hasAccepted = policy.acceptance?.status === 1;
            const hasDeclined = policy.acceptance?.status === 0;

            if (hasAccepted || (hasDeclined && policy.optional === 1)) {
                // Policy already answered, ignore.
                continue;
            }

            if (policy.agreementstyle === CorePolicyAgreementStyle.OwnPage) {
                // Policy needs to be accepted on its own page, it's the next policy to accept.
                return [policy];
            }

            pendingPolicies.push(policy);
        }

        return pendingPolicies;
    }

    /**
     * Get user acceptances.
     *
     * @param options Options
     * @returns List of policies with their acceptances.
     */
    async getUserAcceptances(options: CorePolicyGetAcceptancesOptions = {}): Promise<CorePolicySitePolicy[]> {
        const site = await CoreSites.getSite(options.siteId);

        const userId = options.userId || site.getUserId();
        const data: CorePolicyGetUserAcceptancesWSParams = {
            userid: userId,
        };
        const preSets = {
            cacheKey: this.getUserAcceptancesCacheKey(userId),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy),
        };

        const response = await site.read<CorePolicyGetUserAcceptancesWSResponse>('tool_policy_get_user_acceptances', data, preSets);
        if (response.warnings?.length) {
            throw new CoreWSError(response.warnings[0]);
        }

        return response.policies;
    }

    /**
     * Get the cache key for the get user acceptances call.
     *
     * @param userId ID of the user to get the badges from.
     * @returns Cache key.
     */
    protected getUserAcceptancesCacheKey(userId: number): string {
        return CorePolicyService.ROOT_CACHE_KEY + 'userAcceptances:' + userId;
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

    /**
     * Invalidate acceptances WS call.
     *
     * @param options Options.
     * @returns Promise resolved when data is invalidated.
     */
    async invalidateAcceptances(options: {userId?: number; siteId?: string} = {}): Promise<void> {
        const site = await CoreSites.getSite(options.siteId);

        await site.invalidateWsCacheForKey(this.getUserAcceptancesCacheKey(options.userId || site.getUserId()));
    }

    /**
     * Check whether a site allows getting and setting acceptances.
     *
     * @param siteId Site Id.
     * @returns Whether the site allows getting and setting acceptances.
     */
    async isManageAcceptancesAvailable(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return site.wsAvailable('tool_policy_get_user_acceptances') && site.wsAvailable('tool_policy_set_acceptances_status');
    }

    /**
     * Set user acceptances.
     *
     * @param policies Policies to accept or decline. Keys are policy version id, value is whether to accept or decline.
     * @param siteId Site ID. If not defined, current site.
     * @returns New value for policyagreed.
     */
    async setUserAcceptances(policies: Record<number, number>, siteId?: string): Promise<number> {
        const site = await CoreSites.getSite(siteId);

        const data: CorePolicySetAcceptancesWSParams = {
            userid: site.getUserId(),
            policies: Object.keys(policies).map((versionId) => ({
                versionid: Number(versionId),
                status: policies[versionId],
            })),
        };

        const response = await site.write<CorePolicySetAcceptancesWSResponse>('tool_policy_set_acceptances_status', data);
        if (response.warnings?.length) {
            throw new CoreWSError(response.warnings[0]);
        }

        return response.policyagreed;
    }

}

export const CorePolicy = makeSingleton(CorePolicyService);

/**
 * Options for get policy acceptances.
 */
type CorePolicyGetAcceptancesOptions = CoreSitesCommonWSOptions & {
    userId?: number; // User ID. If not defined, current user.
};

/**
 * Result of WS core_user_agree_site_policy.
 */
type CorePolicyAgreeSitePolicyResult = {
    status: boolean; // Status: true only if we set the policyagreed to 1 for the user.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of tool_policy_get_user_acceptances WS.
 */
type CorePolicyGetUserAcceptancesWSParams = {
    userid?: number; // The user id we want to retrieve the acceptances.
};

/**
 * Data returned by tool_policy_get_user_acceptances WS.
 */
type CorePolicyGetUserAcceptancesWSResponse = {
    policies: CorePolicySitePolicy[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Policy data returned by tool_policy_get_user_acceptances WS.
 */
export type CorePolicySitePolicy = {
    policyid: number; // The policy id.
    versionid: number; // The policy version id.
    agreementstyle: number; // The policy agreement style. 0: consent page, 1: own page.
    optional: number; // Whether the policy is optional. 0: compulsory, 1: optional.
    revision: string; // The policy revision.
    status: number; // The policy status. 0: draft, 1: active, 2: archived.
    name: string; // The policy name.
    summary?: string; // The policy summary.
    summaryformat: CoreTextFormat; // Summary format (1 = HTML, 0 = MOODLE, 2 = PLAIN, or 4 = MARKDOWN).
    content?: string; // The policy content.
    contentformat: CoreTextFormat; // Content format (1 = HTML, 0 = MOODLE, 2 = PLAIN, or 4 = MARKDOWN).
    acceptance?: CorePolicySitePolicyAcceptance; // Acceptance status for the given user.
    canaccept: boolean; // Whether the policy can be accepted.
    candecline: boolean; // Whether the policy can be declined.
    canrevoke: boolean; // Whether the policy can be revoked.
};

/**
 * Policy acceptance data returned by tool_policy_get_user_acceptances WS.
 */
export type CorePolicySitePolicyAcceptance = {
    status: number; // The acceptance status. 0: declined, 1: accepted.
    lang: string; // The policy lang.
    timemodified: number; // The time the acceptance was set.
    usermodified: number; // The user who accepted.
    note?: string; // The policy note/remarks.
    modfullname?: string; // The fullname who accepted on behalf.
};

/**
 * Params of tool_policy_set_acceptances_status WS.
 */
type CorePolicySetAcceptancesWSParams = {
    policies: {
        versionid: number; // The policy version id.
        status: number; // The policy acceptance status. 0: decline, 1: accept.
    }[]; // Policies acceptances for the given user.
    userid?: number; // The user id we want to set the acceptances. Default is the current user.
};

/**
 * Data returned by tool_policy_set_acceptances_status WS.
 */
type CorePolicySetAcceptancesWSResponse = {
    policyagreed: number; // Whether the user has provided acceptance to all current site policies. 1 if yes, 0 if not.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Agreement style.
 */
export enum CorePolicyAgreementStyle {
    ConsentPage = 0, // Policy to be accepted together with others on the consent page.
    OwnPage = 1, // Policy to be accepted on its own page before reaching the consent page.
}

/**
 * Status of a policy.
 */
export enum CorePolicyStatus {
    Draft = 0,
    Active = 1,
    Archived = 2,
}
