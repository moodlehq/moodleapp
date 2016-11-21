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

.constant('mmLoginSSOCode', 2) // SSO in browser window is required.
.constant('mmLoginSSOInAppCode', 3) // SSO in embedded browser is required.
.constant('mmLoginLaunchSiteURL', 'mmLoginLaunchSiteURL')
.constant('mmLoginLaunchPassport', 'mmLoginLaunchPassport')

/**
 * Service to provide some helper functionalities for the login component.
 *
 * @module mm.core.login
 * @ngdoc service
 * @name $mmLoginHelper
 */
.factory('$mmLoginHelper', function($q, $log, $mmConfig, mmLoginSSOCode, mmLoginSSOInAppCode, mmLoginLaunchSiteURL,
            mmLoginLaunchPassport, md5, $mmSite, $mmSitesManager, $mmLang, $mmUtil, $state, $mmAddonManager,
            $translate, mmCoreConfigConstants) {

    $log = $log.getInstance('$mmLoginHelper');

    var self = {};

    /**
     * Show a confirm modal if needed and open a browser to perform SSO login.
     *
     * @module mm.core.login
     * @ngdoc method
     * @name $mmLoginHelper#confirmAndOpenBrowserForSSOLogin
     * @param  {String} siteurl     URL of the site where the SSO login will be performed.
     * @param  {Number} typeOfLogin mmLoginSSOCode or mmLoginSSOInAppCode.
     * @param  {String} [service]   The service to use. If not defined, external service will be used.
     * @param  {String} [launchUrl] The URL to open. If not defined, local_mobile URL will be used.
     * @return {Void}
     */
    self.confirmAndOpenBrowserForSSOLogin = function(siteurl, typeOfLogin, service, launchUrl) {
        // Show confirm only if it's needed. Treat "false" (string) as false to prevent typing errors.
        var skipConfirmation = mmCoreConfigConstants.skipssoconfirmation && mmCoreConfigConstants.skipssoconfirmation !== 'false',
            promise = skipConfirmation ? $q.when() : $mmUtil.showConfirm($translate('mm.login.logininsiterequired'));

        promise.then(function() {
            self.openBrowserForSSOLogin(siteurl, typeOfLogin, service, launchUrl);
        });
    };

    /**
     * Format profile fields, filtering the ones that shouldn't be shown on signup and classifying them in categories.
     *
     * @module mm.core.login
     * @ngdoc method
     * @name $mmLoginHelper#formatProfileFieldsForSignup
     * @param  {Object[]} profileFields Profile fields to format.
     * @return {Object}                 Categories with the fields to show in each one.
     */
    self.formatProfileFieldsForSignup = function(profileFields) {
        var categories = {};

        angular.forEach(profileFields, function(field) {
            if (!field.signup) {
                // Not a signup field, ignore it.
                return;
            }

            if (!categories[field.categoryid]) {
                categories[field.categoryid] = {
                    id: field.categoryid,
                    name: field.categoryname,
                    fields: []
                };
            }

            categories[field.categoryid].fields.push(field);
        });

        return categories;
    };

    /**
     * Builds an object with error messages for some common errors.
     * Please notice that this function doesn't support all possible error types.
     *
     * @module mm.core.login
     * @ngdoc method
     * @name $mmLoginHelper#getErrorMessages
     * @param  {String} [requiredMsg]  Code of the string for required error.
     * @param  {String} [emailMsg]     Code of the string for invalid email error.
     * @param  {String} [patternMsg]   Code of the string for pattern not match error.
     * @param  {String} [urlMsg]       Code of the string for invalid url error.
     * @param  {String} [minlengthMsg] Code of the string for "too short" error.
     * @param  {String} [maxlengthMsg] Code of the string for "too long" error.
     * @param  {String} [minMsg]       Code of the string for min value error.
     * @param  {String} [maxMsg]       Code of the string for max value error.
     * @return {Object}                Object with the errors.
     */
    self.getErrorMessages = function(requiredMsg, emailMsg, patternMsg, urlMsg, minlengthMsg, maxlengthMsg, minMsg, maxMsg) {
        var errors = {};

        if (requiredMsg) {
            errors.required = $translate.instant(requiredMsg);
        }
        if (emailMsg) {
            errors.email = $translate.instant(emailMsg);
        }
        if (patternMsg) {
            errors.pattern = $translate.instant(patternMsg);
        }
        if (urlMsg) {
            errors.url = $translate.instant(urlMsg);
        }
        if (minlengthMsg) {
            errors.minlength = $translate.instant(minlengthMsg);
        }
        if (maxlengthMsg) {
            errors.maxlength = $translate.instant(maxlengthMsg);
        }
        if (minMsg) {
            errors.min = $translate.instant(minMsg);
        }
        if (maxMsg) {
            errors.max = $translate.instant(maxMsg);
        }

        return errors;
    };

    /**
     * Go to the view to add a new site.
     * If a fixed URL is configured, go to credentials instead.
     *
     * @module mm.core.login
     * @ngdoc method
     * @name $mmLoginHelper#goToAddSite
     * @return {Promise} Promise resolved when the state changes.
     */
    self.goToAddSite = function() {
        if (mmCoreConfigConstants.siteurl) {
            // Fixed URL is set, go to credentials page.
            return $state.go('mm_login.credentials', {siteurl: mmCoreConfigConstants.siteurl});
        } else {
            return $state.go('mm_login.site');
        }
    };

    /**
     * Go to the initial page of a site depending on 'userhomepage' setting.
     *
     * @module mm.core.login
     * @ngdoc method
     * @name $mmLoginHelper#goToSiteInitialPage
     * @return {Promise} Promise resolved when the state changes.
     */
    self.goToSiteInitialPage = function() {
        if ($mmSite.getInfo() && $mmSite.getInfo().userhomepage === 0) {
            // Configured to go to Site Home. Check if plugin is installed in the app.
            var $mmaFrontpage = $mmAddonManager.get('$mmaFrontpage');
            if ($mmaFrontpage) {
                return $mmaFrontpage.isFrontpageAvailable().then(function() {
                    return $state.go('site.mm_course-section');
                }).catch(function() {
                    return $state.go('site.mm_courses');
                });
            }
        }

        return $state.go('site.mm_courses');
    };

    /**
     * Check if the app is configured to use a fixed URL.
     *
     * @module mm.core.login
     * @ngdoc method
     * @name $mmLoginHelper#isFixedUrlSet
     * @return {Boolean} True if set, false otherwise.
     */
    self.isFixedUrlSet = function() {
        return !!mmCoreConfigConstants.siteurl;
    };

    /**
     * Check if SSO login should use an embedded browser.
     *
     * @module mm.core.login
     * @ngdoc method
     * @name $mmLoginHelper#isSSOEmbeddedBrowser
     * @param  {Number}  code Code to check.
     * @return {Boolean}      True if embedded browser, false othwerise.
     */
    self.isSSOEmbeddedBrowser = function(code) {
        return code == mmLoginSSOInAppCode;
    };

    /**
     * Check if SSO login is needed based on code returned by the WS.
     *
     * @module mm.core.login
     * @ngdoc method
     * @name $mmLoginHelper#isSSOLoginNeeded
     * @param  {Number}  code Code to check.
     * @return {Boolean}      True if SSO login is needed, false othwerise.
     */
    self.isSSOLoginNeeded = function(code) {
        return code == mmLoginSSOCode || code == mmLoginSSOInAppCode;
    };

    /**
     * Open a browser to perform SSO login.
     *
     * @module mm.core.login
     * @ngdoc method
     * @name $mmLoginHelper#openBrowserForSSOLogin
     * @param  {String} siteurl     URL of the site where the SSO login will be performed.
     * @param  {Number} typeOfLogin mmLoginSSOCode or mmLoginSSOInAppCode.
     * @param  {String} [service]   The service to use. If not defined, external service will be used.
     * @param  {String} [launchUrl] The URL to open. If not defined, local_mobile URL will be used.
     * @return {Void}
     */
    self.openBrowserForSSOLogin = function(siteurl, typeOfLogin, service, launchUrl) {
        var loginUrl = self.prepareForSSOLogin(siteurl, service, launchUrl);

        if (self.isSSOEmbeddedBrowser(typeOfLogin)) {
            $translate('mm.login.cancel').then(function(cancelStr) {
                var options = {
                    clearsessioncache: 'yes', // Clear the session cache to allow for multiple logins.
                    closebuttoncaption: cancelStr,
                };
                $mmUtil.openInApp(loginUrl, options);
            });
        } else {
            $mmUtil.openInBrowser(loginUrl);
            if (navigator.app) {
                navigator.app.exitApp();
            }
        }
    };

    /**
     * Prepare the app to perform SSO login.
     *
     * @module mm.core.login
     * @ngdoc method
     * @name $mmLoginHelper#prepareForSSOLogin
     * @param  {String} siteurl     URL of the site where the SSO login will be performed.
     * @param  {String} [service]   The service to use. If not defined, external service will be used.
     * @param  {String} [launchUrl] The URL to open. If not defined, local_mobile URL will be used.
     * @return {Void}
     */
    self.prepareForSSOLogin = function(siteurl, service, launchUrl) {
        service = service || mmCoreConfigConstants.wsextservice;
        launchUrl = launchUrl || siteurl + '/local/mobile/launch.php';

        var passport = Math.random() * 1000,
            loginUrl = launchUrl + '?service=' + service;

        loginUrl += "&passport=" + passport;
        loginUrl += "&urlscheme=" + mmCoreConfigConstants.customurlscheme;

        // Store the siteurl and passport in $mmConfig for persistence. We are "configuring"
        // the app to wait for an SSO. $mmConfig shouldn't be used as a temporary storage.
        $mmConfig.set(mmLoginLaunchSiteURL, siteurl);
        $mmConfig.set(mmLoginLaunchPassport, passport);

        return loginUrl;
    };

    /**
     * Convenient helper to validate a browser SSO login.
     *
     * @module mm.core.login
     * @ngdoc method
     * @name $mmLoginHelper#validateBrowserSSOLogin
     * @param {String} url URL received, to be validated.
     * @return {Promise}   The success contains the signature and token. The reject contains the error message.
     */
    self.validateBrowserSSOLogin = function(url) {
        // Split signature:::token
        var params = url.split(":::");

        return $mmConfig.get(mmLoginLaunchSiteURL).then(function(launchSiteURL) {
            return $mmConfig.get(mmLoginLaunchPassport).then(function(passport) {

                // Reset temporary values.
                $mmConfig.delete(mmLoginLaunchSiteURL);
                $mmConfig.delete(mmLoginLaunchPassport);

                // Validate the signature.
                // We need to check both http and https.
                var signature = md5.createHash(launchSiteURL + passport);
                if (signature != params[0]) {
                    if (launchSiteURL.indexOf("https://") != -1) {
                        launchSiteURL = launchSiteURL.replace("https://", "http://");
                    } else {
                        launchSiteURL = launchSiteURL.replace("http://", "https://");
                    }
                    signature = md5.createHash(launchSiteURL + passport);
                }

                if (signature == params[0]) {
                    $log.debug('Signature validated');
                    return {
                        siteurl: launchSiteURL,
                        token: params[1],
                        privateToken: params[2]
                    };
                } else {
                    $log.debug('Inalid signature in the URL request yours: ' + params[0] + ' mine: '
                                    + signature + ' for passport ' + passport);
                    return $mmLang.translateAndReject('mm.core.unexpectederror');
                }

            });
        });
    };

    /**
     * Convenient helper to handle authentication in the app using a token received by SSO login. If it's a new account,
     * the site is stored and the user is authenticated. If the account already exists, update its token.
     *
     * @module mm.core.login
     * @ngdoc method
     * @name $mmLoginHelper#handleSSOLoginAuthentication
     * @param  {String} siteurl        Site's URL.
     * @param  {String} token          User's token.
     * @param  {String} [privateToken] User's private token.
     * @return {Promise}               Promise resolved when the user is authenticated with the token.
     */
    self.handleSSOLoginAuthentication = function(siteurl, token, privateToken) {
        if ($mmSite.isLoggedIn()) {
            // User logged in, he is reconnecting.
            // Retrieve username.
            var info = $mmSite.getInfo();
            if (typeof info != 'undefined' && typeof info.username != 'undefined') {
                return $mmSitesManager.updateSiteToken(info.siteurl, info.username, token, privateToken).then(function() {
                    $mmSitesManager.updateSiteInfoByUrl(info.siteurl, info.username);
                }).catch(function() {
                    // Error updating token, return proper error message.
                    return $mmLang.translateAndReject('mm.login.errorupdatesite');
                });
            }
            return $mmLang.translateAndReject('mm.login.errorupdatesite');
        } else {
            return $mmSitesManager.newSite(siteurl, token, privateToken);
        }
    };

    /**
     * Convenient helper to handle get User Token error. It redirects to change password page ig forcepassword is set.
     *
     * @module mm.core.login
     * @ngdoc method
     * @name $mmLoginHelper#treatUserTokenError
     * @param {String}          siteurl  Site URL to construct change password URL.
     * @param {Object|String}   error    Error object containing errorcode and error message.
     */
    self.treatUserTokenError = function(siteurl, error) {
        if (typeof error == 'string') {
            $mmUtil.showErrorModal(error);
        } else if (error.errorcode == 'forcepasswordchangenotice') {
            self.openChangePassword(siteurl, error.error);
        } else {
            $mmUtil.showErrorModal(error.error);
        }
    };

    /**
     * Convenient helper to open change password page.
     *
     * @module mm.core.login
     * @ngdoc method
     * @name $mmLoginHelper#openChangePassword
     * @param {String}   siteurl  Site URL to construct change password URL.
     * @param {String}   error    Error message.
     */
    self.openChangePassword = function(siteurl, error) {
        return $mmUtil.showModal('mm.core.notice', error, 3000).then(function() {
            var changepasswordurl = siteurl + '/login/change_password.php';
            $mmUtil.openInApp(changepasswordurl);
        });
    };

    return self;
});
