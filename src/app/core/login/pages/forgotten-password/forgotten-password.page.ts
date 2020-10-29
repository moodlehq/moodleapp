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
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NavController } from '@ionic/angular';

import { CoreDomUtils } from '@services/utils/dom';
import { CoreLoginHelper } from '@core/login/services/helper';
import { Translate, Platform } from '@singletons/core.singletons';
import { CoreWSExternalWarning } from '@services/ws';

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
        protected navCtrl: NavController,
        protected formBuilder: FormBuilder,
        protected route: ActivatedRoute,
    ) {
    }

    /**
     * Initialize the component.
     */
    ngOnInit(): void {
        const params = this.route.snapshot.queryParams;

        this.siteUrl = params['siteUrl'];
        this.autoFocus = Platform.instance.is('tablet');
        this.myForm = this.formBuilder.group({
            field: ['username', Validators.required],
            value: [params['username'] || '', Validators.required],
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
            CoreDomUtils.instance.showErrorModal('core.login.usernameoremail', true);

            return;
        }

        const modal = await CoreDomUtils.instance.showModalLoading('core.sending', true);
        const isMail = field == 'email';

        try {
            const response = await CoreLoginHelper.instance.requestPasswordReset(
                this.siteUrl,
                isMail ? '' : value,
                isMail ? value : '',
            );

            if (response.status == 'dataerror') {
                // Error in the data sent.
                this.showError(isMail, response.warnings!);
            } else if (response.status == 'emailpasswordconfirmnotsent' || response.status == 'emailpasswordconfirmnoemail') {
                // Error, not found.
                CoreDomUtils.instance.showErrorModal(response.notice);
            } else {
                // Success.
                CoreDomUtils.instance.triggerFormSubmittedEvent(this.formElement, true);

                CoreDomUtils.instance.showAlert(Translate.instance.instant('core.success'), response.notice);
                this.navCtrl.pop();
            }
        } catch (error) {
            CoreDomUtils.instance.showErrorModal(error);
        } finally {
            modal.dismiss();
        }
    }

    // Show an error from the warnings.
    protected showError(isMail: boolean, warnings: CoreWSExternalWarning[]): void {
        for (let i = 0; i < warnings.length; i++) {
            const warning = warnings[i];
            if ((warning.item == 'email' && isMail) || (warning.item == 'username' && !isMail)) {
                CoreDomUtils.instance.showErrorModal(warning.message);
                break;
            }
        }
    }

}
