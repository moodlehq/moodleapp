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
import { CoreText, CoreTextFormat } from '@singletons/text';
import { CoreObject } from '@singletons/object';
import { CoreConstants } from '@/core/constants';
import { CoreSite } from '@classes/sites/site';
import { CoreError, CoreErrorDebug } from '@classes/errors/error';
import { CoreWSError } from '@classes/errors/wserror';
import { DomSanitizer, makeSingleton, Translate } from '@singletons';
import { CoreLogger } from '@singletons/logger';
import { CoreUrl, CoreUrlParams } from '@singletons/url';
import { CoreNavigator, CoreRedirectPayload } from '@services/navigator';
import { CoreCanceledError } from '@classes/errors/cancelederror';
import { CorePushNotifications } from '@features/pushnotifications/services/pushnotifications';
import { CorePath } from '@singletons/path';
import { CorePromisedValue } from '@classes/promised-value';
import { SafeHtml } from '@angular/platform-browser';
import { CoreSettingsHelper } from '@features/settings/services/settings-helper';
import {
    CoreSiteIdentityProvider,
    CoreSitePublicConfigResponse,
    CoreSiteQRCodeType,
    CoreUnauthenticatedSite,
    TypeOfLogin,
} from '@classes/sites/unauthenticated-site';
import {
    ALWAYS_SHOW_LOGIN_FORM,
    ALWAYS_SHOW_LOGIN_FORM_CHANGED,
    APP_UNSUPPORTED_CHURN,
    EMAIL_SIGNUP_FEATURE_NAME,
    FAQ_QRCODE_IMAGE_HTML,
    FAQ_QRCODE_INFO_DONE,
    FORGOTTEN_PASSWORD_FEATURE_NAME,
    IDENTITY_PROVIDERS_FEATURE_NAME,
    IDENTITY_PROVIDER_FEATURE_NAME_PREFIX,
} from '../constants';
import { LazyDefaultStandaloneComponent } from '@/app/app-routing.module';
import { CoreSiteError } from '@classes/errors/siteerror';
import { CoreQRScan } from '@services/qrscan';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreErrorHelper } from '@services/error-helper';
import { CoreSSO } from '@singletons/sso';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreOpener } from '@singletons/opener';
import { CoreAlerts } from '@services/overlays/alerts';
import { CorePrompts } from '@services/overlays/prompts';

/**
 * Helper provider that provides some common features regarding authentication.
 */
@Injectable({ providedIn: 'root' })
export class CoreLoginHelperProvider {

    protected static readonly PASSWORD_RESETS_CONFIG_KEY = 'password-resets';

