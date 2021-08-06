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

import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';

import { CoreApp } from '@services/app';
import { CoreConfig } from '@services/config';
import { CoreSites, CoreSiteCheckResponse, CoreLoginSiteInfo, CoreSitesDemoSiteData } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreLoginHelper, CoreLoginHelperProvider, CoreLoginSiteSelectorListMethod } from '@features/login/services/login-helper';
import { CoreSite } from '@classes/site';
import { CoreError } from '@classes/errors/error';
import { CoreConstants } from '@/core/constants';
import { Translate } from '@singletons';
import { CoreUrl } from '@singletons/url';
import { CoreUrlUtils } from '@services/utils/url';
import { CoreLoginSiteHelpComponent } from '@features/login/components/site-help/site-help';
import { CoreLoginSiteOnboardingComponent } from '@features/login/components/site-onboarding/site-onboarding';
import { CoreNavigator } from '@services/navigator';
import { CoreCustomURLSchemes, CoreCustomURLSchemesHandleError } from '@services/urlschemes';
import { CoreTextUtils } from '@services/utils/text';
import { CoreForms } from '@singletons/form';

/**
 * Page that displays a "splash screen" while the app is being initialized.
 */
@Component({
    selector: 'page-core-login-site',
    templateUrl: 'site.html',
    styleUrls: ['site.scss', '../../login.scss'],
})
export class CoreLoginSitePage implements OnInit {

    @ViewChild('siteFormEl') formElement?: ElementRef;

    siteForm: FormGroup;
    fixedSites?: CoreLoginSiteInfoExtended[];
    filteredSites?: CoreLoginSiteInfoExtended[];
    siteSelector: CoreLoginSiteSelectorListMethod = 'sitefinder';
    showKeyboard = false;
    filter = '';
    sites: CoreLoginSiteInfoExtended[] = [];
    hasSites = false;
    loadingSites = false;
    searchFunction: (search: string) => void;
    showScanQR: boolean;
    enteredSiteUrl?: CoreLoginSiteInfoExtended;
    siteFinderSettings: SiteFinderSettings;

    constructor(
        protected formBuilder: FormBuilder,
    ) {

        let url = '';
        this.siteSelector = CoreConstants.CONFIG.multisitesdisplay;

        const siteFinderSettings: Partial<SiteFinderSettings> = CoreConstants.CONFIG.sitefindersettings || {};
        this.siteFinderSettings = {
            displaysitename: true,
            displayimage: true,
            displayalias: true,
            displaycity: true,
            displaycountry: true,
            displayurl: true,
            ...siteFinderSettings,
        };

        // Load fixed sites if they're set.
        if (CoreLoginHelper.hasSeveralFixedSites()) {
            url = this.initSiteSelector();
        } else if (CoreConstants.CONFIG.enableonboarding && !CoreApp.isIOS()) {
            this.initOnboarding();
        }

        this.showScanQR = CoreLoginHelper.displayQRInSiteScreen();

        this.siteForm = this.formBuilder.group({
            siteUrl: [url, this.moodleUrlValidator()],
        });

        this.searchFunction = CoreUtils.debounce(async (search: string) => {
            search = search.trim();

            if (search.length >= 3) {
                // Update the sites list.
                const sites = await CoreSites.findSites(search);

                // Add UI tweaks.
                this.sites = this.extendCoreLoginSiteInfo(<CoreLoginSiteInfoExtended[]> sites);

                this.hasSites = !!this.sites.length;
            } else {
                // Not reseting the array to allow animation to be displayed.
                this.hasSites = false;
            }

            this.loadingSites = false;
        }, 1000);
    }

    /**
     * Initialize the component.
     */
    ngOnInit(): void {
        this.showKeyboard = !!CoreNavigator.getRouteBooleanParam('showKeyboard');
    }

    /**
     * Initialize the site selector.
     *
     * @return URL of the first site.
     */
    protected initSiteSelector(): string {
        this.fixedSites = this.extendCoreLoginSiteInfo(<CoreLoginSiteInfoExtended[]> CoreLoginHelper.getFixedSites());
        this.siteSelector = 'list'; // In case it's not defined

        // Do not show images if none are set.
        if (!this.fixedSites.some((site) => !!site.imageurl)) {
            this.siteFinderSettings.displayimage = false;
        }

        this.filteredSites = this.fixedSites;

        return this.fixedSites[0].url;
    }

    /**
     * Initialize and show onboarding if needed.
     *
     * @return Promise resolved when done.
     */
    protected async initOnboarding(): Promise<void> {
        const onboardingDone = await CoreConfig.get(CoreLoginHelperProvider.ONBOARDING_DONE, false);

        if (!onboardingDone) {
            // Check onboarding.
            this.showOnboarding();
        }
    }

