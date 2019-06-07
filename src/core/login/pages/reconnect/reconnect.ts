// (C) Copyright 2015 Martin Dougiamas
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
import { CoreAppProvider } from '@providers/app';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreLoginHelperProvider } from '../../providers/helper';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

/**
 * Page to enter the user password to reconnect to a site.
 */
@IonicPage({ segment: 'core-login-reconnect' })
@Component({
    selector: 'page-core-login-reconnect',
    templateUrl: 'reconnect.html',
})
export class CoreLoginReconnectPage {
    credForm: FormGroup;
    siteUrl: string;
    username: string;
    siteName: string;
    logoUrl: string;
    identityProviders: any[];
    site: any;

    protected infoSiteUrl: string;
    protected pageName: string;
    protected pageParams: any;
    protected siteConfig: any;
    protected isLoggedOut: boolean;
    protected siteId: string;

    constructor(private navCtrl: NavController, navParams: NavParams, fb: FormBuilder, private appProvider: CoreAppProvider,
        private sitesProvider: CoreSitesProvider, private loginHelper: CoreLoginHelperProvider,
        private domUtils: CoreDomUtilsProvider) {

        const currentSite = this.sitesProvider.getCurrentSite();

        this.infoSiteUrl = navParams.get('infoSiteUrl');
        this.pageName = navParams.get('pageName');
        this.pageParams = navParams.get('pageParams');
        this.siteConfig = navParams.get('siteConfig');
        this.siteUrl = navParams.get('siteUrl');
        this.siteId = navParams.get('siteId');

        this.isLoggedOut = currentSite && currentSite.isLoggedOut();
        this.credForm = fb.group({
            password: ['', Validators.required]
        });
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        if (this.siteConfig) {
            this.identityProviders = this.loginHelper.getValidIdentityProviders(this.siteConfig);
        }

        this.sitesProvider.getSite(this.siteId).then((site) => {
            this.site = {
                id: site.id,
                fullname: site.infos.fullname,
                avatar: site.infos.userpictureurl
            };

            this.username = site.infos.username;
            this.siteUrl = site.infos.siteurl;
            this.siteName = site.getSiteName();

            // Check logoURL if user avatar is not set.
            if (this.site.avatar.startsWith(site.infos.siteurl + '/theme/image.php')) {
                this.site.avatar = false;

                return site.getPublicConfig().then((config) => {
                    this.logoUrl = config.logourl || config.compactlogourl;
                }).catch(() => {
                    // Ignore errors.
                });
            }
        }).catch(() => {
            // Shouldn't happen. Just leave the view.
            this.cancel();
        });

    }

    /**
     * Cancel reconnect.
     */
    cancel(): void {
        this.sitesProvider.logout().finally(() => {
            this.navCtrl.setRoot('CoreLoginSitesPage');
        });
    }

    /**
     * Tries to authenticate the user.
     *
     * @param {Event} e Event.
     */
    login(e: Event): void {
        e.preventDefault();
        e.stopPropagation();

        this.appProvider.closeKeyboard();

        // Get input data.
        const siteUrl = this.siteUrl,
            username = this.username,
            password = this.credForm.value.password;

        if (!password) {
            this.domUtils.showErrorModal('core.login.passwordrequired', true);

            return;
        }

        if (!this.appProvider.isOnline()) {
            this.domUtils.showErrorModal('core.networkerrormsg', true);

            return;
        }

        const modal = this.domUtils.showModalLoading();

        // Start the authentication process.
        this.sitesProvider.getUserToken(siteUrl, username, password).then((data) => {
            return this.sitesProvider.updateSiteToken(this.infoSiteUrl, username, data.token, data.privateToken).then(() => {
                // Update site info too because functions might have changed (e.g. unisntall local_mobile).
                return this.sitesProvider.updateSiteInfoByUrl(this.infoSiteUrl, username).then(() => {
                    // Reset fields so the data is not in the view anymore.
                    this.credForm.controls['password'].reset();

                    // Go to the site initial page.
                    return this.loginHelper.goToSiteInitialPage(this.navCtrl, this.pageName, this.pageParams);
                }).catch((error) => {
                    // Error, go back to login page.
                    this.domUtils.showErrorModalDefault(error, 'core.login.errorupdatesite', true);
                    this.cancel();
                });
            });
        }).catch((error) => {
            this.loginHelper.treatUserTokenError(siteUrl, error, username, password);
        }).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * An OAuth button was clicked.
     *
     * @param {any} provider The provider that was clicked.
     */
    oauthClicked(provider: any): void {
        if (!this.loginHelper.openBrowserForOAuthLogin(this.siteUrl, provider, this.siteConfig.launchurl)) {
            this.domUtils.showErrorModal('Invalid data.');
        }
    }
}
