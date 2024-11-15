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

import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';

import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { CoreMimetypeUtils } from '@services/utils/mimetype';
import { CoreSite } from '@classes/sites/site';
import { CoreNavigator } from '@services/navigator';
import { CoreEvents } from '@singletons/events';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { Translate } from '@singletons';
import { CorePolicy, CorePolicyAgreementStyle, CorePolicySitePolicy } from '@features/policy/services/policy';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { CoreUrl } from '@singletons/url';
import { IonContent } from '@ionic/angular';
import { CoreScreen } from '@services/screen';
import { Subscription } from 'rxjs';
import { CoreDom } from '@singletons/dom';
import { CoreWait } from '@singletons/wait';
import { CoreModals } from '@services/modals';
import { CoreLoadings } from '@services/loadings';
import { CorePromiseUtils } from '@singletons/promise-utils';

/**
 * Page to accept a site policy.
 */
@Component({
    selector: 'page-core-policy-site-policy',
    templateUrl: 'site-policy.html',
    styleUrl: 'site-policy.scss',
})
export class CorePolicySitePolicyPage implements OnInit, OnDestroy {

    @ViewChild(IonContent) content?: IonContent;

    siteName?: string;
    isManageAcceptancesAvailable = false;
    policyLoaded?: boolean;
    policiesForm?: FormGroup;
    isPoliciesURL = false;
    title = '';
    subTitle?: string;
    hasScroll = false;
    isTablet = false;

    // Variables for accepting policies using a URL.
    sitePoliciesURL?: string;
    showInline?: boolean;

    // Variables for accepting policies one by one.
    currentPolicy?: SitePolicy;
    pendingPolicies?: SitePolicy[];
    agreeInOwnPage = false;
    numPolicy = 1;
    showConsentForm = false;
    stepData?: {numpolicy: number; totalpolicies: number};
    policiesErrors = { required: Translate.instant('core.policy.mustagreetocontinue') };

    protected siteId?: string;
    protected currentSite!: CoreSite;
    protected layoutSubscription?: Subscription;

    constructor(protected elementRef: ElementRef, protected changeDetector: ChangeDetectorRef) {}

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.siteId = CoreNavigator.getRouteParam('siteId');

        try {
            this.currentSite = CoreSites.getRequiredCurrentSite();
            this.siteName = (await CorePromiseUtils.ignoreErrors(this.currentSite.getSiteName(), '')) || '';
        } catch {
            // Not logged in, stop.
            this.cancel();

            return;
        }

        const currentSiteId = this.currentSite.id;
        this.siteId = this.siteId || currentSiteId;

        if (this.siteId != currentSiteId) {
            // Not current site, stop.
            this.cancel();

            return;
        }

        this.isTablet = CoreScreen.isTablet;
        this.layoutSubscription = CoreScreen.layoutObservable.subscribe(() => {
            this.isTablet = CoreScreen.isTablet;
        });

        this.isManageAcceptancesAvailable = await CorePolicy.isManageAcceptancesAvailable(this.siteId);
        this.isPoliciesURL = this.isManageAcceptancesAvailable ?
            (await this.currentSite.getConfig('sitepolicyhandler')) !== 'tool_policy' :
            true; // Site doesn't support managing acceptances, just display it as a URL.

