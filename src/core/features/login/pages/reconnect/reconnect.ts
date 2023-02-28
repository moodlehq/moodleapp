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

import { CoreApp } from '@services/app';
import { CoreNetwork } from '@services/network';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { CoreLoginHelper } from '@features/login/services/login-helper';
import { CoreSite, CoreSiteIdentityProvider, CoreSitePublicConfigResponse } from '@classes/site';
import { CoreEvents } from '@singletons/events';
import { CoreError } from '@classes/errors/error';
import { CoreNavigator, CoreRedirectPayload } from '@services/navigator';
import { CoreForms } from '@singletons/form';
import { CoreUserSupport } from '@features/user/services/support';
import { CoreUserSupportConfig } from '@features/user/classes/support/support-config';
import { CoreUserAuthenticatedSupportConfig } from '@features/user/classes/support/authenticated-support-config';
import { Translate } from '@singletons';
import { SafeHtml } from '@angular/platform-browser';

/**
 * Page to enter the user password to reconnect to a site.
 */
@Component({
    selector: 'page-core-login-reconnect',
    templateUrl: 'reconnect.html',
    styleUrls: ['../../login.scss'],
})
export class CoreLoginReconnectPage implements OnInit, OnDestroy {

    @ViewChild('reconnectForm') formElement?: ElementRef;

    credForm: FormGroup;
    siteUrl!: string;
    username!: string;
    userFullName!: string;
    userAvatar?: string;
    siteName!: string;
    logoUrl?: string;
    identityProviders?: CoreSiteIdentityProvider[];
    showForgottenPassword = true;
    showSiteAvatar = false;
    isBrowserSSO = false;
    isOAuth = false;
    isLoggedOut: boolean;
    siteId!: string;
    showScanQR = false;
    showLoading = true;
    reconnectAttempts = 0;
    supportConfig?: CoreUserSupportConfig;
    exceededAttemptsHTML?: SafeHtml | string | null;

    protected siteConfig?: CoreSitePublicConfigResponse;
    protected viewLeft = false;
    protected eventThrown = false;
    protected redirectData?: CoreRedirectPayload;
    protected loginSuccessful = false;

