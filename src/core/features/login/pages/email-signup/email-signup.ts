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

import { Component, ElementRef, OnInit, ChangeDetectorRef, inject, viewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { CoreText } from '@singletons/text';
import { CoreCountries, CoreCountry } from '@singletons/countries';
import { Translate } from '@singletons';
import { CoreSitePublicConfigResponse, CoreUnauthenticatedSite } from '@classes/sites/unauthenticated-site';
import { CoreUserProfileFieldDelegate } from '@features/user/services/user-profile-field-delegate';
import {
    CoreLoginSignUp,
    AuthEmailSignupProfileFieldsCategory,
    AuthEmailSignupSettings,
    CoreAuthSignupUserInfo,
} from '@features/login/services/signup';
import { CoreNavigator } from '@services/navigator';
import { CoreForms } from '@singletons/form';
import { CoreRecaptchaComponent } from '@components/recaptcha/recaptcha';
import { CorePath } from '@singletons/path';
import { CoreDom } from '@singletons/dom';
import { CoreSitesFactory } from '@services/sites-factory';
import { EMAIL_SIGNUP_FEATURE_NAME } from '@features/login/constants';
import { CoreInputErrorsMessages } from '@components/input-errors/input-errors';
import { CoreViewer } from '@features/viewer/services/viewer';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreOpener } from '@singletons/opener';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreUserProfileFieldComponent } from '@features/user/components/user-profile-field/user-profile-field';
import { CoreLoginHelper } from '@features/login/services/login-helper';

/**
 * Page to signup using email.
 */
@Component({
    selector: 'page-core-login-email-signup',
    templateUrl: 'email-signup.html',
    styleUrl: '../../login.scss',
    imports: [
        CoreSharedModule,
        CoreUserProfileFieldComponent,
    ],
})
export default class CoreLoginEmailSignupPage implements OnInit {

    // Accept A-Z in strict chars pattern to be able to differentiate it from the lowercase pattern.
    protected static readonly USERNAME_STRICT_CHARS_PATTERN = '^[A-Z-.@_a-z0-9]*$';
    protected static readonly USERNAME_LOWERCASE_PATTERN = '^[^A-Z]*$';

    readonly recaptchaComponent = viewChild(CoreRecaptchaComponent);
    readonly ageFormElement = viewChild<ElementRef>('ageForm');
    readonly signupFormElement = viewChild<ElementRef>('signupFormEl');

    signupForm: FormGroup;
    site!: CoreUnauthenticatedSite;
    displaySiteUrl = false;
    siteConfig?: CoreSitePublicConfigResponse;
    siteName?: string;
    authInstructions = '';
    settings?: AuthEmailSignupSettings;
    countries?: CoreCountry[];
    categories?: AuthEmailSignupProfileFieldsCategory[];
    settingsLoaded = false;
    allRequiredSupported = true;
    signupUrl?: string;
    formSubmitClicked = false;
    captcha = {
        recaptcharesponse: '',
    };

    // Data for age verification.
    ageVerificationForm: FormGroup;
    countryControl: FormControl<string>;
    signUpCountryControl?: FormControl<string>;
    isMinor = false; // Whether the user is minor age.
    ageDigitalConsentVerification?: boolean; // Whether the age verification is enabled.
    supportName?: string;
    supportEmail?: string;

    // Validation errors.
    usernameErrors: CoreInputErrorsMessages;
    passwordErrors: CoreInputErrorsMessages;
    emailErrors: CoreInputErrorsMessages;
    email2Errors: CoreInputErrorsMessages;
    policyErrors: CoreInputErrorsMessages;
    namefieldsErrors?: Record<string, CoreInputErrorsMessages>;

    protected fb = inject(FormBuilder);
    protected element: HTMLElement = inject(ElementRef).nativeElement;
    protected changeDetector = inject(ChangeDetectorRef);