        if (this.isPoliciesURL) {
            await this.fetchSitePoliciesURL();

            this.initFormForPoliciesURL();
        } else {
            await this.fetchNextPoliciesToAccept();
        }
    }

    /**
     * Fetch the site policies URL.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchSitePoliciesURL(): Promise<void> {
        this.title = Translate.instant('core.policy.policyagreement');
        this.subTitle = undefined;

        try {
            this.sitePoliciesURL = await CorePolicy.getSitePoliciesURL(this.siteId);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error getting site policy.');
            this.cancel();

            return;
        }

        // Try to get the mime type.
        try {
            const mimeType = await CoreUtils.getMimeTypeFromUrl(this.sitePoliciesURL);

            const extension = CoreMimetypeUtils.getExtension(mimeType, this.sitePoliciesURL);
            this.showInline = extension == 'html' || extension == 'htm';
        } catch {
            // Unable to get mime type, assume it's not supported.
            this.showInline = false;
        } finally {
            this.policyLoaded = true;
        }

        CoreAnalytics.logEvent({
            type: CoreAnalyticsEventType.VIEW_ITEM,
            ws: 'auth_email_get_signup_settings',
            name: Translate.instant('core.policy.policyagreement'),
            data: { category: 'policy' },
            url: '/user/policy.php',
        });
    }

    /**
     * Fetch the next site policies to accept.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchNextPoliciesToAccept(): Promise<void> {
        try {
            this.scrollTop();

            const pendingPolicies = await CorePolicy.getNextPendingPolicies({
                readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
                siteId: this.siteId,
            });

            // Add some calculated data.
            this.pendingPolicies = pendingPolicies.map((policy: SitePolicy) => {
                policy.referToFullPolicyText = Translate.instant('core.policy.refertofullpolicytext', {
                    $a: `<span class="core-site-policy-full-policy-link">${policy.name}</span>`,
                });

                return policy;
            });

            const policy = this.pendingPolicies[0];
            if (!policy) {
                // No more policies to accept.
                await this.finishAcceptingPolicies();

                return;
            }

            this.initFormForPendingPolicies();

            this.agreeInOwnPage = policy.agreementstyle === CorePolicyAgreementStyle.OwnPage;
            this.showConsentForm = false;
            this.numPolicy = 1;
            this.setCurrentPolicy(policy);
            this.policyLoaded = true;
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error getting site policy.');
            this.cancel();
        }
    }

    /**
     * Log in analytics viewing a certain policy.
     */
    protected logAnalyticsPolicyView(): void {
        if (!this.currentPolicy) {
            return;
        }

        const analyticsParams: Record<string, string | number> = {
            versionid: this.currentPolicy.versionid,
        };
        if (!this.agreeInOwnPage) {
            analyticsParams.numpolicy = this.numPolicy;
            analyticsParams.totalpolicies = this.pendingPolicies?.length ?? this.numPolicy;
        }

        CoreAnalytics.logEvent({
            type: CoreAnalyticsEventType.VIEW_ITEM,
            ws: 'tool_policy_get_user_acceptances',
            name: this.currentPolicy.name,
            data: analyticsParams,
            url: CoreUrl.addParamsToUrl('/admin/tool/policy/view.php', analyticsParams),
        });
    }

    /**
     * Log in analytics viewing the consent form.
     */
    protected logAnalyticsConsentFormView(): void {
        CoreAnalytics.logEvent({
            type: CoreAnalyticsEventType.VIEW_ITEM,
            ws: 'tool_policy_get_user_acceptances',
            name: Translate.instant('core.policy.consentpagetitle'),
            data: {},
            url: CoreUrl.addParamsToUrl('/admin/tool/policy/index.php'),
        });
    }

    /**
     * Init the form to accept the policies using a URL.
     */
    protected initFormForPoliciesURL(): void {
        this.policiesForm = new FormGroup({
            agreepolicy: new FormControl(false, {
                validators: Validators.requiredTrue,
                nonNullable: true,
            }),
        });
    }

    /**
     * Init the form to accept the current pending policies.
     */
    protected initFormForPendingPolicies(): void {
        this.policiesForm = new FormGroup({});

        this.pendingPolicies?.forEach(policy => {
            if (policy.optional) {
                this.policiesForm?.addControl('agreepolicy' + policy.versionid, new FormControl<number | undefined>(undefined, {
                    validators: Validators.required,
                }));
            } else {
                this.policiesForm?.addControl('agreepolicy' + policy.versionid, new FormControl(false, {
                    validators: Validators.requiredTrue,
                    nonNullable: true,
                }));
            }
        });
    }

    /**
     * Cancel.
     *
     * @returns Promise resolved when done.
     */
    async cancel(): Promise<void> {
        await CorePromiseUtils.ignoreErrors(CoreSites.logout());

        await CoreNavigator.navigate('/login/sites', { reset: true });
    }

    /**
     * Load next policy.
     *
     * @param event Event.
     */
    nextPolicy(event: Event): void {
        event.preventDefault();
        event.stopPropagation();

        if (!this.pendingPolicies) {
            return;
        }

        this.scrollTop();

        if (this.numPolicy < this.pendingPolicies.length) {
            this.numPolicy++;
            this.setCurrentPolicy(this.pendingPolicies[this.numPolicy - 1]);

            return;
        }

        // All policies seen, display the consent form.
        this.currentPolicy = undefined;
        this.stepData = undefined;
        this.showConsentForm = true;
        this.title = Translate.instant('core.policy.consentpagetitle');
        this.subTitle = Translate.instant('core.policy.agreepolicies');

        this.logAnalyticsConsentFormView();
    }

    /**
     * Set current policy.
     */
    protected setCurrentPolicy(policy?: CorePolicySitePolicy): void {
        if (!policy) {
            return;
        }

        this.hasScroll = false;
        this.currentPolicy = policy;
        this.title = policy.name || '';
        this.subTitle = undefined;
        this.stepData = !this.agreeInOwnPage ?
            { numpolicy: this.numPolicy, totalpolicies: this.pendingPolicies?.length ?? this.numPolicy } :
            undefined;

        this.logAnalyticsPolicyView();
    }

    /**
     * Check if the content has scroll.
     */
    protected async checkScroll(): Promise<void> {
        await CoreWait.wait(400);

        const scrollElement = await this.content?.getScrollElement();

        this.hasScroll = !!scrollElement && scrollElement.scrollHeight > scrollElement.clientHeight + 2; // Add 2px of error margin.
    }

    /**
     * Submit the acceptances to one or several policies.
     *
     * @param event Event.
     * @returns Promise resolved when done.
     */
    async submitAcceptances(event: Event): Promise<void> {
        event.preventDefault();
        event.stopPropagation();

        if (!this.policiesForm?.valid) {
            for (const name in this.policiesForm?.controls) {
                this.policiesForm.controls[name].markAsDirty();
            }
            this.changeDetector.detectChanges();

            // Scroll to the first element with errors.
            const errorFound = await CoreDom.scrollToInputError(
                this.elementRef.nativeElement,
            );

            if (!errorFound) {
                // Input not found, show an error modal.
                CoreDomUtils.showErrorModal('core.policy.mustagreetocontinue', true);
            }

            return;
        }

        const modal = await CoreLoadings.show('core.sending', true);

        try {
            if (!this.isPoliciesURL) {
                await this.acceptPendingPolicies();

                return;
            }

            await CorePolicy.acceptMandatorySitePolicies(this.siteId);

            await this.finishAcceptingPolicies();
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error accepting site policies.');
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Accept current pending policies.
     */
    protected async acceptPendingPolicies(): Promise<void> {
        if (!this.pendingPolicies) {
            return;
        }

        const acceptances: Record<number, number> = {};

        this.pendingPolicies?.forEach(policy => {
            const control = this.policiesForm?.controls['agreepolicy' + policy.versionid];
            if (!control) {
                return;
            }

            if (policy.optional) {
                if (control.value === null || control.value === undefined) {
                    // Not answered, this code shouldn't be reached. Display error.
                    CoreDomUtils.showErrorModal('core.policy.mustagreetocontinue', true);

                    return;
                }

                acceptances[policy.versionid] = control.value;
            } else {
                if (!control.value) {
                    // Not answered, this code shouldn't be reached. Display error.
                    CoreDomUtils.showErrorModal('core.policy.mustagreetocontinue', true);

                    return;
                }

                acceptances[policy.versionid] = 1;
            }
        });

        await CorePolicy.setUserAcceptances(acceptances, this.siteId);

        await this.fetchNextPoliciesToAccept();
    }

    /**
     * All mandatory policies have been accepted, go to site initial page.
     */
    protected async finishAcceptingPolicies(): Promise<void> {
        // Invalidate cache since some WS don't return error if site policy is not accepted.
        await CorePromiseUtils.ignoreErrors(this.currentSite.invalidateWsCache());

        CoreEvents.trigger(CoreEvents.SITE_POLICY_AGREED, {}, this.siteId);

        await CoreNavigator.navigateToSiteHome();
    }

    /**
     * Scroll to top.
     *
     * @param event Event.
     */
    scrollTop(event?: Event): void {
        event?.preventDefault();
        event?.stopPropagation();

        this.content?.scrollToTop(400);
    }

    /**
     * View the full policy.
     *
     * @param policy Policy.
     */
    async viewFullPolicy(policy: CorePolicySitePolicy): Promise<void> {
        const { CorePolicyViewPolicyModalComponent } =
            await import('@features/policy/components/policy-modal/policy-modal');

        CoreModals.openModal({
            component: CorePolicyViewPolicyModalComponent,
            componentProps: { policy },
        });
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.layoutSubscription?.unsubscribe();
    }

}

type SitePolicy = CorePolicySitePolicy & {
    referToFullPolicyText?: string;
};
