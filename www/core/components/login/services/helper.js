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

.constant('mmLoginSSOCode', 2) // This code is returned by local_mobile Moodle plugin if SSO in browser is required.
.constant('mmLoginLaunchSiteURL', 'mmLoginLaunchSiteURL')
.constant('mmLoginLaunchPassport', 'mmLoginLaunchPassport')

/**
 * Service to provide some helper functionalities for the login component.
 *
 * @module mm.core.login
 * @ngdoc service
 * @name $mmLoginHelper
 */
.factory('$mmLoginHelper', function($q, $log, $mmConfig, mmLoginSSOCode, mmLoginLaunchSiteURL, mmLoginLaunchPassport,
            md5, $mmSite, $mmSitesManager, $mmLang, $mmUtil, $state, mmCoreConfigConstants) {

    $log = $log.getInstance('$mmLoginHelper');

    var self = {};

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
     * Check if the app is configured to use a fixed URL.
     *
     * @module mm.core.login
     * @ngdoc method
     * @name $mmLoginHelper#isFixedUrlSet
     * @return {Boolean} True if set, false otherwise.
     */
    self.isFixedUrlSet = function() {
        return typeof mmCoreConfigConstants.siteurl != 'undefined';
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
        return code == mmLoginSSOCode;
    };

    /**
     * Open a browser to perform SSO login.
     *
     * @module mm.core.login
     * @ngdoc method
     * @name $mmLoginHelper#openBrowserForSSOLogin
     * @param {String} siteurl URL of the site where the SSO login will be performed.
     */
    self.openBrowserForSSOLogin = function(siteurl) {
        var passport = Math.random() * 1000;
        var loginurl = siteurl + "/local/mobile/launch.php?service=" + mmCoreConfigConstants.wsextservice;
        loginurl += "&passport=" + passport;

        // Store the siteurl and passport in $mmConfig for persistence. We are "configuring"
        // the app to wait for an SSO. $mmConfig shouldn't be used as a temporary storage.
        $mmConfig.set(mmLoginLaunchSiteURL, siteurl);
        $mmConfig.set(mmLoginLaunchPassport, passport);

        $mmUtil.openInBrowser(loginurl);
        if (navigator.app) {
            navigator.app.exitApp();
        }
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
                    return { siteurl: launchSiteURL, token: params[1] };
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
     * @param {String} siteurl Site's URL.
     * @param {String} token   User's token.
     * @return {Promise}       Promise resolved when the user is authenticated with the token. Reject returns an error message.
     */
    self.handleSSOLoginAuthentication = function(siteurl, token) {
        if ($mmSite.isLoggedIn()) {
            // User logged in, he is reconnecting.
            var deferred = $q.defer();

            // Retrieve username.
            var info = $mmSite.getInfo();
            if (typeof(info) !== 'undefined' && typeof(info.username) !== 'undefined') {
                $mmSitesManager.updateSiteToken(info.siteurl, info.username, token).then(function() {
                    $mmSitesManager.updateSiteInfoByUrl(info.siteurl, info.username).finally(deferred.resolve);
                }, function() {
                    // Error updating token, return proper error message.
                    $mmLang.translateAndRejectDeferred(deferred, 'mm.login.errorupdatesite');
                });
            } else {
                $mmLang.translateAndRejectDeferred(deferred, 'mm.login.errorupdatesite');
            }
            return deferred.promise;
        } else {
            return $mmSitesManager.newSite(siteurl, token);
        }
    };

    return self;
});