    constructor() {
        // Create the ageVerificationForm.
        this.ageVerificationForm = this.fb.group({
            age: ['', Validators.required],
        });
        this.countryControl = this.fb.control('', { validators: Validators.required, nonNullable: true });
        this.ageVerificationForm.addControl('country', this.countryControl);

        // Create the signupForm with the basic controls. More controls will be added later.
        this.signupForm = this.fb.group({
            password: ['', Validators.required],
            email: ['', Validators.compose([Validators.required, Validators.email])],
            email2: ['', Validators.compose([Validators.required, Validators.email])],
        });

        // Setup validation errors.
        this.usernameErrors = {
            required: 'core.login.usernamerequired',
            pattern: {
                [CoreLoginEmailSignupPage.USERNAME_STRICT_CHARS_PATTERN]: 'core.login.invalidusername',
                [CoreLoginEmailSignupPage.USERNAME_LOWERCASE_PATTERN]: 'core.login.usernamelowercase',
            },
        };
        this.passwordErrors = { required: 'core.login.passwordrequired' };
        this.emailErrors = { required: 'core.login.missingemail' };
        this.policyErrors = { required: 'core.policy.policyagree' };
        this.email2Errors = {
            required: 'core.login.missingemail',
            pattern: 'core.login.emailnotmatch',
        };
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        const siteUrl = CoreNavigator.getRouteParam<string>('siteUrl');
        if (!siteUrl) {
            CoreAlerts.showError('Site URL not supplied.');
            CoreNavigator.back();

            return;
        }

        this.site = CoreSitesFactory.makeUnauthenticatedSite(siteUrl);
        this.displaySiteUrl = this.site.shouldDisplayInformativeLinks();

        // Fetch the data.
        this.fetchData().finally(() => {
            this.settingsLoaded = true;
        });
    }

