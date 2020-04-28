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

import { Component, ViewChild, ElementRef } from '@angular/core';
import { IonicPage, NavController, ModalController, AlertController, NavParams } from 'ionic-angular';
import { CoreAppProvider } from '@providers/app';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider, CoreSiteCheckResponse, CoreLoginSiteInfo } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { CoreConfigConstants } from '../../../../configconstants';
import { CoreLoginHelperProvider } from '../../providers/helper';
import { FormBuilder, FormGroup, ValidatorFn, AbstractControl } from '@angular/forms';
import { CoreUrl } from '@singletons/url';
import { TranslateService } from '@ngx-translate/core';

/**
 * Extended data for UI implementation.
 */
type CoreLoginSiteInfoExtended = CoreLoginSiteInfo & {
    fromWS?: boolean; // If the site came from the WS call.
    noProtocolUrl?: string; // Url wihtout protocol.
    country?: string; // Based on countrycode.
};

/**
 * Page to enter or select the site URL to connect to.
 */
@IonicPage({ segment: 'core-login-site' })
@Component({
    selector: 'page-core-login-site',
    templateUrl: 'site.html',
})
export class CoreLoginSitePage {

    @ViewChild('siteFormEl') formElement: ElementRef;

    siteForm: FormGroup;
    fixedSites: CoreLoginSiteInfo[];
    filteredSites: CoreLoginSiteInfo[];
    fixedDisplay = 'buttons';
    showKeyboard = false;
    filter = '';
    sites: CoreLoginSiteInfoExtended[] = [];
    hasSites = false;
    loadingSites = false;
    onlyWrittenSite = false;
    searchFnc: Function;

