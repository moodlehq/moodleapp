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

import { Component, OnDestroy, OnInit } from '@angular/core';

import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { Translate } from '@singletons';
import { CorePolicy, CorePolicySitePolicy, CorePolicyStatus } from '@features/policy/services/policy';
import { CoreTime } from '@singletons/time';
import { CoreScreen } from '@services/screen';
import { Subscription } from 'rxjs';
import { CORE_DATAPRIVACY_FEATURE_NAME, CORE_DATAPRIVACY_PAGE_NAME } from '@features/dataprivacy/constants';
import { CoreNavigator } from '@services/navigator';
import { CoreDataPrivacy } from '@features/dataprivacy/services/dataprivacy';
import { CoreModals } from '@services/overlays/modals';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page to view user acceptances.
 */
@Component({
    selector: 'page-core-policy-acceptances',
    templateUrl: 'acceptances.html',
    styleUrl: 'acceptances.scss',
    imports: [
        CoreSharedModule,
    ],
})
export default class CorePolicyAcceptancesPage implements OnInit, OnDestroy {

    dataLoaded = false;
    policies: ActiveSitePolicy[] = [];
    activeStatus = CorePolicyStatus.Active;
    inactiveStatus = CorePolicyStatus.Archived;
    isTablet = false;
    hasOnBehalf = false;
    canContactDPO = false;

    protected logView: () => void;
    protected layoutSubscription?: Subscription;

