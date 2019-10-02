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

import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavController, NavParams, Content } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreWSProvider } from '@providers/ws';
import { CoreLoginHelperProvider } from '../../providers/helper';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { CoreUserProfileFieldDelegate } from '@core/user/providers/user-profile-field-delegate';
import { CoreConfigConstants } from '../../../../configconstants';

/**
 * Page to signup using email.
 */
@IonicPage({ segment: 'core-login-email-signup' })
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
    categories: any[];
    settingsLoaded = false;
    captcha = {
        recaptcharesponse: ''
    };

    // Data for age verification.
    ageVerificationForm: FormGroup;
    countryControl: FormControl;
    signUpCountryControl: FormControl;
    isMinor = false; // Whether the user is minor age.
    ageDigitalConsentVerification: boolean; // Whether the age verification is enabled.
    supportName: string;
    supportEmail: string;

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
            private textUtils: CoreTextUtilsProvider, private userProfileFieldDelegate: CoreUserProfileFieldDelegate) {

        this.siteUrl = navParams.get('siteUrl');

        // Create the ageVerificationForm.
        this.ageVerificationForm = this.fb.group({
            age: ['', Validators.required]
        });
        this.countryControl = this.fb.control('', Validators.required);
        this.ageVerificationForm.addControl('country', this.countryControl);

        // Create the signupForm with the basic controls. More controls will be added later.
        this.signupForm = this.fb.group({
            username: ['', Validators.required],
            password: ['', Validators.required],
            email: ['', Validators.compose([Validators.required, Validators.email])],
            email2: ['', Validators.compose([Validators.required, Validators.email])]
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
    ionViewDidLoad(): void {
        // Fetch the data.
        this.fetchData().finally(() => {
            this.settingsLoaded = true;
        });
    }

    /**
     * Complete the FormGroup using the settings received from server.
     */
    protected completeFormGroup(): void {
        this.signupForm.addControl('city', this.fb.control(this.settings.defaultcity || ''));
        this.signUpCountryControl = this.fb.control(this.settings.country || '');
        this.signupForm.addControl('country', this.signUpCountryControl);

        // Add the name fields.
        for (const i in this.settings.namefields) {
            this.signupForm.addControl(this.settings.namefields[i], this.fb.control('', Validators.required));
        }

        if (this.settings.sitepolicy) {
            this.signupForm.addControl('policyagreed', this.fb.control(false, Validators.requiredTrue));
        }
    }

    /**
     * Fetch the required data from the server-
     */
    protected fetchData(): Promise<any> {
        // Get site config.
        return this.sitesProvider.getSitePublicConfig(this.siteUrl).then((config) => {
            this.siteConfig = config;

            if (this.treatSiteConfig(config)) {
                // Check content verification.
                if (typeof this.ageDigitalConsentVerification == 'undefined') {
                    return this.wsProvider.callAjax('core_auth_is_age_digital_consent_verification_enabled', {},
                            {siteUrl: this.siteUrl }).then((result) => {

                        this.ageDigitalConsentVerification = result.status;
                    }).catch((e) => {
                        // Capture exceptions, fail silently.
                    }).then(() => {
                        return this.getSignupSettings();
                    });
                } else {
                    return this.getSignupSettings();
                }
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
    protected getSignupSettings(): Promise<any> {
        return this.wsProvider.callAjax('auth_email_get_signup_settings', {}, { siteUrl: this.siteUrl }).then((settings) => {
            this.settings = settings;
            this.categories = this.loginHelper.formatProfileFieldsForSignup(settings.profilefields);

            if (this.settings.recaptchapublickey) {
                this.captcha.recaptcharesponse = ''; // Reset captcha.
            }

            if (!this.countryControl.value) {
                this.countryControl.setValue(settings.country || '');
            }

            this.namefieldsErrors = {};
            if (settings.namefields) {
                settings.namefields.forEach((field) => {
                    this.namefieldsErrors[field] = this.loginHelper.getErrorMessages('core.login.missing' + field);
                });
            }

            return this.utils.getCountryListSorted().then((countries) => {
                this.countries = countries;
            });
        });
    }

    /**
     * Treat the site config, checking if it's valid and extracting the data we're interested in.
     *
     * @param siteConfig Site config to treat.
     * @return True if success.
     */
    protected treatSiteConfig(siteConfig: any): boolean {
        if (siteConfig && siteConfig.registerauth == 'email' && !this.loginHelper.isEmailSignupDisabled(siteConfig)) {
            this.siteName = CoreConfigConstants.sitename ? CoreConfigConstants.sitename : siteConfig.sitename;
            this.authInstructions = siteConfig.authinstructions;
            this.ageDigitalConsentVerification = siteConfig.agedigitalconsentverification;
            this.supportName = siteConfig.supportname;
            this.supportEmail = siteConfig.supportemail;
            this.countryControl.setValue(siteConfig.country || '');

            return true;
        } else {
            this.domUtils.showErrorModal(
                this.translate.instant('core.login.signupplugindisabled', { $a: this.translate.instant('core.login.auth_email') }));
            this.navCtrl.pop();

            return false;
        }
    }

    /**
     * Pull to refresh.
     *
     * @param refresher Refresher.
     */
    refreshSettings(refresher: any): void {
        this.fetchData().finally(() => {
            refresher.complete();
        });
    }

    /**
     * Create account.
     *
     * @param e Event.
     */
    create(e: Event): void {
        e.preventDefault();
        e.stopPropagation();

        if (!this.signupForm.valid || (this.settings.recaptchapublickey && !this.captcha.recaptcharesponse)) {
            // Form not valid. Scroll to the first element with errors.
            if (!this.domUtils.scrollToInputError(this.content)) {
                // Input not found, show an error modal.
                this.domUtils.showErrorModal('core.errorinvalidform', true);
            }
        } else {
            const params: any = {
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
                const service = this.sitesProvider.determineService(this.siteUrl);
                params.redirect = this.loginHelper.prepareForSSOLogin(this.siteUrl, service, this.siteConfig.launchurl);
            }

            // Get the recaptcha response (if needed).
            if (this.settings.recaptchapublickey && this.captcha.recaptcharesponse) {
                params.recaptcharesponse = this.captcha.recaptcharesponse;
            }

            // Get the data for the custom profile fields.
            this.userProfileFieldDelegate.getDataForFields(this.settings.profilefields, true, 'email', this.signupForm.value).then(
                (fieldsData) => {
                    params.customprofilefields = fieldsData;

                    return this.wsProvider.callAjax('auth_email_signup_user', params, { siteUrl: this.siteUrl });
                }).then((result) => {
                    if (result.success) {
                        // Show alert and ho back.
                        const message = this.translate.instant('core.login.emailconfirmsent', { $a: params.email });
                        this.domUtils.showAlert(this.translate.instant('core.success'), message);
                        this.navCtrl.pop();
                    } else {
                        if (result.warnings && result.warnings.length) {
                            let error = result.warnings[0].message;
                            if (error == 'incorrect-captcha-sol') {
                                error = this.translate.instant('core.login.recaptchaincorrect');
                            }

                            this.domUtils.showErrorModal(error);
                        } else {
                            this.domUtils.showErrorModal('core.login.usernotaddederror', true);
                        }
                    }
                }).catch((error) => {
                    this.domUtils.showErrorModalDefault(error, 'core.login.usernotaddederror', true);
                }).finally(() => {
                    modal.dismiss();
                });
        }
    }

    /**
     * Escape mail to avoid special characters to be treated as a RegExp.
     *
     * @param text Initial mail.
     * @return Escaped mail.
     */
    escapeMail(text: string): string {
        return this.textUtils.escapeForRegex(text);
    }

    /**
     * Show authentication instructions.
     */
    protected showAuthInstructions(): void {
        this.textUtils.expandText(this.translate.instant('core.login.instructions'), this.authInstructions);
    }

    /**
     * Show contact information on site (we have to display again the age verification form).
     */
    showContactOnSite(): void {
        this.utils.openInBrowser(this.siteUrl + '/login/verify_age_location.php');
    }

    /**
     * Verify Age.
     *
     * @param e Event.
     */
    verifyAge(e: Event): void {
        e.preventDefault();
        e.stopPropagation();

        if (!this.ageVerificationForm.valid) {
            this.domUtils.showErrorModal('core.errorinvalidform', true);

            return;
        }

        const modal = this.domUtils.showModalLoading('core.sending', true),
            params = this.ageVerificationForm.value;

        params.age = parseInt(params.age, 10); // Use just the integer part.

        this.wsProvider.callAjax('core_auth_is_minor', params, {siteUrl: this.siteUrl}).then((result) => {
            if (!result.status) {
                if (this.countryControl.value) {
                    this.signUpCountryControl.setValue(this.countryControl.value);
                }

                // Not a minor, go ahead!
                this.ageDigitalConsentVerification = false;
            } else {
                // Is a minor!!
                this.isMinor = true;
            }
        }).catch(() => {
            // Something wrong, redirect to the site.
            this.domUtils.showErrorModal('There was an error verifying your age, please try again using the browser.');
        }).finally(() => {
            modal.dismiss();
        });
    }
}
