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
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { CoreLoginHelper } from '@features/login/services/login-helper';
import { CoreSiteIdentityProvider, CoreSitePublicConfigResponse } from '@classes/site';
import { CoreEvents } from '@singletons/events';
import { CoreError } from '@classes/errors/error';
import { CoreNavigationOptions, CoreNavigator } from '@services/navigator';
import { CoreForms } from '@singletons/form';

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
    isOAuth = false;
    isLoggedOut: boolean;
    siteId!: string;
    showScanQR = false;

    protected page?: string;
    protected pageOptions?: CoreNavigationOptions;
    protected siteConfig?: CoreSitePublicConfigResponse;
    protected viewLeft = false;
    protected eventThrown = false;

    constructor(
        protected fb: FormBuilder,
    ) {
        const currentSite = CoreSites.getCurrentSite();

        this.isLoggedOut = !!currentSite?.isLoggedOut();
        this.credForm = fb.group({
            password: ['', Validators.required],
        });
    }

    /**
     * Initialize the component.
     */
    async ngOnInit(): Promise<void> {
        const siteId = CoreNavigator.getRouteParam<string>('siteId');
        if (!siteId) {
            return this.cancel();
        }

        this.siteId = siteId;
        this.page = CoreNavigator.getRouteParam('pageName');
        this.pageOptions = CoreNavigator.getRouteParam('pageOptions');
        this.showScanQR = CoreLoginHelper.displayQRInSiteScreen() || CoreLoginHelper.displayQRInCredentialsScreen();

        try {
            const site = await CoreSites.getSite(this.siteId);

            if (!site.infos) {
                throw new CoreError('Invalid site');
            }

            this.username = site.infos.username;
            this.userFullName = site.infos.fullname;
            this.userAvatar = site.infos.userpictureurl;
            this.siteUrl = site.infos.siteurl;
            this.siteName = site.getSiteName();

            // If login was OAuth we should only reach this page if the OAuth method ID has changed.
            this.isOAuth = site.isOAuth();

            // Show logo instead of avatar if it's a fixed site.
            this.showSiteAvatar = !!this.userAvatar && !CoreLoginHelper.getFixedSites();

            const config = await CoreUtils.ignoreErrors(site.getPublicConfig());

            if (!config) {
                return;
            }

            this.siteConfig = config;

            await CoreSites.checkApplication(config);

            // Check logoURL if user avatar is not set.
            if (this.userAvatar.startsWith(this.siteUrl + '/theme/image.php')) {
                this.showSiteAvatar = false;
            }
            this.logoUrl = CoreLoginHelper.getLogoUrl(config);

            this.getDataFromConfig(this.siteConfig);
        } catch (error) {
            // Just leave the view.
            this.cancel();
        }
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.viewLeft = true;
        CoreEvents.trigger(CoreEvents.LOGIN_SITE_UNCHECKED, { config: this.siteConfig }, this.siteId);
    }

    /**
     * Get some data (like identity providers) from the site config.
     *
     * @param config Config to use.
     */
    protected getDataFromConfig(config: CoreSitePublicConfigResponse): void {
        const disabledFeatures = CoreLoginHelper.getDisabledFeatures(config);

        this.identityProviders = CoreLoginHelper.getValidIdentityProviders(config, disabledFeatures);
        this.showForgottenPassword = !CoreLoginHelper.isForgottenPasswordDisabled(config);

        if (!this.eventThrown && !this.viewLeft) {
            this.eventThrown = true;
            CoreEvents.trigger(CoreEvents.LOGIN_SITE_CHECKED, { config: config });
        }
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

        if (!CoreApp.isOnline()) {
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
            this.page
                ? await CoreNavigator.navigateToSitePath(this.page, { params: this.pageOptions })
                : await CoreNavigator.navigateToSiteHome();
        } catch (error) {
            CoreLoginHelper.treatUserTokenError(this.siteUrl, error, this.username, password);

            if (error.loggedout) {
                this.cancel();
            } else if (error.errorcode == 'forcepasswordchangenotice') {
                // Reset password field.
                this.credForm.controls.password.reset();
            }
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Forgotten password button clicked.
     */
    forgottenPassword(): void {
        CoreLoginHelper.forgottenPasswordClicked(this.siteUrl, this.username, this.siteConfig);
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
            this.page,
            this.pageOptions,
        );

        if (!result) {
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
     * A11y key functionality that prevents keyDown events.
     *
     * @param e Event.
     */
    keyDown(e: KeyboardEvent): void {
        if (e.key == 'Escape') {
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
        if (e.key == 'Escape') {
            this.cancel(e);
        }
    }

}