    /**
     * Extend info of Login Site Info to get UI tweaks.
     *
     * @param sites Sites list.
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
                CoreUtils.getCountryName(site.countrycode) : '';
            const city = this.siteFinderSettings.displaycity && site.city ?
                site.city : '';

            // Separate location with hiphen if both country and city are present.
            site.location = city && country ? city + ' - ' + country : city + country;

            return site;
        });
    }

    /**
     * Validate Url.
     *
     * @return {ValidatorFn} Validation results.
     */
    protected moodleUrlValidator(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const value = control.value.trim();
            let valid = value.length >= 3 && CoreUrl.isValidMoodleUrl(value);

            if (!valid) {
                const demo = !!CoreSites.getDemoSiteData(value);

                if (demo) {
                    valid = true;
                }
            }

            return valid ? null : { siteUrl: { value: control.value } };
        };
    }

    /**
     * Show a help modal.
     */
    async showHelp(): Promise<void> {
        await CoreDomUtils.openModal({
            component: CoreLoginSiteHelpComponent,
            cssClass: 'core-modal-fullscreen',
        });
    }

    /**
     * Show an onboarding modal.
     */
    async showOnboarding(): Promise<void> {
        await CoreDomUtils.openModal({
            component: CoreLoginSiteOnboardingComponent,
            cssClass: 'core-modal-fullscreen',
        });
    }

    /**
     * Try to connect to a site.
     *
     * @param e Event.
     * @param url The URL to connect to.
     * @param foundSite The site clicked, if any, from the found sites list.
     * @return Promise resolved when done.
     */
    async connect(e: Event, url: string, foundSite?: CoreLoginSiteInfoExtended): Promise<void> {
        e.preventDefault();
        e.stopPropagation();

        CoreApp.closeKeyboard();

        if (!url) {
            CoreDomUtils.showErrorModal('core.login.siteurlrequired', true);

            return;
        }

        if (!CoreApp.isOnline()) {
            CoreDomUtils.showErrorModal('core.networkerrormsg', true);

            return;
        }

        url = url.trim();

        if (url.match(/^(https?:\/\/)?campus\.example\.edu/)) {
            this.showLoginIssue(null, new CoreError(Translate.instant('core.login.errorexampleurl')));

            return;
        }

        const siteData = CoreSites.getDemoSiteData(url);

        if (siteData) {
            // It's a demo site.
            await this.loginDemoSite(siteData);

        } else {
            // Not a demo site.
            const modal = await CoreDomUtils.showModalLoading();

            let checkResult: CoreSiteCheckResponse;

            try {
                checkResult = await CoreSites.checkSite(url);
            } catch (error) {
                // Attempt guessing the domain if the initial check failed
                const domain = CoreUrl.guessMoodleDomain(url);

                if (domain && domain != url) {
                    try {
                        checkResult = await CoreSites.checkSite(domain);
                    } catch (secondError) {
                        // Try to use the first error.
                        modal.dismiss();

                        return this.showLoginIssue(url, error || secondError);
                    }
                } else {
                    modal.dismiss();

                    return this.showLoginIssue(url, error);
                }
            }

            await this.login(checkResult, foundSite);

            modal.dismiss();
        }
    }

    /**
     * Authenticate in a demo site.
     *
     * @param siteData Site data.
     * @return Promise resolved when done.
     */
    protected async loginDemoSite(siteData: CoreSitesDemoSiteData): Promise<void> {
        const modal = await CoreDomUtils.showModalLoading();

        try {
            const data = await CoreSites.getUserToken(siteData.url, siteData.username, siteData.password);

            await CoreSites.newSite(data.siteUrl, data.token, data.privateToken);

            CoreForms.triggerFormSubmittedEvent(this.formElement, true);

            await CoreNavigator.navigateToSiteHome();

            return;
        } catch (error) {
            CoreLoginHelper.treatUserTokenError(siteData.url, error, siteData.username, siteData.password);

            if (error.loggedout) {
                CoreNavigator.navigate('/login/sites', { reset: true });
            }
        } finally {
            modal.dismiss();
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
        try {
            await CoreSites.checkApplication(response.config);

            CoreForms.triggerFormSubmittedEvent(this.formElement, true);

            if (response.warning) {
                CoreDomUtils.showErrorModal(response.warning, true, 4000);
            }

            if (CoreLoginHelper.isSSOLoginNeeded(response.code)) {
                // SSO. User needs to authenticate in a browser.
                CoreLoginHelper.confirmAndOpenBrowserForSSOLogin(
                    response.siteUrl,
                    response.code,
                    response.service,
                    response.config?.launchurl,
                );
            } else {
                const pageParams = { siteUrl: response.siteUrl, siteConfig: response.config };
                if (foundSite && !this.fixedSites) {
                    pageParams['siteName'] = foundSite.name;
                    pageParams['logoUrl'] = foundSite.imageurl;
                }

                CoreNavigator.navigate('/login/credentials', {
                    params: pageParams,
                });
            }
        } catch (error) {
            // Ignore errors.
        }
    }

    /**
     * Show an error that aims people to solve the issue.
     *
     * @param url The URL the user was trying to connect to.
     * @param error Error to display.
     */
    protected showLoginIssue(url: string | null, error: CoreError): void {
        let errorMessage = CoreDomUtils.getErrorMessage(error);

        if (errorMessage == Translate.instant('core.cannotconnecttrouble')) {
            const found = this.sites.find((site) => site.url == url);

            if (!found) {
                errorMessage += ' ' + Translate.instant('core.cannotconnectverify');
            }
        }

        let message = '<p>' + errorMessage + '</p>';
        if (url) {
            const fullUrl = CoreUrlUtils.isAbsoluteURL(url) ? url : 'https://' + url;
            message += '<p padding><a href="' + fullUrl + '" core-link>' + url + '</a></p>';
        }

        const buttons = [
            {
                text: Translate.instant('core.needhelp'),
                handler: (): void => {
                    this.showHelp();
                },
            },
            {
                text: Translate.instant('core.tryagain'),
                role: 'cancel',
            },
        ];

        // @TODO: Remove CoreSite.MINIMUM_MOODLE_VERSION, not used on translations since 3.9.0.
        CoreDomUtils.showAlertWithOptions({
            header: Translate.instant('core.cannotconnect', { $a: CoreSite.MINIMUM_MOODLE_VERSION }),
            message,
            buttons,
        });
    }

    /**
     * The filter has changed.
     *
     * @param event Received Event.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filterChanged(event?: any): void {
        const newValue = event?.target.value?.trim().toLowerCase();
        if (!newValue || !this.fixedSites) {
            this.filteredSites = this.fixedSites;
        } else {
            this.filteredSites = this.fixedSites.filter((site) =>
                site.title.toLowerCase().indexOf(newValue) > -1 || site.noProtocolUrl.toLowerCase().indexOf(newValue) > -1 ||
                site.location.toLowerCase().indexOf(newValue) > -1);
        }
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
                title: '',
                location: '',
                noProtocolUrl: CoreUrl.removeProtocol(search),
            };
        } else {
            this.enteredSiteUrl = undefined;
        }

        this.searchFunction(search.trim());
    }

    /**
     * Show instructions and scan QR code.
     *
     * @return Promise resolved when done.
     */
    async showInstructionsAndScanQR(): Promise<void> {
        try {
            await CoreLoginHelper.showScanQRInstructions();

            await this.scanQR();
        } catch {
            // Ignore errors.
        }
    }

    /**
     * Scan a QR code and put its text in the URL input.
     *
     * @return Promise resolved when done.
     */
    async scanQR(): Promise<void> {
        // Scan for a QR code.
        const text = await CoreUtils.scanQR();

        if (!text) {
            return;
        }

        if (CoreCustomURLSchemes.isCustomURL(text)) {
            try {
                await CoreCustomURLSchemes.handleCustomURL(text);
            } catch (error) {
                if (error && error.data && error.data.isAuthenticationURL && error.data.siteUrl) {
                    // An error ocurred, but it's an authentication URL and we have the site URL.
                    this.treatErrorInAuthenticationCustomURL(text, error);
                } else {
                    CoreCustomURLSchemes.treatHandleCustomURLError(error);
                }
            }

            return;
        }

        // Not a custom URL scheme, check if it's a URL scheme to another app.
        const scheme = CoreUrlUtils.getUrlProtocol(text);

        if (scheme && scheme != 'http' && scheme != 'https') {
            CoreDomUtils.showErrorModal(Translate.instant('core.errorurlschemeinvalidscheme', { $a: text }));
        } else if (CoreLoginHelper.isSiteUrlAllowed(text)) {
            // Put the text in the field (if present).
            this.siteForm.controls.siteUrl.setValue(text);

            this.connect(new Event('click'), text);
        } else {
            CoreDomUtils.showErrorModal('core.errorurlschemeinvalidsite', true);
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
        const siteUrl = error.data?.siteUrl || '';
        const modal = await CoreDomUtils.showModalLoading();

        // Set the site URL in the input.
        this.siteForm.controls.siteUrl.setValue(siteUrl);

        try {
            // Check if site uses SSO.
            const response = await CoreSites.checkSite(siteUrl);

            await CoreSites.checkApplication(response.config);

            if (!CoreLoginHelper.isSSOLoginNeeded(response.code)) {
                // No SSO, go to credentials page.
                await CoreNavigator.navigate('/login/credentials', {
                    params: {
                        siteUrl: response.siteUrl,
                        siteConfig: response.config,
                    },
                });
            }
        } catch (error) {
            // Ignore errors.
        } finally {
            modal.dismiss();
        }

        // Now display the error.
        error.error = CoreTextUtils.addTextToError(
            error.error,
            '<br><br>' + Translate.instant('core.login.youcanstillconnectwithcredentials'),
        );

        CoreCustomURLSchemes.treatHandleCustomURLError(error);
    }

    /**
     * Open settings page.
     */
    openSettings(): void {
        CoreNavigator.navigate('/settings');
    }

}

/**
 * Extended data for UI implementation.
 */
type CoreLoginSiteInfoExtended = CoreLoginSiteInfo & {
    noProtocolUrl: string; // Url wihtout protocol.
    location: string; // City + country.
    title: string; // Name + alias.
};

type SiteFinderSettings = {
    displayalias: boolean;
    displaycity: boolean;
    displaycountry: boolean;
    displayimage: boolean;
    displaysitename: boolean;
    displayurl: boolean;
};
