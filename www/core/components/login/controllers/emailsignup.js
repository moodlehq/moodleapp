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

angular.module('mm.core.login')

/**
 * Controller to handle email signup.
 *
 * @module mm.core.login
 * @ngdoc controller
 * @name mmLoginEmailSignupCtrl
 */
.controller('mmLoginEmailSignupCtrl', function($scope, $stateParams, $mmUtil, $ionicHistory, $mmLoginHelper, $mmWS, $q, $translate,
            $ionicModal, $ionicScrollDelegate, $mmUserProfileFieldsDelegate, $mmSitesManager, $mmText) {

    var siteConfig,
        modalInitialized = false,
        scrollView = $ionicScrollDelegate.$getByHandle('mmLoginEmailSignupScroll'),
        recaptchaV1Enabled = false;

    $scope.siteurl = $stateParams.siteurl;
    $scope.data = {};
    $scope.verifyAgeData = {};
    $scope.isMinor = false;
    $scope.escapeForRegex = $mmText.escapeForRegex;

    // Setup validation errors.
    $scope.usernameErrors = $mmLoginHelper.getErrorMessages('mm.login.usernamerequired');
    $scope.passwordErrors = $mmLoginHelper.getErrorMessages('mm.login.passwordrequired');
    $scope.emailErrors = $mmLoginHelper.getErrorMessages('mm.login.missingemail');
    $scope.email2Errors = $mmLoginHelper.getErrorMessages('mm.login.missingemail', null, 'mm.login.emailnotmatch');
    $scope.policyErrors = $mmLoginHelper.getErrorMessages('mm.login.policyagree');

    function fetchData() {
        // Get site config.
        return $mmSitesManager.getSitePublicConfig($scope.siteurl).then(function(config) {
            siteConfig = config;

            if (treatSiteConfig(siteConfig)) {
                // Check content verification.
                if (typeof $scope.ageDigitalConsentVerification === 'undefined') {
                    return $mmWS.callAjax('core_auth_is_age_digital_consent_verification_enabled',
                            {}, {siteurl: $scope.siteurl }).then(function(ageDigitalConsentVerification) {

                        $scope.ageDigitalConsentVerification = ageDigitalConsentVerification.status;
                    }).catch(function(e) {
                        // Capture exceptions, fail silently.
                    }).finally(function() {
                        return getSignupSettings();
                    });
                } else {
                    return getSignupSettings();
                }
            }
        }).catch(function(err) {
            $mmUtil.showErrorModal(err);
            return $q.reject();
        });
    }

    // Treat the site's config, setting scope variables.
    function treatSiteConfig(siteConfig) {
        if (siteConfig && siteConfig.registerauth == 'email' && !$mmLoginHelper.isEmailSignupDisabled(siteConfig)) {
            $scope.sitename = siteConfig.sitename;
            $scope.authInstructions = siteConfig.authinstructions;
            $scope.ageDigitalConsentVerification = siteConfig.agedigitalconsentverification;
            $scope.supportName = siteConfig.supportname;
            $scope.supportEmail = siteConfig.supportemail;
            $scope.verifyAgeData.country = siteConfig.country;
            initAuthInstructionsModal();
            return true;
        } else {
            $mmUtil.showErrorModal($translate.instant('mm.login.signupplugindisabled',
                    {$a: $translate.instant('mm.login.auth_email')}));
            $ionicHistory.goBack();
            return false;
        }
    }

    // Get signup settings from server.
    function getSignupSettings() {
        return $mmWS.callAjax('auth_email_get_signup_settings', {}, {siteurl: $scope.siteurl}).then(function(settings) {
            $scope.settings = settings;
            $scope.countries = $mmUtil.getCountryList();
            $scope.categories = $mmLoginHelper.formatProfileFieldsForSignup(settings.profilefields);
            recaptchaV1Enabled = !!(settings.recaptchapublickey && settings.recaptchachallengehash &&
                    settings.recaptchachallengeimage);

            if (settings.defaultcity && !$scope.data.city) {
                $scope.data.city = settings.defaultcity;
            }
            if (settings.country && !$scope.data.country) {
                $scope.data.country = settings.country;
            }

            if (recaptchaV1Enabled) {
                $scope.data.recaptcharesponse = ''; // Reset captcha.
            }

            if (!$scope.verifyAgeData.country) {
                $scope.verifyAgeData.country = $scope.data.country;
            }

            $scope.namefieldsErrors = {};
            angular.forEach(settings.namefields, function(field) {
                $scope.namefieldsErrors[field] = $mmLoginHelper.getErrorMessages('mm.login.missing' + field);
            });
        });
    }

    // Init auth instructions modal.
    function initAuthInstructionsModal() {
        if ($scope.authInstructions && !modalInitialized) {
            $ionicModal.fromTemplateUrl('core/components/login/templates/authinstructions-modal.html', {
                scope: $scope,
                animation: 'slide-in-up'
            }).then(function(modal) {
                modalInitialized = true;

                $scope.showAuthInstructions = function() {
                    modal.show();
                };
                $scope.closeAuthInstructions = function() {
                    modal.hide();
                };
                $scope.$on('$destroy', function() {
                    modal.remove();
                });
            });
        }
    }

    fetchData().finally(function() {
        $scope.settingsLoaded = true;
    });

    // Pull to refresh.
    $scope.refreshSettings = function() {
        fetchData().finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    // Request another captcha (V1).
    $scope.requestCaptchaV1 = function(ignoreError) {
        var modal = $mmUtil.showModalLoading();
        getSignupSettings().catch(function(err) {
            if (!ignoreError && err) {
                $mmUtil.showErrorModal(err);
            }
            return $q.reject();
        }).finally(function() {
            modal.dismiss();
        });
    };

    // Create account.
    $scope.create = function(signupForm) {
        if (!signupForm.$valid) {
            // Form not valid. Scroll to the first element with errors.
            return $mmUtil.scrollToInputError(document, scrollView).then(function(found) {
                if (!found) {
                    // Input not found, show an error modal.
                    $mmUtil.showErrorModal('mm.core.errorinvalidform', true);
                }
            });
        } else {
            var fields = $scope.settings.profilefields,
                params = {
                    username: $scope.data.username.trim().toLowerCase(),
                    password: $scope.data.password,
                    firstname: $mmText.cleanTags($scope.data.firstname),
                    lastname: $mmText.cleanTags($scope.data.lastname),
                    email: $scope.data.email.trim(),
                    city: $mmText.cleanTags($scope.data.city),
                    country: $scope.data.country
                },
                modal = $mmUtil.showModalLoading('mm.core.sending', true);

            if (siteConfig.launchurl) {
                var service = $mmSitesManager.determineService($scope.siteurl);
                params.redirect = $mmLoginHelper.prepareForSSOLogin($scope.siteurl, service, siteConfig.launchurl);
            }

            // Get the recaptcha response (if needed).
            if ($scope.data.recaptcharesponse) {
                params.recaptcharesponse = $scope.data.recaptcharesponse;
            }
            if ($scope.settings.recaptchachallengehash) {
                params.recaptchachallengehash = $scope.settings.recaptchachallengehash;
            }

            // Get the data for the custom profile fields.
            $mmUserProfileFieldsDelegate.getDataForFields(fields, true, 'email', $scope.data).then(function(fieldsData) {
                params.customprofilefields = fieldsData;

                return $mmWS.callAjax('auth_email_signup_user', params, {siteurl: $scope.siteurl}).then(function(result) {
                    if (result.success) {
                        var message = $translate.instant('mm.login.emailconfirmsent', {$a: $scope.data.email});
                        $mmUtil.showModal('mm.core.success', message);
                        $ionicHistory.goBack();
                    } else {
                        if (result.warnings && result.warnings.length) {
                            var error = result.warnings[0].message;
                            if (error == 'incorrect-captcha-sol') {
                                error = $translate.instant('mm.login.recaptchaincorrect');
                            }

                            $mmUtil.showErrorModal(error);
                        } else {
                            $mmUtil.showErrorModal('mm.login.usernotaddederror', true);
                        }

                        if (recaptchaV1Enabled) {
                            // Error sending, request another capctha since the current one is probably invalid now.
                            $scope.requestCaptchaV1(true);
                        } else {
                            // Reset captcha (if present).
                            $scope.$broadcast('mmCore:ResetRecaptchaV2');
                        }
                    }
                });
            }).catch(function(error) {
                $mmUtil.showErrorModalDefault(error && error.error, 'mm.login.usernotaddederror', true);

                if (recaptchaV1Enabled) {
                    // Error sending, request another capctha since the current one is probably invalid now.
                    $scope.requestCaptchaV1(true);
                } else {
                    // Reset captcha V2 (if present).
                    $scope.$broadcast('mmCore:ResetRecaptchaV2');
                }
            }).finally(function() {
                modal.dismiss();
            });
        }
    };

    // Verify Age.
    $scope.verifyAge = function(verifyAgeForm) {
        if (verifyAgeForm.$valid) {
            var modal = $mmUtil.showModalLoading();
            params = {
                age: parseInt($scope.verifyAgeData.age),    // Use just the integer part.
                country: $scope.verifyAgeData.country
            };
            $mmWS.callAjax('core_auth_is_minor', params, {siteurl: $scope.siteurl}).then(function(result) {
                if (!result.status) {
                    // Not a minor, go ahead!
                    $scope.ageDigitalConsentVerification = false;
                } else {
                    // Is a minor!!
                    $scope.isMinor = true;
                }
            }).catch(function() {
                // Something wrong, redirect to the site.
                $mmUtil.showErrorModal('There was an error verifying your age, please try again using the browser.');
            }).finally(function() {
                modal.dismiss();
            });
        }
    };

    // Show contact information on site (we have to display again the age verification form).
    $scope.showContactOnSite = function() {
        $mmUtil.openInBrowser($scope.siteurl + '/login/verify_age_location.php');
    };
});