    /**
     * Complete the FormGroup using the settings received from server.
     */
    protected completeFormGroup(): void {
        const checkStrictChars = this.settings?.extendedusernamechars === false;
        this.signupForm.addControl('username', this.fb.control('', Validators.compose([
            Validators.required,
            Validators.pattern(CoreLoginEmailSignupPage.USERNAME_LOWERCASE_PATTERN),
            checkStrictChars ?  Validators.pattern(CoreLoginEmailSignupPage.USERNAME_STRICT_CHARS_PATTERN) : undefined,
        ])));

        this.signupForm.addControl('city', this.fb.control(this.settings?.defaultcity || ''));
        this.signUpCountryControl = this.fb.control(this.settings?.country || '', { nonNullable: true });
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
     */
    protected async fetchData(): Promise<void> {
        try {
            // Get site config.
            this.siteConfig = await this.site.getPublicConfig();
            this.signupUrl = CorePath.concatenatePaths(this.siteConfig.httpswwwroot, 'login/signup.php');

            const configValid = await this.treatSiteConfig();
            if (configValid) {
                // Check content verification.
                if (this.ageDigitalConsentVerification === undefined) {
                    this.ageDigitalConsentVerification = await CoreLoginSignUp.isAgeVerificationEnabled(this.site.getURL());
                }

                await this.getSignupSettings();
            }

            this.completeFormGroup();
        } catch (error) {
            if (this.allRequiredSupported) {
                CoreAlerts.showError(error);
            }
        }
    }

    /**
     * Get signup settings from server.
     */
    protected async getSignupSettings(): Promise<void> {
        this.settings = await CoreLoginSignUp.getEmailSignupSettings(this.site.getURL());

        if (CoreUserProfileFieldDelegate.hasRequiredUnsupportedField(this.settings.profilefields)) {
            this.allRequiredSupported = false;

            throw new Error(Translate.instant('core.login.signuprequiredfieldnotsupported'));
        }

        this.categories = CoreLoginSignUp.formatProfileFieldsForSignup(this.settings.profilefields);

        if (this.settings.recaptchapublickey) {
            this.captcha.recaptcharesponse = ''; // Reset captcha.
        }

        if (!this.countryControl.value) {
            this.countryControl.setValue(this.settings.country || '');
        }

        const namefieldsErrors = {};
        if (this.settings.namefields) {
            this.settings.namefields.forEach((field) => {
                namefieldsErrors[field] = { required: `core.login.missing${field}` };
            });
        }
        this.namefieldsErrors = namefieldsErrors;

        this.countries = await CoreCountries.getCountryListSorted();
    }

    /**
     * Treat the site config, checking if it's valid and extracting the data we're interested in.
     *
     * @returns True if success.
     */
    protected async treatSiteConfig(): Promise<boolean> {
        if (this.siteConfig?.registerauth == 'email' && !this.site.isFeatureDisabled(EMAIL_SIGNUP_FEATURE_NAME)) {
            this.siteName = await this.site.getSiteName();

            this.authInstructions = this.siteConfig.authinstructions;
            this.ageDigitalConsentVerification = this.siteConfig.agedigitalconsentverification;
            this.supportName = this.siteConfig.supportname;
            this.supportEmail = this.siteConfig.supportemail;
            this.countryControl.setValue(this.siteConfig.country || '');

            return true;
        } else {
            CoreAlerts.showError(
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
     */
    async create(e: Event): Promise<void> {
        e.preventDefault();
        e.stopPropagation();

        this.formSubmitClicked = true;

        if (!this.signupForm.valid || (this.settings?.recaptchapublickey && !this.captcha.recaptcharesponse)) {
            // Form not valid. Mark all controls as dirty to display errors.
            for (const name in this.signupForm.controls) {
                this.signupForm.controls[name].markAsDirty();
            }
            this.changeDetector.detectChanges();

            // Scroll to the first element with errors.
            const errorFound = await CoreDom.scrollToInputError(
                this.element,
            );

            if (!errorFound) {
                // Input not found, show an error modal.
                CoreAlerts.showError(Translate.instant('core.errorinvalidform'));
            }

            return;
        }

        const modal = await CoreLoadings.show('core.sending', true);

        const userInfo: CoreAuthSignupUserInfo = {
            username: this.signupForm.value.username,
            password: this.signupForm.value.password,
            firstname: this.signupForm.value.firstname,
            lastname: this.signupForm.value.lastname,
            email: this.signupForm.value.email,
            city: this.signupForm.value.city,
            country: this.signupForm.value.country,
        };

        const redirect = this.siteConfig?.launchurl
            ? await CoreLoginHelper.prepareForSSOLogin(this.site.getURL(), undefined, this.siteConfig.launchurl)
            : undefined;

        // Get the recaptcha response (if needed).
        let recaptchaResponse: string | undefined;
        if (this.settings?.recaptchapublickey && this.captcha.recaptcharesponse) {
            recaptchaResponse = this.captcha.recaptcharesponse;
        }

        try {
            // Get the data for the custom profile fields.
            const customProfileFields = await CoreUserProfileFieldDelegate.getDataForFields(
                this.settings?.profilefields,
                true,
                'email',
                this.signupForm.value,
            );

            const result = await CoreLoginSignUp.emailSignup(userInfo, this.site.getURL(), {
                recaptchaResponse, customProfileFields, redirect,
            });

            if (result.success) {

                CoreForms.triggerFormSubmittedEvent(this.signupFormElement(), true);

                // Show alert and go back.
                const message = Translate.instant('core.login.emailconfirmsent', { $a: userInfo.email.trim() });
                CoreAlerts.show({ header: Translate.instant('core.success'), message });
                CoreNavigator.back();
            } else {
                this.recaptchaComponent()?.expireRecaptchaAnswer();

                const warning = result.warnings?.[0];
                if (warning) {
                    let error = warning.message;
                    if (error == 'incorrect-captcha-sol' || (!error && warning.item == 'recaptcharesponse')) {
                        error = Translate.instant('core.login.recaptchaincorrect');
                    }

                    CoreAlerts.showError(error);
                } else {
                    CoreAlerts.showError(Translate.instant('core.login.usernotaddederror'));
                }
            }
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('core.login.usernotaddederror') });
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
        return CoreText.escapeForRegex(text);
    }

    /**
     * Show authentication instructions.
     */
    showAuthInstructions(): void {
        CoreViewer.viewText(Translate.instant('core.login.instructions'), this.authInstructions);
    }

    /**
     * Show contact information on site (we have to display again the age verification form).
     */
    showContactOnSite(): void {
        CoreOpener.openInBrowser(
            CorePath.concatenatePaths(this.site.getURL(), '/login/verify_age_location.php'),
            { showBrowserWarning: false },
        );
    }

    /**
     * Verify Age.
     *
     * @param e Event.
     */
    async verifyAge(e: Event): Promise<void> {
        e.preventDefault();
        e.stopPropagation();

        if (!this.ageVerificationForm.valid) {
            CoreAlerts.showError(Translate.instant('core.errorinvalidform'));

            return;
        }

        const modal = await CoreLoadings.show('core.sending', true);

        try {
            const age = parseInt(this.ageVerificationForm.value.age, 10);
            const isMinor = await CoreLoginSignUp.isMinor(age, this.ageVerificationForm.value.country, this.site.getURL());

            CoreForms.triggerFormSubmittedEvent(this.ageFormElement(), true);

            if (!isMinor) {
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
            CoreAlerts.showError('There was an error verifying your age, please try again using the browser.');
        } finally {
            modal.dismiss();
        }
    }

}
