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
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { CoreApp } from '@services/app';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreLoginHelper } from '@features/login/services/login-helper';
import { CoreConstants } from '@/core/constants';
import { Translate } from '@singletons';
import { CoreSiteIdentityProvider, CoreSitePublicConfigResponse } from '@classes/site';
import { CoreEvents } from '@singletons/events';
import { CoreNavigator } from '@services/navigator';
import { CoreForms } from '@singletons/form';

/**
 * Page to enter the user credentials.
 */
@Component({
    selector: 'page-core-login-credentials',
    templateUrl: 'credentials.html',
    styleUrls: ['../../login.scss'],
})
export class CoreLoginCredentialsPage implements OnInit, OnDestroy {

    @ViewChild('credentialsForm') formElement?: ElementRef<HTMLFormElement>;

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
    showScanQR = false;

    protected siteConfig?: CoreSitePublicConfigResponse;
    protected eventThrown = false;
    protected viewLeft = false;
    protected siteId?: string;
    protected urlToOpen?: string;
    protected valueChangeSubscription?: Subscription;

    constructor(
        protected fb: FormBuilder,
    ) {}

    /**
     * Initialize the component.
     */
    ngOnInit(): void {
        const siteUrl = CoreNavigator.getRouteParam<string>('siteUrl');
        if (!siteUrl) {
            CoreDomUtils.showErrorModal('Site URL not supplied.');
            CoreNavigator.back();

            return;
        }

        this.siteUrl = siteUrl;
        this.siteName = CoreNavigator.getRouteParam('siteName');
        this.logoUrl = !CoreConstants.CONFIG.forceLoginLogo && CoreNavigator.getRouteParam('logoUrl') || undefined;
        this.siteConfig = CoreNavigator.getRouteParam('siteConfig');
        this.urlToOpen = CoreNavigator.getRouteParam('urlToOpen');
        this.showScanQR = CoreLoginHelper.displayQRInCredentialsScreen();

        this.credForm = this.fb.group({
            username: [CoreNavigator.getRouteParam<string>('username') || '', Validators.required],
            password: ['', Validators.required],
        });

        this.treatSiteConfig();
        this.isFixedUrlSet = CoreLoginHelper.isFixedUrlSet();

        if (this.isFixedUrlSet) {
            // Fixed URL, we need to check if it uses browser SSO login.
            this.checkSite(this.siteUrl);
        } else {
            this.siteChecked = true;
            this.pageLoaded = true;
        }

        if (CoreApp.isIOS()) {
            // Make iOS auto-fill work. The field that isn't focused doesn't get updated, do it manually.
            // Debounce it to prevent triggering this function too often when the user is typing.
            this.valueChangeSubscription = this.credForm.valueChanges.pipe(debounceTime(1000)).subscribe((changes) => {
                if (!this.formElement || !this.formElement.nativeElement) {
                    return;
                }

                const usernameInput = this.formElement.nativeElement.querySelector<HTMLInputElement>('input[name="username"]');
                const passwordInput = this.formElement.nativeElement.querySelector<HTMLInputElement>('input[name="password"]');
                const usernameValue = usernameInput?.value;
                const passwordValue = passwordInput?.value;

                if (usernameValue !== undefined && usernameValue !== changes.username) {
                    this.credForm.get('username')?.setValue(usernameValue);
                }
                if (passwordValue !== undefined && passwordValue !== changes.password) {
                    this.credForm.get('password')?.setValue(passwordValue);
                }
            });
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
            const result = await CoreSites.checkSite(siteUrl, protocol);

            this.siteChecked = true;
            this.siteUrl = result.siteUrl;

            this.siteConfig = result.config;
            this.treatSiteConfig();

            if (result && result.warning) {
                CoreDomUtils.showErrorModal(result.warning, true, 4000);
            }

            if (CoreLoginHelper.isSSOLoginNeeded(result.code)) {
                // SSO. User needs to authenticate in a browser.
                this.isBrowserSSO = true;

                // Check that there's no SSO authentication ongoing and the view hasn't changed.
                if (!CoreApp.isSSOAuthenticationOngoing() && !this.viewLeft) {
                    CoreLoginHelper.confirmAndOpenBrowserForSSOLogin(
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
            CoreDomUtils.showErrorModal(error);
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
            this.logoUrl = CoreLoginHelper.getLogoUrl(this.siteConfig);
            this.authInstructions = this.siteConfig.authinstructions || Translate.instant('core.login.loginsteps');

            const disabledFeatures = CoreLoginHelper.getDisabledFeatures(this.siteConfig);
            this.identityProviders = CoreLoginHelper.getValidIdentityProviders(this.siteConfig, disabledFeatures);
            this.canSignup = this.siteConfig.registerauth == 'email' &&
                    !CoreLoginHelper.isEmailSignupDisabled(this.siteConfig, disabledFeatures);
            this.showForgottenPassword = !CoreLoginHelper.isForgottenPasswordDisabled(this.siteConfig, disabledFeatures);

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

        CoreApp.closeKeyboard();

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
            CoreDomUtils.showErrorModal('core.login.usernamerequired', true);

            return;
        }
        if (!password) {
            CoreDomUtils.showErrorModal('core.login.passwordrequired', true);

            return;
        }

        if (!CoreApp.isOnline()) {
            CoreDomUtils.showErrorModal('core.networkerrormsg', true);

            return;
        }

        const modal = await CoreDomUtils.showModalLoading();

        // Start the authentication process.
        try {
            const data = await CoreSites.getUserToken(siteUrl, username, password);

            const id = await CoreSites.newSite(data.siteUrl, data.token, data.privateToken);

            // Reset fields so the data is not in the view anymore.
            this.credForm.controls['username'].reset();
            this.credForm.controls['password'].reset();

            this.siteId = id;

            await CoreNavigator.navigateToSiteHome({ params: { urlToOpen: this.urlToOpen } });
        } catch (error) {
            CoreLoginHelper.treatUserTokenError(siteUrl, error, username, password);

            if (error.loggedout) {
                CoreNavigator.navigate('/login/sites', { reset: true });
            } else if (error.errorcode == 'forcepasswordchangenotice') {
                // Reset password field.
                this.credForm.controls.password.reset();
            }
        } finally {
            modal.dismiss();

            CoreForms.triggerFormSubmittedEvent(this.formElement, true);
        }
    }

    /**
     * Forgotten password button clicked.
     */
    forgottenPassword(): void {
        CoreLoginHelper.forgottenPasswordClicked(this.siteUrl, this.credForm.value.username, this.siteConfig);
    }

    /**
     * An OAuth button was clicked.
     *
     * @param provider The provider that was clicked.
     */
    oauthClicked(provider: CoreSiteIdentityProvider): void {
        if (!CoreLoginHelper.openBrowserForOAuthLogin(this.siteUrl, provider, this.siteConfig?.launchurl)) {
            CoreDomUtils.showErrorModal('Invalid data.');
        }
    }

    /**
     * Show instructions and scan QR code.
     *
     * @return Promise resolved when done.
     */
    async showInstructionsAndScanQR(): Promise<void> {
        try {
            await CoreLoginHelper.showScanQRInstructions();

            await CoreLoginHelper.scanQR();
        } catch {
            // Ignore errors.
        }
    }

    /**
     * Open email signup page.
     */
    openEmailSignup(): void {
        CoreNavigator.navigate('/login/emailsignup', { params: { siteUrl: this.siteUrl } });
    }

    /**
     * Open settings page.
     */
    openSettings(): void {
        CoreNavigator.navigate('/settings');
    }

    /**
     * View destroyed.
     */
    ngOnDestroy(): void {
        this.viewLeft = true;
        CoreEvents.trigger(CoreEvents.LOGIN_SITE_UNCHECKED, { config: this.siteConfig }, this.siteId);
        this.valueChangeSubscription?.unsubscribe();
    }

}
