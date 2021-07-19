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

import { CoreDomUtils } from '@services/utils/dom';
import { CoreLoginHelper } from '@features/login/services/login-helper';
import { Translate, Platform } from '@singletons';
import { CoreWSExternalWarning } from '@services/ws';
import { CoreNavigator } from '@services/navigator';
import { CoreForms } from '@singletons/form';

/**
 * Page to recover a forgotten password.
 */
@Component({
    selector: 'page-core-login-forgotten-password',
    templateUrl: 'forgotten-password.html',
})
export class CoreLoginForgottenPasswordPage implements OnInit {

    @ViewChild('resetPasswordForm') formElement?: ElementRef;

    myForm!: FormGroup;
    siteUrl!: string;
    autoFocus!: boolean;

    constructor(
        protected formBuilder: FormBuilder,
    ) {
    }

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
        this.autoFocus = Platform.is('tablet');
        this.myForm = this.formBuilder.group({
            field: ['username', Validators.required],
            value: [CoreNavigator.getRouteParam<string>('username') || '', Validators.required],
        });
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
            CoreDomUtils.showErrorModal('core.login.usernameoremail', true);

            return;
        }

        const modal = await CoreDomUtils.showModalLoading('core.sending', true);
        const isMail = field == 'email';

        try {
            const response = await CoreLoginHelper.requestPasswordReset(
                this.siteUrl,
                isMail ? '' : value,
                isMail ? value : '',
            );

            if (response.status == 'dataerror') {
                // Error in the data sent.
                this.showError(isMail, response.warnings!);
            } else if (response.status == 'emailpasswordconfirmnotsent' || response.status == 'emailpasswordconfirmnoemail') {
                // Error, not found.
                CoreDomUtils.showErrorModal(response.notice);
            } else {
                // Success.
                CoreForms.triggerFormSubmittedEvent(this.formElement, true);

                CoreDomUtils.showAlert(Translate.instant('core.success'), response.notice);
                CoreNavigator.back();
            }
        } catch (error) {
            CoreDomUtils.showErrorModal(error);
        } finally {
            modal.dismiss();
        }
    }

    // Show an error from the warnings.
    protected showError(isMail: boolean, warnings: CoreWSExternalWarning[]): void {
        for (let i = 0; i < warnings.length; i++) {
            const warning = warnings[i];
            if ((warning.item == 'email' && isMail) || (warning.item == 'username' && !isMail)) {
                CoreDomUtils.showErrorModal(warning.message);
                break;
            }
        }
    }

}
