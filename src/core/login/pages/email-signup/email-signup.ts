// (C) Copyright 2015 Martin Dougiamas
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

import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavController, NavParams, Content } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreSitesProvider } from '../../../../providers/sites';
import { CoreDomUtilsProvider } from '../../../../providers/utils/dom';
import { CoreTextUtilsProvider } from '../../../../providers/utils/text';
import { CoreUtilsProvider } from '../../../../providers/utils/utils';
import { CoreWSProvider } from '../../../../providers/ws';
import { CoreLoginHelperProvider } from '../../providers/helper';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CoreUserProfileFieldDelegate } from '../../../user/providers/user-profile-field-delegate';

/**
 * Page to signup using email.
 */
@IonicPage({segment: "core-login-email-signup"})
@Component({
    selector: 'page-core-login-email-signup',
    templateUrl: 'email-signup.html',
})
export class CoreLoginEmailSignupPage {
    @ViewChild(Content) content: Content;
    signupForm: FormGroup;
    siteUrl: string;
    siteConfig: any;
    siteName: string;
    authInstructions: string;
    settings: any;
    countries: any;
    countriesKeys: any[];
    categories: any[];
    settingsLoaded: boolean = false;

    // Validation errors.
    usernameErrors: any;
    passwordErrors: any;
    emailErrors: any;
    email2Errors: any;
    policyErrors: any;
    namefieldsErrors: any;

    constructor(private navCtrl: NavController, navParams: NavParams, private fb: FormBuilder, private wsProvider: CoreWSProvider,
            private sitesProvider: CoreSitesProvider, private loginHelper: CoreLoginHelperProvider,
            private domUtils: CoreDomUtilsProvider, private translate: TranslateService, private utils: CoreUtilsProvider,
            private textUtils: CoreTextUtilsProvider, private userProfileFieldDelegate :CoreUserProfileFieldDelegate) {

        this.siteUrl = navParams.get('siteUrl');

        // Create the signupForm with the basic controls. More controls will be added later.
        this.signupForm = this.fb.group({
            'username': ['', Validators.required],
            'password': ['', Validators.required],
            'email': ['', Validators.compose([Validators.required, Validators.email])],
            'email2': ['', Validators.compose([Validators.required, Validators.email])]
        });

        // Setup validation errors.
        this.usernameErrors = this.loginHelper.getErrorMessages('core.login.usernamerequired');
        this.passwordErrors = this.loginHelper.getErrorMessages('core.login.passwordrequired');
        this.emailErrors = this.loginHelper.getErrorMessages('core.login.missingemail');
        this.email2Errors = this.loginHelper.getErrorMessages('core.login.missingemail', undefined, 'core.login.emailnotmatch');
        this.policyErrors = this.loginHelper.getErrorMessages('core.login.policyagree');
    }

    /**
     * View loaded.
     */
    ionViewDidLoad() {
        // Fetch the data.
        this.fetchData().finally(() => {
            this.settingsLoaded = true;
        });
    }

    /**
     * Complete the FormGroup using the settings received from server.
     */
    protected completeFormGroup() {
        this.signupForm.addControl('city', this.fb.control(this.settings.defaultcity || ''));
        this.signupForm.addControl('country', this.fb.control(this.settings.country || ''));

        // Add the name fields.
        for (let i in this.settings.namefields) {
            this.signupForm.addControl(this.settings.namefields[i], this.fb.control('', Validators.required));
        }

        if (this.settings.recaptchachallengehash && this.settings.recaptchachallengeimage) {
            this.signupForm.addControl('recaptcharesponse', this.fb.control('', Validators.required));
        }

        if (this.settings.sitepolicy) {
            this.signupForm.addControl('policyagreed', this.fb.control(false, Validators.requiredTrue));
        }
    }

    /**
     * Fetch the required data from the server-
     */
    protected fetchData() : Promise<any> {
        // Get site config.
        return this.sitesProvider.getSitePublicConfig(this.siteUrl).then((config) => {
            this.siteConfig = config;

            if (this.treatSiteConfig(config)) {
                return this.getSignupSettings();
            }
        }).then(() => {
            this.completeFormGroup();
        }).catch((err) => {
            this.domUtils.showErrorModal(err);
        });
    }

