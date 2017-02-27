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
.constant('mmLoginLaunchSiteURL', 'mmLoginLaunchSiteURL') // @deprecated since version 3.2.1. Use mmLoginLaunchData instead.
.constant('mmLoginLaunchPassport', 'mmLoginLaunchPassport') // @deprecated since version 3.2.1. Use mmLoginLaunchData instead.
.constant('mmLoginLaunchData', 'mmLoginLaunchData')

/**
 * Service to provide some helper functionalities for the login component.
 *
 * @module mm.core.login
 * @ngdoc service
 * @name $mmLoginHelper
 */
.factory('$mmLoginHelper', function($q, $log, $mmConfig, mmLoginSSOCode, mmLoginSSOInAppCode, mmLoginLaunchData, $mmEvents,
            md5, $mmSite, $mmSitesManager, $mmLang, $mmUtil, $state, $mmAddonManager, $translate, mmCoreConfigConstants,
            mmCoreEventSessionExpired, mmUserProfileState, $mmCourses) {

    $log = $log.getInstance('$mmLoginHelper');

    var self = {};

    /**
     * Accept site policy.
     *
     * @module mm.core.login
     * @ngdoc method
     * @name $mmLoginHelper#acceptSitePolicy
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved if success. rejected if failure.
     */
    self.acceptSitePolicy = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.write('core_user_agree_site_policy', {}).then(function(result) {
                if (!result.status) {
                    // Error.
                    if (result.warnings && result.warnings.length) {
                        return $q.reject(result.warnings[0].message);
                    } else {
                        return $q.reject();
                    }
                }
            });
        });
    };

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
        var showConfirmation = self.shouldShowSSOConfirm(typeOfLogin),
            promise = showConfirmation ? $mmUtil.showConfirm($translate('mm.login.logininsiterequired')) : $q.when();

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
        var myCoursesDisabled = $mmCourses.isMyCoursesDisabledInSite();

        if (myCoursesDisabled || ($mmSite.getInfo() && $mmSite.getInfo().userhomepage === 0)) {
            // Configured to go to Site Home OR My Courses is disabled. Check if plugin is installed in the app.
            var $mmaFrontpage = $mmAddonManager.get('$mmaFrontpage');
            if ($mmaFrontpage && !$mmaFrontpage.isDisabledInSite()) {
                return $mmaFrontpage.isFrontpageAvailable().then(function() {
                    return $state.go('site.frontpage');
                }).catch(function() {
                    if (!myCoursesDisabled) {
                        // Site Home not available, go to My Courses.
                        return $state.go('site.mm_courses');
                    }

                    // Both Site Home and My Courses aren't available, go to the user profile.
                    return $state.go(mmUserProfileState, {userid: $mmSite.getUserId()});
                });
            }
        }

        if (!myCoursesDisabled) {
            // Site Home not available, go to My Courses.
            return $state.go('site.mm_courses');
        }

        // Both Site Home and My Courses aren't available, go to the user profile.
        return $state.go(mmUserProfileState, {userid: $mmSite.getUserId()});
    };

    /**
     * Given a site public config, check if email signup is disabled.
     *
     * @module mm.core.login
     * @ngdoc method
     * @name $mmLoginHelper#isEmailSignupDisabled
     * @param  {Object} config Site public config.
     * @return {Boolean}       True if email signup is disabled, false otherwise.
     */
    self.isEmailSignupDisabled = function(config) {
        var disabledFeatures = config && config.tool_mobile_disabledfeatures;
        if (!disabledFeatures) {
            return false;
        }

        var regEx = new RegExp('(,|^)\\$mmLoginEmailSignup(,|$)', 'g');
        return !!disabledFeatures.match(regEx);
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
     * Check if current site is logged out, triggering mmCoreEventSessionExpired if it is.
     *
     * @module mm.core.login
     * @ngdoc method
     * @name $mmLoginHelper#isSiteLoggedOut
     * @param  {String} [stateName]   Name of the state to go once authenticated if logged out. If not defined, site initial page.
     * @param  {Object} [stateParams] Params of the state to go once authenticated if logged out.
     * @return {Boolean}              True if user is logged out, false otherwise.
     */
    self.isSiteLoggedOut = function(stateName, stateParams) {
        if ($mmSite.isLoggedOut()) {
            $mmEvents.trigger(mmCoreEventSessionExpired, {
                siteid: $mmSite.getId(),
                statename: stateName,
                stateparams: stateParams
            });
            return true;
        }
        return false;
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
     * @param  {String} siteurl       URL of the site where the SSO login will be performed.
     * @param  {Number} typeOfLogin   mmLoginSSOCode or mmLoginSSOInAppCode.
     * @param  {String} [service]     The service to use. If not defined, external service will be used.
     * @param  {String} [launchUrl]   The URL to open. If not defined, local_mobile URL will be used.
     * @param  {String} [stateName]   Name of the state to go once authenticated. If not defined, site initial page.
     * @param  {Object} [stateParams] Params of the state to go once authenticated.
     * @return {Void}
     */
    self.openBrowserForSSOLogin = function(siteurl, typeOfLogin, service, launchUrl, stateName, stateParams) {
        var loginUrl = self.prepareForSSOLogin(siteurl, service, launchUrl, stateName, stateParams);

        if (self.isSSOEmbeddedBrowser(typeOfLogin)) {
            var options = {
                clearsessioncache: 'yes', // Clear the session cache to allow for multiple logins.
                closebuttoncaption: $translate.instant('mm.login.cancel'),
            };
            $mmUtil.openInApp(loginUrl, options);
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
     * @param  {String} siteUrl       URL of the site where the SSO login will be performed.
     * @param  {String} [service]     The service to use. If not defined, external service will be used.
     * @param  {String} [launchUrl]   The URL to open. If not defined, local_mobile URL will be used.
     * @param  {String} [stateName]   Name of the state to go once authenticated. If not defined, site initial page.
     * @param  {Object} [stateParams] Params of the state to go once authenticated.
     * @return {Void}
     */
    self.prepareForSSOLogin = function(siteUrl, service, launchUrl, stateName, stateParams) {
        service = service || mmCoreConfigConstants.wsextservice;
        launchUrl = launchUrl || siteUrl + '/local/mobile/launch.php';

        var passport = Math.random() * 1000,
            loginUrl = launchUrl + '?service=' + service;

        loginUrl += "&passport=" + passport;
        loginUrl += "&urlscheme=" + mmCoreConfigConstants.customurlscheme;

        // Store the siteurl and passport in $mmConfig for persistence. We are "configuring"
        // the app to wait for an SSO. $mmConfig shouldn't be used as a temporary storage.
        $mmConfig.set(mmLoginLaunchData, {
            siteurl: siteUrl,
            passport: passport,
            statename: stateName || '',
            stateparams: stateParams || {}
        });

        return loginUrl;
    };

    /**
     * Check if a confirm should be shown to open a SSO authentication.
     *
     * @module mm.core.login
     * @ngdoc method
     * @name $mmLoginHelper#shouldShowSSOConfirm
     * @param  {Number} typeOfLogin mmLoginSSOCode or mmLoginSSOInAppCode.
     * @return {Boolean}            True if confirm modal should be shown, false otherwise.
     */
    self.shouldShowSSOConfirm = function(typeOfLogin) {
        return !self.isSSOEmbeddedBrowser(typeOfLogin) &&
                    (!mmCoreConfigConstants.skipssoconfirmation || mmCoreConfigConstants.skipssoconfirmation === 'false');
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

        return $mmConfig.get(mmLoginLaunchData).then(function(data) {
            var launchSiteURL = data.siteurl,
                passport = data.passport;

            // Reset temporary values.
            $mmConfig.delete(mmLoginLaunchData);

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
                    privateToken: params[2],
                    statename: data.statename,
                    stateparams: data.stateparams
                };
            } else {
                $log.debug('Inalid signature in the URL request yours: ' + params[0] + ' mine: '
                                + signature + ' for passport ' + passport);
                return $mmLang.translateAndReject('mm.core.unexpectederror');
            }
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
