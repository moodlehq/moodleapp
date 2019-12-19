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

import { Injectable } from '@angular/core';
import { Location } from '@angular/common';
import { Platform, AlertController, NavController, NavOptions } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '@providers/app';
import { CoreConfigProvider } from '@providers/config';
import { CoreEventsProvider } from '@providers/events';
import { CoreInitDelegate } from '@providers/init';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreWSProvider } from '@providers/ws';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreSitePluginsProvider } from '@core/siteplugins/providers/siteplugins';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreConfigConstants } from '../../../configconstants';
import { CoreConstants } from '@core/constants';
import { Md5 } from 'ts-md5/dist/md5';
import { CoreSite } from '@classes/site';

/**
 * Data related to a SSO authentication.
 */
export interface CoreLoginSSOData {
    /**
     * The site's URL.
     */
    siteUrl: string;

    /**
     * User's token.
     */
    token?: string;

    /**
     * User's private token.
     */
    privateToken?: string;

    /**
     * Name of the page to go after authenticated.
     */
    pageName?: string;

    /**
     * Params to page to the page.
     */
    pageParams?: any;
}

/**
 * Helper provider that provides some common features regarding authentication.
 */
@Injectable()
export class CoreLoginHelperProvider {
    static OPEN_COURSE = 'open_course';

