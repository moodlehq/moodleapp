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

import { Injectable, SecurityContext } from '@angular/core';
import { Params } from '@angular/router';
import { Md5 } from 'ts-md5/dist/md5';

import { CoreApp, CoreStoreConfig } from '@services/app';
import { CoreConfig } from '@services/config';
import { CoreEvents, CoreEventSessionExpiredData, CoreEventSiteData } from '@singletons/events';
import { CoreSites, CoreLoginSiteInfo, CoreSiteBasicInfo } from '@services/sites';
import { CoreWS, CoreWSExternalWarning } from '@services/ws';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreTextUtils } from '@services/utils/text';
import { CoreUrlParams, CoreUrlUtils } from '@services/utils/url';
import { CoreUtils } from '@services/utils/utils';
import { CoreConstants } from '@/core/constants';
import { CoreSite, CoreSiteIdentityProvider, CoreSitePublicConfigResponse, CoreSiteQRCodeType } from '@classes/site';
import { CoreError } from '@classes/errors/error';
import { CoreWSError } from '@classes/errors/wserror';
import { DomSanitizer, makeSingleton, Translate } from '@singletons';
import { CoreLogger } from '@singletons/logger';
import { CoreUrl } from '@singletons/url';
import { CoreNavigator, CoreRedirectPayload } from '@services/navigator';
import { CoreCanceledError } from '@classes/errors/cancelederror';
import { CoreCustomURLSchemes } from '@services/urlschemes';
import { CorePushNotifications } from '@features/pushnotifications/services/pushnotifications';
import { CorePath } from '@singletons/path';
import { CorePromisedValue } from '@classes/promised-value';
import { SafeHtml } from '@angular/platform-browser';
import { CoreLoginError } from '@classes/errors/loginerror';

const PASSWORD_RESETS_CONFIG_KEY = 'password-resets';

export const GET_STARTED_URL = 'https://moodle.com';

/**
 * Helper provider that provides some common features regarding authentication.
 */
@Injectable({ providedIn: 'root' })
export class CoreLoginHelperProvider {

    /**
     * @deprecated since 3.9.5.
     */
    static readonly OPEN_COURSE = 'open_course';

    static readonly ONBOARDING_DONE = 'onboarding_done';
    static readonly FAQ_URL_IMAGE_HTML = '<img src="assets/img/login/faq_url.png" role="presentation" alt="">';
    static readonly FAQ_QRCODE_IMAGE_HTML = '<img src="assets/img/login/faq_qrcode.png" role="presentation" alt="">';

