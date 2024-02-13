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

import { Component, OnInit } from '@angular/core';

import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { CoreMimetypeUtils } from '@services/utils/mimetype';
import { CoreSite } from '@classes/sites/site';
import { CoreNavigator } from '@services/navigator';
import { CoreEvents } from '@singletons/events';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { Translate } from '@singletons';
import { CorePolicy } from '@features/policy/services/policy';
import { FormControl, FormGroup, Validators } from '@angular/forms';

/**
 * Page to accept a site policy.
 */
@Component({
    selector: 'page-core-policy-site-policy',
    templateUrl: 'site-policy.html',
    styleUrls: ['site-policy.scss'],
})
export class CorePolicySitePolicyPage implements OnInit {

    siteName?: string;
    isManageAcceptancesAvailable = false;
    isPoliciesURL = false;
    sitePoliciesURL?: string;
    showInline?: boolean;
    policyLoaded?: boolean;
    policyForm?: FormGroup;

    protected siteId?: string;
    protected currentSite!: CoreSite;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.siteId = CoreNavigator.getRouteParam('siteId');

        try {
            this.currentSite = CoreSites.getRequiredCurrentSite();
            this.siteName = (await CoreUtils.ignoreErrors(this.currentSite.getSiteName(), '')) || '';
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

        this.isManageAcceptancesAvailable = await CorePolicy.isManageAcceptancesAvailable(this.siteId);
        this.isPoliciesURL = this.isManageAcceptancesAvailable ?
            (await this.currentSite.getConfig('sitepolicyhandler')) !== 'tool_policy' :
            true; // Site doesn't support managing acceptances, just display it as a URL.

        if (this.isPoliciesURL) {
            this.initFormForPoliciesURL();

            await this.fetchSitePoliciesURL();
        } else {
            // TODO
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
     * Fetch the site policies URL.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchSitePoliciesURL(): Promise<void> {
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
    }

    /**
     * Init the form to accept the policies using a URL.
     */
    protected initFormForPoliciesURL(): void {
        this.policyForm = new FormGroup({
            agreepolicy: new FormControl(false, {
                validators: Validators.requiredTrue,
                nonNullable: true,
            }),
        });
    }

    /**
     * Cancel.
     *
     * @returns Promise resolved when done.
     */
    async cancel(): Promise<void> {
        await CoreUtils.ignoreErrors(CoreSites.logout());

        await CoreNavigator.navigate('/login/sites', { reset: true });
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

        if (!this.policyForm?.valid) {
            return;
        }

        const modal = await CoreDomUtils.showModalLoading('core.sending', true);

        try {
            await CorePolicy.acceptMandatorySitePolicies(this.siteId);

            // Success accepting, go to site initial page.
            // Invalidate cache since some WS don't return error if site policy is not accepted.
            await CoreUtils.ignoreErrors(this.currentSite.invalidateWsCache());

            CoreEvents.trigger(CoreEvents.SITE_POLICY_AGREED, {}, this.siteId);

            await CoreNavigator.navigateToSiteHome();
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error accepting site policy.');
        } finally {
            modal.dismiss();
        }
    }

}
