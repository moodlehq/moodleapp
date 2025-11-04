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

import { Component, Input, OnInit } from '@angular/core';
import { CorePromisedValue } from '@classes/promised-value';
import { CoreSite } from '@classes/sites/site';
import { CoreSiteIdentityProvider, CoreSitePublicConfigResponse } from '@classes/sites/unauthenticated-site';
import { CoreLoginHelper, CoreLoginMethod } from '@features/login/services/login-helper';
import { CoreRedirectPayload } from '@services/navigator';
import { CoreSitesFactory } from '@services/sites-factory';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreLoginIdentityProviderComponent } from '../identity-provider/identity-provider';

@Component({
    selector: 'core-login-methods',
    templateUrl: 'login-methods.html',
    styleUrl: '../../login.scss',
    imports: [
        CoreSharedModule,
        CoreLoginIdentityProviderComponent,
    ],
})
export class CoreLoginMethodsComponent implements OnInit {

    @Input() siteUrl = '';
    @Input() siteConfig?: CoreSitePublicConfigResponse;
    @Input() redirectData?: CoreRedirectPayload;
    @Input() site?: CoreSite; // Defined when the user is reconnecting.
    @Input() showLoginForm = true;

    isBrowserSSO  = false;
    showScanQR  = false;
    loginMethods: CoreLoginMethod[] = [];
    identityProviders: CoreSiteIdentityProvider[] = [];

    protected currentLoginProvider?: CoreSiteIdentityProvider;
    protected isReady = new CorePromisedValue<void>();

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        if (this.site) {
            this.siteUrl = this.site.getURL();

            this.loginMethods = await CoreLoginHelper.getLoginMethods();

            const defaultMethod = await CoreLoginHelper.getDefaultLoginMethod();
            if (this.site.isLoggedOut() && defaultMethod) {
                await defaultMethod.action();
            }
        }

        if (this.siteConfig) {
            this.isBrowserSSO = CoreLoginHelper.isSSOLoginNeeded(this.siteConfig.typeoflogin);

            // Identity providers won't be shown if login on browser.
            if (!this.isBrowserSSO) {
                this.identityProviders = await CoreLoginHelper.getValidIdentityProvidersForSite(
                    this.site ?? CoreSitesFactory.makeUnauthenticatedSite(this.siteUrl, this.siteConfig),
                );
            }

            if (this.site) {
                // The identity provider set in the site will be shown at the top.
                const oAuthId = this.site.getOAuthId();
                this.currentLoginProvider = CoreLoginHelper.findIdentityProvider(this.identityProviders, oAuthId);

                // Remove the identity provider from the array.
                this.identityProviders = this.identityProviders.filter((provider) =>
                    provider.url !== this.currentLoginProvider?.url);
            }

            await this.setShowScanQR();
        }

        this.isReady.resolve();
    }

    /**
     * Set if should show the scan QR code button.
     */
    async setShowScanQR(): Promise<void> {
        if (this.site) {
            if (this.site.isDemoModeSite()) {
                this.showScanQR = false;

                return;
            }

            this.showScanQR = CoreLoginHelper.displayQRInSiteScreen();

            if (this.showScanQR) {
                return;
            }
        }

        // If still false or credentials screen.
        if (this.siteConfig) {
            this.showScanQR = await CoreLoginHelper.displayQRInCredentialsScreen(this.siteConfig.tool_mobile_qrcodetype);
        }
    }

    /**
     * Show instructions and scan QR code.
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
     * Get the current login.
     *
     * @returns Current login.
     */
    async getCurrentLogin(): Promise<CoreLoginMethodsCurrentLogin | undefined> {
        await this.isReady;
        if (!this.currentLoginProvider) {
            return;
        }

        const showOther = !!(this.showLoginForm || this.isBrowserSSO) &&
            !!(this.loginMethods.length || this.identityProviders.length || this.showScanQR);

        return {
            provider: this.currentLoginProvider,
            showOther,
        };
    }

}

export type CoreLoginMethodsCurrentLogin = {
    provider: CoreSiteIdentityProvider;
    showOther: boolean;
};
