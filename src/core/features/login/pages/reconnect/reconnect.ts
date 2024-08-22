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

import { CoreNetwork } from '@services/network';
import { CoreSiteBasicInfo, CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { CoreLoginHelper } from '@features/login/services/login-helper';
import { CoreSite } from '@classes/sites/site';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreError } from '@classes/errors/error';
import { CoreNavigator, CoreRedirectPayload } from '@services/navigator';
import { CoreForms } from '@singletons/form';
import { CoreUserSupport } from '@features/user/services/support';
import { CoreUserSupportConfig } from '@features/user/classes/support/support-config';
import { CoreUserAuthenticatedSupportConfig } from '@features/user/classes/support/authenticated-support-config';
import { Translate } from '@singletons';
import { SafeHtml } from '@angular/platform-browser';
import { CoreSitePublicConfigResponse } from '@classes/sites/unauthenticated-site';
import { ALWAYS_SHOW_LOGIN_FORM_CHANGED, FORGOTTEN_PASSWORD_FEATURE_NAME } from '@features/login/constants';
import { CoreKeyboard } from '@singletons/keyboard';
import { CoreLoadings } from '@services/loadings';

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
    site!: CoreSite;
    logoUrl?: string;
    displaySiteUrl = false;
    showForgottenPassword = true;
    showUserAvatar = false;
    isBrowserSSO = false;
    isLoggedOut: boolean;
    siteId!: string;
    siteInfo?: CoreSiteBasicInfo;
    showScanQR = false;
    showLoading = true;
    reconnectAttempts = 0;
    supportConfig?: CoreUserSupportConfig;
    exceededAttemptsHTML?: SafeHtml | string | null;
    siteConfig?: CoreSitePublicConfigResponse;
    redirectData?: CoreRedirectPayload;
    showLoginForm = true;

    protected viewLeft = false;
    protected eventThrown = false;
    protected loginSuccessful = false;
    protected username = '';
    protected alwaysShowLoginFormObserver?: CoreEventObserver;
    protected loginObserver?: CoreEventObserver;

    constructor(
        protected fb: FormBuilder,
    ) {
        const currentSite = CoreSites.getCurrentSite();

        this.isLoggedOut = !currentSite || currentSite.isLoggedOut();
        this.credForm = fb.group({
            password: ['', Validators.required],
        });

        // Listen to LOGIN event to determine if login was successful, since the login can be done using QR, biometric, etc.
        this.loginObserver = CoreEvents.on(CoreEvents.LOGIN, () => {
            this.loginSuccessful = true;
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

            this.site = await CoreSites.getSite(this.siteId);

            if (!this.site.infos) {
                throw new CoreError('Invalid site');
            }

            this.siteInfo = {
                id: this.siteId,
                siteUrl: this.site.getURL(),
                siteUrlWithoutProtocol: this.site.getURL().replace(/^https?:\/\//, '').toLowerCase(),
                fullname: this.site.infos.fullname,
                firstname: this.site.infos.firstname,
                lastname: this.site.infos.lastname,
                siteName: await this.site.getSiteName(),
                userpictureurl: this.site.infos.userpictureurl,
                loggedOut: true, // Not used.
            };

            this.displaySiteUrl = this.site.shouldDisplayInformativeLinks();
            this.username = this.site.infos.username;
            this.supportConfig = new CoreUserAuthenticatedSupportConfig(this.site);

            const availableSites = await CoreLoginHelper.getAvailableSites();

            // Show logo instead of avatar if it's a fixed site.
            this.showUserAvatar = !availableSites.length;

            await this.checkSiteConfig();

            this.alwaysShowLoginFormObserver = CoreEvents.on(ALWAYS_SHOW_LOGIN_FORM_CHANGED, async () => {
                this.showLoginForm = await CoreLoginHelper.shouldShowLoginForm(this.siteConfig);
            });

            this.showLoading = false;
        } catch (error) {
            CoreDomUtils.showErrorModal(error);

            return this.cancel();
        }
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
                loginSuccessful: this.loginSuccessful,
                siteId: this.siteId,
            },
            this.siteId,
        );
        this.alwaysShowLoginFormObserver?.off();
        this.loginObserver?.off();
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
    protected async checkSiteConfig(): Promise<void> {
        this.siteConfig = await CoreUtils.ignoreErrors(this.site.getPublicConfig({
            readingStrategy: CoreSitesReadingStrategy.PREFER_NETWORK,
        }));

        this.showLoginForm = await CoreLoginHelper.shouldShowLoginForm(this.siteConfig);

        if (!this.siteConfig) {
            return;
        }

        this.showForgottenPassword = !this.site.isFeatureDisabled(FORGOTTEN_PASSWORD_FEATURE_NAME);
        this.exceededAttemptsHTML = CoreLoginHelper.buildExceededAttemptsHTML(
            !!this.supportConfig?.canContactSupport(),
            this.showForgottenPassword,
        );

        if (!this.eventThrown && !this.viewLeft) {
            this.eventThrown = true;
            CoreEvents.trigger(CoreEvents.LOGIN_SITE_CHECKED, { config: this.siteConfig, siteId: this.siteId });
        }

        this.isBrowserSSO = CoreLoginHelper.isSSOLoginNeeded(this.siteConfig.typeoflogin);
        this.logoUrl = this.site.getLogoUrl();

        await CoreSites.checkApplication(this.siteConfig);
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

        CoreKeyboard.close();

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

        const modal = await CoreLoadings.show();

        try {
            // Start the authentication process.
            const data = await CoreSites.getUserToken(this.site.getURL(), this.username, password);

            await CoreSites.updateSiteToken(this.site.getURL(), this.username, data.token, data.privateToken);

            CoreForms.triggerFormSubmittedEvent(this.formElement, true);

            // Update site info too.
            await CoreSites.updateSiteInfoByUrl(this.site.getURL(), this.username);

            // Reset fields so the data is not in the view anymore.
            this.credForm.controls['password'].reset();

            // Go to the site initial page.
            await CoreNavigator.navigateToSiteHome({
                params: this.redirectData,
            });
        } catch (error) {
            CoreLoginHelper.treatUserTokenError(this.site.getURL(), error, this.username, password);

            if (error.loggedout) {
                this.cancel();
            } else if (error.errorcode === 'forcepasswordchangenotice') {
                // Reset password field.
                this.credForm.controls.password.reset();
            } else if (error.errorcode === 'invalidlogin') {
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
        CoreLoginHelper.forgottenPasswordClicked(this.site.getURL(), this.username, this.siteConfig);
    }

    /**
     * Open browser for SSO login.
     */
    openBrowserSSO(): void {
        if (!this.siteConfig) {
            return;
        }

        CoreLoginHelper.openBrowserForSSOLogin(
            this.site.getURL(),
            this.siteConfig.typeoflogin,
            undefined,
            this.siteConfig.launchurl,
            this.redirectData,
        );
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
