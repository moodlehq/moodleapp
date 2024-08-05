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
import { CoreNetwork } from '@services/network';
import { CoreSiteCheckResponse, CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreLoginHelper } from '@features/login/services/login-helper';
import { Translate } from '@singletons';
import { CoreSitePublicConfigResponse, CoreUnauthenticatedSite } from '@classes/sites/unauthenticated-site';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreNavigator } from '@services/navigator';
import { CoreForms } from '@singletons/form';
import { CoreUserSupport } from '@features/user/services/support';
import { CoreUserSupportConfig } from '@features/user/classes/support/support-config';
import { CoreUserGuestSupportConfig } from '@features/user/classes/support/guest-support-config';
import { SafeHtml } from '@angular/platform-browser';
import { CorePlatform } from '@services/platform';
import { CoreSitesFactory } from '@services/sites-factory';
import {
    ALWAYS_SHOW_LOGIN_FORM_CHANGED,
    EMAIL_SIGNUP_FEATURE_NAME,
    FORGOTTEN_PASSWORD_FEATURE_NAME,
} from '@features/login/constants';
import { CoreCustomURLSchemes } from '@services/urlschemes';
import { CoreSiteError } from '@classes/errors/siteerror';
import { CoreKeyboard } from '@singletons/keyboard';

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
    site!: CoreUnauthenticatedSite;
    siteName?: string;
    logoUrl?: string;
    authInstructions?: string;
    canSignup?: boolean;
    pageLoaded = false;
    isBrowserSSO = false;
    showForgottenPassword = true;
    showScanQR = false;
    loginAttempts = 0;
    supportConfig?: CoreUserSupportConfig;
    exceededAttemptsHTML?: SafeHtml | string | null;
    siteConfig?: CoreSitePublicConfigResponse;
    siteCheckError = '';
    displaySiteUrl = false;
    showLoginForm = true;

    protected siteCheck?: CoreSiteCheckResponse;
    protected eventThrown = false;
    protected viewLeft = false;
    protected siteId?: string;
    protected urlToOpen?: string;
    protected valueChangeSubscription?: Subscription;
    protected alwaysShowLoginFormObserver?: CoreEventObserver;

    constructor(
        protected fb: FormBuilder,
    ) {}

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            this.siteCheck = CoreNavigator.getRouteParam<CoreSiteCheckResponse>('siteCheck');

            const siteUrl = this.siteCheck?.siteUrl || CoreNavigator.getRequiredRouteParam<string>('siteUrl');
            if (this.siteCheck?.config) {
                this.siteConfig = this.siteCheck.config;
            }

            this.site = CoreSitesFactory.makeUnauthenticatedSite(siteUrl, this.siteConfig);
            this.logoUrl = this.site.getLogoUrl(this.siteConfig);
            this.urlToOpen = CoreNavigator.getRouteParam('urlToOpen');
            this.supportConfig = this.siteConfig && new CoreUserGuestSupportConfig(this.site, this.siteConfig);
            this.displaySiteUrl = this.site.shouldDisplayInformativeLinks();
            this.siteName = await this.site.getSiteName();
        } catch (error) {
            CoreDomUtils.showErrorModal(error);

            return CoreNavigator.back();
        }

        this.credForm = this.fb.group({
            username: [CoreNavigator.getRouteParam<string>('username') || '', Validators.required],
            password: ['', Validators.required],
        });

        await this.checkSite();

        if (this.isBrowserSSO && CoreLoginHelper.shouldSkipCredentialsScreenOnSSO()) {
            const launchedWithTokenURL = await CoreCustomURLSchemes.appLaunchedWithTokenURL();
            if (!launchedWithTokenURL) {
                this.openBrowserSSO();
            }
        }

        if (CorePlatform.isIOS() && !this.isBrowserSSO) {
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

        this.alwaysShowLoginFormObserver = CoreEvents.on(ALWAYS_SHOW_LOGIN_FORM_CHANGED, async () => {
            this.showLoginForm = await CoreLoginHelper.shouldShowLoginForm(this.siteConfig);
        });
    }

    /**
     * Show help modal.
     */
    showHelp(): void {
        CoreUserSupport.showHelp(
            Translate.instant('core.login.credentialshelp'),
            Translate.instant('core.login.credentialssupportsubject'),
            this.supportConfig,
        );
    }

    /**
     * Get site config and check if it requires SSO login.
     * This should be used only if a fixed URL is set, otherwise this check is already performed in CoreLoginSitePage.
     *
     * @returns Promise resolved when done.
     */
    async checkSite(): Promise<void> {
        this.pageLoaded = false;

        // If the site is configured with http:// protocol we force that one, otherwise we use default mode.
        const protocol = this.site.siteUrl.indexOf('http://') === 0 ? 'http://' : undefined;

        try {
            if (!this.siteCheck) {
                this.siteCheck = await CoreSites.checkSite(this.site.siteUrl, protocol);
                this.siteCheck.config && this.site.setPublicConfig(this.siteCheck.config);
            }

            this.site.setURL(this.siteCheck.siteUrl);
            this.siteConfig = this.siteCheck.config;
            this.supportConfig = this.siteConfig && new CoreUserGuestSupportConfig(this.site, this.siteConfig);

            await this.treatSiteConfig();

            this.siteCheckError = '';

            // Check if user needs to authenticate in a browser.
            this.isBrowserSSO = CoreLoginHelper.isSSOLoginNeeded(this.siteCheck.code);
        } catch (error) {
            this.siteCheckError = CoreDomUtils.getErrorMessage(error) || 'Error loading site';

            CoreDomUtils.showErrorModal(error);
        } finally {
            this.pageLoaded = true;
        }
    }

    /**
     * Treat the site configuration (if it exists).
     */
    protected async treatSiteConfig(): Promise<void> {
        this.showLoginForm = await CoreLoginHelper.shouldShowLoginForm(this.siteConfig);

        if (!this.siteConfig) {
            this.authInstructions = undefined;
            this.canSignup = false;

            return;
        }

        if (this.site.isDemoModeSite()) {
            this.showScanQR = false;
        } else {
            this.siteName = this.siteConfig.sitename;
            this.logoUrl = this.site.getLogoUrl(this.siteConfig);
            this.showScanQR = await CoreLoginHelper.displayQRInCredentialsScreen(this.siteConfig.tool_mobile_qrcodetype);
        }

        this.canSignup = this.siteConfig.registerauth == 'email' && !this.site.isFeatureDisabled(EMAIL_SIGNUP_FEATURE_NAME);
        this.showForgottenPassword = !this.site.isFeatureDisabled(FORGOTTEN_PASSWORD_FEATURE_NAME);
        this.exceededAttemptsHTML = CoreLoginHelper.buildExceededAttemptsHTML(
            !!this.supportConfig?.canContactSupport(),
            this.showForgottenPassword,
        );
        this.authInstructions = this.siteConfig.authinstructions ||
            (this.canSignup ? Translate.instant('core.login.loginsteps') : '');

        if (!this.eventThrown && !this.viewLeft) {
            this.eventThrown = true;
            CoreEvents.trigger(CoreEvents.LOGIN_SITE_CHECKED, { config: this.siteConfig });
        }
    }

    /**
     * Tries to authenticate the user using the browser.
     *
     * @param e Event.
     * @returns Promise resolved when done.
     */
    async openBrowserSSO(e?: Event): Promise<void> {
        e?.preventDefault();
        e?.stopPropagation();

        // Check that there's no SSO authentication ongoing and the view hasn't changed.
        if (CoreApp.isSSOAuthenticationOngoing() || this.viewLeft || !this.siteCheck) {
            return;
        }

        CoreLoginHelper.openBrowserForSSOLogin(
            this.siteCheck.siteUrl,
            this.siteCheck.code,
            this.siteCheck.service,
            this.siteCheck.config?.launchurl,
        );
    }

    /**
     * Tries to authenticate the user.
     *
     * @param e Event.
     * @returns Promise resolved when done.
     */
    async login(e?: Event): Promise<void> {
        e?.preventDefault();
        e?.stopPropagation();

        CoreKeyboard.close();

        // Get input data.
        const siteUrl = this.site.getURL();
        const username = this.credForm.value.username;
        const password = this.credForm.value.password;

        if (!username) {
            CoreDomUtils.showErrorModal('core.login.usernamerequired', true);

            return;
        }
        if (!password) {
            CoreDomUtils.showErrorModal('core.login.passwordrequired', true);

            return;
        }

        if (!CoreNetwork.isOnline()) {
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
            if (error instanceof CoreSiteError && CoreLoginHelper.isAppUnsupportedError(error)) {
                await CoreLoginHelper.showAppUnsupportedModal(siteUrl, this.site, error.debug);
            } else {
                CoreLoginHelper.treatUserTokenError(siteUrl, error, username, password);
            }

            if (error.loggedout) {
                CoreNavigator.navigate('/login/sites', { reset: true });
            } else if (error.errorcode == 'forcepasswordchangenotice') {
                // Reset password field.
                this.credForm.controls.password.reset();
            } else if (error.errorcode === 'invalidlogin') {
                this.loginAttempts++;
            }
        } finally {
            modal.dismiss();

            CoreForms.triggerFormSubmittedEvent(this.formElement, true);
        }
    }

    /**
     * Exceeded attempts message clicked.
     *
     * @param event Click event.
     */
    exceededAttemptsClicked(event: Event): void {
        event.preventDefault();

        if (!(event.target instanceof HTMLAnchorElement)) {
            return;
        }

        this.forgottenPassword();
    }

    /**
     * Forgotten password button clicked.
     */
    forgottenPassword(): void {
        CoreLoginHelper.forgottenPasswordClicked(this.site.getURL(), this.credForm.value.username, this.siteConfig);
    }

    /**
     * Open email signup page.
     */
    openEmailSignup(): void {
        CoreNavigator.navigate('/login/emailsignup', { params: { siteUrl: this.site.getURL() } });
    }

    /**
     * Open settings page.
     */
    openSettings(): void {
        CoreNavigator.navigate('/settings');
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.viewLeft = true;
        CoreEvents.trigger(
            CoreEvents.LOGIN_SITE_UNCHECKED,
            {
                config: this.siteConfig,
                loginSuccessful: !!this.siteId,
            },
            this.siteId,
        );
        this.valueChangeSubscription?.unsubscribe();
        this.alwaysShowLoginFormObserver?.off();
    }

}
