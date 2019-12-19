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

import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreMimetypeUtilsProvider } from '@providers/utils/mimetype';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreLoginHelperProvider } from '../../providers/helper';
import { CoreSite } from '@classes/site';

/**
 * Page to accept a site policy.
 */
@IonicPage({ segment: 'core-login-site-policy' })
@Component({
    selector: 'page-core-login-site-policy',
    templateUrl: 'site-policy.html',
})
export class CoreLoginSitePolicyPage {
    sitePolicy: string;
    showInline: boolean;
    policyLoaded: boolean;
    protected siteId: string;
    protected currentSite: CoreSite;

    constructor(private navCtrl: NavController, navParams: NavParams, private loginHelper: CoreLoginHelperProvider,
            private domUtils: CoreDomUtilsProvider, private sitesProvider: CoreSitesProvider, private utils: CoreUtilsProvider,
            private mimeUtils: CoreMimetypeUtilsProvider) {
        this.siteId = navParams.get('siteId');
    }

    /**
     * View laoded.
     */
    ionViewDidLoad(): void {
        this.currentSite = this.sitesProvider.getCurrentSite();

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
    protected fetchSitePolicy(): Promise<any> {
        return this.loginHelper.getSitePolicy(this.siteId).then((sitePolicy) => {
            this.sitePolicy = sitePolicy;

            // Try to get the mime type.
            return this.utils.getMimeTypeFromUrl(sitePolicy).then((mimeType) => {
                const extension = this.mimeUtils.getExtension(mimeType, sitePolicy);
                this.showInline = extension == 'html' || extension == 'htm';
            }).catch(() => {
                // Unable to get mime type, assume it's not supported.
                this.showInline = false;
            }).finally(() => {
                this.policyLoaded = true;
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error getting site policy.');
            this.cancel();
        });
    }

    /**
     * Cancel.
     */
    cancel(): void {
        this.sitesProvider.logout().catch(() => {
            // Ignore errors, shouldn't happen.
        }).then(() => {
            this.navCtrl.setRoot('CoreLoginSitesPage');
        });
    }

    /**
     * Accept the site policy.
     */
    accept(): void {
        const modal = this.domUtils.showModalLoading('core.sending', true);
        this.loginHelper.acceptSitePolicy(this.siteId).then(() => {
            // Success accepting, go to site initial page.
            // Invalidate cache since some WS don't return error if site policy is not accepted.
            return this.currentSite.invalidateWsCache().catch(() => {
                // Ignore errors.
            }).then(() => {
                return this.loginHelper.goToSiteInitialPage();
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error accepting site policy.');
        }).finally(() => {
            modal.dismiss();
        });
    }
}
