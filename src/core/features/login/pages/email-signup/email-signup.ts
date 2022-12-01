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

import { Component, ViewChild, ElementRef, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';

import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreTextUtils } from '@services/utils/text';
import { CoreCountry, CoreUtils } from '@services/utils/utils';
import { CoreWS, CoreWSExternalWarning } from '@services/ws';
import { CoreConstants } from '@/core/constants';
import { Translate } from '@singletons';
import { CoreSitePublicConfigResponse } from '@classes/site';
import { CoreUserProfileFieldDelegate } from '@features/user/services/user-profile-field-delegate';

import {
    AuthEmailSignupProfileFieldsCategory,
    AuthEmailSignupSettings,
    CoreLoginHelper,
} from '@features/login/services/login-helper';
import { CoreNavigator } from '@services/navigator';
import { CoreForms } from '@singletons/form';
import { CoreRecaptchaComponent } from '@components/recaptcha/recaptcha';
import { CorePath } from '@singletons/path';
import { CoreDom } from '@singletons/dom';

/**
 * Page to signup using email.
 */
@Component({
    selector: 'page-core-login-email-signup',
    templateUrl: 'email-signup.html',
    styleUrls: ['../../login.scss'],
})
export class CoreLoginEmailSignupPage implements OnInit {

    @ViewChild(CoreRecaptchaComponent) recaptchaComponent?: CoreRecaptchaComponent;
    @ViewChild('ageForm') ageFormElement?: ElementRef;
    @ViewChild('signupFormEl') signupFormElement?: ElementRef;

    signupForm: FormGroup;
    siteUrl!: string;
    siteConfig?: CoreSitePublicConfigResponse;
    siteName?: string;
    authInstructions = '';
    settings?: AuthEmailSignupSettings;
    countries?: CoreCountry[];
    categories?: AuthEmailSignupProfileFieldsCategory[];
    settingsLoaded = false;
    allRequiredSupported = true;
    signupUrl?: string;
    captcha = {
        recaptcharesponse: '',
    };

    // Data for age verification.
    ageVerificationForm: FormGroup;
    countryControl: FormControl;
    signUpCountryControl?: FormControl;
    isMinor = false; // Whether the user is minor age.
    ageDigitalConsentVerification?: boolean; // Whether the age verification is enabled.
    supportName?: string;
    supportEmail?: string;

    // Validation errors.
    usernameErrors: Record<string, string>;
    passwordErrors: Record<string, string>;
    emailErrors: Record<string, string>;
    email2Errors: Record<string, string>;
    policyErrors: Record<string, string>;
    namefieldsErrors?: Record<string, Record<string, string>>;

    constructor(
        protected fb: FormBuilder,
        protected elementRef: ElementRef,
        protected changeDetector: ChangeDetectorRef,
    ) {
        // Create the ageVerificationForm.
        this.ageVerificationForm = this.fb.group({
            age: ['', Validators.required],
        });
        this.countryControl = this.fb.control('', Validators.required);
        this.ageVerificationForm.addControl('country', this.countryControl);

        // Create the signupForm with the basic controls. More controls will be added later.
        this.signupForm = this.fb.group({
            username: ['', Validators.required],
            password: ['', Validators.required],
            email: ['', Validators.compose([Validators.required, Validators.email])],
            email2: ['', Validators.compose([Validators.required, Validators.email])],
        });

        // Setup validation errors.
        this.usernameErrors = CoreLoginHelper.getErrorMessages('core.login.usernamerequired');
        this.passwordErrors = CoreLoginHelper.getErrorMessages('core.login.passwordrequired');
        this.emailErrors = CoreLoginHelper.getErrorMessages('core.login.missingemail');
        this.policyErrors = CoreLoginHelper.getErrorMessages('core.login.policyagree');
        this.email2Errors = CoreLoginHelper.getErrorMessages(
            'core.login.missingemail',
            undefined,
            'core.login.emailnotmatch',
        );
    }

    /**
     * Component initialized.
     */
    ngOnInit(): void {
        const siteUrl = CoreNavigator.getRouteParam<string>('siteUrl');
        if (!siteUrl) {
            CoreDomUtils.showErrorModal('Site URL not supplied.');
            CoreNavigator.back();

            return;
        }

        this.siteUrl = siteUrl;

        // Fetch the data.
        this.fetchData().finally(() => {
            this.settingsLoaded = true;
        });
    }

    /**
     * Complete the FormGroup using the settings received from server.
     */
    protected completeFormGroup(): void {
        this.signupForm.addControl('city', this.fb.control(this.settings?.defaultcity || ''));
        this.signUpCountryControl = this.fb.control(this.settings?.country || '');
        this.signupForm.addControl('country', this.signUpCountryControl);

        // Add the name fields.
        for (const i in this.settings?.namefields) {
            this.signupForm.addControl(this.settings?.namefields[i], this.fb.control('', Validators.required));
        }

        if (this.settings?.sitepolicy) {
            this.signupForm.addControl('policyagreed', this.fb.control(false, Validators.requiredTrue));
        }
    }

