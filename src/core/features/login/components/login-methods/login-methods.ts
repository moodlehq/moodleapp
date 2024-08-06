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

import { toBoolean } from '@/core/transforms/boolean';
import { Component, Input, OnInit } from '@angular/core';
import { CoreSiteIdentityProvider, CoreSitePublicConfigResponse } from '@classes/sites/unauthenticated-site';
import { CoreLoginHelper, CoreLoginMethod } from '@features/login/services/login-helper';
import { CoreRedirectPayload } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreSitesFactory } from '@services/sites-factory';
import { CoreDomUtils } from '@services/utils/dom';

@Component({
    selector: 'core-login-methods',
    templateUrl: 'login-methods.html',
    styleUrls: ['../../login.scss'],
})
export class CoreLoginMethodsComponent implements OnInit {

    @Input({ transform: toBoolean }) reconnect = false;
    @Input() siteUrl = '';
    @Input() siteConfig?: CoreSitePublicConfigResponse;
    @Input() redirectData?: CoreRedirectPayload;
    @Input() showLoginForm = true;

    isBrowserSSO  = false;
    showScanQR  = false;
    loginMethods: CoreLoginMethod[] = [];
    identityProviders: CoreSiteIdentityProvider[] = [];

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        if (this.reconnect) {
            this.loginMethods = await CoreLoginHelper.getLoginMethods();

            const currentSite = CoreSites.getCurrentSite();
            const defaultMethod = await CoreLoginHelper.getDefaultLoginMethod();
            if (currentSite?.isLoggedOut() && defaultMethod) {
                await defaultMethod.action();
            }
        }

        if (this.siteConfig) {
            this.isBrowserSSO = CoreLoginHelper.isSSOLoginNeeded(this.siteConfig.typeoflogin);

            // Identity providers won't be shown if login on browser.
            if (!this.isBrowserSSO) {
                this.identityProviders = await CoreLoginHelper.getValidIdentityProvidersForSite(
                    CoreSitesFactory.makeUnauthenticatedSite(this.siteUrl, this.siteConfig),
                );
            }

            if (this.reconnect) {
                this.showScanQR = CoreLoginHelper.displayQRInSiteScreen();
            }

            // If still false or credentials screen.
            if (!this.reconnect || !this.showScanQR) {
                this.showScanQR = await CoreLoginHelper.displayQRInCredentialsScreen(this.siteConfig.tool_mobile_qrcodetype);
            }
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
     * An OAuth button was clicked.
     *
     * @param provider The provider that was clicked.
     */
    async oauthClicked(provider: CoreSiteIdentityProvider): Promise<void> {
        const result = await CoreLoginHelper.openBrowserForOAuthLogin(
            this.siteUrl,
            provider,
            this.siteConfig?.launchurl,
            this.redirectData,
        );

        if (!result) {
            CoreDomUtils.showErrorModal('Invalid data.');
        }
    }

}