    constructor(
        protected fb: FormBuilder,
    ) {
        const currentSite = CoreSites.getCurrentSite();

        this.isLoggedOut = !currentSite || currentSite.isLoggedOut();
        this.credForm = fb.group({
            password: ['', Validators.required],
        });
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            this.siteId = CoreNavigator.getRequiredRouteParam<string>('siteId');

            const redirectPath = CoreNavigator.getRouteParam('redirectPath');
            const urlToOpen = CoreNavigator.getRouteParam('urlToOpen');
            if (redirectPath || urlToOpen) {
                this.redirectData = {
                    redirectPath,
                    redirectOptions: CoreNavigator.getRouteParam('redirectOptions'),
                    urlToOpen,
                };
            }

            const site = await CoreSites.getSite(this.siteId);

            if (!site.infos) {
                throw new CoreError('Invalid site');
            }

            this.username = site.infos.username;
            this.userFullName = site.infos.fullname;
            this.userAvatar = site.infos.userpictureurl;
            this.siteUrl = site.infos.siteurl;
            this.siteName = site.getSiteName();
            this.supportConfig = new CoreUserAuthenticatedSupportConfig(site);

            // If login was OAuth we should only reach this page if the OAuth method ID has changed.
            this.isOAuth = site.isOAuth();

            // Show logo instead of avatar if it's a fixed site.
            this.showSiteAvatar = !!this.userAvatar && !CoreLoginHelper.getFixedSites();

            this.checkSiteConfig(site);

            this.showLoading = false;
        } catch (error) {
            CoreDomUtils.showErrorModal(error);

            return this.cancel();
        }
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.viewLeft = true;
        CoreEvents.trigger(
            CoreEvents.LOGIN_SITE_UNCHECKED,
            {
                config: this.siteConfig,
                loginSuccessful: this.loginSuccessful,
            },
            this.siteId,
        );
    }

    /**
     * Show help modal.
     */
    showHelp(): void {
        CoreUserSupport.showHelp(
            Translate.instant('core.login.reconnecthelp'),
            Translate.instant('core.login.reconnectsupportsubject'),
            this.supportConfig,
        );
    }

    /**
     * Get some data (like identity providers) from the site config.
     */
    protected async checkSiteConfig(site: CoreSite): Promise<void> {
        this.siteConfig = await CoreUtils.ignoreErrors(site.getPublicConfig({
            readingStrategy: CoreSitesReadingStrategy.PREFER_NETWORK,
        }));

        if (!this.siteConfig) {
            return;
        }

        const disabledFeatures = CoreLoginHelper.getDisabledFeatures(this.siteConfig);

        this.identityProviders = CoreLoginHelper.getValidIdentityProviders(this.siteConfig, disabledFeatures);
        this.showForgottenPassword = !CoreLoginHelper.isForgottenPasswordDisabled(this.siteConfig);
        this.exceededAttemptsHTML = CoreLoginHelper.buildExceededAttemptsHTML(
            !!this.supportConfig?.canContactSupport(),
            this.showForgottenPassword,
        );

        if (!this.eventThrown && !this.viewLeft) {
            this.eventThrown = true;
            CoreEvents.trigger(CoreEvents.LOGIN_SITE_CHECKED, { config: this.siteConfig });
        }

        this.isBrowserSSO = !this.isOAuth && CoreLoginHelper.isSSOLoginNeeded(this.siteConfig.typeoflogin);
        this.showScanQR = CoreLoginHelper.displayQRInSiteScreen() ||
            CoreLoginHelper.displayQRInCredentialsScreen(this.siteConfig.tool_mobile_qrcodetype);

        await CoreSites.checkApplication(this.siteConfig);

        // Check logoURL if user avatar is not set.
        if (this.userAvatar?.startsWith(this.siteUrl + '/theme/image.php')) {
            this.showSiteAvatar = false;
        }
        this.logoUrl = CoreLoginHelper.getLogoUrl(this.siteConfig);
    }

    /**
     * Cancel reconnect.
     *
     * @param e Event.
     */
    cancel(e?: Event): void {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (this.isLoggedOut) {
            // Go to sites page when user is logged out.
            CoreNavigator.navigate('/login/sites', { reset: true });
        }

        CoreSites.logout();
    }

    /**
     * Tries to authenticate the user.
     *
     * @param e Event.
     */
    async login(e: Event): Promise<void> {
        e.preventDefault();
        e.stopPropagation();

        CoreApp.closeKeyboard();

        // Get input data.
        const password = this.credForm.value.password;

        if (!password) {
            CoreDomUtils.showErrorModal('core.login.passwordrequired', true);

            return;
        }

        if (!CoreNetwork.isOnline()) {
            CoreDomUtils.showErrorModal('core.networkerrormsg', true);

            return;
        }

        const modal = await CoreDomUtils.showModalLoading();

        try {
            // Start the authentication process.
            const data = await CoreSites.getUserToken(this.siteUrl, this.username, password);

            await CoreSites.updateSiteToken(this.siteUrl, this.username, data.token, data.privateToken);

            CoreForms.triggerFormSubmittedEvent(this.formElement, true);

            // Update site info too.
            await CoreSites.updateSiteInfoByUrl(this.siteUrl, this.username);

            // Reset fields so the data is not in the view anymore.
            this.credForm.controls['password'].reset();

            // Go to the site initial page.
            this.loginSuccessful = true;

            await CoreNavigator.navigateToSiteHome({
                params: this.redirectData,
            });
        } catch (error) {
            CoreLoginHelper.treatUserTokenError(this.siteUrl, error, this.username, password);

            if (error.loggedout) {
                this.cancel();
            } else if (error.errorcode == 'forcepasswordchangenotice') {
                // Reset password field.
                this.credForm.controls.password.reset();
            } else if (error.errorcode == 'invalidlogin') {
                this.reconnectAttempts++;
            }
        } finally {
            modal.dismiss();
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
        CoreLoginHelper.forgottenPasswordClicked(this.siteUrl, this.username, this.siteConfig);
    }

    /**
     * Open browser for SSO login.
     */
    openBrowserSSO(): void {
        if (!this.siteConfig) {
            return;
        }

        CoreLoginHelper.confirmAndOpenBrowserForSSOLogin(
            this.siteUrl,
            this.siteConfig.typeoflogin,
            undefined,
            this.siteConfig.launchurl,
            this.redirectData,
        );
    }

    /**
     * An OAuth button was clicked.
     *
     * @param provider The provider that was clicked.
     */
    oauthClicked(provider: CoreSiteIdentityProvider): void {
        const result = CoreLoginHelper.openBrowserForOAuthLogin(
            this.siteUrl,
            provider,
            this.siteConfig?.launchurl,
            this.redirectData,
        );

        if (!result) {
            CoreDomUtils.showErrorModal('Invalid data.');
        }
    }

    /**
     * Show instructions and scan QR code.
     *
     * @returns Promise resolved when done.
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
     * A11y key functionality that prevents keyDown events.
     *
     * @param e Event.
     */
    keyDown(e: KeyboardEvent): void {
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
        }
    }

    /**
     * Cancel reconnect.
     *
     * @param e Event.
     */
    keyUp(e: KeyboardEvent): void {
        if (e.key === 'Escape') {
            this.cancel(e);
        }
    }

}
