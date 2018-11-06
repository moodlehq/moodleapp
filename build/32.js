webpackJsonp([32],{

/***/ 1876:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CoreLoginCredentialsPageModule", function() { return CoreLoginCredentialsPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__email_signup__ = __webpack_require__(2001);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__components_components_module__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__directives_directives_module__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__core_user_components_components_module__ = __webpack_require__(388);
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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};







var CoreLoginCredentialsPageModule = /** @class */ (function () {
    function CoreLoginCredentialsPageModule() {
    }
    CoreLoginCredentialsPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_2__email_signup__["a" /* CoreLoginEmailSignupPage */]
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_4__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_5__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_6__core_user_components_components_module__["a" /* CoreUserComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_2__email_signup__["a" /* CoreLoginEmailSignupPage */]),
                __WEBPACK_IMPORTED_MODULE_3__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ]
        })
    ], CoreLoginCredentialsPageModule);
    return CoreLoginCredentialsPageModule;
}());

//# sourceMappingURL=email-signup.module.js.map

/***/ }),

/***/ 2001:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return CoreLoginEmailSignupPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__providers_sites__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_utils_dom__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__providers_utils_text__ = __webpack_require__(11);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__providers_utils_utils__ = __webpack_require__(5);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__providers_ws__ = __webpack_require__(118);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8__providers_helper__ = __webpack_require__(79);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9__angular_forms__ = __webpack_require__(20);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10__core_user_providers_user_profile_field_delegate__ = __webpack_require__(119);
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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};











/**
 * Page to signup using email.
 */
