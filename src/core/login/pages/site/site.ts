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
import { CoreSite } from '@classes/site';
import { CoreAppProvider } from '@providers/app';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider, CoreSiteCheckResponse, CoreLoginSiteInfo } from '@providers/sites';
import { CoreCustomURLSchemesProvider, CoreCustomURLSchemesHandleError } from '@providers/urlschemes';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreConfig } from '@providers/config';
import { CoreConfigConstants } from '../../../../configconstants';
import { CoreLoginHelperProvider } from '../../providers/helper';
import { FormBuilder, FormGroup, ValidatorFn, AbstractControl } from '@angular/forms';
import { CoreUrl } from '@singletons/url';
import { TranslateService } from '@ngx-translate/core';

/**
 * Extended data for UI implementation.
 */
type CoreLoginSiteInfoExtended = CoreLoginSiteInfo & {
    noProtocolUrl?: string; // Url wihtout protocol.
    location?: string; // City + country.
    title?: string; // Name + alias.
};

type SiteFinderSettings = {
    displayalias: boolean,
    displaycity: boolean,
    displaycountry: boolean,
    displayimage: boolean,
    displaysitename: boolean,
    displayurl: boolean
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
    fixedSites: CoreLoginSiteInfoExtended[];
    filteredSites: CoreLoginSiteInfoExtended[];
    siteSelector = 'sitefinder';
    showKeyboard = false;
    filter = '';
    sites: CoreLoginSiteInfoExtended[] = [];
    hasSites = false;
    loadingSites = false;
    searchFnc: Function;
    showScanQR: boolean;
    enteredSiteUrl: CoreLoginSiteInfoExtended;
    siteFinderSettings: SiteFinderSettings;

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
            protected utils: CoreUtilsProvider,
            protected urlSchemesProvider: CoreCustomURLSchemesProvider,
            protected textUtils: CoreTextUtilsProvider) {

        this.showKeyboard = !!navParams.get('showKeyboard');

        let url = '';
        this.siteSelector = CoreConfigConstants.multisitesdisplay;

        const siteFinderSettings: Partial<SiteFinderSettings> = CoreConfigConstants['sitefindersettings'] || {};
        this.siteFinderSettings = {
            displaysitename: true,
            displayimage: true,
            displayalias: true,
            displaycity: true,
            displaycountry: true,
            displayurl: true,
            ...siteFinderSettings
        };

        // Load fixed sites if they're set.
        if (this.loginHelper.hasSeveralFixedSites()) {
            // Deprecate listnourl on 3.9.3, remove this block on the following release.
            if (this.siteSelector == 'listnourl') {
                this.siteSelector = 'list';
                this.siteFinderSettings.displayurl = false;
            }

            this.fixedSites = this.extendCoreLoginSiteInfo(<CoreLoginSiteInfoExtended[]> this.loginHelper.getFixedSites());

            // Do not show images if none are set.
            if (!this.fixedSites.some((site) => !!site.imageurl)) {
                this.siteFinderSettings.displayimage = false;
            }

            // Autoselect if not defined.
            if (this.siteSelector != 'list' && this.siteSelector != 'buttons') {
                this.siteSelector = this.fixedSites.length > 3 ? 'list' : 'buttons';
            }

            this.filteredSites = this.fixedSites;
            url = this.fixedSites[0].url;
        } else if (CoreConfigConstants.enableonboarding && !this.appProvider.isIOS() && !this.appProvider.isMac()) {
            CoreConfig.instance.get(CoreLoginHelperProvider.ONBOARDING_DONE, false).then((onboardingDone) => {
                if (!onboardingDone) {
                    // Check onboarding.
                    this.showOnboarding();
                }
            });
        }

        this.showScanQR = this.utils.canScanQR() && (typeof CoreConfigConstants['displayqronsitescreen'] == 'undefined' ||
            !!CoreConfigConstants['displayqronsitescreen']);

        this.siteForm = fb.group({
            siteUrl: [url, this.moodleUrlValidator()]
        });

        this.searchFnc = this.utils.debounce(async (search: string) => {
            search = search.trim();

            if (search.length >= 3) {
                // Update the sites list.
                this.sites = await this.sitesProvider.findSites(search);

                // Add UI tweaks.
                this.sites = this.extendCoreLoginSiteInfo(this.sites);

                this.hasSites = !!this.sites.length;
            } else {
                // Not reseting the array to allow animation to be displayed.
                this.hasSites = false;
            }

            this.loadingSites = false;
        }, 1000);
    }

    /**
     * Extend info of Login Site Info to get UI tweaks.
     *
     * @param  sites Sites list.
     * @return Sites list with extended info.
     */
    protected extendCoreLoginSiteInfo(sites: CoreLoginSiteInfoExtended[]): CoreLoginSiteInfoExtended[] {
        return sites.map((site) => {
            site.noProtocolUrl = this.siteFinderSettings.displayurl && site.url ? CoreUrl.removeProtocol(site.url) : '';

            const name = this.siteFinderSettings.displaysitename ? site.name : '';
            const alias = this.siteFinderSettings.displayalias && site.alias ? site.alias : '';

            // Set title with parenthesis if both name and alias are present.
            site.title = name && alias ? name + ' (' + alias + ')' : name + alias;

            const country = this.siteFinderSettings.displaycountry && site.countrycode ?
                this.utils.getCountryName(site.countrycode) : '';
            const city = this.siteFinderSettings.displaycity && site.city ?
                site.city : '';

            // Separate location with hiphen if both country and city are present.
            site.location = city && country ? city + ' - ' + country : city + country;

            return site;
        });
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
                return site.title.toLowerCase().indexOf(newValue) > -1 || site.noProtocolUrl.toLowerCase().indexOf(newValue) > -1 ||
                    site.location.toLowerCase().indexOf(newValue) > -1;
            });
        }
    }

    /**
     * Show a help modal.
     */
    showHelp(): void {
        const modal = this.modalCtrl.create('CoreLoginSiteHelpPage', {}, { cssClass: 'core-modal-fullscreen' });
        modal.present();
    }

    /**
     * Show an onboarding modal.
     */
    showOnboarding(): void {
        const modal = this.modalCtrl.create('CoreLoginSiteOnboardingPage', {}, { cssClass: 'core-modal-fullscreen' });
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
            const found = this.sites.find((site) => site.url == url);

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

        // @TODO: Remove CoreSite.MINIMUM_MOODLE_VERSION, not used on translations since 3.9.0.
        this.domUtils.showAlertWithOptions({
            title: this.translate.instant('core.cannotconnect', {$a: CoreSite.MINIMUM_MOODLE_VERSION}),
            message,
            buttons,
        });
    }

    /**
     * Find a site on the backend.
     *
     * @param e Event.
     * @param search Text to search.
     */
    searchSite(e: Event, search: string): void {
        this.loadingSites = true;

        search = search.trim();

        if (this.siteForm.valid && search.length >= 3) {
            this.enteredSiteUrl = {
                url: search,
                name: 'connect',
                noProtocolUrl: CoreUrl.removeProtocol(search),
            };
        } else {
            this.enteredSiteUrl = null;
        }

        this.searchFnc(search.trim());
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
        return this.sitesProvider.checkApplication(response.config).then(() => {

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

    /**
     * Show instructions and scan QR code.
     */
    showInstructionsAndScanQR(): void {
        // Show some instructions first.
        this.domUtils.showAlertWithOptions({
            title: this.translate.instant('core.login.faqwhereisqrcode'),
            message: this.translate.instant('core.login.faqwhereisqrcodeanswer',
                {$image: CoreLoginHelperProvider.FAQ_QRCODE_IMAGE_HTML}),
            buttons: [
                {
                    text: this.translate.instant('core.cancel'),
                    role: 'cancel'
                },
                {
                    text: this.translate.instant('core.next'),
                    handler: (): void => {
                        this.scanQR();
                    }
                },
            ],
        });
    }

    /**
     * Scan a QR code and put its text in the URL input.
     *
     * @return Promise resolved when done.
     */
    async scanQR(): Promise<void> {
        // Scan for a QR code.
        const text = await this.utils.scanQR();

        if (text) {
            if (this.urlSchemesProvider.isCustomURL(text)) {
                try {
                    await this.urlSchemesProvider.handleCustomURL(text);
                } catch (error) {
                    if (error && error.data && error.data.isAuthenticationURL && error.data.siteUrl) {
                        // An error ocurred, but it's an authentication URL and we have the site URL.
                        this.treatErrorInAuthenticationCustomURL(text, error);
                    } else {
                        this.urlSchemesProvider.treatHandleCustomURLError(error);
                    }
                }
            } else {
                // Not a custom URL scheme, check if it's a URL scheme to another app.
                const scheme = this.urlUtils.getUrlProtocol(text);

                if (scheme && scheme != 'http' && scheme != 'https') {
                    this.domUtils.showErrorModal(this.translate.instant('core.errorurlschemeinvalidscheme', {$a: text}));
                } else if (this.loginHelper.isSiteUrlAllowed(text)) {
                    // Put the text in the field (if present).
                    this.siteForm.controls.siteUrl.setValue(text);

                    this.connect(new Event('click'), text);
                } else {
                    this.domUtils.showErrorModal('core.errorurlschemeinvalidsite', true);
                }
            }
        }
    }

    /**
     * Treat an error while handling a custom URL meant to perform an authentication.
     * If the site doesn't use SSO, the user will be sent to the credentials screen.
     *
     * @param customURL Custom URL handled.
     * @param error Error data.
     * @return Promise resolved when done.
     */
    protected async treatErrorInAuthenticationCustomURL(customURL: string, error: CoreCustomURLSchemesHandleError): Promise<void> {
        const siteUrl = error.data.siteUrl;
        const modal = this.domUtils.showModalLoading();

        // Set the site URL in the input.
        this.siteForm.controls.siteUrl.setValue(siteUrl);

        try {
            // Check if site uses SSO.
            const response = await this.sitesProvider.checkSite(siteUrl);

            await this.sitesProvider.checkApplication(response.config);

            if (!this.loginHelper.isSSOLoginNeeded(response.code)) {
                // No SSO, go to credentials page.
                await this.navCtrl.push('CoreLoginCredentialsPage', {
                    siteUrl: response.siteUrl,
                    siteConfig: response.config,
                });
            }
        } catch (error) {
            // Ignore errors.
        } finally {
            modal.dismiss();
        }

        // Now display the error.
        error.error = this.textUtils.addTextToError(error.error,
                '<br><br>' + this.translate.instant('core.login.youcanstillconnectwithcredentials'));

        this.urlSchemesProvider.treatHandleCustomURLError(error);
    }
}