    constructor(navParams: NavParams,
            protected navCtrl: NavController,
            fb: FormBuilder,
            protected appProvider: CoreAppProvider,
            protected sitesProvider: CoreSitesProvider,
            protected loginHelper: CoreLoginHelperProvider,
            protected modalCtrl: ModalController,
            protected alertCtrl: AlertController,
            protected urlUtils: CoreUrlUtilsProvider,
            protected domUtils: CoreDomUtilsProvider,
            protected eventsProvider: CoreEventsProvider,
            protected translate: TranslateService,
            protected utils: CoreUtilsProvider) {

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
            siteUrl: [url, this.moodleUrlValidator()]
        });

        this.searchFnc = this.utils.debounce(async (search: string, isValid: boolean = false) => {
            search = search.trim();

            if (search.length >= 3) {
                this.onlyWrittenSite = false;

                // Update the sites list.
                this.sites = await this.sitesProvider.findSites(search);

                // UI tweaks.
                this.sites.forEach((site) => {
                    site.noProtocolUrl = CoreUrl.removeProtocol(site.url);
                    site.fromWS = true;
                    site.country = this.utils.getCountryName(site.countrycode);
                });

                // If it's a valid URL, add it.
                if (isValid) {
                    this.onlyWrittenSite = !!this.sites.length;
                    this.sites.unshift({
                        url: search,
                        fromWS: false,
                        name: this.translate.instant('core.login.yourenteredsite'),
                        noProtocolUrl: CoreUrl.removeProtocol(search),
                    });
                }

                this.hasSites = !!this.sites.length;
            } else {
                // Not reseting the array to allow animation to be displayed.
                this.hasSites = false;
            }

            this.loadingSites = false;
        }, 1000);
    }

    /**
     * Try to connect to a site.
     *
     * @param e Event.
     * @param url The URL to connect to.
     * @param foundSite The site clicked, if any, from the found sites list.
     */
    connect(e: Event, url: string, foundSite?: CoreLoginSiteInfoExtended): void {
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

        url = url.trim();

        if (url.match(/^(https?:\/\/)?campus\.example\.edu/)) {
            this.showLoginIssue(null, this.translate.instant('core.login.errorexampleurl'));

            return;
        }

        const modal = this.domUtils.showModalLoading(),
            siteData = this.sitesProvider.getDemoSiteData(url);

        if (siteData) {
            // It's a demo site.
            this.sitesProvider.getUserToken(siteData.url, siteData.username, siteData.password).then((data) => {
                return this.sitesProvider.newSite(data.siteUrl, data.token, data.privateToken).then(() => {

                    this.domUtils.triggerFormSubmittedEvent(this.formElement, true);

                    return this.loginHelper.goToSiteInitialPage();
                }, (error) => {
                    this.loginHelper.treatUserTokenError(siteData.url, error, siteData.username, siteData.password);
                    if (error.loggedout) {
                        this.navCtrl.setRoot('CoreLoginSitesPage');
                    }
                });
            }, (error) => {
                this.loginHelper.treatUserTokenError(siteData.url, error, siteData.username, siteData.password);
                if (error.loggedout) {
                    this.navCtrl.setRoot('CoreLoginSitesPage');
                }
            }).finally(() => {
                modal.dismiss();
            });

        } else {
            // Not a demo site.
            this.sitesProvider.checkSite(url)
                .catch((error) => {
                    // Attempt guessing the domain if the initial check failed
                    const domain = CoreUrl.guessMoodleDomain(url);

                    if (domain && domain != url) {
                        return this.sitesProvider.checkSite(domain).catch((secondError) => {
                            // Try to use the first error.
                            return Promise.reject(error || secondError);
                        });
                    }

                    return Promise.reject(error);
                })
                .then((result) => this.login(result, foundSite))
                .catch((error) => this.showLoginIssue(url, error))
                .finally(() => modal.dismiss());
        }
    }

    /**
     * The filter has changed.
     *
     * @param Received Event.
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
     * @param url The URL the user was trying to connect to.
     * @param error Error to display.
     */
    protected showLoginIssue(url: string, error: any): void {
        error = this.domUtils.getErrorMessage(error);

        if (error == this.translate.instant('core.cannotconnecttrouble')) {
            const found = this.sites.find((site) => site.fromWS && site.url == url);

            if (!found) {
                error += ' ' + this.translate.instant('core.cannotconnectverify');
            }
        }

        let message = '<p>' + error + '</p>';
        if (url) {
            const fullUrl = this.urlUtils.isAbsoluteURL(url) ? url : 'https://' + url;
            message += '<p padding><a href="' + fullUrl + '" core-link>' + url + '</a></p>';
        }

        const buttons = [
            {
                text: this.translate.instant('core.needhelp'),
                handler: (): void => {
                    this.showHelp();
                }
            },
            {
                text: this.translate.instant('core.tryagain'),
                role: 'cancel'
            }
        ];

        this.domUtils.showAlertWithButtons(this.translate.instant('core.cannotconnect'), message, buttons);
    }

    /**
     * Find a site on the backend.
     *
     * @param e Event.
     * @param search Text to search.
     */
    searchSite(e: Event, search: string): void {
        this.loadingSites = true;

        this.searchFnc(search.trim(), this.siteForm.valid);
    }

    /**
     * Get the demo data for a certain "name" if it is a demo site.
     *
     * @param name Name of the site to check.
     * @return Site data if it's a demo site, undefined otherwise.
     */
    getDemoSiteData(name: string): any {
        const demoSites = CoreConfigConstants.demo_sites;
        if (typeof demoSites != 'undefined' && typeof demoSites[name] != 'undefined') {
            return demoSites[name];
        }
    }

    /**
     * Process login to a site.
     *
     * @param response Response obtained from the site check request.
     * @param foundSite The site clicked, if any, from the found sites list.
     *
     * @return Promise resolved after logging in.
     */
    protected async login(response: CoreSiteCheckResponse, foundSite?: CoreLoginSiteInfoExtended): Promise<void> {
        return this.sitesProvider.checkRequiredMinimumVersion(response.config).then(() => {

            this.domUtils.triggerFormSubmittedEvent(this.formElement, true);

            if (response.warning) {
                this.domUtils.showErrorModal(response.warning, true, 4000);
            }

            if (this.loginHelper.isSSOLoginNeeded(response.code)) {
                // SSO. User needs to authenticate in a browser.
                this.loginHelper.confirmAndOpenBrowserForSSOLogin(
                    response.siteUrl, response.code, response.service, response.config && response.config.launchurl);
            } else {
                const pageParams = { siteUrl: response.siteUrl, siteConfig: response.config };
                if (foundSite) {
                    pageParams['siteName'] = foundSite.name;
                    pageParams['logoUrl'] = foundSite.imageurl;
                }

                this.navCtrl.push('CoreLoginCredentialsPage', pageParams);
            }
        }).catch(() => {
            // Ignore errors.
        });
    }

    /**
     * Validate Url.
     *
     * @return {ValidatorFn} Validation results.
     */
    protected moodleUrlValidator(): ValidatorFn {
      return (control: AbstractControl): {[key: string]: any} | null => {
        const value = control.value.trim();
        let valid = value.length >= 3 && CoreUrl.isValidMoodleUrl(value);

        if (!valid) {
            const demo = !!this.getDemoSiteData(value);

            if (demo) {
                valid = true;
            }
        }

        return valid ? null : {siteUrl: {value: control.value}};
      };
    }

}
