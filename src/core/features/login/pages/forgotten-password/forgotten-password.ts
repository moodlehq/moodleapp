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

import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CoreLoginHelper } from '@features/login/services/login-helper';
import { Translate } from '@singletons';
import { CoreNavigator } from '@services/navigator';
import { CoreForms } from '@singletons/form';
import { CorePlatform } from '@services/platform';
import { CoreSitePublicConfigResponse, CoreUnauthenticatedSite } from '@classes/sites/unauthenticated-site';
import { CoreUserSupportConfig } from '@features/user/classes/support/support-config';
import { CoreUserGuestSupportConfig } from '@features/user/classes/support/guest-support-config';
import { CoreSitesFactory } from '@services/sites-factory';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreLoginExceededAttemptsComponent } from '../../components/exceeded-attempts/exceeded-attempts';

/**
 * Page to recover a forgotten password.
 */
@Component({
    selector: 'page-core-login-forgotten-password',
    templateUrl: 'forgotten-password.html',
    standalone: true,
    imports: [
        CoreSharedModule,
        CoreLoginExceededAttemptsComponent,
    ],
})
export default class CoreLoginForgottenPasswordPage implements OnInit {

    @ViewChild('resetPasswordForm') formElement?: ElementRef;

    myForm!: FormGroup;
    site!: CoreUnauthenticatedSite;
    autoFocus!: boolean;
    supportConfig?: CoreUserSupportConfig;
    canContactSupport?: boolean;
    wasPasswordResetRequestedRecently = false;

    constructor(protected formBuilder: FormBuilder) {}

    /**
     * Initialize the component.
     */
    async ngOnInit(): Promise<void> {
        const siteUrl = CoreNavigator.getRouteParam<string>('siteUrl');
        if (!siteUrl) {
            CoreAlerts.showError('Site URL not supplied.');
            CoreNavigator.back();

            return;
        }

        const siteConfig = CoreNavigator.getRouteParam<CoreSitePublicConfigResponse>('siteConfig');

        this.site = CoreSitesFactory.makeUnauthenticatedSite(siteUrl, siteConfig);
        this.autoFocus = CorePlatform.is('tablet');
        this.myForm = this.formBuilder.group({
            field: ['username', Validators.required],
            value: [CoreNavigator.getRouteParam<string>('username') || '', Validators.required],
        });

        this.supportConfig = siteConfig && new CoreUserGuestSupportConfig(this.site, siteConfig);
        this.canContactSupport = this.supportConfig?.canContactSupport();
        this.wasPasswordResetRequestedRecently = await CoreLoginHelper.wasPasswordResetRequestedRecently(siteUrl);
    }

    /**
     * Request to reset the password.
     *
     * @param e Event.
     */
    async resetPassword(e: Event): Promise<void> {
        e.preventDefault();
        e.stopPropagation();

        const field = this.myForm.value.field;
        const value = this.myForm.value.value;

        if (!value) {
            CoreAlerts.showError(Translate.instant('core.login.usernameoremail'));

            return;
        }

        const modal = await CoreLoadings.show('core.sending', true);
        const isMail = field === 'email';

        try {
            const response = await CoreLoginHelper.requestPasswordReset(
                this.site.getURL(),
                isMail ? '' : value,
                isMail ? value : '',
            );

            if (response.status === 'dataerror') {
                // Show an error from the warnings.
                const warning = response.warnings?.find((warning) =>
                    (warning.item === 'email' && isMail) || (warning.item === 'username' && !isMail));
                if (warning) {
                    CoreAlerts.showError(warning.message);
                }
            } else if (response.status === 'emailpasswordconfirmnotsent' || response.status === 'emailpasswordconfirmnoemail') {
                // Error, not found.
                CoreAlerts.showError(response.notice);
            } else {
                // Success.
                CoreForms.triggerFormSubmittedEvent(this.formElement, true);

                await CoreAlerts.show({ header: Translate.instant('core.success'), message: response.notice });
                await CoreNavigator.back();
                await CoreLoginHelper.passwordResetRequested(this.site.getURL());
            }
        } catch (error) {
            CoreAlerts.showError(error);
        } finally {
            modal.dismiss();
        }
    }

}
