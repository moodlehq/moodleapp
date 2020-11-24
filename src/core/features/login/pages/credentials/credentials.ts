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

import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NavController } from '@ionic/angular';

import { CoreApp } from '@services/app';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { CoreLoginHelper, CoreLoginHelperProvider } from '@features/login/services/login-helper';
import { CoreConstants } from '@/core/constants';
import { Translate } from '@singletons';
import { CoreSiteIdentityProvider, CoreSitePublicConfigResponse } from '@classes/site';
import { CoreEvents } from '@singletons/events';

/**
 * Page to enter the user credentials.
 */
@Component({
    selector: 'page-core-login-credentials',
    templateUrl: 'credentials.html',
    styleUrls: ['../../login.scss'],
})
export class CoreLoginCredentialsPage implements OnInit, OnDestroy {

    @ViewChild('credentialsForm') formElement?: ElementRef;

    credForm!: FormGroup;
    siteUrl!: string;
    siteChecked = false;
    siteName?: string;
    logoUrl?: string;
    authInstructions?: string;
    canSignup?: boolean;
    identityProviders?: CoreSiteIdentityProvider[];
    pageLoaded = false;
    isBrowserSSO = false;
    isFixedUrlSet = false;
    showForgottenPassword = true;
    showScanQR: boolean;

    protected siteConfig?: CoreSitePublicConfigResponse;
    protected eventThrown = false;
    protected viewLeft = false;
    protected siteId?: string;
    protected urlToOpen?: string;

    constructor(
        protected fb: FormBuilder,
        protected route: ActivatedRoute,
        protected navCtrl: NavController,
    ) {

        const canScanQR = CoreUtils.instance.canScanQR();
        if (canScanQR) {
            if (typeof CoreConstants.CONFIG.displayqroncredentialscreen == 'undefined') {
                this.showScanQR = CoreLoginHelper.instance.isFixedUrlSet();
            } else {
                this.showScanQR = !!CoreConstants.CONFIG.displayqroncredentialscreen;
            }
        } else {
            this.showScanQR = false;
        }
    }

    /**
     * Initialize the component.
     */
    ngOnInit(): void {
        this.route.queryParams.subscribe(params => {
            this.siteUrl = params['siteUrl'];
            this.siteName = params['siteName'] || undefined;
            this.logoUrl = !CoreConstants.CONFIG.forceLoginLogo && params['logoUrl'] || undefined;
            this.siteConfig = params['siteConfig'];
            this.urlToOpen = params['urlToOpen'];

            this.credForm = this.fb.group({
                username: [params['username'] || '', Validators.required],
                password: ['', Validators.required],
            });
        });

        this.treatSiteConfig();
        this.isFixedUrlSet = CoreLoginHelper.instance.isFixedUrlSet();

        if (this.isFixedUrlSet) {
            // Fixed URL, we need to check if it uses browser SSO login.
            this.checkSite(this.siteUrl);
        } else {
            this.siteChecked = true;
            this.pageLoaded = true;
        }
    }

    /**
     * Check if a site uses local_mobile, requires SSO login, etc.
     * This should be used only if a fixed URL is set, otherwise this check is already performed in CoreLoginSitePage.
     *
     * @param siteUrl Site URL to check.
     * @return Promise resolved when done.
     */
    protected async checkSite(siteUrl: string): Promise<void> {
        this.pageLoaded = false;

        // If the site is configured with http:// protocol we force that one, otherwise we use default mode.
        const protocol = siteUrl.indexOf('http://') === 0 ? 'http://' : undefined;

        try {
            const result = await CoreSites.instance.checkSite(siteUrl, protocol);

            this.siteChecked = true;
            this.siteUrl = result.siteUrl;

            this.siteConfig = result.config;
            this.treatSiteConfig();

            if (result && result.warning) {
                CoreDomUtils.instance.showErrorModal(result.warning, true, 4000);
            }

            if (CoreLoginHelper.instance.isSSOLoginNeeded(result.code)) {
                // SSO. User needs to authenticate in a browser.
                this.isBrowserSSO = true;

                // Check that there's no SSO authentication ongoing and the view hasn't changed.
                if (!CoreApp.instance.isSSOAuthenticationOngoing() && !this.viewLeft) {
                    CoreLoginHelper.instance.confirmAndOpenBrowserForSSOLogin(
                        result.siteUrl,
                        result.code,
                        result.service,
                        result.config?.launchurl,
                    );
                }
            } else {
                this.isBrowserSSO = false;
            }

        } catch (error) {
            CoreDomUtils.instance.showErrorModal(error);
        } finally {
            this.pageLoaded = true;
        }
    }