    /**
     * Get signup settings from server.
     */
    protected getSignupSettings() : Promise<any> {
        return this.wsProvider.callAjax('auth_email_get_signup_settings', {}, {siteUrl: this.siteUrl}).then((settings) => {
            this.settings = settings;
            this.categories = this.loginHelper.formatProfileFieldsForSignup(settings.profilefields);

            if (this.signupForm && this.signupForm.controls['recaptcharesponse']) {
                this.signupForm.controls['recaptcharesponse'].reset(); // Reset captcha.
            }

            this.namefieldsErrors = {};
            if (settings.namefields) {
                settings.namefields.forEach((field) => {
                    this.namefieldsErrors[field] = this.loginHelper.getErrorMessages('core.login.missing' + field);
                });
            }

            return this.utils.getCountryList().then((countries) => {
                this.countries = countries;
                this.countriesKeys = Object.keys(countries);
            });
        });
    }

    /**
     * Treat the site config, checking if it's valid and extracting the data we're interested in.
     *
     * @param {any} siteConfig Site config to treat.
     */
    protected treatSiteConfig(siteConfig) {
        if (siteConfig && siteConfig.registerauth == 'email' && !this.loginHelper.isEmailSignupDisabled(siteConfig)) {
            this.siteName = siteConfig.sitename;
            this.authInstructions = siteConfig.authinstructions;
            return true;
        } else {
            this.domUtils.showErrorModal(
                this.translate.instant('core.login.signupplugindisabled', {$a: this.translate.instant('core.login.auth_email')}));
            this.navCtrl.pop();
            return false;
        }
    }

    /**
     * Pull to refresh.
     *
     * @param {any} refresher Refresher.
     */
    refreshSettings(refresher: any) : void {
        this.fetchData().finally(() => {
            refresher.complete();
        });
    }

    /**
     * Request another captcha.
     *
     * @param {boolean} ignoreError Whether to ignore errors.
     */
    requestCaptcha(ignoreError?: boolean) : void {
        let modal = this.domUtils.showModalLoading();
        this.getSignupSettings().catch((err) => {
            if (!ignoreError && err) {
                this.domUtils.showErrorModal(err);
            }
        }).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Create account.
     */
    create() : void {
        if (!this.signupForm.valid) {
            // Form not valid. Scroll to the first element with errors.
            if (!this.domUtils.scrollToInputError(this.content, document.body)) {
                // Input not found, show an error modal.
                this.domUtils.showErrorModal('core.errorinvalidform', true);
            }
        } else {
            let params: any = {
                    username: this.signupForm.value.username.trim().toLowerCase(),
                    password: this.signupForm.value.password,
                    firstname: this.textUtils.cleanTags(this.signupForm.value.firstname),
                    lastname: this.textUtils.cleanTags(this.signupForm.value.lastname),
                    email: this.signupForm.value.email.trim(),
                    city: this.textUtils.cleanTags(this.signupForm.value.city),
                    country: this.signupForm.value.country
                },
                modal = this.domUtils.showModalLoading('core.sending', true);

            if (this.siteConfig.launchurl) {
                let service = this.sitesProvider.determineService(this.siteUrl);
                params.redirect = this.loginHelper.prepareForSSOLogin(this.siteUrl, service, this.siteConfig.launchurl);
            }

            if (this.settings.recaptchachallengehash && this.settings.recaptchachallengeimage) {
                params.recaptchachallengehash = this.settings.recaptchachallengehash;
                params.recaptcharesponse = this.signupForm.value.recaptcharesponse;
            }

            // Get the data for the custom profile fields.
            this.userProfileFieldDelegate.getDataForFields(this.settings.profilefields, true, 'email', this.signupForm.value).then((fieldsData) => {
                params.customprofilefields = fieldsData;

                this.wsProvider.callAjax('auth_email_signup_user', params, {siteUrl: this.siteUrl}).then((result) => {
                    if (result.success) {
                        // Show alert and ho back.
                        let message = this.translate.instant('core.login.emailconfirmsent', {$a: params.email});
                        this.domUtils.showAlert(this.translate.instant('core.success'), message);
                        this.navCtrl.pop();
                    } else {
                        this.domUtils.showErrorModalFirstWarning(result.warnings, 'core.login.usernotaddederror', true);

                        // Error sending, request another capctha since the current one is probably invalid now.
                        this.requestCaptcha(true);
                    }
                });
            }).catch((error) => {
                this.domUtils.showErrorModalDefault(error && error.error, 'core.login.usernotaddederror', true);

                // Error sending, request another capctha since the current one is probably invalid now.
                this.requestCaptcha(true);
            }).finally(() => {
                modal.dismiss();
            });
        }
    }

    /**
     * Show authentication instructions.
     */
    protected showAuthInstructions() {
        this.textUtils.expandText(this.translate.instant('core.login.instructions'), this.authInstructions);
    }
}