    private static readonly APP_UNSUPPORTED_ERRORS = [
        'loginfailed',
        'logintokenempty',
        'logintokenerror',
        'mobileservicesnotenabled',
        'sitehasredirect',
        'webservicesnotenabled',
    ];

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
     * @deprecated since 4.4. Use CorePolicy.acceptMandatoryPolicies instead.
     */
    async acceptSitePolicy(siteId?: string): Promise<void> {
        const { CorePolicy } = await import('@features/policy/services/policy');

        return CorePolicy.acceptMandatorySitePolicies(siteId);
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
            !CoreSSO.isSSOAuthenticationOngoing() &&
            currentSite?.isLoggedOut() &&
            CoreNavigator.isCurrent('/login/reconnect')
        ) {
            // User must reauthenticate but he closed the InAppBrowser without doing so, logout him.
            CoreSites.logout();
        }
    }

    /**
     * Open a browser to perform SSO login.
     *
     * @param siteUrl URL of the site where the SSO login will be performed.
     * @param typeOfLogin TypeOfLogin.BROWSER or TypeOfLogin.EMBEDDED.
     * @param service The service to use. If not defined, core service will be used.
     * @param launchUrl The URL to open for SSO. If not defined, default tool mobile launch URL will be used.
     * @param redirectData Data of the path/url to open once authenticated. If not defined, site initial page.
     * @deprecated since 4.3. Use openBrowserForSSOLogin instead.
     */
    async confirmAndOpenBrowserForSSOLogin(
        siteUrl: string,
        typeOfLogin: TypeOfLogin,
        service?: string,
        launchUrl?: string,
        redirectData?: CoreRedirectPayload,
    ): Promise<void> {
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
            CoreOpener.openInApp(siteConfig.forgottenpasswordurl);

            return;
        }

        // Check if password reset can be done through the app.
        const modal = await CoreLoadings.show();

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
     * @deprecated since 4.4. Shoudn't be used since disabled features are not treated by this function anymore.
     */
    getDisabledFeatures(config?: CoreSitePublicConfigResponse): string {
        const disabledFeatures = config?.tool_mobile_disabledfeatures;
        if (!disabledFeatures) {
            return '';
        }

        return disabledFeatures;
    }

    /**
     * Get logo URL from a site public config.
     *
     * @param config Site public config.
     * @returns Logo URL.
     * @deprecated since 4.4. Please use getLogoUrl in a site instance.
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
     * Get email signup settings.
     *
     * @param siteUrl Site URL.
     * @returns Signup settings.
     */
    async getEmailSignupSettings(siteUrl: string): Promise<AuthEmailSignupSettings> {
        return await CoreWS.callAjax('auth_email_get_signup_settings', {}, { siteUrl });
    }

    /**
     * Get the site policy.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the site policy.
     * @deprecated since 4.4. Use CorePolicy.getSitePoliciesURL instead.
     */
    async getSitePolicy(siteId?: string): Promise<string> {
        const { CorePolicy } = await import('@features/policy/services/policy');

        return CorePolicy.getSitePoliciesURL(siteId);
    }

    /**
     * Get Available sites (includes staging sites if are enabled). It doesn't include demo mode site.
     *
     * @returns Available sites.
     */
    async getAvailableSites(): Promise<CoreLoginSiteInfo[]> {
        const hasEnabledStagingSites = await CoreSettingsHelper.hasEnabledStagingSites();

        return CoreConstants.CONFIG.sites.filter(site => (!site.staging || hasEnabledStagingSites) && !site.demoMode);
    }

    /**
     * Get demo mode site info. This function doesn't check if demo mode is enabled.
     *
     * @returns Demo mode site info, undefined if no demo mode site.
     */
    getDemoModeSiteInfo(): CoreLoginSiteInfo | undefined {
        return CoreConstants.CONFIG.sites.find(site => site.demoMode);
    }

    /**
     * Get the valid identity providers from a site config.
     *
     * @param siteConfig Site's public config.
     * @returns Valid identity providers.
     * @deprecated since 4.4. Please use getValidIdentityProvidersForSite instead.
     */
    getValidIdentityProviders(siteConfig?: CoreSitePublicConfigResponse): CoreSiteIdentityProvider[] {
        if (!siteConfig) {
            return [];
        }
        // eslint-disable-next-line deprecation/deprecation
        if (this.isFeatureDisabled(IDENTITY_PROVIDERS_FEATURE_NAME, siteConfig)) {
            // Identity providers are disabled, return an empty list.
            return [];
        }

        const validProviders: CoreSiteIdentityProvider[] = [];
        const httpUrl = CorePath.concatenatePaths(siteConfig.wwwroot, 'auth/oauth2/');
        const httpsUrl = CorePath.concatenatePaths(siteConfig.httpswwwroot, 'auth/oauth2/');

        if (siteConfig.identityproviders && siteConfig.identityproviders.length) {
            siteConfig.identityproviders.forEach((provider) => {
                const urlParams = CoreUrl.extractUrlParams(provider.url);

                if (
                    provider.url &&
                    (provider.url.indexOf(httpsUrl) != -1 || provider.url.indexOf(httpUrl) != -1) &&
                    !this.isFeatureDisabled( // eslint-disable-line deprecation/deprecation
                        IDENTITY_PROVIDER_FEATURE_NAME_PREFIX + urlParams.id,
                        siteConfig,
                    )
                ) {
                    validProviders.push(provider);
                }
            });
        }

        return validProviders;
    }

    /**
     * Get the valid identity providers from a site config.
     *
     * @param site Site instance.
     * @returns Valid identity providers.
     */
    async getValidIdentityProvidersForSite(site: CoreUnauthenticatedSite): Promise<CoreSiteIdentityProvider[]> {
        const siteConfig = await CorePromiseUtils.ignoreErrors(site.getPublicConfig());
        if (!siteConfig) {
            return [];
        }

        if (site.isFeatureDisabled(IDENTITY_PROVIDERS_FEATURE_NAME)) {
            // Identity providers are disabled, return an empty list.
            return [];
        }

        const validProviders: CoreSiteIdentityProvider[] = [];
        const httpUrl = CorePath.concatenatePaths(siteConfig.wwwroot, 'auth/oauth2/');
        const httpsUrl = CorePath.concatenatePaths(siteConfig.httpswwwroot, 'auth/oauth2/');

        if (siteConfig.identityproviders && siteConfig.identityproviders.length) {
            siteConfig.identityproviders.forEach((provider) => {
                const urlParams = CoreUrl.extractUrlParams(provider.url);

                if (provider.url && (provider.url.indexOf(httpsUrl) !== -1 || provider.url.indexOf(httpUrl) !== -1) &&
                        !site.isFeatureDisabled(IDENTITY_PROVIDER_FEATURE_NAME_PREFIX + urlParams.id)) {
                    validProviders.push(provider);
                }
            });
        }

        return validProviders;
    }

    /**
     * Finds an identity provider from a list of providers based on the given OAuth ID.
     *
     * @param providers Array of identity providers.
     * @param oauthId The OAuth ID to match against the providers' URLs.
     * @returns The identity provider that matches the given OAuth ID, or undefined if no match is found.
     */
    findIdentityProvider(providers: CoreSiteIdentityProvider[], oauthId?: number): CoreSiteIdentityProvider | undefined {
        if (!oauthId) {
            return;
        }

        return providers.find(provider => Number(CoreUrl.extractUrlParams(provider.url).id) === oauthId);
    }

    /**
     * Go to the page to add a new site.
     * If a fixed URL is configured, go to credentials instead.
     *
     * @param setRoot True to set the new page as root, false to add it to the stack.
     * @param showKeyboard Whether to show keyboard in the new page. Only if no fixed URL set.
     */
    async goToAddSite(setRoot = false, showKeyboard = false): Promise<void> {
        if (CoreSites.isLoggedIn()) {
            // Logout first.
            await CoreSites.logout({
                siteId: CoreConstants.NO_SITE_ID,
                redirectPath: '/login/sites',
                redirectOptions: { params: { openAddSite: true , showKeyboard } },
            });

            return;
        }

        const [path, params] = await this.getAddSiteRouteInfo(showKeyboard);

        await CoreNavigator.navigate(path, { params, reset: setRoot });
    }

    /**
     * Get path and params to visit the route to add site.
     *
     * @param showKeyboard Whether to show keyboard in the new page. Only if no fixed URL set.
     * @returns Path and params.
     */
    async getAddSiteRouteInfo(showKeyboard?: boolean): Promise<[string, Params]> {
        if (CoreConstants.CONFIG.demoMode) {
            const demoModeSite = this.getDemoModeSiteInfo();

            if (demoModeSite) {
                return ['/login/credentials', { siteUrl: demoModeSite.url }];
            }
        }

        const sites = await this.getAvailableSites();

        if (sites.length === 1) {
            // Fixed URL is set, go to credentials page.
            return ['/login/credentials', { siteUrl: sites[0].url }];
        }

        return ['/login/site', { showKeyboard }];
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
     * @deprecated since 5.0. This is now handled by CoreCustomURLSchemes.
     */
    handleSSOLoginAuthentication(siteUrl: string, token: string, privateToken?: string, oauthId?: number): Promise<string> {
        // Always create a new site to prevent overriding data if another user credentials were introduced.
        return CoreSites.newSite(siteUrl, token, privateToken, true, oauthId);
    }

    /**
     * Given a site public config, check if email signup is disabled.
     *
     * @param config Site public config.
     * @returns Whether email signup is disabled.
     * @deprecated since 4.4. Please use isFeatureDisabled in a site instance.
     */
    isEmailSignupDisabled(config?: CoreSitePublicConfigResponse): boolean {
        // eslint-disable-next-line deprecation/deprecation
        return this.isFeatureDisabled(EMAIL_SIGNUP_FEATURE_NAME, config);
    }

    /**
     * Given a site public config, check if a certian feature is disabled.
     *
     * @param feature Feature to check.
     * @param config Site public config.
     * @returns Whether email signup is disabled.
     * @deprecated since 4.4. Please use isFeatureDisabled in a site instance.
     */
    isFeatureDisabled(feature: string, config?: CoreSitePublicConfigResponse): boolean {
       // eslint-disable-next-line deprecation/deprecation
       const disabledFeatures = this.getDisabledFeatures(config);

        const regEx = new RegExp('(,|^)' + feature + '(,|$)', 'g');

        return !!disabledFeatures.match(regEx);
    }

    /**
     * Check if the app is configured to use a fixed URL (only 1).
     *
     * @returns Whether there is 1 fixed URL.
     */
    async isSingleFixedSite(): Promise<boolean> {
        const sites = await this.getAvailableSites();

        return sites.length === 1;
    }

    /**
     * Given a site public config, check if forgotten password is disabled.
     *
     * @param config Site public config.
     * @returns Whether it's disabled.
     * @deprecated since 4.4. Please use isFeatureDisabled in a site instance.
     */
    isForgottenPasswordDisabled(config?: CoreSitePublicConfigResponse): boolean {
        // eslint-disable-next-line deprecation/deprecation
        return this.isFeatureDisabled(FORGOTTEN_PASSWORD_FEATURE_NAME, config);
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
        const sites = await this.getAvailableSites();

        if (sites.length) {
            const demoModeSite = this.getDemoModeSiteInfo();

            return sites.some((site) => CoreUrl.sameDomainAndPath(siteUrl, site.url)) ||
                (!!demoModeSite && CoreUrl.sameDomainAndPath(siteUrl, demoModeSite.url));
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
    isSSOEmbeddedBrowser(code: TypeOfLogin): boolean {
        return code == TypeOfLogin.EMBEDDED;
    }

    /**
     * Check if SSO login is needed based on code returned by the WS.
     *
     * @param code Code to check.
     * @returns True if SSO login is needed, false othwerise.
     */
    isSSOLoginNeeded(code: TypeOfLogin): boolean {
        return code == TypeOfLogin.BROWSER || code == TypeOfLogin.EMBEDDED;
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
    async openBrowserForOAuthLogin(
        siteUrl: string,
        provider: CoreSiteIdentityProvider,
        launchUrl?: string,
        redirectData?: CoreRedirectPayload,
    ): Promise<boolean> {
        launchUrl = launchUrl || siteUrl + '/admin/tool/mobile/launch.php';

        this.logger.debug('openBrowserForOAuthLogin launchUrl:', launchUrl);

        if (!provider || !provider.url) {
            return false;
        }

        const params = CoreUrl.extractUrlParams(provider.url);

        if (!params.id) {
            return false;
        }

        const modal = await CoreLoadings.show();

        try {
            const loginUrl = await this.prepareForSSOLogin(siteUrl, undefined, launchUrl, redirectData, {
                oauthsso: params.id,
            });

            // Always open it in browser because the user might have the session stored in there.
            CoreOpener.openInBrowser(loginUrl, { showBrowserWarning: false });
            CoreApp.closeApp();

            return true;
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error opening browser' });
        } finally {
            modal.dismiss();
        }

        return false;
    }

    /**
     * Open a browser to perform SSO login.
     *
     * @param siteUrl URL of the site where the SSO login will be performed.
     * @param typeOfLogin TypeOfLogin.BROWSER or TypeOfLogin.EMBEDDED.
     * @param service The service to use. If not defined, core service will be used.
     * @param launchUrl The URL to open for SSO. If not defined, default tool mobile launch URL will be used.
     * @param redirectData Data of the path/url to open once authenticated. If not defined, site initial page.
     */
    async openBrowserForSSOLogin(
        siteUrl: string,
        typeOfLogin: TypeOfLogin,
        service?: string,
        launchUrl?: string,
        redirectData?: CoreRedirectPayload,
    ): Promise<void> {
        const modal = await CoreLoadings.show();

        try {
            const loginUrl = await this.prepareForSSOLogin(siteUrl, service, launchUrl, redirectData);

            this.logger.debug('openBrowserForSSOLogin loginUrl:', loginUrl);

            if (this.isSSOEmbeddedBrowser(typeOfLogin)) {
                CoreOpener.openInApp(loginUrl, {
                    clearsessioncache: 'yes', // Clear the session cache to allow for multiple logins.
                    closebuttoncaption: Translate.instant('core.login.cancel'),
                });
            } else {
                CoreOpener.openInBrowser(loginUrl, { showBrowserWarning: false });
                CoreApp.closeApp();
            }
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error opening browser' });
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Convenient helper to open change password page.
     *
     * @param siteUrl Site URL to construct change password URL.
     * @param error Error message.
     */
    async openChangePassword(siteUrl: string, error: string): Promise<void> {
        const alert = await CoreAlerts.show({
            header: Translate.instant('core.notice'),
            message: error,
            autoCloseTime: 3000,
        });

        await alert.onDidDismiss();

        CoreOpener.openInApp(siteUrl + '/login/change_password.php');
    }

    /**
     * Open forgotten password in inappbrowser.
     *
     * @param siteUrl URL of the site.
     */
    openForgottenPassword(siteUrl: string): void {
        CoreOpener.openInApp(siteUrl + '/login/forgot_password.php');
    }

    /**
     * Function to open in app browser to change password or complete user profile.
     *
     * @param siteId The site ID.
     * @param path The relative path of the URL to open.
     * @param alertMessage The key of the message to display before opening the in app browser.
     * @param invalidateCache Whether to invalidate site's cache (e.g. when the user is forced to change password).
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
    async prepareForSSOLogin(
        siteUrl: string,
        service?: string,
        launchUrl?: string,
        redirectData: CoreRedirectPayload = {},
        urlParams?: CoreUrlParams,
    ): Promise<string> {

        service = service || CoreConstants.CONFIG.wsservice;
        launchUrl = launchUrl || siteUrl + '/admin/tool/mobile/launch.php';

        const passport = Math.random() * 1000;

        const additionalParams = Object.assign(urlParams || {}, {
            service,
            passport,
            urlscheme: CoreConstants.CONFIG.customurlscheme,
        });

        const loginUrl = CoreUrl.addParamsToUrl(launchUrl, additionalParams);

        // Store the siteurl and passport in CoreConfig for persistence.
        // We are "configuring" the app to wait for an SSO. CoreConfig shouldn't be used as a temporary storage.
        await CoreConfig.set(CoreConstants.LOGIN_LAUNCH_DATA, JSON.stringify(<StoredLoginLaunchData> {
            siteUrl,
            passport,
            ...redirectData,
            ssoUrlParams: urlParams || {},
        }));

        return loginUrl;
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
            params.username = username.trim();
        }

        if (email) {
            params.email = email.trim();
        }

        return CoreWS.callAjax('core_auth_request_password_reset', params, { siteUrl });
    }

    /**
     * Function that should be called when the session expires. Reserved for core use.
     *
     * @param data Data received by the SESSION_EXPIRED event.
     */
    async sessionExpired(data: CoreEventSessionExpiredData & CoreEventSiteData): Promise<void> {
        const siteId = data?.siteId;
        const currentSite = CoreSites.getCurrentSite();

        if (!currentSite) {
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
            const info = currentSite.getInfo();
            if (info !== undefined && info.username !== undefined) {
                // If current page is already reconnect, stop.
                if (CoreNavigator.isCurrent('/login/reconnect')) {
                    return;
                }

                await CorePromiseUtils.ignoreErrors(CoreNavigator.navigate('/login/reconnect', {
                    params: {
                        siteId,
                        ...redirectData,
                    },
                    reset: true,
                }));
            }
        } catch (error) {
            // Error checking site.
            if (currentSite.isLoggedOut()) {
                // Site is logged out, show error and logout the user.
                CoreAlerts.showError(error, { default: Translate.instant('core.networkerrormsg') });
                CoreSites.logout();
            }
        } finally {
            this.sessionExpiredCheckingSite[siteId || ''] = false;
        }
    }

    /**
     * Check if the default login form should be displayed.
     *
     * @param config Site public config.
     * @returns True if the login form should be displayed.
     */
    async shouldShowLoginForm(config?: CoreSitePublicConfigResponse): Promise<boolean> {
        // Only hide the form if the setting exists and is set to 0.
        if (config?.showloginform === 0) {
            return Boolean(await CoreConfig.get(ALWAYS_SHOW_LOGIN_FORM, 0));
        }

        return true;
    }

    /**
     * Check if a confirm should be shown to open a SSO authentication.
     *
     * @param typeOfLogin TypeOfLogin.BROWSER or TypeOfLogin.EMBEDDED.
     * @returns True if confirm modal should be shown, false otherwise.
     * @deprecated since 4.3. Not used anymore. See shouldSkipCredentialsScreenOnSSO.
     */
    shouldShowSSOConfirm(typeOfLogin: TypeOfLogin): boolean {
        return !this.isSSOEmbeddedBrowser(typeOfLogin) && !this.shouldSkipCredentialsScreenOnSSO();
    }

    /**
     * Check if we can skip credentials page.
     *
     * @returns If true, the browser should be opened without the user prompt.
     */
    shouldSkipCredentialsScreenOnSSO(): boolean {
        return String(CoreConstants.CONFIG.skipssoconfirmation) === 'true';
    }

    /**
     * Check whether the given error means that the app is not working in the site.
     *
     * @param error Site error.
     * @returns Whether the given error means that the app is not working in the site.
     */
    isAppUnsupportedError(error: CoreSiteError): boolean {
        return CoreLoginHelperProvider.APP_UNSUPPORTED_ERRORS.includes(error.debug?.code ?? '');
    }

    /**
     * Show modal indicating that the app is not supported in the site.
     *
     * @param siteUrl Site url.
     * @param site Site instance.
     * @param debug Error debug information.
     */
    async showAppUnsupportedModal(siteUrl: string, site?: CoreUnauthenticatedSite, debug?: CoreErrorDebug): Promise<void> {
        const siteName = await site?.getSiteName() ?? siteUrl;

        await CoreAlerts.show({
            header: Translate.instant('core.login.unsupportedsite'),
            message: Translate.instant('core.login.unsupportedsitemessage', { site: siteName }),
            buttons: [
                {
                    text: Translate.instant('core.cancel'),
                    role: 'cancel',
                },
                {
                    text: Translate.instant('core.openinbrowser'),
                    handler: () => this.openInBrowserFallback(site?.getURL() ?? siteUrl, debug),
                },
            ],
        });
    }

    /**
     * Open site in browser as fallback when it is not supported in the app.
     *
     * @param siteUrl Site url.
     * @param debug Error debug information.
     */
    async openInBrowserFallback(siteUrl: string, debug?: CoreErrorDebug): Promise<void> {
        CoreEvents.trigger(APP_UNSUPPORTED_CHURN, { siteUrl, debug });

        await CoreOpener.openInBrowser(siteUrl, { showBrowserWarning: false });
    }

    /**
     * Show a modal warning that the credentials introduced were not correct.
     */
    protected showInvalidLoginModal(error: CoreError): void {
        const errorDetails = error instanceof CoreSiteError ? error.debug?.details : null;

        CoreAlerts.showError(errorDetails ?? error.message);
    }

    /**
     * Show a modal warning the user that he should use the Workplace app.
     *
     * @param message The warning message.
     */
    protected showWorkplaceNoticeModal(message: string): void {
        const link = CoreApp.getAppStoreUrl({ android: 'com.moodle.workplace', ios: 'id1470929705' });

        CoreAlerts.showDownloadAppNotice(message, link);
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

        CoreAlerts.showDownloadAppNotice(message, link);
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
        const header = Translate.instant('core.login.mustconfirm');
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
            await CoreAlerts.show({ header, message });

            return;
        }

        try {
            // Ask the user if he wants to resend the email.
            await CoreAlerts.confirm(message, {
                header,
                okText: Translate.instant('core.login.resendemail'),
                cancelText: Translate.instant('core.close'),
            });

            // Call the WS to resend the confirmation email.
            const modal = await CoreLoadings.show('core.sending', true);
            const data = { username, password };
            const preSets = { siteUrl };

            try {
                const result = <ResendConfirmationEmailResult> await CoreWS.callAjax(
                    'core_auth_resend_confirmation_email',
                    data,
                    preSets,
                );

                if (!result.status) {
                    if (result.warnings?.length) {
                        throw new CoreWSError(result.warnings[0]);
                    }

                    throw new CoreError('Error sending confirmation email');
                }

                const message = Translate.instant('core.login.emailconfirmsentsuccess');
                CoreAlerts.show({ header: Translate.instant('core.success'), message });
            } finally {
                modal.dismiss();
            }
        } catch (error) {
            CoreAlerts.showError(error);
        }
    }

    /**
     * Check if confirmation email an be resent.
     *
     * @param siteUrl Site URL to check.
     * @returns Promise.
     */
    protected async canResendEmail(siteUrl: string): Promise<boolean> {
        const modal = await CoreLoadings.show();

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
     * @returns void
     * @deprecated since 4.4. Use CorePolicy.goToAcceptSitePolicies instead.
     */
    async sitePolicyNotAgreed(siteId?: string): Promise<void> {
        const { CorePolicy } = await import('@features/policy/services/policy');

        return CorePolicy.goToAcceptSitePolicies(siteId);
    }

    /**
     * Convenient helper to handle get User Token error. It redirects to change password page if forcepassword is set.
     *
     * @param siteUrl Site URL to construct change password URL.
     * @param error Error object containing errorcode and error message.
     * @param username Username.
     * @param password User password.
     */
    treatUserTokenError(siteUrl: string, error: CoreError, username?: string, password?: string): void {
        const errorCode = 'errorcode' in error ? error.errorcode : null;

        switch (errorCode) {
            case 'forcepasswordchangenotice':
                this.openChangePassword(siteUrl, CoreErrorHelper.getErrorMessageFromError(error) ?? '');
                break;
            case 'usernotconfirmed':
                this.showNotConfirmedModal(siteUrl, undefined, username, password);
                break;
            case 'connecttomoodleapp':
                this.showMoodleAppNoticeModal(CoreErrorHelper.getErrorMessageFromError(error) ?? '');
                break;
            case 'connecttoworkplaceapp':
                this.showWorkplaceNoticeModal(CoreErrorHelper.getErrorMessageFromError(error) ?? '');
                break;
            case 'invalidlogin':
                this.showInvalidLoginModal(error);
                break;
            default:
                CoreAlerts.showError(error);
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

        const data = <StoredLoginLaunchData | null> CoreText.parseJSON(serializedData, null);
        if (data === null) {
            throw new CoreError('No launch data stored.');
        }

        const passport = data.passport;
        let launchSiteURL = data.siteUrl;

        // Reset temporary values.
        CoreConfig.delete(CoreConstants.LOGIN_LAUNCH_DATA);

        // Validate the signature.
        // We need to check both http and https.
        let signature = Md5.hashAsciiStr(launchSiteURL + passport);
        if (signature != params[0]) {
            if (launchSiteURL.indexOf('https://') != -1) {
                launchSiteURL = launchSiteURL.replace('https://', 'http://');
            } else {
                launchSiteURL = launchSiteURL.replace('http://', 'https://');
            }
            signature = Md5.hashAsciiStr(launchSiteURL + passport);
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
        return CoreQRScan.canScanQR() && (CoreConstants.CONFIG.displayqronsitescreen === undefined ||
            !!CoreConstants.CONFIG.displayqronsitescreen);
    }

    /**
     * Check whether the QR reader should be displayed in credentials screen.
     *
     * @param qrCodeType QR Code type from public config, assuming enabled if undefined.
     * @returns Whether the QR reader should be displayed in credentials screen.
     */
    async displayQRInCredentialsScreen(qrCodeType = CoreSiteQRCodeType.QR_CODE_LOGIN): Promise<boolean> {
        if (!CoreQRScan.canScanQR()) {
            return false;
        }

        const isSingleFixedSite = await this.isSingleFixedSite();

        if ((CoreConstants.CONFIG.displayqroncredentialscreen === undefined && isSingleFixedSite) ||
            (CoreConstants.CONFIG.displayqroncredentialscreen !== undefined &&
                !!CoreConstants.CONFIG.displayqroncredentialscreen)) {

            return qrCodeType === CoreSiteQRCodeType.QR_CODE_LOGIN;
        }

        return false;
    }

    /**
     * Show instructions to scan QR code.
     */
    async showScanQRInstructions(): Promise<void> {
        const dontShowWarning = await CoreConfig.get(FAQ_QRCODE_INFO_DONE, 0);
        if (dontShowWarning) {
            return;
        }

        const message = Translate.instant(
            'core.login.faqwhereisqrcodeanswer',
            { $image: '<div class="text-center">'+ FAQ_QRCODE_IMAGE_HTML + '</div>' },
        );
        const header = Translate.instant('core.login.faqwhereisqrcode');

        try {
            const dontShowAgain = await CorePrompts.show(message, 'checkbox', {
                header,
                placeholderOrLabel: Translate.instant('core.dontshowagain'),
                buttons: { okText: Translate.instant('core.next'), cancelText: Translate.instant('core.cancel') },
            });

            if (dontShowAgain) {
                CoreConfig.set(FAQ_QRCODE_INFO_DONE, 1);
            }
        } catch {
            // User canceled.
            throw new CoreCanceledError('');
        }
    }

    /**
     * Scan a QR code and tries to authenticate the user using custom URL scheme.
     */
    async scanQR(): Promise<void> {
        // Scan for a QR code.
        const text = await CoreQRScan.scanQRWithUrlHandling();

        if (!text) {
            return;
        }

        // Not a custom URL scheme, check if it's a URL scheme to another app.
        const scheme = CoreUrl.getUrlProtocol(text);

        if (scheme && scheme != 'http' && scheme != 'https') {
            CoreAlerts.showError(Translate.instant('core.errorurlschemeinvalidscheme', { $a: text }));
        } else {
            CoreAlerts.showError(Translate.instant('core.login.errorqrnoscheme'));
        }
    }

    /**
     * Get the accounts list classified per site.
     *
     * @returns Promise resolved with account list.
     */
    async getAccountsList(): Promise<CoreAccountsList> {
        const sites = await CorePromiseUtils.ignoreErrors(CoreSites.getSortedSites(), [] as CoreSiteBasicInfo[]);

        const accountsList: CoreAccountsList = {
            sameSite: [],
            otherSites: [],
            count: sites.length,
        };
        const currentSiteId = CoreSites.getCurrentSiteId();
        let siteUrl = '';

        if (currentSiteId) {
            siteUrl = sites.find((site) => site.id == currentSiteId)?.siteUrlWithoutProtocol ?? '';
        }

        const otherSites: Record<string, CoreSiteBasicInfo[]> = {};

        // Add site counter and classify sites.
        await Promise.all(sites.map(async (site) => {
            site.badge = await CorePromiseUtils.ignoreErrors(CorePushNotifications.getSiteCounter(site.id)) || 0;

            if (site.id === currentSiteId) {
                accountsList.currentSite = site;
            } else if (site.siteUrlWithoutProtocol == siteUrl) {
                accountsList.sameSite.push(site);
            } else {
                if (!otherSites[site.siteUrlWithoutProtocol]) {
                    otherSites[site.siteUrlWithoutProtocol] = [];
                }

                otherSites[site.siteUrlWithoutProtocol].push(site);
            }

            return;
        }));

        accountsList.otherSites = CoreObject.toArray(otherSites);

        return accountsList;
    }

    /**
     * Find and delete a site from the list of sites.
     *
     * @param accountsList Account list.
     * @param site Site to be deleted.
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
    getReconnectPage(): LazyDefaultStandaloneComponent {
        return import('@features/login/pages/reconnect/reconnect');
    }

    /**
     * Get credentials page route module.
     *
     * @returns Credentials page route module.
     */
    getCredentialsPage(): LazyDefaultStandaloneComponent {
        return import('@features/login/pages/credentials/credentials');
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

        await CoreConfig.set(CoreLoginHelperProvider.PASSWORD_RESETS_CONFIG_KEY, JSON.stringify(passwordResets));
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
            await CoreConfig.delete(CoreLoginHelperProvider.PASSWORD_RESETS_CONFIG_KEY);
        } else {
            await CoreConfig.set(CoreLoginHelperProvider.PASSWORD_RESETS_CONFIG_KEY, JSON.stringify(passwordResets));
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
        const passwordResetsJson = await CoreConfig.get(CoreLoginHelperProvider.PASSWORD_RESETS_CONFIG_KEY, '{}');

        return CoreText.parseJSON<Record<string, number>>(passwordResetsJson, {});
    }

}

export const CoreLoginHelper = makeSingleton(CoreLoginHelperProvider);

/**
 * Accounts list for selecting sites interfaces.
 */
export type CoreAccountsList<T extends CoreSiteBasicInfo = CoreSiteBasicInfo> = {
    currentSite?: T; // If logged in, current site info.
    sameSite: T[]; // If logged in, accounts info on the same site.
    otherSites: T[][]; // Other accounts in other sites.
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
 * Result of WS auth_email_get_signup_settings.
 */
export type AuthEmailSignupSettings = {
    namefields: string[];
    passwordpolicy?: string; // Password policy.
    sitepolicy?: string; // Site policy.
    sitepolicyhandler?: string; // Site policy handler.
    defaultcity?: string; // Default city.
    country?: string; // Default country.
    extendedusernamechars?: boolean; // @since 4.4. Extended characters in usernames or no.
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
    descriptionformat: CoreTextFormat; // Description format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    categoryid?: number; // Profield field category id.
    categoryname?: string; // Profield field category name.
    sortorder?: number; // Profield field sort order.
    required?: number; // Profield field required.
    locked?: number; // Profield field locked.
    visible?: number; // Profield field visible.
    forceunique?: number; // Profield field unique.
    signup?: number; // Profield field in signup form.
    defaultdata?: string; // Profield field default data.
    defaultdataformat: CoreTextFormat; // Defaultdata format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
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

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [ALWAYS_SHOW_LOGIN_FORM_CHANGED]: { value: number };
        [APP_UNSUPPORTED_CHURN]: { siteUrl: string; debug?: CoreErrorDebug };
    }

}