    /**
     * Treat the site configuration (if it exists).
     */
    protected treatSiteConfig(): void {
        if (this.siteConfig) {
            this.siteName = CoreConstants.CONFIG.sitename ? CoreConstants.CONFIG.sitename : this.siteConfig.sitename;
            this.logoUrl = CoreLoginHelper.instance.getLogoUrl(this.siteConfig);
            this.authInstructions = this.siteConfig.authinstructions || Translate.instance.instant('core.login.loginsteps');

            const disabledFeatures = CoreLoginHelper.instance.getDisabledFeatures(this.siteConfig);
            this.identityProviders = CoreLoginHelper.instance.getValidIdentityProviders(this.siteConfig, disabledFeatures);
            this.canSignup = this.siteConfig.registerauth == 'email' &&
                    !CoreLoginHelper.instance.isEmailSignupDisabled(this.siteConfig, disabledFeatures);
            this.showForgottenPassword = !CoreLoginHelper.instance.isForgottenPasswordDisabled(this.siteConfig, disabledFeatures);

            if (!this.eventThrown && !this.viewLeft) {
                this.eventThrown = true;
                CoreEvents.trigger(CoreEvents.LOGIN_SITE_CHECKED, { config: this.siteConfig });
            }
        } else {
            this.authInstructions = undefined;
            this.canSignup = false;
            this.identityProviders = [];
        }
    }

    /**
     * Tries to authenticate the user.
     *
     * @param e Event.
     * @return Promise resolved when done.
     */
    async login(e?: Event): Promise<void> {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        CoreApp.instance.closeKeyboard();

        // Get input data.
        const siteUrl = this.siteUrl;
        const username = this.credForm.value.username;
        const password = this.credForm.value.password;

        if (!this.siteChecked || this.isBrowserSSO) {
            // Site wasn't checked (it failed) or a previous check determined it was SSO. Let's check again.
            await this.checkSite(siteUrl);

            if (!this.isBrowserSSO) {
                // Site doesn't use browser SSO, throw app's login again.
                return this.login();
            }

            return;
        }

        if (!username) {
            CoreDomUtils.instance.showErrorModal('core.login.usernamerequired', true);

            return;
        }
        if (!password) {
            CoreDomUtils.instance.showErrorModal('core.login.passwordrequired', true);

            return;
        }

        if (!CoreApp.instance.isOnline()) {
            CoreDomUtils.instance.showErrorModal('core.networkerrormsg', true);

            return;
        }

        const modal = await CoreDomUtils.instance.showModalLoading();

        // Start the authentication process.
        try {
            const data = await CoreSites.instance.getUserToken(siteUrl, username, password);

            const id = await CoreSites.instance.newSite(data.siteUrl, data.token, data.privateToken);

            // Reset fields so the data is not in the view anymore.
            this.credForm.controls['username'].reset();
            this.credForm.controls['password'].reset();

            this.siteId = id;

            await CoreLoginHelper.instance.goToSiteInitialPage({ urlToOpen: this.urlToOpen });
        } catch (error) {
            CoreLoginHelper.instance.treatUserTokenError(siteUrl, error, username, password);

            if (error.loggedout) {
                this.navCtrl.navigateRoot('/login/sites');
            } else if (error.errorcode == 'forcepasswordchangenotice') {
                // Reset password field.
                this.credForm.controls.password.reset();
            }
        } finally {
            modal.dismiss();

            CoreDomUtils.instance.triggerFormSubmittedEvent(this.formElement, true);
        }
    }

    /**
     * Forgotten password button clicked.
     */
    forgottenPassword(): void {
        CoreLoginHelper.instance.forgottenPasswordClicked(this.siteUrl, this.credForm.value.username, this.siteConfig);
    }

    /**
     * An OAuth button was clicked.
     *
     * @param provider The provider that was clicked.
     */
    oauthClicked(provider: CoreSiteIdentityProvider): void {
        if (!CoreLoginHelper.instance.openBrowserForOAuthLogin(this.siteUrl, provider, this.siteConfig?.launchurl)) {
            CoreDomUtils.instance.showErrorModal('Invalid data.');
        }
    }

    /**
     * Show instructions and scan QR code.
     */
    showInstructionsAndScanQR(): void {
        // Show some instructions first.
        CoreDomUtils.instance.showAlertWithOptions({
            header: Translate.instance.instant('core.login.faqwhereisqrcode'),
            message: Translate.instance.instant(
                'core.login.faqwhereisqrcodeanswer',
                { $image: CoreLoginHelperProvider.FAQ_QRCODE_IMAGE_HTML },
            ),
            buttons: [
                {
                    text: Translate.instance.instant('core.cancel'),
                    role: 'cancel',
                },
                {
                    text: Translate.instance.instant('core.next'),
                    handler: (): void => {
                        this.scanQR();
                    },
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
        // @todo Scan for a QR code.
    }

    /**
     * View destroyed.
     */
    ngOnDestroy(): void {
        this.viewLeft = true;
        CoreEvents.trigger(CoreEvents.LOGIN_SITE_UNCHECKED, { config: this.siteConfig }, this.siteId);
    }

}
