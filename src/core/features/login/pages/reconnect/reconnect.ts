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
import { ActivatedRoute, Params } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NavController } from '@ionic/angular';

import { CoreApp } from '@services/app';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { CoreLoginHelper } from '@features/login/services/login-helper';
import { CoreSiteIdentityProvider, CoreSitePublicConfigResponse } from '@classes/site';
import { CoreEvents } from '@singletons/events';
import { CoreError } from '@classes/errors/error';
import { CoreNavigator } from '@services/navigator';

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

    protected page?: string;
    protected pageParams?: Params;
    protected siteConfig?: CoreSitePublicConfigResponse;
    protected viewLeft = false;
    protected eventThrown = false;

    constructor(
        protected navCtrl: NavController,
        protected fb: FormBuilder,
        protected route: ActivatedRoute,
    ) {

        const currentSite = CoreSites.instance.getCurrentSite();

        this.isLoggedOut = !!currentSite?.isLoggedOut();
        this.credForm = fb.group({
            password: ['', Validators.required],
        });
    }

    /**
     * Initialize the component.
     */
    async ngOnInit(): Promise<void> {
        const params = this.route.snapshot.queryParams;

        this.siteId = params['siteId'];
        this.page = params['pageName'];
        this.pageParams = params['pageParams'];

        try {
            const site = await CoreSites.instance.getSite(this.siteId);

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
            this.showSiteAvatar = !!this.userAvatar && !CoreLoginHelper.instance.getFixedSites();

            const config = await CoreUtils.instance.ignoreErrors(site.getPublicConfig());

            if (!config) {
                return;
            }

            this.siteConfig = config;

            await CoreSites.instance.checkRequiredMinimumVersion(config);

            // Check logoURL if user avatar is not set.
            if (this.userAvatar.startsWith(this.siteUrl + '/theme/image.php')) {
                this.showSiteAvatar = false;
            }
            this.logoUrl = CoreLoginHelper.instance.getLogoUrl(config);

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
        const disabledFeatures = CoreLoginHelper.instance.getDisabledFeatures(config);

        this.identityProviders = CoreLoginHelper.instance.getValidIdentityProviders(config, disabledFeatures);
        this.showForgottenPassword = !CoreLoginHelper.instance.isForgottenPasswordDisabled(config);

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

        CoreSites.instance.logout();
    }

    /**
     * Tries to authenticate the user.
     *
     * @param e Event.
     */
    async login(e: Event): Promise<void> {
        e.preventDefault();
        e.stopPropagation();

        CoreApp.instance.closeKeyboard();

        // Get input data.
        const password = this.credForm.value.password;

        if (!password) {
            CoreDomUtils.instance.showErrorModal('core.login.passwordrequired', true);

            return;
        }

        if (!CoreApp.instance.isOnline()) {
            CoreDomUtils.instance.showErrorModal('core.networkerrormsg', true);

            return;
        }

        const modal = await CoreDomUtils.instance.showModalLoading();

        try {
            // Start the authentication process.
            const data = await CoreSites.instance.getUserToken(this.siteUrl, this.username, password);

            await CoreSites.instance.updateSiteToken(this.siteUrl, this.username, data.token, data.privateToken);

            CoreDomUtils.instance.triggerFormSubmittedEvent(this.formElement, true);

            // Update site info too.
            await CoreSites.instance.updateSiteInfoByUrl(this.siteUrl, this.username);

            // Reset fields so the data is not in the view anymore.
            this.credForm.controls['password'].reset();

            // Go to the site initial page.
            // @todo test that this is working properly (could we use navigateToSitePath instead?).
            await CoreNavigator.instance.navigateToSiteHome({
                params: {
                    redirectPath: this.page,
                    redirectParams: this.pageParams,
                },
            });
        } catch (error) {
            CoreLoginHelper.instance.treatUserTokenError(this.siteUrl, error, this.username, password);

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
        CoreLoginHelper.instance.forgottenPasswordClicked(this.siteUrl, this.username, this.siteConfig);
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

}