    /**
     * Fetch the required data from the server.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchData(): Promise<void> {
        try {
            // Get site config.
            this.siteConfig = await CoreSites.getSitePublicConfig(this.siteUrl);
            this.signupUrl = CorePath.concatenatePaths(this.siteConfig.httpswwwroot, 'login/signup.php');

            if (this.treatSiteConfig()) {
                // Check content verification.
                if (this.ageDigitalConsentVerification === undefined) {

                    const result = await CoreUtils.ignoreErrors(
                        CoreWS.callAjax<IsAgeVerificationEnabledWSResponse>(
                            'core_auth_is_age_digital_consent_verification_enabled',
                            {},
                            { siteUrl: this.siteUrl },
                        ),
                    );

                    this.ageDigitalConsentVerification = !!result?.status;
                }

                await this.getSignupSettings();
            }

            this.completeFormGroup();
        } catch (error) {
            if (this.allRequiredSupported) {
                CoreDomUtils.showErrorModal(error);
            }
        }
    }

    /**
     * Get signup settings from server.
     *
     * @returns Promise resolved when done.
     */
    protected async getSignupSettings(): Promise<void> {
        this.settings = await CoreWS.callAjax<AuthEmailSignupSettings>(
            'auth_email_get_signup_settings',
            {},
            { siteUrl: this.siteUrl },
        );

        if (CoreUserProfileFieldDelegate.hasRequiredUnsupportedField(this.settings.profilefields)) {
            this.allRequiredSupported = false;

            throw new Error(Translate.instant('core.login.signuprequiredfieldnotsupported'));
        }

        this.categories = CoreLoginHelper.formatProfileFieldsForSignup(this.settings.profilefields);

        if (this.settings.recaptchapublickey) {
            this.captcha.recaptcharesponse = ''; // Reset captcha.
        }

        if (!this.countryControl.value) {
            this.countryControl.setValue(this.settings.country || '');
        }

        this.namefieldsErrors = {};
        if (this.settings.namefields) {
            this.settings.namefields.forEach((field) => {
                this.namefieldsErrors![field] = CoreLoginHelper.getErrorMessages('core.login.missing' + field);
            });
        }

        this.countries = await CoreUtils.getCountryListSorted();
    }

    /**
     * Treat the site config, checking if it's valid and extracting the data we're interested in.
     *
     * @returns True if success.
     */
    protected treatSiteConfig(): boolean {
        if (this.siteConfig?.registerauth == 'email' && !CoreLoginHelper.isEmailSignupDisabled(this.siteConfig)) {
            this.siteName = CoreConstants.CONFIG.sitename ? CoreConstants.CONFIG.sitename : this.siteConfig.sitename;
            this.authInstructions = this.siteConfig.authinstructions;
            this.ageDigitalConsentVerification = this.siteConfig.agedigitalconsentverification;
            this.supportName = this.siteConfig.supportname;
            this.supportEmail = this.siteConfig.supportemail;
            this.countryControl.setValue(this.siteConfig.country || '');

            return true;
        } else {
            CoreDomUtils.showErrorModal(
                Translate.instant(
                    'core.login.signupplugindisabled',
                    { $a: Translate.instant('core.login.auth_email') },
                ),
            );
            CoreNavigator.back();

            return false;
        }
    }

