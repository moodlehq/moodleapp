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
import { IonicPage, NavController, ModalController, NavParams } from 'ionic-angular';
import { CoreAppProvider } from '@providers/app';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreConfigConstants } from '../../../../configconstants';
import { CoreLoginHelperProvider } from '../../providers/helper';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

/**
 * Page to enter or select the site URL to connect to.
 */
@IonicPage({ segment: 'core-login-site' })
@Component({
    selector: 'page-core-login-site',
    templateUrl: 'site.html',
})
export class CoreLoginSitePage {
    siteForm: FormGroup;
    fixedSites: any[];
    filteredSites: any[];
    fixedDisplay = 'buttons';
    showKeyboard = false;
    filter = '';

    constructor(navParams: NavParams, private navCtrl: NavController, fb: FormBuilder, private appProvider: CoreAppProvider,
            private sitesProvider: CoreSitesProvider, private loginHelper: CoreLoginHelperProvider,
            private modalCtrl: ModalController, private domUtils: CoreDomUtilsProvider) {

        this.showKeyboard = !!navParams.get('showKeyboard');

        let url = '';

        // Load fixed sites if they're set.
        if (this.loginHelper.hasSeveralFixedSites()) {
            this.fixedSites = <any[]> this.loginHelper.getFixedSites();
            this.fixedDisplay = CoreConfigConstants.multisitesdisplay;
            // Autoselect if not defined.
            if (['list', 'listnourl', 'select', 'buttons'].indexOf(this.fixedDisplay) < 0) {
                this.fixedDisplay = this.fixedSites.length > 8 ? 'list' : (this.fixedSites.length > 3 ? 'select' : 'buttons');
            }
            this.filteredSites = this.fixedSites;
            url = this.fixedSites[0].url;
        }

        this.siteForm = fb.group({
            siteUrl: [url, Validators.required]
        });
    }

    /**
     * Try to connect to a site.
     *
     * @param {Event} e Event.
     * @param {string} url The URL to connect to.
     */
    connect(e: Event, url: string): void {
        e.preventDefault();
        e.stopPropagation();

        this.appProvider.closeKeyboard();

        if (!url) {
            this.domUtils.showErrorModal('core.login.siteurlrequired', true);

            return;
        }

        if (!this.appProvider.isOnline()) {
            this.domUtils.showErrorModal('core.networkerrormsg', true);

            return;
        }

        const modal = this.domUtils.showModalLoading(),
            siteData = this.sitesProvider.getDemoSiteData(url);

        if (siteData) {
            // It's a demo site.
            this.sitesProvider.getUserToken(siteData.url, siteData.username, siteData.password).then((data) => {
                return this.sitesProvider.newSite(data.siteUrl, data.token, data.privateToken).then(() => {
                    return this.loginHelper.goToSiteInitialPage();
                }, (error) => {
                    this.domUtils.showErrorModal(error);
                });
            }, (error) => {
                this.loginHelper.treatUserTokenError(siteData.url, error, siteData.username, siteData.password);
            }).finally(() => {
                modal.dismiss();
            });

        } else {
            // Not a demo site.
            this.sitesProvider.checkSite(url).then((result) => {

                if (result.warning) {
                    this.domUtils.showErrorModal(result.warning, true, 4000);
                }

                if (this.loginHelper.isSSOLoginNeeded(result.code)) {
                    // SSO. User needs to authenticate in a browser.
                    this.loginHelper.confirmAndOpenBrowserForSSOLogin(
                        result.siteUrl, result.code, result.service, result.config && result.config.launchurl);
                } else {
                    this.navCtrl.push('CoreLoginCredentialsPage', { siteUrl: result.siteUrl, siteConfig: result.config });
                }
            }, (error) => {
                this.showLoginIssue(url, error);
            }).finally(() => {
                modal.dismiss();
            });
        }
    }

    /**
     * The filter has changed.
     *
     * @param {any} Received Event.
     */
    filterChanged(event: any): void {
        const newValue = event.target.value && event.target.value.trim().toLowerCase();
        if (!newValue || !this.fixedSites) {
            this.filteredSites = this.fixedSites;
        } else {
            this.filteredSites = this.fixedSites.filter((site) => {
                return site.name.toLowerCase().indexOf(newValue) > -1 || site.url.toLowerCase().indexOf(newValue) > -1;
            });
        }
    }

    /**
     * Show a help modal.
     */
    showHelp(): void {
        const modal = this.modalCtrl.create('CoreLoginSiteHelpPage');
        modal.present();
    }

    /**
     * Show an error that aims people to solve the issue.
     *
     * @param {string} url The URL the user was trying to connect to.
     * @param {any} error Error to display.
     */
    protected showLoginIssue(url: string, error: any): void {
        const modal = this.modalCtrl.create('CoreLoginSiteErrorPage', {
            siteUrl: url,
            issue: this.domUtils.getErrorMessage(error)
        });

        modal.present();
    }
}
