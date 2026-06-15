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

import { Component, input } from '@angular/core';
import { CoreSiteIdentityProvider } from '@classes/sites/unauthenticated-site';
import { CoreLoginHelper } from '@features/login/services/login-helper';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreRedirectPayload } from '@services/navigator';
import { CoreAlerts } from '@services/overlays/alerts';

@Component({
    selector: 'core-identity-provider',
    templateUrl: 'identity-provider.html',
    imports: [
        CoreSharedModule,
    ],
})
export class CoreLoginIdentityProviderComponent {

    readonly provider = input.required<CoreSiteIdentityProvider>();
    readonly siteUrl = input.required<string>();
    readonly launchurl = input('');
    readonly redirectData = input<CoreRedirectPayload>();
    readonly siteId = input<string>();

    /**
     * The button has been clicked.
     */
    async openOAuth(): Promise<void> {
        const result = await CoreLoginHelper.openBrowserForOAuthLogin(
            this.siteUrl(),
            this.provider(),
            {
                launchUrl: this.launchurl(),
                redirectData: this.redirectData(),
                siteId: this.siteId(),
            },
        );

        if (!result) {
            CoreAlerts.showError('Invalid data.');
        }
    }

}
