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

import { Injectable } from '@angular/core';
import { NavController, Platform } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '../../../providers/app';
import { CoreConfigProvider } from '../../../providers/config';
import { CoreEventsProvider } from '../../../providers/events';
import { CoreInitDelegate } from '../../../providers/init';
import { CoreLoggerProvider } from '../../../providers/logger';
import { CoreSitesProvider } from '../../../providers/sites';
import { CoreWSProvider } from '../../../providers/ws';
import { CoreDomUtilsProvider } from '../../../providers/utils/dom';
import { CoreTextUtilsProvider } from '../../../providers/utils/text';
import { CoreUrlUtilsProvider } from '../../../providers/utils/url';
import { CoreUtilsProvider } from '../../../providers/utils/utils';
import { CoreConfigConstants } from '../../../configconstants';
import { CoreConstants } from '../../constants';
import { CoreEmulatorHelperProvider } from '../../emulator/providers/helper';
import { Md5 } from 'ts-md5/dist/md5';

export interface CoreLoginSSOData {
    siteUrl?: string;
    token?: string;
    privateToken?: string;
    pageName?: string;
    pageParams?: any
};

/**
 * Emulates the Cordova Zip plugin in desktop apps and in browser.
 */
@Injectable()
export class CoreLoginHelperProvider {
    protected logger;
    protected isSSOConfirmShown = false;
    protected isOpenEditAlertShown = false;
    protected navCtrl: NavController;
    lastInAppUrl: string;
    waitingForBrowser = false;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private domUtils: CoreDomUtilsProvider,
            private wsProvider: CoreWSProvider, private translate: TranslateService, private textUtils: CoreTextUtilsProvider,
            private eventsProvider: CoreEventsProvider, private appProvider: CoreAppProvider, private utils: CoreUtilsProvider,
            private urlUtils: CoreUrlUtilsProvider,private configProvider: CoreConfigProvider, private platform: Platform,
            private emulatorHelper: CoreEmulatorHelperProvider, private initDelegate: CoreInitDelegate) {
        this.logger = logger.getInstance('CoreLoginHelper');
    }

    /**
     * Accept site policy.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved if success, rejected if failure.
     */
    acceptSitePolicy(siteId?: string) : Promise<void> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.write('core_user_agree_site_policy', {}).then((result) => {
                if (!result.status) {
                    // Error.
                    if (result.warnings && result.warnings.length) {
                        // Check if there is a warning 'alreadyagreed'.
                        for (let i in result.warnings) {
                            let warning = result.warnings[i];
                            if (warning.warningcode == 'alreadyagreed') {
                                // Policy already agreed, treat it as a success.
                                return;
                            }
                        }

                        // Another warning, reject.
                        return Promise.reject(result.warnings[0]);
                    } else {
                        return Promise.reject(null);
                    }
                }
            });
        });
    }

    /**
     * Function to handle URL received by Custom URL Scheme. If it's a SSO login, perform authentication.
     *
     * @param {string} url URL received.
     * @return {boolean} True if it's a SSO URL, false otherwise.
     */
    appLaunchedByURL(url: string) : boolean {
        let ssoScheme = CoreConfigConstants.customurlscheme + '://token=';
        if (url.indexOf(ssoScheme) == -1) {
            return false;
        }

        if (this.appProvider.isSSOAuthenticationOngoing()) {
            // Authentication ongoing, probably duplicated request.
            return true;
        }
        if (this.appProvider.isDesktop()) {
            // In desktop, make sure InAppBrowser is closed.
            this.utils.closeInAppBrowser(true);
        }

        // App opened using custom URL scheme. Probably an SSO authentication.
        this.appProvider.startSSOAuthentication();
        this.logger.debug('App launched by URL');

        // Delete the sso scheme from the URL.
        url = url.replace(ssoScheme, '');

        // Some platforms like Windows add a slash at the end. Remove it.
        // Some sites add a # at the end of the URL. If it's there, remove it.
        url = url.replace(/\/?#?\/?$/, '');

        // Decode from base64.
        try {
            url = atob(url);
        } catch(err) {
            // Error decoding the parameter.
            this.logger.error('Error decoding parameter received for login SSO');
            return false;
        }

        let modal = this.domUtils.showModalLoading('mm.login.authenticating', true),
            siteData: CoreLoginSSOData;

        // Wait for app to be ready.
        this.initDelegate.ready().then(() => {
            return this.validateBrowserSSOLogin(url);
        }).then((data) => {
            siteData = data;
            return this.handleSSOLoginAuthentication(siteData.siteUrl, siteData.token, siteData.privateToken);
        }).then(() => {
            if (siteData.pageName) {
                // State defined, go to that state instead of site initial page.
                this.navCtrl.push(siteData.pageName, siteData.pageParams);
            } else {
                this.goToSiteInitialPage(this.navCtrl, true);
            }
        }).catch((errorMessage) => {
            if (typeof errorMessage == 'string' && errorMessage != '') {
                this.domUtils.showErrorModal(errorMessage);
            }
        }).finally(() => {
            modal.dismiss();
            this.appProvider.finishSSOAuthentication();
        });

        return true;
    }

    /**
     * Check if a site allows requesting a password reset through the app.
     *
     * @param {string} siteUrl URL of the site.
     * @return {Promise<any>} Promise resolved with boolean: whether can be done through the app.
     */
    canRequestPasswordReset(siteUrl: string) : Promise<any> {
        return this.requestPasswordReset(siteUrl).then(() => {
            return true;
        }).catch((error) => {
            return error.available == 1 || error.errorcode != 'invalidrecord';
        });
    }

    /**
     * Function called when an SSO InAppBrowser is closed or the app is resumed. Check if user needs to be logged out.
     */
    checkLogout() {
        if (!this.appProvider.isSSOAuthenticationOngoing() && this.sitesProvider.isLoggedIn() &&
                this.sitesProvider.getCurrentSite().isLoggedOut() && this.navCtrl.getActive().name == 'CoreLoginReconnectPage') {
            // User must reauthenticate but he closed the InAppBrowser without doing so, logout him.
            this.sitesProvider.logout();
        }
    }

    /**
     * Show a confirm modal if needed and open a browser to perform SSO login.
     *
     * @param  {string} siteurl     URL of the site where the SSO login will be performed.
     * @param  {number} typeOfLogin CoreConstants.loginSSOCode or CoreConstants.loginSSOInAppCode.
     * @param  {string} [service]   The service to use. If not defined, external service will be used.
     * @param  {string} [launchUrl] The URL to open for SSO. If not defined, local_mobile launch URL will be used.
     * @return {Void}
     */
    confirmAndOpenBrowserForSSOLogin(siteUrl: string, typeOfLogin: number, service?: string, launchUrl?: string) : void {
        // Show confirm only if it's needed. Treat "false" (string) as false to prevent typing errors.
        let showConfirmation = this.shouldShowSSOConfirm(typeOfLogin),
            promise;

        if (showConfirmation) {
            promise = this.domUtils.showConfirm(this.translate.instant('mm.login.logininsiterequired'));
        } else {
            promise = Promise.resolve();
        }

        promise.then(() => {
            this.openBrowserForSSOLogin(siteUrl, typeOfLogin, service, launchUrl);
        });
    }

    /**
     * Format profile fields, filtering the ones that shouldn't be shown on signup and classifying them in categories.
     *
     * @param {any[]} profileFields Profile fields to format.
     * @return {any} Categories with the fields to show in each one.
     */
    formatProfileFieldsForSignup(profileFields: any[]) : any {
        let categories = {};

        if (!profileFields) {
            return categories;
        }

        profileFields.forEach((field) => {
            if (!field.signup) {
                // Not a signup field, ignore it.
                return;
            }

            if (!categories[field.categoryid]) {
                categories[field.categoryid] = {
                    id: field.categoryid,
                    name: field.categoryname,
                    fields: []
                }
            }

            categories[field.categoryid].fields.push(field);
        });

        return categories;
    }

    /**
     * Builds an object with error messages for some common errors.
     * Please notice that this function doesn't support all possible error types.
     *
     * @param {string} [requiredMsg] Code of the string for required error.
     * @param {string} [emailMsg] Code of the string for invalid email error.
     * @param {string} [patternMsg] Code of the string for pattern not match error.
     * @param {string} [urlMsg] Code of the string for invalid url error.
     * @param {string} [minlengthMsg] Code of the string for "too short" error.
     * @param {string} [maxlengthMsg] Code of the string for "too long" error.
     * @param {string} [minMsg] Code of the string for min value error.
     * @param {string} [maxMsg] Code of the string for max value error.
     * @return {any} Object with the errors.
     */
    getErrorMessages(requiredMsg?: string, emailMsg?: string, patternMsg?: string, urlMsg?: string, minlengthMsg?: string,
            maxlengthMsg?: string, minMsg?: string, maxMsg?: string) : any {
        var errors: any = {};

        if (requiredMsg) {
            errors.required = errors.requiredTrue = this.translate.instant(requiredMsg);
        }
        if (emailMsg) {
            errors.email = this.translate.instant(emailMsg);
        }
        if (patternMsg) {
            errors.pattern = this.translate.instant(patternMsg);
        }
        if (urlMsg) {
            errors.url = this.translate.instant(urlMsg);
        }
        if (minlengthMsg) {
            errors.minlength = this.translate.instant(minlengthMsg);
        }
        if (maxlengthMsg) {
            errors.maxlength = this.translate.instant(maxlengthMsg);
        }
        if (minMsg) {
            errors.min = this.translate.instant(minMsg);
        }
        if (maxMsg) {
            errors.max = this.translate.instant(maxMsg);
        }

        return errors;
    }

    /**
     * Get the site policy.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<string>} Promise resolved with the site policy.
     */
    getSitePolicy(siteId?: string) : Promise<string> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            // Check if it's stored in the site config.
            let sitePolicy = site.getStoredConfig('sitepolicy');
            if (typeof sitePolicy != 'undefined') {
                return sitePolicy ? sitePolicy : Promise.reject(null);
            }

            // Not in the config, try to get it using auth_email_get_signup_settings.
            return this.wsProvider.callAjax('auth_email_get_signup_settings', {}, {siteUrl: site.getURL()}).then((settings) => {
                return settings.sitepolicy ? settings.sitepolicy : Promise.reject(null);
            });
        });
    }

    /**
     * Get fixed site or sites.
     *
     * @return {string|any[]} Fixed site or list of fixed sites.
     */
    getFixedSites() : string|any[] {
        return CoreConfigConstants.siteurl;
    }

    /**
     * Get the valid identity providers from a site config.
     *
     * @param {any} siteConfig Site's public config.
     * @return {any[]} Valid identity providers.
     */
    getValidIdentityProviders(siteConfig: any) : any[] {
        let validProviders = [],
            httpUrl = this.textUtils.concatenatePaths(siteConfig.wwwroot, 'auth/oauth2/'),
            httpsUrl = this.textUtils.concatenatePaths(siteConfig.httpswwwroot, 'auth/oauth2/');

        if (siteConfig.identityproviders && siteConfig.identityproviders.length) {
            siteConfig.identityproviders.forEach((provider) => {
                if (provider.url && (provider.url.indexOf(httpsUrl) != -1 || provider.url.indexOf(httpUrl) != -1)) {
                    validProviders.push(provider);
                }
            });
        }

        return validProviders;
    }

    /**
     * Go to the page to add a new site.
     * If a fixed URL is configured, go to credentials instead.
     *
     * @param {NavController} navCtrl The NavController instance to use.
     * @param {boolean} [setRoot] True to set the new page as root, false to add it to the stack.
     * @return {Promise<any>} Promise resolved when done.
     */
    goToAddSite(navCtrl: NavController, setRoot?: boolean) : Promise<any> {
        let pageName,
            params;

        if (this.isFixedUrlSet()) {
            // Fixed URL is set, go to credentials page.
            let url = typeof CoreConfigConstants.siteurl == 'string' ?
                    CoreConfigConstants.siteurl : CoreConfigConstants.siteurl[0].url;

            pageName = 'CoreLoginCredentialsPage';
            params = {siteUrl: url};
        } else {
            pageName = 'CoreLoginSitePage';
        }

        if (setRoot) {
            return navCtrl.setRoot(pageName, params, {animate: false});
        } else {
            return navCtrl.push(pageName, params);
        }
    }

    /**
     * Go to the initial page of a site depending on 'userhomepage' setting.
     *
     * @param {NavController} navCtrl The NavController instance to use.
     * @param {boolean} [setRoot] True to set the new page as root, false to add it to the stack.
     * @return {Promise<any>} Promise resolved when done.
     */
    goToSiteInitialPage(navCtrl: NavController, setRoot?: boolean) : Promise<any> {
        return this.isMyOverviewEnabled().then((myOverview) => {
            let myCourses = !myOverview && this.isMyCoursesEnabled(),
                site = this.sitesProvider.getCurrentSite(),
                promise;

            if (!site) {
                return Promise.reject(null);
            }

            // Check if frontpage is needed to be shown. (If configured or if any of the other avalaible).
            if ((site.getInfo() && site.getInfo().userhomepage === 0) || (!myCourses && !myOverview)) {
                promise = this.isFrontpageEnabled();
            } else {
                promise = Promise.resolve(false);
            }

            return promise.then((frontpage) => {
                // Check avalaibility in priority order.
                let pageName,
                    params;

                // @todo Use real pages names when they are implemented.
                if (frontpage) {
                    pageName = 'Frontpage';
                } else if (myOverview) {
                    pageName = 'MyOverview';
                } else if (myCourses) {
                    pageName = 'MyCourses';
                } else {
                    // Anything else available, go to the user profile.
                    pageName = 'User';
                    params = {
                        userId: site.getUserId()
                    };
                }

                if (setRoot) {
                    return navCtrl.setRoot(pageName, params, {animate: false});
                } else {
                    return navCtrl.push(pageName, params);
                }
            });
        });
    }

    /**
     * Convenient helper to handle authentication in the app using a token received by SSO login. If it's a new account,
     * the site is stored and the user is authenticated. If the account already exists, update its token.
     *
     * @param {string} siteUrl Site's URL.
     * @param {string} token User's token.
     * @param {string} [privateToken] User's private token.
     * @return {Promise<any>} Promise resolved when the user is authenticated with the token.
     */
    handleSSOLoginAuthentication(siteUrl: string, token: string, privateToken?: string) : Promise<any> {
        if (this.sitesProvider.isLoggedIn()) {
            // User logged in, he is reconnecting. Retrieve username.
            var info = this.sitesProvider.getCurrentSite().getInfo();
            if (typeof info != 'undefined' && typeof info.username != 'undefined') {
                return this.sitesProvider.updateSiteToken(info.siteurl, info.username, token, privateToken).then(() => {
                    this.sitesProvider.updateSiteInfoByUrl(info.siteurl, info.username);
                }).catch(() => {
                    // Error updating token, return proper error message.
                    return Promise.reject(this.translate.instant('mm.login.errorupdatesite'));
                });
            }
            return Promise.reject(this.translate.instant('mm.login.errorupdatesite'));
        } else {
            return this.sitesProvider.newSite(siteUrl, token, privateToken);
        }
    }

    /**
     * Check if the app is configured to use several fixed URLs.
     *
     * @return {boolean} Whether there are several fixed URLs.
     */
    hasSeveralFixedSites() : boolean {
        return CoreConfigConstants.siteurl && Array.isArray(CoreConfigConstants.siteurl) &&
                CoreConfigConstants.siteurl.length > 1;
    }

    /**
     * Function called when a page starts loading in any InAppBrowser window.
     *
     * @param {string} url Loaded url.
     */
    inAppBrowserLoadStart(url: string) : void {
        // URLs with a custom scheme can be prefixed with "http://" or "https://", we need to remove this.
        url = url.replace(/^https?:\/\//, '');

        if (this.appLaunchedByURL(url)) {
            // Close the browser if it's a valid SSO URL.
            this.utils.closeInAppBrowser(false);
        } else if (this.platform.is('android')) {
            // Check if the URL has a custom URL scheme. In Android they need to be opened manually.
            const urlScheme = this.urlUtils.getUrlProtocol(url);
            if (urlScheme && urlScheme !== 'file' && urlScheme !== 'cdvfile') {
                // Open in browser should launch the right app if found and do nothing if not found.
                this.utils.openInBrowser(url);

                // At this point the InAppBrowser is showing a "Webpage not available" error message.
                // Try to navigate to last loaded URL so this error message isn't found.
                if (this.lastInAppUrl) {
                    this.utils.openInApp(this.lastInAppUrl);
                } else {
                    // No last URL loaded, close the InAppBrowser.
                    this.utils.closeInAppBrowser(false);
                }
            } else {
                this.lastInAppUrl = url;
            }
        }
    }

    /**
     * Given a site public config, check if email signup is disabled.
     *
     * @param {any} config Site public config.
     * @return {boolean} Whether email signup is disabled.
     */
    isEmailSignupDisabled(config: any) : boolean {
        let disabledFeatures = config && config.tool_mobile_disabledfeatures;
        if (!disabledFeatures) {
            return false;
        }

        let regEx = new RegExp('(,|^)\\$mmLoginEmailSignup(,|$)', 'g');
        return !!disabledFeatures.match(regEx);
    }

    /**
     * Check if the app is configured to use a fixed URL (only 1).
     *
     * @return {boolean} Whether there is 1 fixed URL.
     */
    isFixedUrlSet() : boolean {
        if (Array.isArray(CoreConfigConstants.siteurl)) {
            return CoreConfigConstants.siteurl.length == 1;
        }
        return !!CoreConfigConstants.siteurl;
    }

    /**
     * Check if the app is configured to use a fixed URL (only 1).
     *
     * @return {Promise<boolean>} Promise resolved with boolean: whether there is 1 fixed URL.
     */
    protected isFrontpageEnabled() : Promise<boolean> {
        // var $mmaFrontpage = $mmAddonManager.get('$mmaFrontpage');
        // if ($mmaFrontpage && !$mmaFrontpage.isDisabledInSite()) {
        //     return $mmaFrontpage.isFrontpageAvailable().then(() => {
        //         return true;
        //     }).catch(() => {
        //         return false;
        //     });
        // }
        // @todo: Implement it when front page is implemented.
        return Promise.resolve(false);
    }

    /**
     * Check if My Courses is enabled.
     *
     * @return {boolean} Whether My Courses is enabled.
     */
    protected isMyCoursesEnabled() : boolean {
        // @todo: Implement it when My Courses is implemented.
        return false;
        // return !$mmCourses.isMyCoursesDisabledInSite();
    }

    /**
     * Check if My Overview is enabled.
     *
     * @return {Promise<boolean>} Promise resolved with boolean: whether My Overview is enabled.
     */
    protected isMyOverviewEnabled() : Promise<boolean> {
        // @todo: Implement it when My Overview is implemented.
        return Promise.resolve(false);
    }

    /**
     * Check if current site is logged out, triggering mmCoreEventSessionExpired if it is.
     *
     * @param {string} [pageName] Name of the page to go once authenticated if logged out. If not defined, site initial page.
     * @param {any} [params] Params of the page to go once authenticated if logged out.
     * @return {boolean} True if user is logged out, false otherwise.
     */
    isSiteLoggedOut(pageName?: string, params?: any) : boolean {
        let site = this.sitesProvider.getCurrentSite();
        if (!site) {
            return false;
        }

        if (site.isLoggedOut()) {
            this.eventsProvider.trigger(CoreEventsProvider.SESSION_EXPIRED, {
                siteId: site.getId(),
                pageName: pageName,
                params: params
            });
            return true;
        }
        return false;
    }

    /**
     * Check if SSO login should use an embedded browser.
     *
     * @param {number} code Code to check.
     * @return {boolean} True if embedded browser, false othwerise.
     */
    isSSOEmbeddedBrowser(code: number) : boolean {
        if (this.appProvider.isDesktop() && this.emulatorHelper.isLinux()) {
            // In Linux desktop apps, always use embedded browser.
            return true;
        }

        return code == CoreConstants.loginSSOInAppCode;
    }

    /**
     * Check if SSO login is needed based on code returned by the WS.
     *
     * @param {number} code Code to check.
     * @return {boolean} True if SSO login is needed, false othwerise.
     */
    isSSOLoginNeeded(code: number) : boolean {
        return code == CoreConstants.loginSSOCode || code == CoreConstants.loginSSOInAppCode;
    }

    /**
     * Open a browser to perform OAuth login (Google, Facebook, Microsoft).
     *
     * @param {string} siteUrl URL of the site where the login will be performed.
     * @param {any} provider The identity provider.
     * @param {string} [launchUrl] The URL to open for SSO. If not defined, tool/mobile launch URL will be used.
     * @param {string} [pageName] Name of the page to go once authenticated. If not defined, site initial page.
     * @param {any} [pageParams] Params of the state to go once authenticated.
     * @return {boolean} True if success, false if error.
     */
    openBrowserForOAuthLogin(siteUrl: string, provider: any, launchUrl?: string, pageName?: string, pageParams?: any) : boolean {
        launchUrl = launchUrl || siteUrl + '/admin/tool/mobile/launch.php';
        if (!provider || !provider.url) {
            return false;
        }

        let service = this.sitesProvider.determineService(siteUrl),
            loginUrl = this.prepareForSSOLogin(siteUrl, service, launchUrl, pageName, pageParams),
            params = this.urlUtils.extractUrlParams(provider.url);

        if (!params.id) {
            return false;
        }

        loginUrl += '&oauthsso=' + params.id;

        if (this.appProvider.isDesktop() && this.emulatorHelper.isLinux()) {
            // In Linux desktop apps, always use embedded browser.
            this.utils.openInApp(loginUrl);
        } else {
            // Always open it in browser because the user might have the session stored in there.
            this.utils.openInBrowser(loginUrl);
            if ((<any>navigator).app) {
                (<any>navigator).app.exitApp();
            }
        }

        return true;
    }

    /**
     * Open a browser to perform SSO login.
     *
     * @param {string} siteurl URL of the site where the SSO login will be performed.
     * @param {number} typeOfLogin CoreConstants.loginSSOCode or CoreConstants.loginSSOInAppCode.
     * @param {string} [service] The service to use. If not defined, external service will be used.
     * @param {string} [launchUrl] The URL to open for SSO. If not defined, local_mobile launch URL will be used.
     * @param {string} [pageName] Name of the page to go once authenticated. If not defined, site initial page.
     * @param {any} [pageParams] Params of the state to go once authenticated.
     */
    openBrowserForSSOLogin(siteUrl: string, typeOfLogin: number, service?: string, launchUrl?: string, pageName?: string,
            pageParams?: any) : void {
        let loginUrl = this.prepareForSSOLogin(siteUrl, service, launchUrl, pageName, pageParams);

        if (this.isSSOEmbeddedBrowser(typeOfLogin)) {
            let options = {
                clearsessioncache: 'yes', // Clear the session cache to allow for multiple logins.
                closebuttoncaption: this.translate.instant('mm.login.cancel'),
            }
            this.utils.openInApp(loginUrl, options);
        } else {
            this.utils.openInBrowser(loginUrl);
            if ((<any>navigator).app) {
                (<any>navigator).app.exitApp();
            }
        }
    }

    /**
     * Convenient helper to open change password page.
     *
     * @param {string} siteUrl Site URL to construct change password URL.
     * @param {string} error Error message.
     */
    openChangePassword(siteUrl: string, error: string) : void {
        let alert = this.domUtils.showAlert(this.translate.instant('mm.core.notice'), error, null, 3000);
        alert.onDidDismiss(() => {
            this.utils.openInApp(siteUrl + '/login/change_password.php');
        });
    }

    /**
     * Open forgotten password in inappbrowser.
     *
     * @param {string} siteUrl URL of the site.
     */
    openForgottenPassword(siteUrl: string) : void {
        this.utils.openInApp(siteUrl + '/login/forgot_password.php');
    }

    /*
     * Function to open in app browser to change password or complete user profile.
     *
     * @param {string} siteId The site ID.
     * @param {string} path The relative path of the URL to open.
     * @param {string} alertMessage The key of the message to display before opening the in app browser.
     * @param {boolean} [invalidateCache] Whether to invalidate site's cache (e.g. when the user is forced to change password).
     */
    openInAppForEdit(siteId: string, path: string, alertMessage: string, invalidateCache?: boolean) : void {
        if (!siteId || siteId !== this.sitesProvider.getCurrentSiteId()) {
            // Site that triggered the event is not current site, nothing to do.
            return;
        }

        let currentSite = this.sitesProvider.getCurrentSite(),
            siteUrl = currentSite && currentSite.getURL();
        if (!currentSite || !siteUrl) {
            return;
        }

        if (!this.isOpenEditAlertShown && !this.waitingForBrowser) {
            this.isOpenEditAlertShown = true;

            if (invalidateCache) {
                currentSite.invalidateWsCache();
            }

            // Open change password.
            alertMessage = this.translate.instant(alertMessage) + '<br>' + this.translate.instant('mm.core.redirectingtosite');
            currentSite.openInAppWithAutoLogin(siteUrl + path, undefined, alertMessage).then(() => {
                this.waitingForBrowser = true;
            }).finally(() => {
                this.isOpenEditAlertShown = false;
            });
        }
    }

    /**
     * Prepare the app to perform SSO login.
     *
     * @param {string} siteUrl URL of the site where the SSO login will be performed.
     * @param {string} [service] The service to use. If not defined, external service will be used.
     * @param {string} [launchUrl] The URL to open for SSO. If not defined, local_mobile launch URL will be used.
     * @param {string} [pageName] Name of the page to go once authenticated. If not defined, site initial page.
     * @param {any} [pageParams] Params of the state to go once authenticated.
     */
    prepareForSSOLogin(siteUrl: string, service?: string, launchUrl?: string, pageName?: string, pageParams?: any) : string {
        service = service || CoreConfigConstants.wsextservice;
        launchUrl = launchUrl || siteUrl + '/local/mobile/launch.php';

        let passport = Math.random() * 1000,
            loginUrl = launchUrl + '?service=' + service;

        loginUrl += "&passport=" + passport;
        loginUrl += "&urlscheme=" + CoreConfigConstants.customurlscheme;

        // Store the siteurl and passport in $mmConfig for persistence. We are "configuring"
        // the app to wait for an SSO. $mmConfig shouldn't be used as a temporary storage.
        this.configProvider.set(CoreConstants.loginLaunchData, JSON.stringify({
            siteUrl: siteUrl,
            passport: passport,
            pageName: pageName || '',
            pageParams: pageParams || {}
        }));

        return loginUrl;
    }

    /**
     * Request a password reset.
     *
     * @param {string} siteUrl URL of the site.
     * @param {string} [username] Username to search.
     * @param {string} [email] Email to search.
     * @return {Promise<any>} Promise resolved when done.
     */
    requestPasswordReset(siteUrl: string, username?: string, email?: string) : Promise<any> {
        var params: any = {};

        if (username) {
            params.username = username;
        }

        if (email) {
            params.email = email;
        }

        return this.wsProvider.callAjax('core_auth_request_password_reset', params, {siteUrl: siteUrl});
    }

    /**
     * Function that should be called when the session expires. Reserved for core use.
     *
     * @param {any} data Data received by the SESSION_EXPIRED event.
     */
    sessionExpired(data: any) : void {
        let siteId = data && data.siteId,
            currentSite = this.sitesProvider.getCurrentSite(),
            siteUrl = currentSite && currentSite.getURL(),
            promise;

        if (!currentSite || !siteUrl) {
            return;
        }

        if (siteId && siteId !== currentSite.getId()) {
            return; // Site that triggered the event is not current site.
        }

        // Check authentication method.
        this.sitesProvider.checkSite(siteUrl).then((result) => {

            if (result.warning) {
                this.domUtils.showErrorModal(result.warning, true, 4000);
            }

            if (this.isSSOLoginNeeded(result.code)) {
                // SSO. User needs to authenticate in a browser. Prevent showing the message several times
                // or show it again if the user is already authenticating using SSO.
                if (!this.appProvider.isSSOAuthenticationOngoing() && !this.isSSOConfirmShown && !this.waitingForBrowser) {
                    this.isSSOConfirmShown = true;

                    if (this.shouldShowSSOConfirm(result.code)) {
                        promise = this.domUtils.showConfirm(this.translate.instant('mm.login.' +
                                (currentSite.isLoggedOut() ? 'loggedoutssodescription' : 'reconnectssodescription')));
                    } else {
                        promise = Promise.resolve();
                    }

                    promise.then(() => {
                        this.waitingForBrowser = true;
                        this.openBrowserForSSOLogin(result.siteUrl, result.code, result.service,
                                result.config && result.config.launchurl, data.pageName, data.params);
                    }).catch(() => {
                        // User cancelled, logout him.
                        this.sitesProvider.logout();
                    }).finally(() => {
                        this.isSSOConfirmShown = false;
                    });
                }
            } else {
                let info = currentSite.getInfo();
                if (typeof info != 'undefined' && typeof info.username != 'undefined') {
                    this.navCtrl.setRoot('CoreLoginReconnectPage', {
                        infoSiteUrl: info.siteurl,
                        siteUrl: result.siteUrl,
                        siteId: siteId,
                        pageName: data.pageName,
                        pageParams: data.params,
                        siteConfig: result.config
                    });
                }
            }
        }).catch((error) => {
            // Error checking site.
            if (currentSite.isLoggedOut()) {
                // Site is logged out, show error and logout the user.
                this.domUtils.showErrorModalDefault(error, 'mm.core.networkerrormsg', true);
                this.sitesProvider.logout();
            }
        });
    }

    /**
     * Set a NavController to use.
     *
     * @param {NavController} navCtrl Nav controller.
     */
    setNavCtrl(navCtrl: NavController) : void {
        this.navCtrl = navCtrl;
    }

    /**
     * Check if a confirm should be shown to open a SSO authentication.
     *
     * @param {number} typeOfLogin CoreConstants.loginSSOCode or CoreConstants.loginSSOInAppCode.
     * @return {boolean} True if confirm modal should be shown, false otherwise.
     */
    shouldShowSSOConfirm(typeOfLogin: number) : boolean {
        return !this.isSSOEmbeddedBrowser(typeOfLogin) &&
                    (!CoreConfigConstants.skipssoconfirmation || String(CoreConfigConstants.skipssoconfirmation) === 'false');
    }

    /**
     * Function called when site policy is not agreed. Reserved for core use.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     */
    sitePolicyNotAgreed(siteId?: string) : void {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();
        if (!siteId || siteId != this.sitesProvider.getCurrentSiteId()) {
            // Only current site allowed.
            return;
        }

        if (!this.sitesProvider.getCurrentSite().wsAvailable('core_user_agree_site_policy')) {
            // WS not available, stop.
            return;
        }

        this.navCtrl.setRoot('CoreLoginSitePolicyPage', {siteId: siteId});
    }

    /**
     * Convenient helper to handle get User Token error. It redirects to change password page if forcepassword is set.
     *
     * @param {string} siteUrl Site URL to construct change password URL.
     * @param {any} error Error object containing errorcode and error message.
     */
    treatUserTokenError(siteUrl: string, error: any) : void {
        if (typeof error == 'string') {
            this.domUtils.showErrorModal(error);
        } else if (error.errorcode == 'forcepasswordchangenotice') {
            this.openChangePassword(siteUrl, error.error);
        } else {
            this.domUtils.showErrorModal(error.error);
        }
    }

    /**
     * Convenient helper to validate a browser SSO login.
     *
     * @param {string} url URL received, to be validated.
     * @return {Promise<CoreLoginSSOData>} Promise resolved on success.
     */
    validateBrowserSSOLogin(url: string) : Promise<CoreLoginSSOData> {
        // Split signature:::token
        const params = url.split(":::");

        return this.configProvider.get(CoreConstants.loginLaunchData).then((data): any => {
            try {
                data = JSON.parse(data);
            } catch(ex) {
                return Promise.reject(null);
            }

            let launchSiteURL = data.siteurl,
                passport = data.passport;

            // Reset temporary values.
            this.configProvider.delete(CoreConstants.loginLaunchData);

            // Validate the signature.
            // We need to check both http and https.
            let signature = <string>Md5.hashAsciiStr(launchSiteURL + passport);
            if (signature != params[0]) {
                if (launchSiteURL.indexOf("https://") != -1) {
                    launchSiteURL = launchSiteURL.replace("https://", "http://");
                } else {
                    launchSiteURL = launchSiteURL.replace("http://", "https://");
                }
                signature = <string>Md5.hashAsciiStr(launchSiteURL + passport);
            }

            if (signature == params[0]) {
                this.logger.debug('Signature validated');
                return {
                    siteUrl: launchSiteURL,
                    token: params[1],
                    privateToken: params[2],
                    pageName: data.pageName,
                    pageParams: data.pageParams
                }
            } else {
                this.logger.debug('Invalid signature in the URL request yours: ' + params[0] + ' mine: '
                                + signature + ' for passport ' + passport);
                return Promise.reject(this.translate.instant('mm.core.unexpectederror'));
            }
        });
    }
}
