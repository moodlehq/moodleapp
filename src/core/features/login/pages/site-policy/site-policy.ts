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
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';

import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { CoreMimetypeUtils } from '@services/utils/mimetype';
import { CoreLoginHelper } from '@features/login/services/login-helper';
import { CoreSite } from '@classes/site';

/**
 * Page to accept a site policy.
 */
@Component({
    selector: 'page-core-login-site-policy',
    templateUrl: 'site-policy.html',
})
export class CoreLoginSitePolicyPage implements OnInit {

    sitePolicy?: string;
    showInline?: boolean;
    policyLoaded?: boolean;
    protected siteId?: string;
    protected currentSite?: CoreSite;

    constructor(
        protected navCtrl: NavController,
        protected route: ActivatedRoute,
    ) {
    }

    /**
     * Component initialized.
     */
    ngOnInit(): void {
        const params = this.route.snapshot.queryParams;

        this.siteId = params['siteId'];
        this.currentSite = CoreSites.instance.getCurrentSite();

        if (!this.currentSite) {
            // Not logged in, stop.
            this.cancel();

            return;
        }

        const currentSiteId = this.currentSite.id;
        this.siteId = this.siteId || currentSiteId;

        if (this.siteId != currentSiteId || !this.currentSite.wsAvailable('core_user_agree_site_policy')) {
            // Not current site or WS not available, stop.
            this.cancel();

            return;
        }

        this.fetchSitePolicy();
    }

    /**
     * Fetch the site policy URL.
     *
     * @return Promise resolved when done.
     */
    protected async fetchSitePolicy(): Promise<void> {
        try {
            this.sitePolicy = await CoreLoginHelper.instance.getSitePolicy(this.siteId);
        } catch (error) {
            CoreDomUtils.instance.showErrorModalDefault(error, 'Error getting site policy.');
            this.cancel();

            return;
        }

        // Try to get the mime type.
        try {
            const mimeType = await CoreUtils.instance.getMimeTypeFromUrl(this.sitePolicy);

            const extension = CoreMimetypeUtils.instance.getExtension(mimeType, this.sitePolicy);
            this.showInline = extension == 'html' || extension == 'htm';
        } catch (error) {
            // Unable to get mime type, assume it's not supported.
            this.showInline = false;
        } finally {
            this.policyLoaded = true;
        }
    }

    /**
     * Cancel.
     *
     * @return Promise resolved when done.
     */
    async cancel(): Promise<void> {
        await CoreUtils.instance.ignoreErrors(CoreSites.instance.logout());

        await this.navCtrl.navigateRoot('/login/sites');
    }

    /**
     * Accept the site policy.
     *
     * @return Promise resolved when done.
     */
    async accept(): Promise<void> {
        const modal = await CoreDomUtils.instance.showModalLoading('core.sending', true);

        try {
            await CoreLoginHelper.instance.acceptSitePolicy(this.siteId);

            // Success accepting, go to site initial page.
            // Invalidate cache since some WS don't return error if site policy is not accepted.
            await CoreUtils.instance.ignoreErrors(this.currentSite!.invalidateWsCache());

            await CoreLoginHelper.instance.goToSiteInitialPage();
        } catch (error) {
            CoreDomUtils.instance.showErrorModalDefault(error, 'Error accepting site policy.');
        } finally {
            modal.dismiss();
        }
    }

}