    /**
     * Create account.
     *
     * @param e Event.
     * @returns Promise resolved when done.
     */
    async create(e: Event): Promise<void> {
        e.preventDefault();
        e.stopPropagation();

        if (!this.signupForm.valid || (this.settings?.recaptchapublickey && !this.captcha.recaptcharesponse)) {
            // Form not valid. Mark all controls as dirty to display errors.
            for (const name in this.signupForm.controls) {
                this.signupForm.controls[name].markAsDirty();
            }
            this.changeDetector.detectChanges();

            // Scroll to the first element with errors.
            const errorFound = await CoreDom.scrollToInputError(
                this.elementRef.nativeElement,
            );

            if (!errorFound) {
                // Input not found, show an error modal.
                CoreDomUtils.showErrorModal('core.errorinvalidform', true);
            }

            return;
        }

        const modal = await CoreDomUtils.showModalLoading('core.sending', true);

        const params: SignupUserWSParams = {
            username: this.signupForm.value.username.trim().toLowerCase(),
            password: this.signupForm.value.password,
            firstname: CoreTextUtils.cleanTags(this.signupForm.value.firstname),
            lastname: CoreTextUtils.cleanTags(this.signupForm.value.lastname),
            email: this.signupForm.value.email.trim(),
            city: CoreTextUtils.cleanTags(this.signupForm.value.city),
            country: this.signupForm.value.country,
        };

        if (this.siteConfig?.launchurl) {
            params.redirect = CoreLoginHelper.prepareForSSOLogin(this.siteUrl, undefined, this.siteConfig.launchurl);
        }

        // Get the recaptcha response (if needed).
        if (this.settings?.recaptchapublickey && this.captcha.recaptcharesponse) {
            params.recaptcharesponse = this.captcha.recaptcharesponse;
        }

        try {
            // Get the data for the custom profile fields.
            params.customprofilefields = await CoreUserProfileFieldDelegate.getDataForFields(
                this.settings?.profilefields,
                true,
                'email',
                this.signupForm.value,
            );

            const result = await CoreWS.callAjax<SignupUserWSResult>(
                'auth_email_signup_user',
                params,
                { siteUrl: this.siteUrl },
            );

            if (result.success) {

                CoreForms.triggerFormSubmittedEvent(this.signupFormElement, true);

                // Show alert and ho back.
                const message = Translate.instant('core.login.emailconfirmsent', { $a: params.email });
                CoreDomUtils.showAlert(Translate.instant('core.success'), message);
                CoreNavigator.back();
            } else {
                this.recaptchaComponent?.expireRecaptchaAnswer();

                const warning = result.warnings?.[0];
                if (warning) {
                    let error = warning.message;
                    if (error == 'incorrect-captcha-sol' || (!error && warning.item == 'recaptcharesponse')) {
                        error = Translate.instant('core.login.recaptchaincorrect');
                    }

                    CoreDomUtils.showErrorModal(error);
                } else {
                    CoreDomUtils.showErrorModal('core.login.usernotaddederror', true);
                }
            }
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'core.login.usernotaddederror', true);
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Escape mail to avoid special characters to be treated as a RegExp.
     *
     * @param text Initial mail.
     * @returns Escaped mail.
     */
    escapeMail(text: string): string {
        return CoreTextUtils.escapeForRegex(text);
    }

    /**
     * Show authentication instructions.
     */
    showAuthInstructions(): void {
        CoreTextUtils.viewText(Translate.instant('core.login.instructions'), this.authInstructions);
    }

    /**
     * Show contact information on site (we have to display again the age verification form).
     */
    showContactOnSite(): void {
        CoreUtils.openInBrowser(
            CorePath.concatenatePaths(this.siteUrl, '/login/verify_age_location.php'),
            { showBrowserWarning: false },
        );
    }

    /**
     * Verify Age.
     *
     * @param e Event.
     * @returns Promise resolved when done.
     */
    async verifyAge(e: Event): Promise<void> {
        e.preventDefault();
        e.stopPropagation();

        if (!this.ageVerificationForm.valid) {
            CoreDomUtils.showErrorModal('core.errorinvalidform', true);

            return;
        }

        const modal = await CoreDomUtils.showModalLoading('core.sending', true);

        const params = this.ageVerificationForm.value;

        params.age = parseInt(params.age, 10); // Use just the integer part.

        try {
            const result = await CoreWS.callAjax<IsMinorWSResult>('core_auth_is_minor', params, { siteUrl: this.siteUrl });

            CoreForms.triggerFormSubmittedEvent(this.ageFormElement, true);

            if (!result.status) {
                if (this.countryControl.value) {
                    this.signUpCountryControl?.setValue(this.countryControl.value);
                }

                // Not a minor, go ahead.
                this.ageDigitalConsentVerification = false;
            } else {
                // Is a minor.
                this.isMinor = true;
            }
        } catch {
            // Something wrong, redirect to the site.
            CoreDomUtils.showErrorModal('There was an error verifying your age, please try again using the browser.');
        } finally {
            modal.dismiss();
        }
    }

}

/**
 * Result of WS core_auth_is_age_digital_consent_verification_enabled.
 */
type IsAgeVerificationEnabledWSResponse = {
    status: boolean; // True if digital consent verification is enabled, false otherwise.
};

/**
 * Params for WS auth_email_signup_user.
 */
type SignupUserWSParams = {
    username: string; // Username.
    password: string; // Plain text password.
    firstname: string; // The first name(s) of the user.
    lastname: string; // The family name of the user.
    email: string; // A valid and unique email address.
    city?: string; // Home city of the user.
    country?: string; // Home country code.
    recaptchachallengehash?: string; // Recaptcha challenge hash.
    recaptcharesponse?: string; // Recaptcha response.
    customprofilefields?: { // User custom fields (also known as user profile fields).
        type: string; // The type of the custom field.
        name: string; // The name of the custom field.
        value: unknown; // Custom field value, can be an encoded json if required.
    }[];
    redirect?: string; // Redirect the user to this site url after confirmation.
};

/**
 * Result of WS auth_email_signup_user.
 */
type SignupUserWSResult = {
    success: boolean; // True if the user was created false otherwise.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Result of WS core_auth_is_minor.
 */
type IsMinorWSResult = {
    status: boolean; // True if the user is considered to be a digital minor, false if not.
};