    constructor() {
        this.logView = CoreTime.once(() => {
            const currentUserId = CoreSites.getCurrentSiteUserId();

            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM_LIST,
                ws: 'tool_policy_get_user_acceptances',
                name: Translate.instant('core.policy.policiesagreements'),
                data: { userid: currentUserId },
                url: `/admin/tool/policy/user.php?userid=${currentUserId}`,
            });
        });
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.isTablet = CoreScreen.isTablet;
        this.layoutSubscription = CoreScreen.layoutObservable.subscribe(() => {
            this.isTablet = CoreScreen.isTablet;
        });

        this.fetchCanContactDPO();
        this.fetchAcceptances().finally(() => {
            this.dataLoaded = true;
        });
    }

    /**
     * Check if user can contact DPO.
     */
    protected async fetchCanContactDPO(): Promise<void> {
        const site = CoreSites.getCurrentSite();
        if (!site || site.isFeatureDisabled(CORE_DATAPRIVACY_FEATURE_NAME)) {
            this.canContactDPO = false;

            return;
        }

        this.canContactDPO = await CorePromiseUtils.ignoreErrors(CoreDataPrivacy.isEnabled(), false);
    }

    /**
     * Fetch the policies and acceptances.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchAcceptances(): Promise<void> {
        try {
            const allPolicies = await CorePolicy.getUserAcceptances();

            this.hasOnBehalf = false;

            const policiesById = allPolicies.reduce((groupedPolicies, policy) => {
                const formattedPolicy = this.formatSitePolicy(policy);
                this.hasOnBehalf = this.hasOnBehalf || formattedPolicy.onBehalf;

                groupedPolicies[policy.policyid] = groupedPolicies[policy.policyid] || [];
                groupedPolicies[policy.policyid].push(formattedPolicy);

                return groupedPolicies;
            }, <Record<number, SitePolicy[]>> {});

            this.policies = [];
            for (const policyId in policiesById) {
                const policyVersions = policiesById[policyId];

                let activePolicy: ActiveSitePolicy | undefined =
                    policyVersions.find((policy) => policy.status === CorePolicyStatus.Active);
                if (!activePolicy) {
                    // No active policy, it shouldn't happen. Use the one with highest versionid.
                    policyVersions.sort((a, b) => b.versionid - a.versionid);
                    activePolicy = policyVersions[0];
                }

                activePolicy.previousVersions = policyVersions.filter(policy => policy !== activePolicy);
                this.policies.push(activePolicy);
            }

            this.logView();
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error getting policies.' });
        }
    }

    /**
     * Format a site policy, adding some calculated data.
     *
     * @param policy Policy to format.
     * @param expanded Whether the policy should be expanded or not.
     * @returns Formatted policy.
     */
    protected formatSitePolicy(policy: CorePolicySitePolicy, expanded = false): SitePolicy {
        const hasAccepted = policy.acceptance?.status === 1;
        const hasDeclined = policy.acceptance?.status === 0;
        const onBehalf = !!policy.acceptance && policy.acceptance.usermodified !== CoreSites.getCurrentSiteUserId();

        return {
            ...policy,
            expanded,
            hasAccepted,
            hasDeclined,
            onBehalf,
            hasActions: hasDeclined || !hasAccepted || !!policy.optional,
        };
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     */
    async refreshAcceptances(refresher?: HTMLIonRefresherElement): Promise<void> {
        await CorePromiseUtils.ignoreErrors(CorePolicy.invalidateAcceptances());

        await CorePromiseUtils.ignoreErrors(this.fetchAcceptances());

        refresher?.complete();
    }

    /**
     * Toogle the visibility of a policy (expand/collapse).
     *
     * @param event Event.
     * @param policy Policy.
     */
    toggle(event: Event, policy: SitePolicy): void {
        event.preventDefault();
        event.stopPropagation();
        policy.expanded = !policy.expanded;
    }

    /**
     * View the full policy.
     *
     * @param event Event.
     * @param policy Policy.
     */
    async viewFullPolicy(event: Event, policy: CorePolicySitePolicy): Promise<void> {
        event.preventDefault();
        event.stopPropagation();

        const { CorePolicyViewPolicyModalComponent } =
            await import('@features/policy/components/policy-modal/policy-modal');

        CoreModals.openModal({
            component: CorePolicyViewPolicyModalComponent,
            componentProps: { policy },
        });
    }

    /**
     * Set the acceptance of a policy.
     *
     * @param event Event.
     * @param policy Policy
     * @param accept Whether to accept or not.
     */
    async setAcceptance(event: Event, policy: SitePolicy, accept: boolean): Promise<void> {
        event.preventDefault();
        event.stopPropagation();

        const modal = await CoreLoadings.show('core.sending', true);

        try {
            await CorePolicy.setUserAcceptances({ [policy.versionid]: accept ? 1 : 0 });

            await this.updatePolicyAcceptance(policy, accept);
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error changing policy status.' });
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Update the acceptance data for a certain policy.
     *
     * @param policy Policy to update.
     * @param accepted Whether the policy has just been accepted or declined.
     */
    protected async updatePolicyAcceptance(policy: SitePolicy, accepted: boolean): Promise<void> {
        try {
            const policies = await CorePolicy.getUserAcceptances({ readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK });

            const newPolicy = policies.find((p) => p.versionid === policy.versionid);

            if (!newPolicy) {
                throw new Error('Policy not found.');
            }

            policy.acceptance = newPolicy.acceptance;
        } catch {
            // Error updating the acceptance, calculate it in the app.
            policy.acceptance = {
                status: accepted ? 1 : 0,
                lang: policy.acceptance?.lang ?? 'en',
                timemodified: Date.now(),
                usermodified: CoreSites.getCurrentSiteUserId(),
            };
        }

        Object.assign(policy, this.formatSitePolicy(policy, policy.expanded));
    }

    /**
     * Open page to contact DPO.
     *
     * @param event Event.
     */
    openContactDPO(event: Event): void {
        event.preventDefault();
        event.stopPropagation();

        CoreNavigator.navigateToSitePath(CORE_DATAPRIVACY_PAGE_NAME);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.layoutSubscription?.unsubscribe();
    }

}

/**
 * Site policy with some calculated data.
 */
type SitePolicy = CorePolicySitePolicy & {
    expanded: boolean;
    hasAccepted: boolean;
    hasDeclined: boolean;
    onBehalf: boolean;
    hasActions: boolean;
};

/**
 * Active site policy with some calculated data.
 */
type ActiveSitePolicy = SitePolicy & {
    previousVersions?: SitePolicy[];
};
