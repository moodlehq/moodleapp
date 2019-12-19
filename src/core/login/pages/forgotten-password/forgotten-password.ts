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

import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreLoginHelperProvider } from '../../providers/helper';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

/**
 * Page to recover a forgotten password.
 */
@IonicPage({ segment: 'core-login-forgotten-password' })
@Component({
    selector: 'page-core-login-forgotten-password',
    templateUrl: 'forgotten-password.html',
})
export class CoreLoginForgottenPasswordPage {
    myForm: FormGroup;
    siteUrl: string;

    constructor(private navCtrl: NavController, navParams: NavParams, fb: FormBuilder, private translate: TranslateService,
            private loginHelper: CoreLoginHelperProvider, private domUtils: CoreDomUtilsProvider) {

        this.siteUrl = navParams.get('siteUrl');
        this.myForm = fb.group({
            field: ['username', Validators.required],
            value: [navParams.get('username') || '', Validators.required]
        });
    }

    /**
     * Request to reset the password.
     *
     * @param e Event.
     */
    resetPassword(e: Event): void {
        e.preventDefault();
        e.stopPropagation();

        const field = this.myForm.value.field,
            value = this.myForm.value.value;

        if (!value) {
            this.domUtils.showErrorModal('core.login.usernameoremail', true);

            return;
        }

        const modal = this.domUtils.showModalLoading('core.sending', true),
            isMail = field == 'email';

        this.loginHelper.requestPasswordReset(this.siteUrl, isMail ? '' : value, isMail ? value : '').then((response) => {
            if (response.status == 'dataerror') {
                // Error in the data sent.
                this.showError(isMail, response.warnings);
            } else if (response.status == 'emailpasswordconfirmnotsent' || response.status == 'emailpasswordconfirmnoemail') {
                // Error, not found.
                this.domUtils.showErrorModal(response.notice);
            } else {
                // Success.
                this.domUtils.showAlert(this.translate.instant('core.success'), response.notice);
                this.navCtrl.pop();
            }
        }).catch((error) => {
            this.domUtils.showErrorModal(error);
        }).finally(() => {
            modal.dismiss();
        });
    }

    // Show an error from the warnings.
    protected showError(isMail: boolean, warnings: any[]): void {
        for (let i = 0; i < warnings.length; i++) {
            const warning = warnings[i];
            if ((warning.item == 'email' && isMail) || (warning.item == 'username' && !isMail)) {
                this.domUtils.showErrorModal(warning.message);
                break;
            }
        }
    }
}