var CoreLoginEmailSignupPage = /** @class */ (function () {
    function CoreLoginEmailSignupPage(navCtrl, navParams, fb, wsProvider, sitesProvider, loginHelper, domUtils, translate, utils, textUtils, userProfileFieldDelegate) {
        this.navCtrl = navCtrl;
        this.fb = fb;
        this.wsProvider = wsProvider;
        this.sitesProvider = sitesProvider;
        this.loginHelper = loginHelper;
        this.domUtils = domUtils;
        this.translate = translate;
        this.utils = utils;
        this.textUtils = textUtils;
        this.userProfileFieldDelegate = userProfileFieldDelegate;
        this.settingsLoaded = false;
        this.captcha = {
            recaptcharesponse: ''
        };
        this.isMinor = false; // Whether the user is minor age.
        this.siteUrl = navParams.get('siteUrl');
        // Create the ageVerificationForm.
        this.ageVerificationForm = this.fb.group({
            age: ['', __WEBPACK_IMPORTED_MODULE_9__angular_forms__["h" /* Validators */].required]
        });
        this.countryControl = this.fb.control('', __WEBPACK_IMPORTED_MODULE_9__angular_forms__["h" /* Validators */].required);
        this.ageVerificationForm.addControl('country', this.countryControl);
        // Create the signupForm with the basic controls. More controls will be added later.
        this.signupForm = this.fb.group({
            username: ['', __WEBPACK_IMPORTED_MODULE_9__angular_forms__["h" /* Validators */].required],
            password: ['', __WEBPACK_IMPORTED_MODULE_9__angular_forms__["h" /* Validators */].required],
            email: ['', __WEBPACK_IMPORTED_MODULE_9__angular_forms__["h" /* Validators */].compose([__WEBPACK_IMPORTED_MODULE_9__angular_forms__["h" /* Validators */].required, __WEBPACK_IMPORTED_MODULE_9__angular_forms__["h" /* Validators */].email])],
            email2: ['', __WEBPACK_IMPORTED_MODULE_9__angular_forms__["h" /* Validators */].compose([__WEBPACK_IMPORTED_MODULE_9__angular_forms__["h" /* Validators */].required, __WEBPACK_IMPORTED_MODULE_9__angular_forms__["h" /* Validators */].email])]
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
    CoreLoginEmailSignupPage.prototype.ionViewDidLoad = function () {
        var _this = this;
        // Fetch the data.
        this.fetchData().finally(function () {
            _this.settingsLoaded = true;
        });
    };
    /**
     * Complete the FormGroup using the settings received from server.
     */
    CoreLoginEmailSignupPage.prototype.completeFormGroup = function () {
        this.signupForm.addControl('city', this.fb.control(this.settings.defaultcity || ''));
        this.signupForm.addControl('country', this.fb.control(this.settings.country || ''));
        // Add the name fields.
        for (var i in this.settings.namefields) {
            this.signupForm.addControl(this.settings.namefields[i], this.fb.control('', __WEBPACK_IMPORTED_MODULE_9__angular_forms__["h" /* Validators */].required));
        }
        if (this.settings.sitepolicy) {
            this.signupForm.addControl('policyagreed', this.fb.control(false, __WEBPACK_IMPORTED_MODULE_9__angular_forms__["h" /* Validators */].requiredTrue));
        }
    };
    /**
     * Fetch the required data from the server-
     */
    CoreLoginEmailSignupPage.prototype.fetchData = function () {
        var _this = this;
        // Get site config.
        return this.sitesProvider.getSitePublicConfig(this.siteUrl).then(function (config) {
            _this.siteConfig = config;
            if (_this.treatSiteConfig(config)) {
                // Check content verification.
                if (typeof _this.ageDigitalConsentVerification == 'undefined') {
                    return _this.wsProvider.callAjax('core_auth_is_age_digital_consent_verification_enabled', {}, { siteUrl: _this.siteUrl }).then(function (result) {
                        _this.ageDigitalConsentVerification = result.status;
                    }).catch(function (e) {
                        // Capture exceptions, fail silently.
                    }).then(function () {
                        return _this.getSignupSettings();
                    });
                }
                else {
                    return _this.getSignupSettings();
                }
            }
        }).then(function () {
            _this.completeFormGroup();
        }).catch(function (err) {
            _this.domUtils.showErrorModal(err);
        });
    };
    /**
     * Get signup settings from server.
     */
    CoreLoginEmailSignupPage.prototype.getSignupSettings = function () {
        var _this = this;
        return this.wsProvider.callAjax('auth_email_get_signup_settings', {}, { siteUrl: this.siteUrl }).then(function (settings) {
            _this.settings = settings;
            _this.categories = _this.loginHelper.formatProfileFieldsForSignup(settings.profilefields);
            if (_this.settings.recaptchapublickey) {
                _this.captcha.recaptcharesponse = ''; // Reset captcha.
            }
            if (!_this.countryControl.value) {
                _this.countryControl.setValue(settings.country || '');
            }
            _this.namefieldsErrors = {};
            if (settings.namefields) {
                settings.namefields.forEach(function (field) {
                    _this.namefieldsErrors[field] = _this.loginHelper.getErrorMessages('core.login.missing' + field);
                });
            }
            return _this.utils.getCountryList().then(function (countries) {
                _this.countries = countries;
                _this.countriesKeys = Object.keys(countries);
            });
        });
    };
    /**
     * Treat the site config, checking if it's valid and extracting the data we're interested in.
     *
     * @param {any} siteConfig Site config to treat.
     * @return {boolean} True if success.
     */
    CoreLoginEmailSignupPage.prototype.treatSiteConfig = function (siteConfig) {
        if (siteConfig && siteConfig.registerauth == 'email' && !this.loginHelper.isEmailSignupDisabled(siteConfig)) {
            this.siteName = siteConfig.sitename;
            this.authInstructions = siteConfig.authinstructions;
            this.ageDigitalConsentVerification = siteConfig.agedigitalconsentverification;
            this.supportName = siteConfig.supportname;
            this.supportEmail = siteConfig.supportemail;
            this.countryControl.setValue(siteConfig.country || '');
            return true;
        }
        else {
            this.domUtils.showErrorModal(this.translate.instant('core.login.signupplugindisabled', { $a: this.translate.instant('core.login.auth_email') }));
            this.navCtrl.pop();
            return false;
        }
    };
    /**
     * Pull to refresh.
     *
     * @param {any} refresher Refresher.
     */
    CoreLoginEmailSignupPage.prototype.refreshSettings = function (refresher) {
        this.fetchData().finally(function () {
            refresher.complete();
        });
    };
    /**
     * Create account.
     */
    CoreLoginEmailSignupPage.prototype.create = function () {
        var _this = this;
        if (!this.signupForm.valid || (this.settings.recaptchapublickey && !this.captcha.recaptcharesponse)) {
            // Form not valid. Scroll to the first element with errors.
            if (!this.domUtils.scrollToInputError(this.content)) {
                // Input not found, show an error modal.
                this.domUtils.showErrorModal('core.errorinvalidform', true);
            }
        }
        else {
            var params_1 = {
                username: this.signupForm.value.username.trim().toLowerCase(),
                password: this.signupForm.value.password,
                firstname: this.textUtils.cleanTags(this.signupForm.value.firstname),
                lastname: this.textUtils.cleanTags(this.signupForm.value.lastname),
                email: this.signupForm.value.email.trim(),
                city: this.textUtils.cleanTags(this.signupForm.value.city),
                country: this.signupForm.value.country
            }, modal_1 = this.domUtils.showModalLoading('core.sending', true);
            if (this.siteConfig.launchurl) {
                var service = this.sitesProvider.determineService(this.siteUrl);
                params_1.redirect = this.loginHelper.prepareForSSOLogin(this.siteUrl, service, this.siteConfig.launchurl);
            }
            // Get the recaptcha response (if needed).
            if (this.settings.recaptchapublickey && this.captcha.recaptcharesponse) {
                params_1.recaptcharesponse = this.captcha.recaptcharesponse;
            }
            // Get the data for the custom profile fields.
            this.userProfileFieldDelegate.getDataForFields(this.settings.profilefields, true, 'email', this.signupForm.value).then(function (fieldsData) {
                params_1.customprofilefields = fieldsData;
                _this.wsProvider.callAjax('auth_email_signup_user', params_1, { siteUrl: _this.siteUrl }).then(function (result) {
                    if (result.success) {
                        // Show alert and ho back.
                        var message = _this.translate.instant('core.login.emailconfirmsent', { $a: params_1.email });
                        _this.domUtils.showAlert(_this.translate.instant('core.success'), message);
                        _this.navCtrl.pop();
                    }
                    else {
                        if (result.warnings && result.warnings.length) {
                            var error = result.warnings[0].message;
                            if (error == 'incorrect-captcha-sol') {
                                error = _this.translate.instant('core.login.recaptchaincorrect');
                            }
                            _this.domUtils.showErrorModal(error);
                        }
                        else {
                            _this.domUtils.showErrorModal('core.login.usernotaddederror', true);
                        }
                    }
                });
            }).catch(function (error) {
                _this.domUtils.showErrorModalDefault(error && error.error, 'core.login.usernotaddederror', true);
            }).finally(function () {
                modal_1.dismiss();
            });
        }
    };
    /**
     * Escape mail to avoid special characters to be treated as a RegExp.
     *
     * @param  {string} text Initial mail.
     * @return {string}      Escaped mail.
     */
    CoreLoginEmailSignupPage.prototype.escapeMail = function (text) {
        return this.textUtils.escapeForRegex(text);
    };
    /**
     * Show authentication instructions.
     */
    CoreLoginEmailSignupPage.prototype.showAuthInstructions = function () {
        this.textUtils.expandText(this.translate.instant('core.login.instructions'), this.authInstructions);
    };
    /**
     * Show contact information on site (we have to display again the age verification form).
     */
    CoreLoginEmailSignupPage.prototype.showContactOnSite = function () {
        this.utils.openInBrowser(this.siteUrl + '/login/verify_age_location.php');
    };
    /**
     * Verify Age.
     */
    CoreLoginEmailSignupPage.prototype.verifyAge = function () {
        var _this = this;
        if (!this.ageVerificationForm.valid) {
            this.domUtils.showErrorModal('core.errorinvalidform', true);
            return;
        }
        var modal = this.domUtils.showModalLoading('core.sending', true), params = this.ageVerificationForm.value;
        params.age = parseInt(params.age, 10); // Use just the integer part.
        this.wsProvider.callAjax('core_auth_is_minor', params, { siteUrl: this.siteUrl }).then(function (result) {
            if (!result.status) {
                // Not a minor, go ahead!
                _this.ageDigitalConsentVerification = false;
            }
            else {
                // Is a minor!!
                _this.isMinor = true;
            }
        }).catch(function () {
            // Something wrong, redirect to the site.
            _this.domUtils.showErrorModal('There was an error verifying your age, please try again using the browser.');
        }).finally(function () {
            modal.dismiss();
        });
    };
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_9" /* ViewChild */])(__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["f" /* Content */]),
        __metadata("design:type", __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["f" /* Content */])
    ], CoreLoginEmailSignupPage.prototype, "content", void 0);
    CoreLoginEmailSignupPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-core-login-email-signup',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/core/login/pages/email-signup/email-signup.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title>{{ \'core.login.newaccount\' | translate }}</ion-title>\n\n        <ion-buttons end>\n            <button ion-button icon-only *ngIf="authInstructions" (click)="showAuthInstructions()" [attr.aria-label]="\'core.login.instructions\' | translate">\n                <ion-icon name="help-circle"></ion-icon>\n            </button>\n        </ion-buttons>\n    </ion-navbar>\n</ion-header>\n<ion-content>\n    <ion-refresher [enabled]="settingsLoaded && !isMinor" (ionRefresh)="refreshSettings($event)">\n        <ion-refresher-content pullingText="{{ \'core.pulltorefresh\' | translate }}"></ion-refresher-content>\n    </ion-refresher>\n\n    <core-loading [hideUntil]="settingsLoaded" *ngIf="!isMinor">\n\n        <!-- Age verification. -->\n        <form ion-list *ngIf="settingsLoaded && settings && ageDigitalConsentVerification" [formGroup]="ageVerificationForm" (ngSubmit)="verifyAge()">\n            <ion-item-divider color="light" text-wrap>\n                <p class="item-heading">{{ \'core.agelocationverification\' | translate }}</p>\n            </ion-item-divider>\n\n            <ion-item text-wrap>\n                <ion-label stacked core-mark-required="true">{{ \'core.whatisyourage\' | translate }}</ion-label>\n                <ion-input type="number" name="age" placeholder="0" formControlName="age" autocapitalize="none" autocorrect="off"></ion-input>\n            </ion-item>\n\n            <ion-item text-wrap>\n                <ion-label stacked core-mark-required="true">{{ \'core.wheredoyoulive\' | translate }}</ion-label>\n                <ion-select name="country" formControlName="country">\n                    <ion-option value="">{{ \'core.login.selectacountry\' | translate }}</ion-option>\n                    <ion-option *ngFor="let key of countriesKeys" [value]="key">{{countries[key]}}</ion-option>\n                </ion-select>\n            </ion-item>\n\n            <!-- Submit button. -->\n            <ion-item padding>\n                <button ion-button block type="submit" [disabled]="!ageVerificationForm.valid">{{ \'core.proceed\' | translate }}</button>\n            </ion-item>\n\n            <ion-item text-wrap>\n                <p class="item-heading">{{ \'core.whyisthisrequired\' | translate }}</p>\n                <p>{{ \'core.explanationdigitalminor\' | translate }}</p>\n            </ion-item>\n        </form>\n\n        <!-- Signup form. -->\n        <form ion-list *ngIf="settingsLoaded && settings && !ageDigitalConsentVerification" [formGroup]="signupForm" (ngSubmit)="create()">\n            <ion-item text-wrap text-center>\n                <!-- If no sitename show big siteurl. -->\n                <p *ngIf="!siteName" padding class="item-heading">{{siteUrl}}</p>\n                <!-- If sitename, show big sitename and small siteurl. -->\n                <p *ngIf="siteName" padding class="item-heading"><core-format-text [text]="siteName"></core-format-text></p>\n                <p *ngIf="siteName">{{siteUrl}}</p>\n            </ion-item>\n\n            <!-- Username and password. -->\n            <ion-item-divider text-wrap color="light">\n                {{ \'core.login.createuserandpass\' | translate }}\n            </ion-item-divider>\n            <ion-item text-wrap>\n                <ion-label stacked core-mark-required="true">{{ \'core.login.username\' | translate }}</ion-label>\n                <ion-input type="text" name="username" placeholder="{{ \'core.login.username\' | translate }}" formControlName="username" autocapitalize="none" autocorrect="off"></ion-input>\n                <core-input-errors item-content [control]="signupForm.controls.username" [errorMessages]="usernameErrors"></core-input-errors>\n            </ion-item>\n            <ion-item text-wrap>\n                <ion-label stacked core-mark-required="true">{{ \'core.login.password\' | translate }}</ion-label>\n                <core-show-password item-content [name]="\'password\'">\n                    <ion-input type="password" name="password" placeholder="{{ \'core.login.password\' | translate }}" formControlName="password" [clearOnEdit]="false"></ion-input>\n                </core-show-password>\n                <p *ngIf="settings.passwordpolicy" item-content class="core-input-footnote">\n                    {{settings.passwordpolicy}}\n                </p>\n                <core-input-errors item-content [control]="signupForm.controls.password" [errorMessages]="passwordErrors"></core-input-errors>\n            </ion-item>\n\n            <!-- More details. -->\n            <ion-item-divider text-wrap color="light">\n                {{ \'core.login.supplyinfo\' | translate }}\n            </ion-item-divider>\n            <ion-item text-wrap>\n                <ion-label stacked core-mark-required="true">{{ \'core.user.email\' | translate }}</ion-label>\n                <ion-input type="email" name="email" placeholder="{{ \'core.user.email\' | translate }}" formControlName="email" autocapitalize="none" autocorrect="off"></ion-input>\n                <core-input-errors item-content [control]="signupForm.controls.email" [errorMessages]="emailErrors"></core-input-errors>\n            </ion-item>\n            <ion-item text-wrap>\n                <ion-label stacked core-mark-required="true">{{ \'core.user.emailagain\' | translate }}</ion-label>\n                <ion-input type="email" name="email2" placeholder="{{ \'core.user.emailagain\' | translate }}" formControlName="email2" autocapitalize="none" autocorrect="off" [pattern]="escapeMail(signupForm.controls.email.value)"></ion-input>\n                <core-input-errors item-content [control]="signupForm.controls.email2" [errorMessages]="email2Errors"></core-input-errors>\n            </ion-item>\n            <ion-item *ngFor="let nameField of settings.namefields" text-wrap>\n                <ion-label stacked core-mark-required="true">{{ \'core.user.\' + nameField | translate }}</ion-label>\n                <ion-input type="text" name="nameField" placeholder="{{ \'core.user.\' + nameField | translate }}" formControlName="{{nameField}}" autocorrect="off"></ion-input>\n                <core-input-errors item-content [control]="signupForm.controls[nameField]" [errorMessages]="namefieldsErrors[nameField]"></core-input-errors>\n            </ion-item>\n            <ion-item text-wrap>\n                <ion-label stacked>{{ \'core.user.city\' | translate }}</ion-label>\n                <ion-input type="text" name="city" placeholder="{{ \'core.user.city\' | translate }}" formControlName="city" autocorrect="off"></ion-input>\n            </ion-item>\n            <ion-item text-wrap>\n                <ion-label stacked id="core-login-signup-country">{{ \'core.user.country\' | translate }}</ion-label>\n                <ion-select name="country" formControlName="country" aria-labelledby="core-login-signup-country">\n                    <ion-option value="">{{ \'core.login.selectacountry\' | translate }}</ion-option>\n                    <ion-option *ngFor="let key of countriesKeys" [value]="key">{{countries[key]}}</ion-option>\n                </ion-select>\n            </ion-item>\n\n            <!-- Other categories. -->\n            <ng-container *ngFor="let category of categories">\n                <ion-item-divider text-wrap color="light">{{ category.name }}</ion-item-divider>\n                <core-user-profile-field *ngFor="let field of category.fields" [field]="field" edit="true" signup="true" registerAuth="email" [form]="signupForm"></core-user-profile-field>\n            </ng-container>\n\n            <!-- ReCAPTCHA -->\n            <ng-container *ngIf="settings.recaptchapublickey">\n                <ion-item-divider text-wrap color="light">{{ \'core.login.security_question\' | translate }}</ion-item-divider>\n                <ion-item text-wrap>\n                    <core-recaptcha [publicKey]="settings.recaptchapublickey" [model]="captcha" [siteUrl]="siteUrl"></core-recaptcha>\n                </ion-item>\n            </ng-container>\n\n            <!-- Site policy (if any). -->\n            <ng-container *ngIf="settings.sitepolicy">\n                <ion-item-divider text-wrap color="light">{{ \'core.login.policyagreement\' | translate }}</ion-item-divider>\n                <ion-item text-wrap>\n                    <p><a [href]="settings.sitepolicy" core-link capture="false">{{ \'core.login.policyagreementclick\' | translate }}</a></p>\n                </ion-item>\n                <ion-item text-wrap>\n                    <ion-label>\n                        <span [core-mark-required]="true">{{ \'core.login.policyaccept\' | translate }}</span>\n                        <core-input-errors [control]="signupForm.controls.policyagreed" [errorMessages]="policyErrors"></core-input-errors>\n                    </ion-label>\n                    <ion-checkbox item-end name="policyagreed" formControlName="policyagreed"></ion-checkbox>\n                </ion-item>\n            </ng-container>\n\n            <!-- Submit button. -->\n            <ion-item padding>\n                <button ion-button block color="primary" type="submit">{{ \'core.login.createaccount\' | translate }}</button>\n            </ion-item>\n        </form>\n    </core-loading>\n\n    <ion-list *ngIf="isMinor">\n        <ion-item-divider color="light" text-wrap>\n            <p *ngIf="siteName" class="item-heading padding"><core-format-text [text]="siteName"></core-format-text></p>\n        </ion-item-divider>\n        <ion-item text-wrap>\n            <p class="item-heading">{{ \'core.considereddigitalminor\' | translate }}</p>\n            <p>{{ \'core.digitalminor_desc\' | translate }}</p>\n            <p *ngIf="supportName">{{ supportName }}</p>\n            <p *ngIf="supportEmail">{{ supportEmail }}</p>\n            <div padding *ngIf="!supportName && !supportEmail">\n                <button ion-button block (click)="showContactOnSite()">\n                    {{ \'core.openinbrowser\' | translate }}\n                </button>\n            </div>\n        </ion-item>\n    </ion-list>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/core/login/pages/email-signup/email-signup.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["r" /* NavController */], __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["s" /* NavParams */], __WEBPACK_IMPORTED_MODULE_9__angular_forms__["a" /* FormBuilder */], __WEBPACK_IMPORTED_MODULE_7__providers_ws__["a" /* CoreWSProvider */],
            __WEBPACK_IMPORTED_MODULE_3__providers_sites__["a" /* CoreSitesProvider */], __WEBPACK_IMPORTED_MODULE_8__providers_helper__["a" /* CoreLoginHelperProvider */],
            __WEBPACK_IMPORTED_MODULE_4__providers_utils_dom__["a" /* CoreDomUtilsProvider */], __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["c" /* TranslateService */], __WEBPACK_IMPORTED_MODULE_6__providers_utils_utils__["a" /* CoreUtilsProvider */],
            __WEBPACK_IMPORTED_MODULE_5__providers_utils_text__["a" /* CoreTextUtilsProvider */], __WEBPACK_IMPORTED_MODULE_10__core_user_providers_user_profile_field_delegate__["a" /* CoreUserProfileFieldDelegate */]])
    ], CoreLoginEmailSignupPage);
    return CoreLoginEmailSignupPage;
}());

//# sourceMappingURL=email-signup.js.map

/***/ })

});
//# sourceMappingURL=32.js.map