    protected logger: CoreLogger;
    protected sessionExpiredCheckingSite: Record<string, boolean> = {};
    protected isOpenEditAlertShown = false;
    protected waitingForBrowser?: CorePromisedValue<void>;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreLoginHelper');
    }

    /**
     * Initialize service.
     */
    async initialize(): Promise<void> {
        this.cleanUpPasswordResets();
    }

    /**
     * Accept site policy.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if success, rejected if failure.
     */
    async acceptSitePolicy(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const result = await site.write<AgreeSitePolicyResult>('core_user_agree_site_policy', {});

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
                throw new CoreWSError(result.warnings[0]);
            } else {
                throw new CoreError('Cannot agree site policy');
            }
        }
    }

    /**
     * Check if a site allows requesting a password reset through the app.
     *
     * @param siteUrl URL of the site.
     * @returns Promise resolved with boolean: whether can be done through the app.
     */
    async canRequestPasswordReset(siteUrl: string): Promise<boolean> {
        try {
            await this.requestPasswordReset(siteUrl);

            return true;
        } catch (error) {
            return error.available == 1 || (error.errorcode && error.errorcode != 'invalidrecord');
        }
    }

    /**
     * Function called when an SSO InAppBrowser is closed or the app is resumed. Check if user needs to be logged out.
     */
    checkLogout(): void {
        const currentSite = CoreSites.getCurrentSite();

        if (
            !CoreApp.isSSOAuthenticationOngoing() &&
            currentSite?.isLoggedOut() &&
            CoreNavigator.isCurrent('/login/reconnect')
        ) {
            // User must reauthenticate but he closed the InAppBrowser without doing so, logout him.
            CoreSites.logout();
        }
    }

    /**
     * Show a confirm modal if needed and open a browser to perform SSO login.
     *
     * @param siteUrl URL of the site where the SSO login will be performed.
     * @param typeOfLogin CoreConstants.LOGIN_SSO_CODE or CoreConstants.LOGIN_SSO_INAPP_CODE.
     * @param service The service to use. If not defined, core service will be used.
     * @param launchUrl The URL to open for SSO. If not defined, default tool mobile launch URL will be used.
     * @param redirectData Data of the path/url to open once authenticated. If not defined, site initial page.
     * @returns Promise resolved when done or if user cancelled.
     */
    async confirmAndOpenBrowserForSSOLogin(
        siteUrl: string,
        typeOfLogin: number,
        service?: string,
        launchUrl?: string,
        redirectData?: CoreRedirectPayload,
    ): Promise<void> {
        // Show confirm only if it's needed. Treat "false" (string) as false to prevent typing errors.
        const showConfirmation = this.shouldShowSSOConfirm(typeOfLogin);

        if (showConfirmation) {
            try {
                await CoreDomUtils.showConfirm(Translate.instant('core.login.logininsiterequired'));
            } catch {
                // User canceled, stop.
                return;
            }
        }

        this.openBrowserForSSOLogin(siteUrl, typeOfLogin, service, launchUrl, redirectData);
    }

    /**
     * Helper function to act when the forgotten password is clicked.
     *
     * @param siteUrl Site URL.
     * @param username Username.
     * @param siteConfig Site config.
     */
    async forgottenPasswordClicked(siteUrl: string, username: string, siteConfig?: CoreSitePublicConfigResponse): Promise<void> {
        if (siteConfig && siteConfig.forgottenpasswordurl) {
            // URL set, open it.
            CoreUtils.openInApp(siteConfig.forgottenpasswordurl);

            return;
        }

        // Check if password reset can be done through the app.
        const modal = await CoreDomUtils.showModalLoading();

        try {
            const canReset = await this.canRequestPasswordReset(siteUrl);

            if (canReset) {
                await CoreNavigator.navigate('/login/forgottenpassword', {
                    params: {
                        siteUrl,
                        siteConfig,
                        username,
                    },
                });
            } else {
                this.openForgottenPassword(siteUrl);
            }
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Format profile fields, filtering the ones that shouldn't be shown on signup and classifying them in categories.
     *
     * @param profileFields Profile fields to format.
     * @returns Categories with the fields to show in each one.
     */
    formatProfileFieldsForSignup(profileFields?: AuthEmailSignupProfileField[]): AuthEmailSignupProfileFieldsCategory[] {
        if (!profileFields) {
            return [];
        }

        const categories: Record<number, AuthEmailSignupProfileFieldsCategory> = {};

        profileFields.forEach((field) => {
            if (!field.signup || !field.categoryid) {
                // Not a signup field, ignore it.
                return;
            }

            if (!categories[field.categoryid]) {
                categories[field.categoryid] = {
                    id: field.categoryid,
                    name: field.categoryname || '',
                    fields: [],
                };
            }

            categories[field.categoryid].fields.push(field);
        });

        return Object.keys(categories).map((index) => categories[Number(index)]);
    }

    /**
     * Get disabled features from a site public config.
     *
     * @param config Site public config.
     * @returns Disabled features.
     */
    getDisabledFeatures(config?: CoreSitePublicConfigResponse): string {
        const disabledFeatures = config?.tool_mobile_disabledfeatures;
        if (!disabledFeatures) {
            return '';
        }

        return CoreTextUtils.treatDisabledFeatures(disabledFeatures);
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
     * @returns Object with the errors.
     */
    getErrorMessages(
        requiredMsg?: string,
        emailMsg?: string,
        patternMsg?: string,
        urlMsg?: string,
        minlengthMsg?: string,
        maxlengthMsg?: string,
        minMsg?: string,
        maxMsg?: string,
    ): Record<string, string> {
        const errors: Record<string, string> = {};

        if (requiredMsg) {
            errors.required = errors.requiredTrue = Translate.instant(requiredMsg);
        }
        if (emailMsg) {
            errors.email = Translate.instant(emailMsg);
        }
        if (patternMsg) {
            errors.pattern = Translate.instant(patternMsg);
        }
        if (urlMsg) {
            errors.url = Translate.instant(urlMsg);
        }
        if (minlengthMsg) {
            errors.minlength = Translate.instant(minlengthMsg);
        }
        if (maxlengthMsg) {
            errors.maxlength = Translate.instant(maxlengthMsg);
        }
        if (minMsg) {
            errors.min = Translate.instant(minMsg);
        }
        if (maxMsg) {
            errors.max = Translate.instant(maxMsg);
        }

        return errors;
    }

    /**
     * Get logo URL from a site public config.
     *
     * @param config Site public config.
     * @returns Logo URL.
     */
    getLogoUrl(config: CoreSitePublicConfigResponse): string | undefined {
        return !CoreConstants.CONFIG.forceLoginLogo && config ? (config.logourl || config.compactlogourl) : undefined;
    }

    /**
     * Returns the logout label of a site.
     *
     * @param site Site. If not defined, use current site.
     * @returns The string key.
     */
    getLogoutLabel(site?: CoreSite): string {
        site = site || CoreSites.getCurrentSite();
        const config = site?.getStoredConfig();

        return 'core.mainmenu.' + (config && config.tool_mobile_forcelogout == '1' ? 'logout' : 'switchaccount');
    }

    /**
     * Get the OAuth ID of some URL params (if it has an OAuth ID).
     *
     * @param params Params.
     * @returns OAuth ID.
     */
    getOAuthIdFromParams(params?: CoreUrlParams): number | undefined {
        return params && params.oauthsso !== undefined ? Number(params.oauthsso) : undefined;
    }

    /**
     * Get the site policy.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the site policy.
     */
    async getSitePolicy(siteId?: string): Promise<string> {
        const site = await CoreSites.getSite(siteId);

        let sitePolicy: string | undefined;

        try {
            // Try to get the latest config, maybe the site policy was just added or has changed.
            sitePolicy = await site.getConfig('sitepolicy', true);
        } catch (error) {
            // Cannot get config, try to get the site policy using auth_email_get_signup_settings.
            const settings = <AuthEmailSignupSettings> await CoreWS.callAjax(
                'auth_email_get_signup_settings',
                {},
                { siteUrl: site.getURL() },
            );

            sitePolicy = settings.sitepolicy;
        }

        if (!sitePolicy) {
            throw new CoreError('Cannot retrieve site policy');
        }

        return sitePolicy;
    }

    /**
     * Get fixed site or sites.
     *
     * @returns Fixed site or list of fixed sites.
     */
    getFixedSites(): string | CoreLoginSiteInfo[] {
        return CoreConstants.CONFIG.siteurl;
    }

    /**
     * Get the valid identity providers from a site config.
     *
     * @param siteConfig Site's public config.
     * @param disabledFeatures List of disabled features already treated. If not provided it will be calculated.
     * @returns Valid identity providers.
     */
    getValidIdentityProviders(siteConfig?: CoreSitePublicConfigResponse, disabledFeatures?: string): CoreSiteIdentityProvider[] {
        if (!siteConfig) {
            return [];
        }
        if (this.isFeatureDisabled('NoDelegate_IdentityProviders', siteConfig, disabledFeatures)) {
            // Identity providers are disabled, return an empty list.
            return [];
        }

        const validProviders: CoreSiteIdentityProvider[] = [];
        const httpUrl = CorePath.concatenatePaths(siteConfig.wwwroot, 'auth/oauth2/');
        const httpsUrl = CorePath.concatenatePaths(siteConfig.httpswwwroot, 'auth/oauth2/');

        if (siteConfig.identityproviders && siteConfig.identityproviders.length) {
            siteConfig.identityproviders.forEach((provider) => {
                const urlParams = CoreUrlUtils.extractUrlParams(provider.url);

                if (provider.url && (provider.url.indexOf(httpsUrl) != -1 || provider.url.indexOf(httpUrl) != -1) &&
                        !this.isFeatureDisabled('NoDelegate_IdentityProvider_' + urlParams.id, siteConfig, disabledFeatures)) {
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
     * @returns Promise resolved when done.
     */
    async goToAddSite(setRoot = false, showKeyboard = false): Promise<void> {
        let path = '/login/sites';
        let params: Params = { openAddSite: true , showKeyboard };

        if (CoreSites.isLoggedIn()) {
            const willReload = await CoreSites.logoutForRedirect(CoreConstants.NO_SITE_ID, {
                redirectPath: path,
                redirectOptions: { params },
            });

            if (willReload) {
                return;
            }
        } else {
            [path, params] = this.getAddSiteRouteInfo(showKeyboard);
        }

        await CoreNavigator.navigate(path, { params, reset: setRoot });
    }

    /**
     * Get path and params to visit the route to add site.
     *
     * @param showKeyboard Whether to show keyboard in the new page. Only if no fixed URL set.
     * @returns Path and params.
     */
    getAddSiteRouteInfo(showKeyboard?: boolean): [string, Params] {
        if (this.isFixedUrlSet()) {
            // Fixed URL is set, go to credentials page.
            const fixedSites = this.getFixedSites();
            const url = typeof fixedSites == 'string' ? fixedSites : fixedSites[0].url;

            return ['/login/credentials', { siteUrl: url }];
        }

        return ['/login/site', { showKeyboard }];
    }

    /**
     * Open a page that doesn't belong to any site.
     *
     * @param page Page to open.
     * @param params Params of the page.
     * @returns Promise resolved when done.
     * @deprecated since 3.9.5. Use CoreNavigator.navigateToLoginCredentials instead.
     */
    async goToNoSitePage(page: string, params?: Params): Promise<void> {
        await CoreNavigator.navigateToLoginCredentials(params);
    }

    /**
     * Go to the initial page of a site depending on 'userhomepage' setting.
     *
     * @param navCtrlUnused Deprecated param.
     * @param page Name of the page to load after loading the main page.
     * @param params Params to pass to the page.
     * @param options Navigation options.
     * @param url URL to open once the main menu is loaded.
     * @returns Promise resolved when done.
     * @deprecated since 3.9.5. Use CoreNavigator.navigateToSiteHome or CoreNavigator.navigateToSitePath instead.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async goToSiteInitialPage(navCtrlUnused?: unknown, page?: string, params?: any, options?: any, url?: string): Promise<void> {
        await CoreNavigator.navigateToSiteHome({
            ...options,
            params: <CoreRedirectPayload> {
                redirectPath: page,
                redirectOptions: { params },
                urlToOpen: url,
            },
        });
    }

    /**
     * Convenient helper to handle authentication in the app using a token received by SSO login. If it's a new account,
     * the site is stored and the user is authenticated. If the account already exists, update its token.
     *
     * @param siteUrl Site's URL.
     * @param token User's token.
     * @param privateToken User's private token.
     * @param oauthId OAuth ID. Only if the authentication was using an OAuth method.
     * @returns Promise resolved when the user is authenticated with the token.
     */
    handleSSOLoginAuthentication(siteUrl: string, token: string, privateToken?: string, oauthId?: number): Promise<string> {
        // Always create a new site to prevent overriding data if another user credentials were introduced.
        return CoreSites.newSite(siteUrl, token, privateToken, true, oauthId);
    }

    /**
     * Check if the app is configured to use several fixed URLs.
     *
     * @returns Whether there are several fixed URLs.
     */
    hasSeveralFixedSites(): boolean {
        return !!(CoreConstants.CONFIG.siteurl && Array.isArray(CoreConstants.CONFIG.siteurl) &&
            CoreConstants.CONFIG.siteurl.length > 1);
    }

    /**
     * Given a site public config, check if email signup is disabled.
     *
     * @param config Site public config.
     * @param disabledFeatures List of disabled features already treated. If not provided it will be calculated.
     * @returns Whether email signup is disabled.
     */
    isEmailSignupDisabled(config?: CoreSitePublicConfigResponse, disabledFeatures?: string): boolean {
        return this.isFeatureDisabled('CoreLoginEmailSignup', config, disabledFeatures);
    }

    /**
     * Given a site public config, check if a certian feature is disabled.
     *
     * @param feature Feature to check.
     * @param config Site public config.
     * @param disabledFeatures List of disabled features already treated. If not provided it will be calculated.
     * @returns Whether email signup is disabled.
     */
    isFeatureDisabled(feature: string, config?: CoreSitePublicConfigResponse, disabledFeatures?: string): boolean {
        if (disabledFeatures === undefined) {
            disabledFeatures = this.getDisabledFeatures(config);
        }

        const regEx = new RegExp('(,|^)' + feature + '(,|$)', 'g');

        return !!disabledFeatures.match(regEx);
    }

    /**
     * Check if the app is configured to use a fixed URL (only 1).
     *
     * @returns Whether there is 1 fixed URL.
     */
    isFixedUrlSet(): boolean {
        if (Array.isArray(CoreConstants.CONFIG.siteurl)) {
            return CoreConstants.CONFIG.siteurl.length == 1;
        }

        return !!CoreConstants.CONFIG.siteurl;
    }

    /**
     * Given a site public config, check if forgotten password is disabled.
     *
     * @param config Site public config.
     * @param disabledFeatures List of disabled features already treated. If not provided it will be calculated.
     * @returns Whether it's disabled.
     */
    isForgottenPasswordDisabled(config?: CoreSitePublicConfigResponse, disabledFeatures?: string): boolean {
        return this.isFeatureDisabled('NoDelegate_ForgottenPassword', config, disabledFeatures);
    }

    /**
     * Check if current site is logged out, triggering session expired event if it is.
     *
     * @param redirectData Data of the path/url to open once authenticated if logged out. If not defined, site initial page.
     * @returns True if user is logged out, false otherwise.
     */
    isSiteLoggedOut(redirectData?: CoreRedirectPayload): boolean {
        const site = CoreSites.getCurrentSite();
        if (!site) {
            return false;
        }

        if (site.isLoggedOut()) {
            CoreEvents.trigger(CoreEvents.SESSION_EXPIRED, redirectData || {}, site.getId());

            return true;
        }

        return false;
    }

    /**
     * Check if a site URL is "allowed". In case the app has fixed sites, only those will be allowed to connect to.
     *
     * @param siteUrl Site URL to check.
     * @param checkSiteFinder Whether to check site finder if needed. Defaults to true.
     * @returns Promise resolved with boolean: whether is one of the fixed sites.
     */
    async isSiteUrlAllowed(siteUrl: string, checkSiteFinder = true): Promise<boolean> {
        if (this.isFixedUrlSet()) {
            // Only 1 site allowed.
            return CoreUrl.sameDomainAndPath(siteUrl, <string> this.getFixedSites());
        } else if (this.hasSeveralFixedSites()) {
            const sites = <CoreLoginSiteInfo[]> this.getFixedSites();

            return sites.some((site) => CoreUrl.sameDomainAndPath(siteUrl, site.url));
        } else if (CoreConstants.CONFIG.multisitesdisplay == 'sitefinder' && CoreConstants.CONFIG.onlyallowlistedsites &&
                checkSiteFinder) {
            // Call the sites finder to validate the site.
            const result = await CoreSites.findSites(siteUrl.replace(/^https?:\/\/|\.\w{2,3}\/?$/g, ''));

            return result && result.some((site) => CoreUrl.sameDomainAndPath(siteUrl, site.url));
        } else {
            // No fixed sites or it uses a non-restrictive sites finder. Allow connecting.
            return true;
        }
    }

    /**
     * Check if SSO login should use an embedded browser.
     *
     * @param code Code to check.
     * @returns True if embedded browser, false othwerise.
     */
    isSSOEmbeddedBrowser(code: number): boolean {
        return code == CoreConstants.LOGIN_SSO_INAPP_CODE;
    }

    /**
     * Check if SSO login is needed based on code returned by the WS.
     *
     * @param code Code to check.
     * @returns True if SSO login is needed, false othwerise.
     */
    isSSOLoginNeeded(code: number): boolean {
        return code == CoreConstants.LOGIN_SSO_CODE || code == CoreConstants.LOGIN_SSO_INAPP_CODE;
    }

    /**
     * Load a certain page in the main menu page.
     *
     * @param page Name of the page to load.
     * @param params Params to pass to the page.
     * @deprecated since 3.9.5. Use CoreNavigator.navigateToSitepath instead.
     */
    loadPageInMainMenu(page: string, params?: Params): void {
        CoreNavigator.navigateToSitePath(page, { params });
    }

    /**
     * Open a browser to perform OAuth login (Google, Facebook, Microsoft).
     *
     * @param siteUrl URL of the site where the login will be performed.
     * @param provider The identity provider.
     * @param launchUrl The URL to open for SSO. If not defined, tool/mobile launch URL will be used.
     * @param redirectData Data of the path/url to open once authenticated. If not defined, site initial page.
     * @returns True if success, false if error.
     */
    openBrowserForOAuthLogin(
        siteUrl: string,
        provider: CoreSiteIdentityProvider,
        launchUrl?: string,
        redirectData?: CoreRedirectPayload,
    ): boolean {
        launchUrl = launchUrl || siteUrl + '/admin/tool/mobile/launch.php';
        if (!provider || !provider.url) {
            return false;
        }

        const params = CoreUrlUtils.extractUrlParams(provider.url);

        if (!params.id) {
            return false;
        }

        const loginUrl = this.prepareForSSOLogin(siteUrl, undefined, launchUrl, redirectData, {
            oauthsso: params.id,
        });

        // Always open it in browser because the user might have the session stored in there.
        CoreUtils.openInBrowser(loginUrl, { showBrowserWarning: false });
        CoreApp.closeApp();

        return true;
    }

    /**
     * Open a browser to perform SSO login.
     *
     * @param siteUrl URL of the site where the SSO login will be performed.
     * @param typeOfLogin CoreConstants.LOGIN_SSO_CODE or CoreConstants.LOGIN_SSO_INAPP_CODE.
     * @param service The service to use. If not defined, core service will be used.
     * @param launchUrl The URL to open for SSO. If not defined, default tool mobile launch URL will be used.
     * @param redirectData Data of the path/url to open once authenticated. If not defined, site initial page.
     */
    openBrowserForSSOLogin(
        siteUrl: string,
        typeOfLogin: number,
        service?: string,
        launchUrl?: string,
        redirectData?: CoreRedirectPayload,
    ): void {
        const loginUrl = this.prepareForSSOLogin(siteUrl, service, launchUrl, redirectData);

        if (this.isSSOEmbeddedBrowser(typeOfLogin)) {
            CoreUtils.openInApp(loginUrl, {
                clearsessioncache: 'yes', // Clear the session cache to allow for multiple logins.
                closebuttoncaption: Translate.instant('core.login.cancel'),
            });
        } else {
            CoreUtils.openInBrowser(loginUrl, { showBrowserWarning: false });
            CoreApp.closeApp();
        }
    }

    /**
     * Convenient helper to open change password page.
     *
     * @param siteUrl Site URL to construct change password URL.
     * @param error Error message.
     * @returns Promise resolved when done.
     */
    async openChangePassword(siteUrl: string, error: string): Promise<void> {
        const alert = await CoreDomUtils.showAlert(Translate.instant('core.notice'), error, undefined, 3000);

        await alert.onDidDismiss();

        CoreUtils.openInApp(siteUrl + '/login/change_password.php');
    }

    /**
     * Open forgotten password in inappbrowser.
     *
     * @param siteUrl URL of the site.
     */
    openForgottenPassword(siteUrl: string): void {
        CoreUtils.openInApp(siteUrl + '/login/forgot_password.php');
    }

    /**
     * Function to open in app browser to change password or complete user profile.
     *
     * @param siteId The site ID.
     * @param path The relative path of the URL to open.
     * @param alertMessage The key of the message to display before opening the in app browser.
     * @param invalidateCache Whether to invalidate site's cache (e.g. when the user is forced to change password).
     * @returns Promise resolved when done.
     */
    async openInAppForEdit(siteId: string, path: string, alertMessage?: string, invalidateCache?: boolean): Promise<void> {
        if (!siteId || siteId !== CoreSites.getCurrentSiteId()) {
            // Site that triggered the event is not current site, nothing to do.
            return;
        }

        const currentSite = CoreSites.getCurrentSite();
        const siteUrl = currentSite?.getURL();

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
                alertMessage = Translate.instant(alertMessage) + '<br>' +
                    Translate.instant('core.redirectingtosite');
            }

            try {
                await currentSite.openInAppWithAutoLogin(siteUrl + path, undefined, alertMessage);
            } finally {
                this.isOpenEditAlertShown = false;
            }

            await this.waitForBrowser();

            CoreEvents.trigger(CoreEvents.COMPLETE_REQUIRED_PROFILE_DATA_FINISHED, {
                path,
            }, siteId);
        }
    }

    /**
     * Function that should be called when password change is forced. Reserved for core use.
     *
     * @param siteId The site ID. Undefined for current site.
     */
    async passwordChangeForced(siteId?: string): Promise<void> {
        const currentSite = CoreSites.getCurrentSite();
        siteId = siteId ?? currentSite?.getId();

        if (!currentSite || siteId !== currentSite.getId()) {
            return; // Site that triggered the event is not current site.
        }

        // If current page is already change password, stop.
        if (CoreNavigator.isCurrent('/login/changepassword')) {
            return;
        }

        await CoreNavigator.navigate('/login/changepassword', { params: { siteId }, reset: true });
    }

    /**
     * Prepare the app to perform SSO login.
     *
     * @param siteUrl URL of the site where the SSO login will be performed.
     * @param service The service to use. If not defined, core service will be used.
     * @param launchUrl The URL to open for SSO. If not defined, default tool mobile launch URL will be used.
     * @param redirectData Redirect dataof the page to go once authenticated. If not defined, site initial page.
     * @param urlParams Other params to add to the URL.
     * @returns Login Url.
     */
    prepareForSSOLogin(
        siteUrl: string,
        service?: string,
        launchUrl?: string,
        redirectData: CoreRedirectPayload = {},
        urlParams?: CoreUrlParams,
    ): string {

        service = service || CoreConstants.CONFIG.wsservice;
        launchUrl = launchUrl || siteUrl + '/admin/tool/mobile/launch.php';

        const passport = Math.random() * 1000;
        let loginUrl = launchUrl + '?service=' + service;

        loginUrl += '&passport=' + passport;
        loginUrl += '&urlscheme=' + CoreConstants.CONFIG.customurlscheme;

        if (urlParams) {
            loginUrl = CoreUrlUtils.addParamsToUrl(loginUrl, urlParams);
        }

        // Store the siteurl and passport in CoreConfigProvider for persistence.
        // We are "configuring" the app to wait for an SSO. CoreConfigProvider shouldn't be used as a temporary storage.
        CoreConfig.set(CoreConstants.LOGIN_LAUNCH_DATA, JSON.stringify(<StoredLoginLaunchData> {
            siteUrl: siteUrl,
            passport: passport,
            ...redirectData,
            ssoUrlParams: urlParams || {},
        }));

        return loginUrl;
    }

    /**
     * Redirect to a new page, setting it as the root page and loading the right site if needed.
     *
     * @param page Name of the page to load.
     * @param params Params to pass to the page.
     * @param siteId Site to load. If not defined, current site.
     * @returns Promise resolved when done.
     * @deprecated since 3.9.5. Use CoreNavigator.navigateToSitePath instead.
     */
    async redirect(page: string, params?: Params, siteId?: string): Promise<void> {
        await CoreNavigator.navigateToSitePath(page, { params, siteId });
    }

    /**
     * Request a password reset.
     *
     * @param siteUrl URL of the site.
     * @param username Username to search.
     * @param email Email to search.
     * @returns Promise resolved when done.
     */
    requestPasswordReset(siteUrl: string, username?: string, email?: string): Promise<CoreLoginRequestPasswordResetResult> {
        const params: Record<string, string> = {};

        if (username) {
            params.username = username;
        }

        if (email) {
            params.email = email;
        }

        return CoreWS.callAjax('core_auth_request_password_reset', params, { siteUrl });
    }

    /**
     * Function that should be called when the session expires. Reserved for core use.
     *
     * @param data Data received by the SESSION_EXPIRED event.
     * @returns Promise resolved when done.
     */
    async sessionExpired(data: CoreEventSessionExpiredData & CoreEventSiteData): Promise<void> {
        const siteId = data?.siteId;
        const currentSite = CoreSites.getCurrentSite();
        const siteUrl = currentSite?.getURL();

        if (!currentSite || !siteUrl) {
            return;
        }

        if (siteId && siteId !== currentSite.getId()) {
            return; // Site that triggered the event is not current site.
        }

        if (this.sessionExpiredCheckingSite[siteId || '']) {
            return; // Operation pending.
        }

        this.sessionExpiredCheckingSite[siteId || ''] = true;
        const redirectData: CoreRedirectPayload = {
            redirectPath: data.redirectPath,
            redirectOptions: data.redirectOptions,
            urlToOpen: data.urlToOpen,
        };

        try {
            // Check authentication method.
            const result = await CoreSites.checkSite(siteUrl);

            if (this.isSSOLoginNeeded(result.code)) {
                // SSO. User needs to authenticate in a browser. Check if we need to display a message.
                if (!CoreApp.isSSOAuthenticationOngoing() && !this.waitingForBrowser) {
                    try {
                        if (this.shouldShowSSOConfirm(result.code)) {
                            await CoreDomUtils.showConfirm(Translate.instant('core.login.' +
                                (currentSite.isLoggedOut() ? 'loggedoutssodescription' : 'reconnectssodescription')));
                        }

                        this.waitForBrowser();

                        this.openBrowserForSSOLogin(
                            result.siteUrl,
                            result.code,
                            result.service,
                            result.config?.launchurl,
                            redirectData,
                        );
                    } catch (error) {
                        // User cancelled, logout him.
                        CoreSites.logout();
                    }
                }
            } else {
                if (currentSite.isOAuth()) {
                    // User authenticated using an OAuth method. Check if it's still valid.
                    const identityProviders = this.getValidIdentityProviders(result.config);
                    const providerToUse = identityProviders.find((provider) => {
                        const params = CoreUrlUtils.extractUrlParams(provider.url);

                        return Number(params.id) == currentSite.getOAuthId();
                    });

                    if (providerToUse) {
                        if (!CoreApp.isSSOAuthenticationOngoing() && !this.waitingForBrowser) {
                            // Open browser to perform the OAuth.
                            const confirmMessage = Translate.instant('core.login.' +
                                    (currentSite.isLoggedOut() ? 'loggedoutssodescription' : 'reconnectssodescription'));

                            try {
                                await CoreDomUtils.showConfirm(confirmMessage);

                                this.waitForBrowser();
                                CoreSites.unsetCurrentSite(); // Unset current site to make authentication work fine.

                                this.openBrowserForOAuthLogin(
                                    siteUrl,
                                    providerToUse,
                                    result.config?.launchurl,
                                    redirectData,
                                );
                            } catch (error) {
                                // User cancelled, logout him.
                                CoreSites.logout();
                            }
                        }

                        return;
                    }
                }

                const info = currentSite.getInfo();
                if (info !== undefined && info.username !== undefined) {
                    // If current page is already reconnect, stop.
                    if (CoreNavigator.isCurrent('/login/reconnect')) {
                        return;
                    }

                    await CoreUtils.ignoreErrors(CoreNavigator.navigate('/login/reconnect', {
                        params: {
                            siteId,
                            ...redirectData,
                        },
                        reset: true,
                    }));
                }
            }
        } catch (error) {
            // Error checking site.
            if (currentSite.isLoggedOut()) {
                // Site is logged out, show error and logout the user.
                CoreDomUtils.showErrorModalDefault(error, 'core.networkerrormsg', true);
                CoreSites.logout();
            }
        } finally {
            this.sessionExpiredCheckingSite[siteId || ''] = false;
        }
    }

    /**
     * Check if a confirm should be shown to open a SSO authentication.
     *
     * @param typeOfLogin CoreConstants.LOGIN_SSO_CODE or CoreConstants.LOGIN_SSO_INAPP_CODE.
     * @returns True if confirm modal should be shown, false otherwise.
     */
    shouldShowSSOConfirm(typeOfLogin: number): boolean {
        return !this.isSSOEmbeddedBrowser(typeOfLogin) &&
            (!CoreConstants.CONFIG.skipssoconfirmation || String(CoreConstants.CONFIG.skipssoconfirmation) === 'false');
    }

    /**
     * Show a modal warning that the credentials introduced were not correct.
     */
    protected showInvalidLoginModal(error: CoreLoginError): void {
        CoreDomUtils.showErrorModal(error.errorDetails ?? error.message);
    }

    /**
     * Show a modal warning the user that he should use the Workplace app.
     *
     * @param message The warning message.
     */
    protected showWorkplaceNoticeModal(message: string): void {
        const link = CoreApp.getAppStoreUrl({ android: 'com.moodle.workplace', ios: 'id1470929705' });

        CoreDomUtils.showDownloadAppNoticeModal(message, link);
    }

    /**
     * Show a modal warning the user that he should use the current Moodle app.
     *
     * @param message The warning message.
     */
    protected showMoodleAppNoticeModal(message: string): void {
        const storesConfig: CoreStoreConfig = CoreConstants.CONFIG.appstores;
        storesConfig.mobile = 'https://download.moodle.org/mobile/';
        storesConfig.default = 'https://download.moodle.org/mobile/';

        const link = CoreApp.getAppStoreUrl(storesConfig);

        CoreDomUtils.showDownloadAppNoticeModal(message, link);
    }

    /**
     * Show a modal to inform the user that a confirmation email was sent, and a button to resend the email on 3.6+ sites.
     *
     * @param siteUrl Site URL.
     * @param email Email of the user. If set displayed in the message.
     * @param username Username. If not set the button to resend email will not be shown.
     * @param password User password. If not set the button to resend email will not be shown.
     */
    protected async showNotConfirmedModal(siteUrl: string, email?: string, username?: string, password?: string): Promise<void> {
        const title = Translate.instant('core.login.mustconfirm');
        let message: string;
        let canResend = false;
        if (email) {
            message = Translate.instant('core.login.emailconfirmsent', { $a: email });
        } else {
            message = Translate.instant('core.login.emailconfirmsentnoemail');
        }

        // Check whether we need to display the resend button or not.
        if (username && password) {
            canResend = await this.canResendEmail(siteUrl);
        }

        if (!canResend) {
            // Just display an informative alert.
            await CoreDomUtils.showAlert(title, message);

            return;
        }

        const okText = Translate.instant('core.login.resendemail');
        const cancelText = Translate.instant('core.close');

        try {
            // Ask the user if he wants to resend the email.
            await CoreDomUtils.showConfirm(message, title, okText, cancelText);

            // Call the WS to resend the confirmation email.
            const modal = await CoreDomUtils.showModalLoading('core.sending', true);
            const data = { username, password };
            const preSets = { siteUrl };

            try {
                const result = <ResendConfirmationEmailResult> await CoreWS.callAjax(
                    'core_auth_resend_confirmation_email',
                    data,
                    preSets,
                );

                if (!result.status) {
                    throw new CoreWSError(result.warnings![0]);
                }

                const message = Translate.instant('core.login.emailconfirmsentsuccess');
                CoreDomUtils.showAlert(Translate.instant('core.success'), message);
            } finally {
                modal.dismiss();
            }
        } catch (error) {
            CoreDomUtils.showErrorModal(error);
        }
    }

    /**
     * Check if confirmation email an be resent.
     *
     * @param siteUrl Site URL to check.
     * @returns Promise.
     */
    protected async canResendEmail(siteUrl: string): Promise<boolean> {
        const modal = await CoreDomUtils.showModalLoading();

        // We don't have site info before login, the only way to check if the WS is available is by calling it.
        try {
            // This call will always fail because we aren't sending parameters.
            await CoreWS.callAjax('core_auth_resend_confirmation_email', {}, { siteUrl });

            return true; // We should never reach here.
        } catch (error) {
            // If the WS responds with an invalid parameter error it means the WS is avaiable.
            return error?.errorcode === 'invalidparameter';
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Function called when site policy is not agreed. Reserved for core use.
     *
     * @param siteId Site ID. If not defined, current site.
     */
    sitePolicyNotAgreed(siteId?: string): void {
        siteId = siteId || CoreSites.getCurrentSiteId();
        if (!siteId || siteId != CoreSites.getCurrentSiteId()) {
            // Only current site allowed.
            return;
        }

        // If current page is already site policy, stop.
        if (CoreNavigator.isCurrent('/login/sitepolicy')) {
            return;
        }

        CoreNavigator.navigate('/login/sitepolicy', { params: { siteId }, reset: true });
    }

    /**
     * Convenient helper to handle get User Token error. It redirects to change password page if forcepassword is set.
     *
     * @param siteUrl Site URL to construct change password URL.
     * @param error Error object containing errorcode and error message.
     * @param username Username.
     * @param password User password.
     */
    treatUserTokenError(siteUrl: string, error: CoreWSError, username?: string, password?: string): void {
        switch (error.errorcode) {
            case 'forcepasswordchangenotice':
                this.openChangePassword(siteUrl, CoreTextUtils.getErrorMessageFromError(error)!);
                break;
            case 'usernotconfirmed':
                this.showNotConfirmedModal(siteUrl, undefined, username, password);
                break;
            case 'connecttomoodleapp':
                this.showMoodleAppNoticeModal(CoreTextUtils.getErrorMessageFromError(error)!);
                break;
            case 'connecttoworkplaceapp':
                this.showWorkplaceNoticeModal(CoreTextUtils.getErrorMessageFromError(error)!);
                break;
            case 'invalidlogin':
                this.showInvalidLoginModal(error);
                break;
            default:
                CoreDomUtils.showErrorModal(error);
                break;
        }
    }

    /**
     * Convenient helper to validate a browser SSO login.
     *
     * @param url URL received, to be validated.
     * @returns Promise resolved on success.
     */
    async validateBrowserSSOLogin(url: string): Promise<CoreLoginSSOData> {
        // Split signature:::token
        const params = url.split(':::');

        const serializedData = await CoreConfig.get<string>(CoreConstants.LOGIN_LAUNCH_DATA);

        const data = <StoredLoginLaunchData | null> CoreTextUtils.parseJSON(serializedData, null);
        if (data === null) {
            throw new CoreError('No launch data stored.');
        }

        const passport = data.passport;
        let launchSiteURL = data.siteUrl;

        // Reset temporary values.
        CoreConfig.delete(CoreConstants.LOGIN_LAUNCH_DATA);

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
                redirectPath: data.redirectPath,
                redirectOptions: data.redirectOptions,
                urlToOpen: data.urlToOpen,
                ssoUrlParams: data.ssoUrlParams,
            };
        } else {
            this.logger.debug('Invalid signature in the URL request yours: ' + params[0] + ' mine: '
                + signature + ' for passport ' + passport);

            throw new CoreError(Translate.instant('core.unexpectederror'));
        }
    }

    /**
     * Return whether the app is waiting for browser.
     *
     * @returns Whether the app is waiting for browser.
     */
    isWaitingForBrowser(): boolean {
        return !!this.waitingForBrowser;
    }

    /**
     * Start waiting when opening a browser/IAB.
     *
     * @returns Promise resolved when the app is resumed.
     */
    async waitForBrowser(): Promise<void> {
        if (!this.waitingForBrowser) {
            this.waitingForBrowser = new CorePromisedValue();
        }

        await this.waitingForBrowser;
    }

    /**
     * Stop waiting for browser.
     */
    stopWaitingForBrowser(): void {
        this.waitingForBrowser?.resolve();
        this.waitingForBrowser = undefined;
    }

    /**
     * Check whether the QR reader should be displayed in site screen.
     *
     * @returns Whether the QR reader should be displayed in site screen.
     */
    displayQRInSiteScreen(): boolean {
        return CoreUtils.canScanQR() && (CoreConstants.CONFIG.displayqronsitescreen === undefined ||
            !!CoreConstants.CONFIG.displayqronsitescreen);
    }

    /**
     * Check whether the QR reader should be displayed in credentials screen.
     *
     * @param qrCodeType QR Code type from public config, assuming enabled if undefined.
     * @returns Whether the QR reader should be displayed in credentials screen.
     */
    displayQRInCredentialsScreen(qrCodeType = CoreSiteQRCodeType.QR_CODE_LOGIN): boolean {
        if (!CoreUtils.canScanQR()) {
            return false;
        }

        if ((CoreConstants.CONFIG.displayqroncredentialscreen === undefined && this.isFixedUrlSet()) ||
            (CoreConstants.CONFIG.displayqroncredentialscreen !== undefined &&
                !!CoreConstants.CONFIG.displayqroncredentialscreen)) {

            return qrCodeType == CoreSiteQRCodeType.QR_CODE_LOGIN;
        }

        return false;
    }

    /**
     * Show instructions to scan QR code.
     *
     * @returns Promise resolved if the user accepts to scan QR.
     */
    async showScanQRInstructions(): Promise<void> {
        await new Promise<void>((resolve, reject) => {
            CoreDomUtils.showAlertWithOptions({
                header: Translate.instant('core.login.faqwhereisqrcode'),
                message: Translate.instant(
                    'core.login.faqwhereisqrcodeanswer',
                    { $image: CoreLoginHelperProvider.FAQ_QRCODE_IMAGE_HTML },
                ),
                buttons: [
                    {
                        text: Translate.instant('core.cancel'),
                        role: 'cancel',
                        handler: () => reject(new CoreCanceledError()),
                    },
                    {
                        text: Translate.instant('core.next'),
                        handler: () => resolve(),
                    },
                ],
            });
        });
    }

    /**
     * Scan a QR code and tries to authenticate the user using custom URL scheme.
     *
     * @returns Promise resolved when done.
     */
    async scanQR(): Promise<void> {
        // Scan for a QR code.
        const text = await CoreUtils.scanQR();

        if (text && CoreCustomURLSchemes.isCustomURL(text)) {
            try {
                await CoreCustomURLSchemes.handleCustomURL(text);
            } catch (error) {
                CoreCustomURLSchemes.treatHandleCustomURLError(error);
            }
        } else if (text) {
            // Not a custom URL scheme, check if it's a URL scheme to another app.
            const scheme = CoreUrlUtils.getUrlProtocol(text);

            if (scheme && scheme != 'http' && scheme != 'https') {
                CoreDomUtils.showErrorModal(Translate.instant('core.errorurlschemeinvalidscheme', { $a: text }));
            } else {
                CoreDomUtils.showErrorModal('core.login.errorqrnoscheme', true);
            }
        }
    }

    /**
     * Get the accounts list classified per site.
     *
     * @param currentSiteId If loggedin, current Site Id.
     * @returns Promise resolved with account list.
     */
    async getAccountsList(currentSiteId?: string): Promise<CoreAccountsList> {
        const sites = await CoreUtils.ignoreErrors(CoreSites.getSortedSites(), [] as CoreSiteBasicInfo[]);

        const accountsList: CoreAccountsList = {
            sameSite: [],
            otherSites: [],
            count: sites.length,
        };

        let siteUrl = '';

        if (currentSiteId) {
            const index = sites.findIndex((site) => site.id == currentSiteId);

            accountsList.currentSite = sites.splice(index, 1)[0];
            siteUrl = accountsList.currentSite.siteUrlWithoutProtocol;
        }

        const otherSites: Record<string, CoreSiteBasicInfo[]> = {};

        // Add site counter and classify sites.
        await Promise.all(sites.map(async (site) => {
            site.badge = await CoreUtils.ignoreErrors(CorePushNotifications.getSiteCounter(site.id)) || 0;

            if (site.siteUrlWithoutProtocol == siteUrl) {
                accountsList.sameSite.push(site);
            } else {
                if (!otherSites[site.siteUrlWithoutProtocol]) {
                    otherSites[site.siteUrlWithoutProtocol] = [];
                }

                otherSites[site.siteUrlWithoutProtocol].push(site);
            }

            return;
        }));

        accountsList.otherSites = CoreUtils.objectToArray(otherSites);

        return accountsList;
    }

    /**
     * Find and delete a site from the list of sites.
     *
     * @param accountsList Account list.
     * @param site Site to be deleted.
     * @returns Resolved when done.
     */
    async deleteAccountFromList(accountsList: CoreAccountsList, site: CoreSiteBasicInfo): Promise<void> {
        await CoreSites.deleteSite(site.id);

        const siteUrl = site.siteUrlWithoutProtocol;
        let index = 0;

        // Found on same site.
        if (accountsList.sameSite.length > 0 && accountsList.sameSite[0].siteUrlWithoutProtocol == siteUrl) {
            index = accountsList.sameSite.findIndex((listedSite) => listedSite.id == site.id);
            if (index >= 0) {
                accountsList.sameSite.splice(index, 1);
                accountsList.count--;
            }

            return;
        }

        const otherSiteIndex = accountsList.otherSites.findIndex((sites) =>
            sites.length > 0 && sites[0].siteUrlWithoutProtocol == siteUrl);
        if (otherSiteIndex < 0) {
            // Site Url not found.
            return;
        }

        index = accountsList.otherSites[otherSiteIndex].findIndex((listedSite) => listedSite.id == site.id);
        if (index >= 0) {
            accountsList.otherSites[otherSiteIndex].splice(index, 1);
            accountsList.count--;
        }

        if (accountsList.otherSites[otherSiteIndex].length == 0) {
            accountsList.otherSites.splice(otherSiteIndex, 1);
        }
    }

    /**
     * Get reconnect page route module.
     *
     * @returns Reconnect page route module.
     */
    async getReconnectRouteModule(): Promise<unknown> {
        return import('@features/login/pages/reconnect/reconnect.module').then(m => m.CoreLoginReconnectPageModule);
    }

    /**
     * Get credentials page route module.
     *
     * @returns Credentials page route module.
     */
    async getCredentialsRouteModule(): Promise<unknown> {
        return import('@features/login/pages/credentials/credentials.module').then(m => m.CoreLoginCredentialsPageModule);
    }

    /**
     * Retrieve login methods.
     *
     * @returns Login methods found.
     */
    async getLoginMethods(): Promise<CoreLoginMethod[]> {
        return [];
    }

    /**
     * Retrieve default login method.
     *
     * @returns Default login method.
     */
    async getDefaultLoginMethod(): Promise<CoreLoginMethod | null> {
        return null;
    }

    /**
     * Record that a password reset has been requested for a given site.
     *
     * @param siteUrl Site url.
     */
    async passwordResetRequested(siteUrl: string): Promise<void> {
        const passwordResets = await this.getPasswordResets();

        passwordResets[siteUrl] = Date.now();

        await CoreConfig.set(PASSWORD_RESETS_CONFIG_KEY, JSON.stringify(passwordResets));
    }

    /**
     * Find out if a password reset has been requested recently for a given site.
     *
     * @param siteUrl Site url.
     * @returns Whether a password reset has been requested recently.
     */
    async wasPasswordResetRequestedRecently(siteUrl: string): Promise<boolean> {
        const passwordResets = await this.getPasswordResets();

        return siteUrl in passwordResets
            && passwordResets[siteUrl] > Date.now() - CoreConstants.MILLISECONDS_HOUR;
    }

    /**
     * Clean up expired password reset records from the database.
     */
    async cleanUpPasswordResets(): Promise<void> {
        const passwordResets = await this.getPasswordResets();
        const siteUrls = Object.keys(passwordResets);

        for (const siteUrl of siteUrls) {
            if (passwordResets[siteUrl] > Date.now() - CoreConstants.MILLISECONDS_HOUR) {
                continue;
            }

            delete passwordResets[siteUrl];
        }

        if (Object.values(passwordResets).length === 0) {
            await CoreConfig.delete(PASSWORD_RESETS_CONFIG_KEY);
        } else {
            await CoreConfig.set(PASSWORD_RESETS_CONFIG_KEY, JSON.stringify(passwordResets));
        }
    }

    /**
     * Build the HTML message to show once login attempts have been exceeded.
     *
     * @param canContactSupport Whether contacting support is enabled in the site.
     * @param canRecoverPassword Whether recovering the password is enabled in the site.
     * @returns HTML message.
     */
    buildExceededAttemptsHTML(canContactSupport: boolean, canRecoverPassword: boolean): SafeHtml | string | null {
        const safeHTML = (html: string) => DomSanitizer.sanitize(SecurityContext.HTML, html) ?? '';
        const recoverPasswordHTML = (messageKey: string) => {
            const placeholder = '%%RECOVER_PASSWORD%%';
            const message = safeHTML(Translate.instant(messageKey, { recoverPassword: placeholder }));
            const recoverPassword = safeHTML(Translate.instant('core.login.exceededloginattemptsrecoverpassword'));

            return DomSanitizer.bypassSecurityTrustHtml(
                message.replace(placeholder, `<a href="#" role="button" style="color:inherit">${recoverPassword}</a>`),
            );
        };

        if (canContactSupport && canRecoverPassword) {
            return recoverPasswordHTML('core.login.exceededloginattempts');
        }

        if (canContactSupport) {
            return Translate.instant('core.login.exceededloginattemptswithoutpassword');
        }

        if (canRecoverPassword) {
            return recoverPasswordHTML('core.login.exceededloginattemptswithoutsupport');
        }

        return null;
    }

    /**
     * Get a record indexing the last time a password reset was requested for a site.
     *
     * @returns Password resets.
     */
    protected async getPasswordResets(): Promise<Record<string, number>> {
        const passwordResetsJson = await CoreConfig.get(PASSWORD_RESETS_CONFIG_KEY, '{}');

        return CoreTextUtils.parseJSON<Record<string, number>>(passwordResetsJson, {});
    }

}

export const CoreLoginHelper = makeSingleton(CoreLoginHelperProvider);

/**
 * Accounts list for selecting sites interfaces.
 */
export type CoreAccountsList = {
    currentSite?: CoreSiteBasicInfo; // If logged in, current site info.
    sameSite: CoreSiteBasicInfo[]; // If logged in, accounts info on the same site.
    otherSites: CoreSiteBasicInfo[][]; // Other accounts in other sites.
    count: number; // Number of sites.
};

/**
 * Data related to a SSO authentication.
 */
export type CoreLoginSSOData = CoreRedirectPayload & {
    siteUrl: string; // The site's URL.
    token?: string; // User's token.
    privateToken?: string; // User's private token.
    ssoUrlParams?: CoreUrlParams; // Other params added to the login url.
};

/**
 * Result of WS core_user_agree_site_policy.
 */
type AgreeSitePolicyResult = {
    status: boolean; // Status: true only if we set the policyagreed to 1 for the user.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Result of WS auth_email_get_signup_settings.
 */
export type AuthEmailSignupSettings = {
    namefields: string[];
    passwordpolicy?: string; // Password policy.
    sitepolicy?: string; // Site policy.
    sitepolicyhandler?: string; // Site policy handler.
    defaultcity?: string; // Default city.
    country?: string; // Default country.
    profilefields?: AuthEmailSignupProfileField[]; // Required profile fields.
    recaptchapublickey?: string; // Recaptcha public key.
    recaptchachallengehash?: string; // Recaptcha challenge hash.
    recaptchachallengeimage?: string; // Recaptcha challenge noscript image.
    recaptchachallengejs?: string; // Recaptcha challenge js url.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Profile field for signup.
 */
export type AuthEmailSignupProfileField = {
    id?: number; // Profile field id.
    shortname?: string; // Profile field shortname.
    name?: string; // Profield field name.
    datatype?: string; // Profield field datatype.
    description?: string; // Profield field description.
    descriptionformat: number; // Description format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    categoryid?: number; // Profield field category id.
    categoryname?: string; // Profield field category name.
    sortorder?: number; // Profield field sort order.
    required?: number; // Profield field required.
    locked?: number; // Profield field locked.
    visible?: number; // Profield field visible.
    forceunique?: number; // Profield field unique.
    signup?: number; // Profield field in signup form.
    defaultdata?: string; // Profield field default data.
    defaultdataformat: number; // Defaultdata format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    param1?: string; // Profield field settings.
    param2?: string; // Profield field settings.
    param3?: string; // Profield field settings.
    param4?: string; // Profield field settings.
    param5?: string; // Profield field settings.
};

/**
 * Category of profile fields for signup.
 */
export type AuthEmailSignupProfileFieldsCategory = {
    id: number; // Category ID.
    name: string; // Category name.
    fields: AuthEmailSignupProfileField[]; // Field in the category.
};

/**
 * Result of WS core_auth_request_password_reset.
 */
export type CoreLoginRequestPasswordResetResult = {
    status: string; // The returned status of the process
    notice: string; // Important information for the user about the process.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Result of WS core_auth_resend_confirmation_email.
 */
type ResendConfirmationEmailResult = {
    status: boolean; // True if the confirmation email was sent, false otherwise.
    warnings?: CoreWSExternalWarning[];
};

type StoredLoginLaunchData = CoreRedirectPayload & {
    siteUrl: string;
    passport: number;
    ssoUrlParams: CoreUrlParams;
};

export type CoreLoginSiteSelectorListMethod =
    'url'|
    'sitefinder'|
    'list'|
    '';

export type CoreLoginMethod = {
    name: string; // Name of the login method.
    icon: string; // Icon of the provider.
    action: () => unknown; // Action to execute on button click.
};

export type CoreLoginSiteFinderSettings = {
    displayalias: boolean;
    displaycity: boolean;
    displaycountry: boolean;
    displayimage: boolean;
    displaysitename: boolean;
    displayurl: boolean;
    defaultimageurl?: string;
};