    protected logger;
    protected isSSOConfirmShown = false;
    protected isOpenEditAlertShown = false;
    protected pageToLoad: {page: string, params: any, time: number}; // Page to load once main menu is opened.
    waitingForBrowser = false;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private domUtils: CoreDomUtilsProvider,
            private wsProvider: CoreWSProvider, private translate: TranslateService, private textUtils: CoreTextUtilsProvider,
            private eventsProvider: CoreEventsProvider, private appProvider: CoreAppProvider, private utils: CoreUtilsProvider,
            private urlUtils: CoreUrlUtilsProvider, private configProvider: CoreConfigProvider, private platform: Platform,
            private initDelegate: CoreInitDelegate, private sitePluginsProvider: CoreSitePluginsProvider,
            private location: Location, private alertCtrl: AlertController, private courseProvider: CoreCourseProvider) {
        this.logger = logger.getInstance('CoreLoginHelper');

        this.eventsProvider.on(CoreEventsProvider.MAIN_MENU_OPEN, () => {
            /* If there is any page pending to be opened, do it now. Don't open pages stored more than 5 seconds ago, probably
               the function to open the page was called when it shouldn't. */
            if (this.pageToLoad && Date.now() - this.pageToLoad.time < 5000) {
                this.loadPageInMainMenu(this.pageToLoad.page, this.pageToLoad.params);
                delete this.pageToLoad;
            }
        });
    }

    /**
     * Accept site policy.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if success, rejected if failure.
     */
    acceptSitePolicy(siteId?: string): Promise<void> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.write('core_user_agree_site_policy', {}).then((result) => {
                if (!result.status) {
                    // Error.
                    if (result.warnings && result.warnings.length) {
                        // Check if there is a warning 'alreadyagreed'.
                        for (const i in result.warnings) {
                            const warning = result.warnings[i];
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
     * @param url URL received.
     * @return True if it's a SSO URL, false otherwise.
     * @deprecated Please use CoreCustomURLSchemesProvider.handleCustomURL instead.
     */
    appLaunchedByURL(url: string): boolean {
        const ssoScheme = CoreConfigConstants.customurlscheme + '://token=';
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
        this.logger.debug('App launched by URL with an SSO');

        // Delete the sso scheme from the URL.
        url = url.replace(ssoScheme, '');

        // Some platforms like Windows add a slash at the end. Remove it.
        // Some sites add a # at the end of the URL. If it's there, remove it.
        url = url.replace(/\/?#?\/?$/, '');

        // Decode from base64.
        try {
            url = atob(url);
        } catch (err) {
            // Error decoding the parameter.
            this.logger.error('Error decoding parameter received for login SSO');

            return false;
        }

        let siteData: CoreLoginSSOData,
            modal;

        // Wait for app to be ready.
        this.initDelegate.ready().then(() => {
            modal = this.domUtils.showModalLoading('core.login.authenticating', true);

            return this.validateBrowserSSOLogin(url);
        }).then((data) => {
            siteData = data;

            return this.handleSSOLoginAuthentication(siteData.siteUrl, siteData.token, siteData.privateToken);
        }).then(() => {
            if (siteData.pageName) {
                // State defined, go to that state instead of site initial page.
                this.appProvider.getRootNavController().push(siteData.pageName, siteData.pageParams);
            } else {
                this.goToSiteInitialPage();
            }
        }).catch((error) => {
            if (error) {
                // An error occurred, display the error and logout the user.
                this.treatUserTokenError(siteData.siteUrl, error);
                this.sitesProvider.logout();
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
     * @param siteUrl URL of the site.
     * @return Promise resolved with boolean: whether can be done through the app.
     */
    canRequestPasswordReset(siteUrl: string): Promise<any> {
        return this.requestPasswordReset(siteUrl).then(() => {
            return true;
        }).catch((error) => {
            return error.available == 1 || (typeof error.errorcode != 'undefined' && error.errorcode != 'invalidrecord' &&
                    error.errorcode != '');
        });
    }

    /**
     * Function called when an SSO InAppBrowser is closed or the app is resumed. Check if user needs to be logged out.
     */
    checkLogout(): void {
        const navCtrl = this.appProvider.getRootNavController();
        if (!this.appProvider.isSSOAuthenticationOngoing() && this.sitesProvider.isLoggedIn() &&
            this.sitesProvider.getCurrentSite().isLoggedOut() && navCtrl.getActive().name == 'CoreLoginReconnectPage') {
            // User must reauthenticate but he closed the InAppBrowser without doing so, logout him.
            this.sitesProvider.logout();
        }
    }

    /**
     * Show a confirm modal if needed and open a browser to perform SSO login.
     *
     * @param siteurl URL of the site where the SSO login will be performed.
     * @param typeOfLogin CoreConstants.LOGIN_SSO_CODE or CoreConstants.LOGIN_SSO_INAPP_CODE.
     * @param service The service to use. If not defined, external service will be used.
     * @param launchUrl The URL to open for SSO. If not defined, local_mobile launch URL will be used.
     */
    confirmAndOpenBrowserForSSOLogin(siteUrl: string, typeOfLogin: number, service?: string, launchUrl?: string): void {
        // Show confirm only if it's needed. Treat "false" (string) as false to prevent typing errors.
        const showConfirmation = this.shouldShowSSOConfirm(typeOfLogin);
        let promise;

        if (showConfirmation) {
            promise = this.domUtils.showConfirm(this.translate.instant('core.login.logininsiterequired'));
        } else {
            promise = Promise.resolve();
        }

        promise.then(() => {
            this.openBrowserForSSOLogin(siteUrl, typeOfLogin, service, launchUrl);
        }).catch(() => {
            // User cancelled, ignore.
        });
    }

    /**
     * Helper function to act when the forgotten password is clicked.
     *
     * @param navCtrl NavController to use to navigate.
     * @param siteUrl Site URL.
     * @param username Username.
     * @param siteConfig Site config.
     */
    forgottenPasswordClicked(navCtrl: NavController, siteUrl: string, username: string, siteConfig?: any): void {
        if (siteConfig && siteConfig.forgottenpasswordurl) {
            // URL set, open it.
            this.utils.openInApp(siteConfig.forgottenpasswordurl);

            return;
        }

        // Check if password reset can be done through the app.
        const modal = this.domUtils.showModalLoading();

        this.canRequestPasswordReset(siteUrl).then((canReset) => {
            if (canReset) {
                navCtrl.push('CoreLoginForgottenPasswordPage', {
                    siteUrl: siteUrl, username: username
                });
            } else {
                this.openForgottenPassword(siteUrl);
            }
        }).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Format profile fields, filtering the ones that shouldn't be shown on signup and classifying them in categories.
     *
     * @param profileFields Profile fields to format.
     * @return Categories with the fields to show in each one.
     */
    formatProfileFieldsForSignup(profileFields: any[]): any {
        if (!profileFields) {
            return [];
        }

        const categories = {};

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
                };
            }

            categories[field.categoryid].fields.push(field);
        });

        return Object.keys(categories).map((index) => {
            return categories[index];
        });
    }

    /**
     * Get disabled features from a site public config.
     *
     * @param config Site public config.
     * @return Disabled features.
     */
    getDisabledFeatures(config: any): string {
        const disabledFeatures = config && config.tool_mobile_disabledfeatures;
        if (!disabledFeatures) {
            return '';
        }

        return this.textUtils.treatDisabledFeatures(disabledFeatures);
    }

    /**
     * Builds an object with error messages for some common errors.
     * Please notice that this function doesn't support all possible error types.
     *
     * @param requiredMsg Code of the string for required error.
     * @param emailMsg Code of the string for invalid email error.
     * @param patternMsg Code of the string for pattern not match error.
     * @param urlMsg Code of the string for invalid url error.
     * @param minlengthMsg Code of the string for "too short" error.
     * @param maxlengthMsg Code of the string for "too long" error.
     * @param minMsg Code of the string for min value error.
     * @param maxMsg Code of the string for max value error.
     * @return Object with the errors.
     */
    getErrorMessages(requiredMsg?: string, emailMsg?: string, patternMsg?: string, urlMsg?: string, minlengthMsg?: string,
            maxlengthMsg?: string, minMsg?: string, maxMsg?: string): any {
        const errors: any = {};

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
     * Returns the logout label of a site.
     *
     * @param site Site. If not defined, use current site.
     * @return The string key.
     */
    getLogoutLabel(site?: CoreSite): string {
        site = site || this.sitesProvider.getCurrentSite();
        const config = site.getStoredConfig();

        return 'core.mainmenu.' + (config && config.tool_mobile_forcelogout == '1' ? 'logout' : 'changesite');
    }

    /**
     * Get the site policy.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the site policy.
     */
    getSitePolicy(siteId?: string): Promise<string> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            // Try to get the latest config, maybe the site policy was just added or has changed.
            return site.getConfig('sitepolicy', true).then((sitePolicy) => {
                return sitePolicy ? sitePolicy : Promise.reject(null);
            }, () => {
                // Cannot get config, try to get the site policy using auth_email_get_signup_settings.
                return this.wsProvider.callAjax('auth_email_get_signup_settings', {}, { siteUrl: site.getURL() })
                        .then((settings) => {
                    return settings.sitepolicy ? settings.sitepolicy : Promise.reject(null);
                });
            });
        });
    }

    /**
     * Get fixed site or sites.
     *
     * @return Fixed site or list of fixed sites.
     */
    getFixedSites(): string | any[] {
        return CoreConfigConstants.siteurl;
    }

    /**
     * Get the valid identity providers from a site config.
     *
     * @param siteConfig Site's public config.
     * @return Valid identity providers.
     */
    getValidIdentityProviders(siteConfig: any): any[] {
        const validProviders = [],
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
     * @param setRoot True to set the new page as root, false to add it to the stack.
     * @param showKeyboard Whether to show keyboard in the new page. Only if no fixed URL set.
     * @return Promise resolved when done.
     */
    goToAddSite(setRoot?: boolean, showKeyboard?: boolean): Promise<any> {
        let pageName,
            params;

        if (this.isFixedUrlSet()) {
            // Fixed URL is set, go to credentials page.
            const url = typeof CoreConfigConstants.siteurl == 'string' ?
                CoreConfigConstants.siteurl : CoreConfigConstants.siteurl[0].url;

            pageName = 'CoreLoginCredentialsPage';
            params = { siteUrl: url };
        } else {
            pageName = 'CoreLoginSitePage';
            params = {
                showKeyboard: showKeyboard
            };
        }

        if (setRoot) {
            return this.appProvider.getRootNavController().setRoot(pageName, params, { animate: false });
        } else {
            return this.appProvider.getRootNavController().push(pageName, params);
        }
    }

    /**
     * Open a page that doesn't belong to any site.
     *
     * @param navCtrl Nav Controller.
     * @param page Page to open.
     * @param params Params of the page.
     * @return Promise resolved when done.
     */
    goToNoSitePage(navCtrl: NavController, page: string, params?: any): Promise<any> {
        navCtrl = navCtrl || this.appProvider.getRootNavController();

        if (page == 'CoreLoginSitesPage') {
            // Just open the page as root.
            return navCtrl.setRoot(page, params);
        } else {
            // Check if there is any site stored.
            return this.sitesProvider.hasSites().then((hasSites) => {
                if (hasSites) {
                    // There are sites stored, open sites page first to be able to go back.
                    navCtrl.setRoot('CoreLoginSitesPage');

                    return navCtrl.push(page, params, {animate: false});
                } else {
                    if (page != 'CoreLoginSitePage') {
                        // Open the new site page to be able to go back.
                        navCtrl.setRoot('CoreLoginSitePage');

                        return navCtrl.push(page, params, {animate: false});
                    } else {
                        // Just open the page as root.
                        return navCtrl.setRoot(page, params);
                    }
                }
            });
        }
    }

    /**
     * Go to the initial page of a site depending on 'userhomepage' setting.
     *
     * @param navCtrl NavController to use. Defaults to app root NavController.
     * @param page Name of the page to load after loading the main page.
     * @param params Params to pass to the page.
     * @param options Navigation options.
     * @param url URL to open once the main menu is loaded.
     * @return Promise resolved when done.
     */
    goToSiteInitialPage(navCtrl?: NavController, page?: string, params?: any, options?: NavOptions, url?: string): Promise<any> {
        return this.openMainMenu(navCtrl, page, params, options, url);
    }

    /**
     * Convenient helper to handle authentication in the app using a token received by SSO login. If it's a new account,
     * the site is stored and the user is authenticated. If the account already exists, update its token.
     *
     * @param siteUrl Site's URL.
     * @param token User's token.
     * @param privateToken User's private token.
     * @return Promise resolved when the user is authenticated with the token.
     */
    handleSSOLoginAuthentication(siteUrl: string, token: string, privateToken?: string): Promise<any> {
        // Always create a new site to prevent overriding data if another user credentials were introduced.
        return this.sitesProvider.newSite(siteUrl, token, privateToken);
    }

    /**
     * Check if the app is configured to use several fixed URLs.
     *
     * @return Whether there are several fixed URLs.
     */
    hasSeveralFixedSites(): boolean {
        return CoreConfigConstants.siteurl && Array.isArray(CoreConfigConstants.siteurl) &&
            CoreConfigConstants.siteurl.length > 1;
    }

    /**
     * Function called when a page starts loading in any InAppBrowser window.
     *
     * @param url Loaded url.
     * @deprecated
     */
    inAppBrowserLoadStart(url: string): void {
        // This function is deprecated.
    }

    /**
     * Given a site public config, check if email signup is disabled.
     *
     * @param config Site public config.
     * @param disabledFeatures List of disabled features already treated. If not provided it will be calculated.
     * @return Whether email signup is disabled.
     */
    isEmailSignupDisabled(config?: any, disabledFeatures?: string): boolean {
        return this.isFeatureDisabled('CoreLoginEmailSignup', config, disabledFeatures);
    }

    /**
     * Given a site public config, check if a certian feature is disabled.
     *
     * @param feature Feature to check.
     * @param config Site public config.
     * @param disabledFeatures List of disabled features already treated. If not provided it will be calculated.
     * @return Whether email signup is disabled.
     */
    isFeatureDisabled(feature: string, config?: any, disabledFeatures?: string): boolean {
        if (typeof disabledFeatures == 'undefined') {
            disabledFeatures = this.getDisabledFeatures(config);
        }

        const regEx = new RegExp('(,|^)' + feature + '(,|$)', 'g');

        return !!disabledFeatures.match(regEx);
    }

    /**
     * Check if the app is configured to use a fixed URL (only 1).
     *
     * @return Whether there is 1 fixed URL.
     */
    isFixedUrlSet(): boolean {
        if (Array.isArray(CoreConfigConstants.siteurl)) {
            return CoreConfigConstants.siteurl.length == 1;
        }

        return !!CoreConfigConstants.siteurl;
    }

    /**
     * Given a site public config, check if forgotten password is disabled.
     *
     * @param config Site public config.
     * @param disabledFeatures List of disabled features already treated. If not provided it will be calculated.
     * @return Whether it's disabled.
     */
    isForgottenPasswordDisabled(config?: any, disabledFeatures?: string): boolean {
        return this.isFeatureDisabled('NoDelegate_ForgottenPassword', config, disabledFeatures);
    }

    /**
     * Check if current site is logged out, triggering mmCoreEventSessionExpired if it is.
     *
     * @param pageName Name of the page to go once authenticated if logged out. If not defined, site initial page.
     * @param params Params of the page to go once authenticated if logged out.
     * @return True if user is logged out, false otherwise.
     */
    isSiteLoggedOut(pageName?: string, params?: any): boolean {
        const site = this.sitesProvider.getCurrentSite();
        if (!site) {
            return false;
        }

        if (site.isLoggedOut()) {
            this.eventsProvider.trigger(CoreEventsProvider.SESSION_EXPIRED, {
                pageName: pageName,
                params: params
            }, site.getId());

            return true;
        }

        return false;
    }

    /**
     * Check if SSO login should use an embedded browser.
     *
     * @param code Code to check.
     * @return True if embedded browser, false othwerise.
     */
    isSSOEmbeddedBrowser(code: number): boolean {
        if (this.appProvider.isLinux()) {
            // In Linux desktop app, always use embedded browser.
            return true;
        }

        return code == CoreConstants.LOGIN_SSO_INAPP_CODE;
    }

    /**
     * Check if SSO login is needed based on code returned by the WS.
     *
     * @param code Code to check.
     * @return True if SSO login is needed, false othwerise.
     */
    isSSOLoginNeeded(code: number): boolean {
        return code == CoreConstants.LOGIN_SSO_CODE || code == CoreConstants.LOGIN_SSO_INAPP_CODE;
    }

    /**
     * Load a site and load a certain page in that site.
     *
     * @param page Name of the page to load.
     * @param params Params to pass to the page.
     * @param siteId Site to load.
     * @return Promise resolved when done.
     */
    protected loadSiteAndPage(page: string, params: any, siteId: string): Promise<any> {
        const navCtrl = this.appProvider.getRootNavController();

        if (siteId == CoreConstants.NO_SITE_ID) {
            // Page doesn't belong to a site, just load the page.
            return navCtrl.setRoot(page, params);
        } else {
            const modal = this.domUtils.showModalLoading();

            return this.sitesProvider.loadSite(siteId, page, params).then((loggedIn) => {
                if (loggedIn) {
                    return this.openMainMenu(navCtrl, page, params);
                }
            }).catch((error) => {
                // Site doesn't exist.
                return navCtrl.setRoot('CoreLoginSitesPage');
            }).finally(() => {
                modal.dismiss();
            });
        }
    }

    /**
     * Load a certain page in the main menu page.
     *
     * @param page Name of the page to load.
     * @param params Params to pass to the page.
     */
    loadPageInMainMenu(page: string, params: any): void {
        if (!this.appProvider.isMainMenuOpen()) {
            // Main menu not open. Store the page to be loaded later.
            this.pageToLoad = {
                page: page,
                params: params,
                time: Date.now()
            };

            return;
        }

        if (page == CoreLoginHelperProvider.OPEN_COURSE) {
            // Use the openCourse function.
            this.courseProvider.openCourse(undefined, params.course, params);
        } else {
            this.eventsProvider.trigger(CoreEventsProvider.LOAD_PAGE_MAIN_MENU, { redirectPage: page, redirectParams: params });
        }
    }

    /**
     * Open the main menu, loading a certain page.
     *
     * @param navCtrl NavController.
     * @param page Name of the page to load.
     * @param params Params to pass to the page.
     * @param options Navigation options.
     * @param url URL to open once the main menu is loaded.
     * @return Promise resolved when done.
     */
    protected openMainMenu(navCtrl: NavController, page: string, params: any, options?: NavOptions, url?: string): Promise<any> {
        navCtrl = navCtrl || this.appProvider.getRootNavController();

        // Due to DeepLinker, we need to remove the path from the URL before going to main menu.
        // IonTabs checks the URL to determine which path to load for deep linking, so we clear the URL.
        this.location.replaceState('');

        if (page == CoreLoginHelperProvider.OPEN_COURSE) {
            // Load the main menu first, and then open the course.
            return navCtrl.setRoot('CoreMainMenuPage').finally(() => {
                return this.courseProvider.openCourse(undefined, params.course, params);
            });
        } else {
            // Open the main menu.
            return navCtrl.setRoot('CoreMainMenuPage', { redirectPage: page, redirectParams: params, urlToOpen: url }, options);
        }
    }

    /**
     * Open a browser to perform OAuth login (Google, Facebook, Microsoft).
     *
     * @param siteUrl URL of the site where the login will be performed.
     * @param provider The identity provider.
     * @param launchUrl The URL to open for SSO. If not defined, tool/mobile launch URL will be used.
     * @param pageName Name of the page to go once authenticated. If not defined, site initial page.
     * @param pageParams Params of the state to go once authenticated.
     * @return True if success, false if error.
     */
    openBrowserForOAuthLogin(siteUrl: string, provider: any, launchUrl?: string, pageName?: string, pageParams?: any): boolean {
        launchUrl = launchUrl || siteUrl + '/admin/tool/mobile/launch.php';
        if (!provider || !provider.url) {
            return false;
        }

        const service = this.sitesProvider.determineService(siteUrl),
            params = this.urlUtils.extractUrlParams(provider.url);
        let loginUrl = this.prepareForSSOLogin(siteUrl, service, launchUrl, pageName, pageParams);

        if (!params.id) {
            return false;
        }

        loginUrl += '&oauthsso=' + params.id;

        if (this.appProvider.isLinux()) {
            // In Linux desktop app, always use embedded browser.
            this.utils.openInApp(loginUrl);
        } else {
            // Always open it in browser because the user might have the session stored in there.
            this.utils.openInBrowser(loginUrl);
            if ((<any> navigator).app) {
                (<any> navigator).app.exitApp();
            }
        }

        return true;
    }

    /**
     * Open a browser to perform SSO login.
     *
     * @param siteurl URL of the site where the SSO login will be performed.
     * @param typeOfLogin CoreConstants.LOGIN_SSO_CODE or CoreConstants.LOGIN_SSO_INAPP_CODE.
     * @param service The service to use. If not defined, external service will be used.
     * @param launchUrl The URL to open for SSO. If not defined, local_mobile launch URL will be used.
     * @param pageName Name of the page to go once authenticated. If not defined, site initial page.
     * @param pageParams Params of the state to go once authenticated.
     */
    openBrowserForSSOLogin(siteUrl: string, typeOfLogin: number, service?: string, launchUrl?: string, pageName?: string,
            pageParams?: any): void {
        const loginUrl = this.prepareForSSOLogin(siteUrl, service, launchUrl, pageName, pageParams);

        if (this.isSSOEmbeddedBrowser(typeOfLogin)) {
            const options = {
                clearsessioncache: 'yes', // Clear the session cache to allow for multiple logins.
                closebuttoncaption: this.translate.instant('core.login.cancel'),
            };
            this.utils.openInApp(loginUrl, options);
        } else {
            this.utils.openInBrowser(loginUrl);
            if ((<any> navigator).app) {
                (<any> navigator).app.exitApp();
            }
        }
    }

    /**
     * Convenient helper to open change password page.
     *
     * @param siteUrl Site URL to construct change password URL.
     * @param error Error message.
     */
    openChangePassword(siteUrl: string, error: string): void {
        this.domUtils.showAlert(this.translate.instant('core.notice'), error, undefined, 3000).then((alert) => {
            const subscription = alert.didDismiss.subscribe(() => {
                subscription && subscription.unsubscribe();

                this.utils.openInApp(siteUrl + '/login/change_password.php');
            });
        });
    }

    /**
     * Open forgotten password in inappbrowser.
     *
     * @param siteUrl URL of the site.
     */
    openForgottenPassword(siteUrl: string): void {
        this.utils.openInApp(siteUrl + '/login/forgot_password.php');
    }

    /**
     * Function to open in app browser to change password or complete user profile.
     *
     * @param siteId The site ID.
     * @param path The relative path of the URL to open.
     * @param alertMessage The key of the message to display before opening the in app browser.
     * @param invalidateCache Whether to invalidate site's cache (e.g. when the user is forced to change password).
     */
    openInAppForEdit(siteId: string, path: string, alertMessage?: string, invalidateCache?: boolean): void {
        if (!siteId || siteId !== this.sitesProvider.getCurrentSiteId()) {
            // Site that triggered the event is not current site, nothing to do.
            return;
        }

        const currentSite = this.sitesProvider.getCurrentSite(),
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
            if (alertMessage) {
                alertMessage = this.translate.instant(alertMessage) + '<br>' + this.translate.instant('core.redirectingtosite');
            }
            currentSite.openInAppWithAutoLogin(siteUrl + path, undefined, alertMessage).then(() => {
                this.waitingForBrowser = true;
            }).finally(() => {
                this.isOpenEditAlertShown = false;
            });
        }
    }

    /**
     * Function that should be called when password change is forced. Reserved for core use.
     *
     * @param siteId The site ID.
     */
    passwordChangeForced(siteId: string): void {
        const currentSite = this.sitesProvider.getCurrentSite();
        if (!currentSite || siteId !== currentSite.getId()) {
            return; // Site that triggered the event is not current site.
        }

        const rootNavCtrl = this.appProvider.getRootNavController(),
        activePage = rootNavCtrl.getActive();

        // If current page is already change password, stop.
        if (activePage && activePage.component && activePage.component.name == 'CoreLoginChangePasswordPage') {
            return;
        }

        rootNavCtrl.setRoot('CoreLoginChangePasswordPage', {siteId});
    }

    /**
     * Prepare the app to perform SSO login.
     *
     * @param siteUrl URL of the site where the SSO login will be performed.
     * @param service The service to use. If not defined, external service will be used.
     * @param launchUrl The URL to open for SSO. If not defined, local_mobile launch URL will be used.
     * @param pageName Name of the page to go once authenticated. If not defined, site initial page.
     * @param pageParams Params of the state to go once authenticated.
     */
    prepareForSSOLogin(siteUrl: string, service?: string, launchUrl?: string, pageName?: string, pageParams?: any): string {
        service = service || CoreConfigConstants.wsextservice;
        launchUrl = launchUrl || siteUrl + '/local/mobile/launch.php';

        const passport = Math.random() * 1000;
        let loginUrl = launchUrl + '?service=' + service;

        loginUrl += '&passport=' + passport;
        loginUrl += '&urlscheme=' + CoreConfigConstants.customurlscheme;

        // Store the siteurl and passport in CoreConfigProvider for persistence.
        // We are "configuring" the app to wait for an SSO. CoreConfigProvider shouldn't be used as a temporary storage.
        this.configProvider.set(CoreConstants.LOGIN_LAUNCH_DATA, JSON.stringify({
            siteUrl: siteUrl,
            passport: passport,
            pageName: pageName || '',
            pageParams: pageParams || {}
        }));

        return loginUrl;
    }

    /**
     * Redirect to a new page, setting it as the root page and loading the right site if needed.
     *
     * @param page Name of the page to load. Special cases: OPEN_COURSE (to open course page).
     * @param params Params to pass to the page.
     * @param siteId Site to load. If not defined, current site.
     * @return Promise resolved when done.
     */
    redirect(page: string, params?: any, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        if (this.sitesProvider.isLoggedIn()) {
            if (siteId && siteId != this.sitesProvider.getCurrentSiteId()) {
                // Target page belongs to a different site. Change site.
                if (this.sitePluginsProvider.hasSitePluginsLoaded) {
                    // The site has site plugins so the app will be restarted. Store the data and logout.
                    this.appProvider.storeRedirect(siteId, page, params);

                    return this.sitesProvider.logout();
                } else {
                    return this.sitesProvider.logout().then(() => {
                        return this.loadSiteAndPage(page, params, siteId);
                    });
                }
            } else {
                this.loadPageInMainMenu(page, params);
            }
        } else {
            if (siteId) {
                return this.loadSiteAndPage(page, params, siteId);
            } else {
                return this.appProvider.getRootNavController().setRoot('CoreLoginSitesPage');
            }
        }

        return Promise.resolve();
    }

    /**
     * Request a password reset.
     *
     * @param siteUrl URL of the site.
     * @param username Username to search.
     * @param email Email to search.
     * @return Promise resolved when done.
     */
    requestPasswordReset(siteUrl: string, username?: string, email?: string): Promise<any> {
        const params: any = {};

        if (username) {
            params.username = username;
        }

        if (email) {
            params.email = email;
        }

        return this.wsProvider.callAjax('core_auth_request_password_reset', params, { siteUrl: siteUrl });
    }

    /**
     * Function that should be called when the session expires. Reserved for core use.
     *
     * @param data Data received by the SESSION_EXPIRED event.
     */
    sessionExpired(data: any): void {
        const siteId = data && data.siteId,
            currentSite = this.sitesProvider.getCurrentSite(),
            siteUrl = currentSite && currentSite.getURL();
        let promise;

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
                // SSO. User needs to authenticate in a browser. Check if we need to display a message.
                if (!this.appProvider.isSSOAuthenticationOngoing() && !this.isSSOConfirmShown && !this.waitingForBrowser) {
                    this.isSSOConfirmShown = true;

                    if (this.shouldShowSSOConfirm(result.code)) {
                        promise = this.domUtils.showConfirm(this.translate.instant('core.login.' +
                            (currentSite.isLoggedOut() ? 'loggedoutssodescription' : 'reconnectssodescription')));
                    } else {
                        promise = Promise.resolve();
                    }

                    promise.then(() => {
                        this.waitingForBrowser = true;
                        this.sitesProvider.unsetCurrentSite(); // We need to unset current site to make authentication work fine.

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
                const info = currentSite.getInfo();
                if (typeof info != 'undefined' && typeof info.username != 'undefined') {
                    const rootNavCtrl = this.appProvider.getRootNavController(),
                        activePage = rootNavCtrl.getActive();

                    // If current page is already reconnect, stop.
                    if (activePage && activePage.component && activePage.component.name == 'CoreLoginReconnectPage') {
                        return;
                    }

                    rootNavCtrl.setRoot('CoreLoginReconnectPage', {
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
                this.domUtils.showErrorModalDefault(error, 'core.networkerrormsg', true);
                this.sitesProvider.logout();
            }
        });
    }

    /**
     * Check if a confirm should be shown to open a SSO authentication.
     *
     * @param typeOfLogin CoreConstants.LOGIN_SSO_CODE or CoreConstants.LOGIN_SSO_INAPP_CODE.
     * @return True if confirm modal should be shown, false otherwise.
     */
    shouldShowSSOConfirm(typeOfLogin: number): boolean {
        return !this.isSSOEmbeddedBrowser(typeOfLogin) &&
            (!CoreConfigConstants.skipssoconfirmation || String(CoreConfigConstants.skipssoconfirmation) === 'false');
    }

    /**
     * Show a modal warning the user that he should use the Workplace app.
     *
     * @param message The warning message.
     */
    protected showWorkplaceNoticeModal(message: string): void {
        let link;

        if (this.platform.is('android')) {
            link = 'market://details?id=com.moodle.workplace';
        } else if (this.platform.is('ios')) {
            link = 'itms-apps://itunes.apple.com/app/id1470929705';
        }

        this.showDownloadAppNoticeModal(message, link);
    }

    /**
     * Show a modal warning the user that he should use the current Moodle app.
     *
     * @param message The warning message.
     */
    protected showMoodleAppNoticeModal(message: string): void {
        let link;

        if (this.appProvider.isWindows()) {
            link = 'https://download.moodle.org/desktop/download.php?platform=windows';
        } else if (this.appProvider.isLinux()) {
            link = 'https://download.moodle.org/desktop/download.php?platform=linux&arch=' +
                    (this.appProvider.is64Bits() ? '64' : '32');
        } else if (this.appProvider.isMac()) {
            link = 'itms-apps://itunes.apple.com/app/id1255924440';
        } else if (this.platform.is('android')) {
            link = 'market://details?id=com.moodle.moodlemobile';
        } else if (this.platform.is('ios')) {
            link = 'itms-apps://itunes.apple.com/app/id633359593';
        }

        this.showDownloadAppNoticeModal(message, link);
    }

    /**
     * Show a modal warning the user that he should use a different app.
     *
     * @param message The warning message.
     * @param link Link to the app to download if any.
     */
    protected showDownloadAppNoticeModal(message: string, link?: string): void {
        const buttons: any[] = [
                {
                    text: this.translate.instant('core.ok'),
                    role: 'cancel'
                }
            ];

        if (link) {
            buttons.push({
                text: this.translate.instant('core.download'),
                handler: (): void => {
                    this.utils.openInBrowser(link);
                }
            });
        }

        const alert = this.alertCtrl.create({
                message: message,
                buttons: buttons
            });

        alert.present().then(() => {
            const isDevice = this.platform.is('android') || this.platform.is('ios');
            if (!isDevice) {
                // Treat all anchors so they don't override the app.
                const alertMessageEl: HTMLElement = alert.pageRef().nativeElement.querySelector('.alert-message');
                this.domUtils.treatAnchors(alertMessageEl);
            }
        });
    }

    /**
     * Show a modal to inform the user that a confirmation email was sent, and a button to resend the email on 3.6+ sites.
     *
     * @param siteUrl Site URL.
     * @param email Email of the user. If set displayed in the message.
     * @param username Username. If not set the button to resend email will not be shown.
     * @param password User password. If not set the button to resend email will not be shown.
     */
    protected showNotConfirmedModal(siteUrl: string, email?: string, username?: string, password?: string): void {
        const title = this.translate.instant('core.login.mustconfirm');
        let message;
        if (email) {
            message = this.translate.instant('core.login.emailconfirmsent', { $a: email });
        } else {
            message = this.translate.instant('core.login.emailconfirmsentnoemail');
        }

        // Check whether we need to display the resend button or not.
        let promise;
        if (username && password) {
            const modal = this.domUtils.showModalLoading();
            // We don't have site info before login, the only way to check if the WS is available is by calling it.
            const preSets = { siteUrl };
            promise = this.wsProvider.callAjax('core_auth_resend_confirmation_email', {}, preSets).catch((error) => {
                // If the WS responds with an invalid parameter error it means the WS is avaiable.
                return Promise.resolve(error && error.errorcode === 'invalidparameter');
            }).finally(() => {
                modal.dismiss();
            });
        } else {
            promise = Promise.resolve(false);
        }

        promise.then((canResend) => {
            if (canResend) {
                const okText = this.translate.instant('core.login.resendemail');
                const cancelText = this.translate.instant('core.close');

                this.domUtils.showConfirm(message, title, okText, cancelText).then(() => {
                    // Call the WS to resend the confirmation email.
                    const modal = this.domUtils.showModalLoading('core.sending', true);
                    const data = { username, password };
                    const preSets = { siteUrl };
                    this.wsProvider.callAjax('core_auth_resend_confirmation_email', data, preSets).then((response) => {
                        const message = this.translate.instant('core.login.emailconfirmsentsuccess');
                        this.domUtils.showAlert(this.translate.instant('core.success'), message);
                    }).catch((error) => {
                        this.domUtils.showErrorModal(error);
                    }).finally(() => {
                        modal.dismiss();
                    });
                }).catch(() => {
                    // Dialog dismissed.
                });
            } else {
                this.domUtils.showAlert(title, message);
            }
        });
    }

    /**
     * Function called when site policy is not agreed. Reserved for core use.
     *
     * @param siteId Site ID. If not defined, current site.
     */
    sitePolicyNotAgreed(siteId?: string): void {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();
        if (!siteId || siteId != this.sitesProvider.getCurrentSiteId()) {
            // Only current site allowed.
            return;
        }

        if (!this.sitesProvider.wsAvailableInCurrentSite('core_user_agree_site_policy')) {
            // WS not available, stop.
            return;
        }

        const rootNavCtrl = this.appProvider.getRootNavController(),
            activePage = rootNavCtrl.getActive();

        // If current page is already site policy, stop.
        if (activePage && activePage.component && activePage.component.name == 'CoreLoginSitePolicyPage') {
            return;
        }

        rootNavCtrl.setRoot('CoreLoginSitePolicyPage', { siteId: siteId });
    }

    /**
     * Convenient helper to handle get User Token error. It redirects to change password page if forcepassword is set.
     *
     * @param siteUrl Site URL to construct change password URL.
     * @param error Error object containing errorcode and error message.
     * @param username Username.
     * @param password User password.
     */
    treatUserTokenError(siteUrl: string, error: any, username?: string, password?: string): void {
        if (error.errorcode == 'forcepasswordchangenotice') {
            this.openChangePassword(siteUrl, this.textUtils.getErrorMessageFromError(error));
        } else if (error.errorcode == 'usernotconfirmed') {
            this.showNotConfirmedModal(siteUrl, undefined, username, password);
        } else if (error.errorcode == 'connecttomoodleapp') {
            this.showMoodleAppNoticeModal(this.textUtils.getErrorMessageFromError(error));
        } else if (error.errorcode == 'connecttoworkplaceapp') {
            this.showWorkplaceNoticeModal(this.textUtils.getErrorMessageFromError(error));
        } else {
            this.domUtils.showErrorModal(error);
        }
    }

    /**
     * Convenient helper to validate a browser SSO login.
     *
     * @param url URL received, to be validated.
     * @return Promise resolved on success.
     */
    validateBrowserSSOLogin(url: string): Promise<CoreLoginSSOData> {
        // Split signature:::token
        const params = url.split(':::');

        return this.configProvider.get(CoreConstants.LOGIN_LAUNCH_DATA).then((data): any => {
            data = this.textUtils.parseJSON(data, null);
            if (data === null) {
                return Promise.reject(null);
            }

            const passport = data.passport;
            let launchSiteURL = data.siteUrl;

            // Reset temporary values.
            this.configProvider.delete(CoreConstants.LOGIN_LAUNCH_DATA);

            // Validate the signature.
            // We need to check both http and https.
            let signature = <string> Md5.hashAsciiStr(launchSiteURL + passport);
            if (signature != params[0]) {
                if (launchSiteURL.indexOf('https://') != -1) {
                    launchSiteURL = launchSiteURL.replace('https://', 'http://');
                } else {
                    launchSiteURL = launchSiteURL.replace('http://', 'https://');
                }
                signature = <string> Md5.hashAsciiStr(launchSiteURL + passport);
            }

            if (signature == params[0]) {
                this.logger.debug('Signature validated');

                return {
                    siteUrl: launchSiteURL,
                    token: params[1],
                    privateToken: params[2],
                    pageName: data.pageName,
                    pageParams: data.pageParams
                };
            } else {
                this.logger.debug('Invalid signature in the URL request yours: ' + params[0] + ' mine: '
                    + signature + ' for passport ' + passport);

                return Promise.reject(this.translate.instant('core.unexpectederror'));
            }
        });
    }
}
