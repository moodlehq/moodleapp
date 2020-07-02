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
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from './app';
import { CoreInitDelegate } from './init';
import { CoreLoggerProvider } from './logger';
import { CoreSitesProvider, CoreSiteCheckResponse } from './sites';
import { CoreDomUtilsProvider } from './utils/dom';
import { CoreTextUtilsProvider } from './utils/text';
import { CoreUrlUtilsProvider } from './utils/url';
import { CoreUtilsProvider } from './utils/utils';
import { CoreLoginHelperProvider, CoreLoginSSOData } from '@core/login/providers/helper';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { CoreContentLinksDelegate } from '@core/contentlinks/providers/delegate';
import { CoreSitePluginsProvider } from '@core/siteplugins/providers/siteplugins';
import { CoreConfigConstants } from '../configconstants';
import { CoreConstants } from '@core/constants';
import { makeSingleton } from '@singletons/core.singletons';
import { CoreUrl } from '@singletons/url';

/**
 * All params that can be in a custom URL scheme.
 */
export interface CoreCustomURLSchemesParams extends CoreLoginSSOData {

    /**
     * Username.
     */
    username?: string;

    /**
     * URL to open once authenticated.
     */
    redirect?: any;

    /**
     * Whether it's an SSO token URL.
     */
    isSSOToken?: boolean;

    /**
     * Whether the URL is meant to perform an authentication.
     */
    isAuthenticationURL?: boolean;
}

/*
 * Provider to handle custom URL schemes.
 */
@Injectable()
export class CoreCustomURLSchemesProvider {
    protected logger;
    protected lastUrls = {};

    constructor(logger: CoreLoggerProvider,
            protected appProvider: CoreAppProvider,
            protected utils: CoreUtilsProvider,
            protected loginHelper: CoreLoginHelperProvider,
            protected linksHelper: CoreContentLinksHelperProvider,
            protected initDelegate: CoreInitDelegate,
            protected domUtils: CoreDomUtilsProvider,
            protected urlUtils: CoreUrlUtilsProvider,
            protected sitesProvider: CoreSitesProvider,
            protected textUtils: CoreTextUtilsProvider,
            protected linksDelegate: CoreContentLinksDelegate,
            protected translate: TranslateService,
            protected sitePluginsProvider: CoreSitePluginsProvider) {
        this.logger = logger.getInstance('CoreCustomURLSchemesProvider');
    }

    /**
     * Given some data of a custom URL with a token, create a site if it needs to be created.
     *
     * @param data URL data.
     * @return Promise resolved with the site ID.
     */
    protected async createSiteIfNeeded(data: CoreCustomURLSchemesParams): Promise<string> {
        if (!data.token) {
            return;
        }

        const currentSite = this.sitesProvider.getCurrentSite();

        if (!currentSite || currentSite.getToken() != data.token) {
            // Token belongs to a different site, create it. It doesn't matter if it already exists.

            if (!data.siteUrl.match(/^https?:\/\//)) {
                // URL doesn't have a protocol and it's required to be able to create the site. Check which one to use.
                const result = await this.sitesProvider.checkSite(data.siteUrl);

                data.siteUrl = result.siteUrl;

                await this.sitesProvider.checkRequiredMinimumVersion(result.config);
            }

            return this.sitesProvider.newSite(data.siteUrl, data.token, data.privateToken, !!data.isSSOToken,
                        this.loginHelper.getOAuthIdFromParams(data.ssoUrlParams));
        } else {
            // Token belongs to current site, no need to create it.
            return this.sitesProvider.getCurrentSiteId();
        }
    }

    /**
     * Handle an URL received by custom URL scheme.
     *
     * @param url URL to treat.
     * @return Promise resolved when done. If rejected, the parameter is of type CoreCustomURLSchemesHandleError.
     */
    async handleCustomURL(url: string): Promise<void> {
        if (!this.isCustomURL(url)) {
            throw new CoreCustomURLSchemesHandleError(null);
        }

        /* First check that this URL hasn't been treated a few seconds ago. The function that handles custom URL schemes already
           does this, but this function is called from other places so we need to handle it in here too. */
        if (this.lastUrls[url] && Date.now() - this.lastUrls[url] < 3000) {
            // Function called more than once, stop.
            return;
        }

        this.lastUrls[url] = Date.now();
        url = this.textUtils.decodeURIComponent(url);

        // Wait for app to be ready.
        await this.initDelegate.ready();

        // Some platforms like Windows add a slash at the end. Remove it.
        // Some sites add a # at the end of the URL. If it's there, remove it.
        url = url.replace(/\/?#?\/?$/, '');

        const modal = this.domUtils.showModalLoading();
        let data: CoreCustomURLSchemesParams;

        // Get the data from the URL.
        try {
            if (this.isCustomURLToken(url)) {
                data = await this.getCustomURLTokenData(url);
            } else if (this.isCustomURLLink(url)) {
                // In iOS, the protocol after the scheme doesn't have ":". Add it.
                url = url.replace(/\/\/link=(https?)\/\//, '//link=$1://');

                data = await this.getCustomURLLinkData(url);
            } else {
                // In iOS, the protocol after the scheme doesn't have ":". Add it.
                url = url.replace(/\/\/(https?)\/\//, '//$1://');

                data = await this.getCustomURLData(url);
            }
        } catch (error) {
            modal.dismiss();

            throw error;
        }

        try {
            const isValid = await this.isInFixedSiteUrls(data.siteUrl);

            if (!isValid) {
                throw this.translate.instant('core.errorurlschemeinvalidsite');
            }

            if (data.redirect && data.redirect.match(/^https?:\/\//) && data.redirect.indexOf(data.siteUrl) == -1) {
                // Redirect URL must belong to the same site. Reject.
                throw this.translate.instant('core.contentlinks.errorredirectothersite');
            }

            // First of all, create the site if needed.
            const siteId = await this.createSiteIfNeeded(data);

            if (data.isSSOToken) {
                // Site created and authenticated, open the page to go.
                if (data.pageName) {
                    // State defined, go to that state instead of site initial page.
                    this.appProvider.getRootNavController().push(data.pageName, data.pageParams);
                } else {
                    this.loginHelper.goToSiteInitialPage();
                }

                return;
            }

            if (data.redirect && !data.redirect.match(/^https?:\/\//)) {
                // Redirect is a relative URL. Append the site URL.
                data.redirect = this.textUtils.concatenatePaths(data.siteUrl, data.redirect);
            }

            let siteIds = [siteId];

            if (!siteId) {
                // No site created, check if the site is stored (to know which one to use).
                siteIds = await this.sitesProvider.getSiteIdsFromUrl(data.siteUrl, true, data.username);
            }

            if (siteIds.length > 1) {
                // More than one site to treat the URL, let the user choose.
                this.linksHelper.goToChooseSite(data.redirect || data.siteUrl);

            } else if (siteIds.length == 1) {
                // Only one site, handle the link.
                const site = await this.sitesProvider.getSite(siteIds[0]);

                if (!data.redirect) {
                    // No redirect, go to the root URL if needed.
                    await this.linksHelper.handleRootURL(site, false, true);
                } else {
                    // Handle the redirect link.
                    modal.dismiss(); // Dismiss modal so it doesn't collide with confirms.

                    /* Always use the username from the site in this case. If the link has a username and a token,
                       this will make sure that the link is opened with the user the token belongs to. */
                    const username = site.getInfo().username || data.username;

                    const treated = await this.linksHelper.handleLink(data.redirect, username);

                    if (!treated) {
                        this.domUtils.showErrorModal('core.contentlinks.errornoactions', true);
                    }
                }

            } else {
                // Site not stored. Try to add the site.
                const result = await this.sitesProvider.checkSite(data.siteUrl);

                // Site exists. We'll allow to add it.
                modal.dismiss(); // Dismiss modal so it doesn't collide with confirms.

                await this.goToAddSite(data, result);
            }

        } catch (error) {
            throw new CoreCustomURLSchemesHandleError(error, data);
        } finally {
            modal.dismiss();

            if (data.isSSOToken) {
                this.appProvider.finishSSOAuthentication();
            }
        }
    }

    /**
     * Get the data from a custom URL scheme. The structure of the URL is:
     * moodlemobile://username@domain.com?token=TOKEN&privatetoken=PRIVATETOKEN&redirect=http://domain.com/course/view.php?id=2
     *
     * @param url URL to treat.
     * @return Promise resolved with the data.
     */
    protected async getCustomURLData(url: string): Promise<CoreCustomURLSchemesParams> {
        if (!this.isCustomURL(url)) {
            throw new CoreCustomURLSchemesHandleError(null);
        }

        // App opened using custom URL scheme.
        this.logger.debug('Treating custom URL scheme: ' + url);

        // Delete the sso scheme from the URL.
        url = this.removeCustomURLScheme(url);

        // Detect if there's a user specified.
        const username = this.urlUtils.getUsernameFromUrl(url);
        if (username) {
            url = url.replace(username + '@', ''); // Remove the username from the URL.
        }

        // Get the params of the URL.
        const params = this.urlUtils.extractUrlParams(url);

        // Remove the params to get the site URL.
        if (url.indexOf('?') != -1) {
            url = url.substr(0, url.indexOf('?'));
        }

        if (!url.match(/https?:\/\//)) {
            // Url doesn't have a protocol. Check if the site is stored in the app to be able to determine the protocol.
            const siteIds = await this.sitesProvider.getSiteIdsFromUrl(url, true, username);

            if (siteIds.length) {
                // There is at least 1 site with this URL. Use it to know the full URL.
                const site = await this.sitesProvider.getSite(siteIds[0]);

                url = site.getURL();
            }
        }

        return {
            siteUrl: url,
            username: username,
            token: params.token,
            privateToken: params.privateToken,
            redirect: params.redirect,
            isAuthenticationURL: !!params.token,
        };
    }

    /**
     * Get the data from a "link" custom URL scheme. This kind of URL is deprecated.
     *
     * @param url URL to treat.
     * @return Promise resolved with the data.
     */
    protected async getCustomURLLinkData(url: string): Promise<CoreCustomURLSchemesParams> {
        if (!this.isCustomURLLink(url)) {
            throw new CoreCustomURLSchemesHandleError(null);
        }

        // App opened using custom URL scheme.
        this.logger.debug('Treating custom URL scheme with link param: ' + url);

        // Delete the sso scheme from the URL.
        url = this.removeCustomURLLinkScheme(url);

        // Detect if there's a user specified.
        const username = this.urlUtils.getUsernameFromUrl(url);
        if (username) {
            url = url.replace(username + '@', ''); // Remove the username from the URL.
        }

        // First of all, check if it's the root URL of a site.
        const data = await this.sitesProvider.isStoredRootURL(url, username);

        if (data.site) {
            // Root URL.
            return {
                siteUrl: data.site.getURL(),
                username: username
            };

        } else if (data.siteIds.length > 0) {
            // Not the root URL, but at least 1 site supports the URL. Get the site URL from the list of sites.
            const site = await this.sitesProvider.getSite(data.siteIds[0]);

            return {
                siteUrl: site.getURL(),
                username: username,
                redirect: url
            };

        } else {
            // Get the site URL.
            let siteUrl = this.linksDelegate.getSiteUrl(url);
            let redirect = url;

            if (!siteUrl) {
                // Site URL not found, use the original URL since it could be the root URL of the site.
                siteUrl = url;
                redirect = undefined;
            }

            return {
                siteUrl: siteUrl,
                username: username,
                redirect: redirect
            };
        }
    }

    /**
     * Get the data from a "token" custom URL scheme. This kind of URL is deprecated.
     *
     * @param url URL to treat.
     * @return Promise resolved with the data.
     */
    protected async getCustomURLTokenData(url: string): Promise<CoreCustomURLSchemesParams> {
        if (!this.isCustomURLToken(url)) {
            throw new CoreCustomURLSchemesHandleError(null);
        }

        if (this.appProvider.isSSOAuthenticationOngoing()) {
            // Authentication ongoing, probably duplicated request.
            throw new CoreCustomURLSchemesHandleError('Duplicated');
        }

        if (this.appProvider.isDesktop()) {
            // In desktop, make sure InAppBrowser is closed.
            this.utils.closeInAppBrowser(true);
        }

        // App opened using custom URL scheme. Probably an SSO authentication.
        this.appProvider.startSSOAuthentication();
        this.logger.debug('App launched by URL with an SSO');

        // Delete the sso scheme from the URL.
        url = this.removeCustomURLTokenScheme(url);

        // Some platforms like Windows add a slash at the end. Remove it.
        // Some sites add a # at the end of the URL. If it's there, remove it.
        url = url.replace(/\/?#?\/?$/, '');

        // Decode from base64.
        try {
            url = atob(url);
        } catch (err) {
            // Error decoding the parameter.
            this.logger.error('Error decoding parameter received for login SSO');

            throw new CoreCustomURLSchemesHandleError(null);
        }

        const data: CoreCustomURLSchemesParams = await this.loginHelper.validateBrowserSSOLogin(url);

        data.isSSOToken = true;
        data.isAuthenticationURL = true;

        return data;
    }

    /**
     * Go to page to add a site, or open a browser if SSO.
     *
     * @param data URL data.
     * @param checkResponse Result of checkSite.
     * @return Promise resolved when done.
     */
    protected async goToAddSite(data: CoreCustomURLSchemesParams, checkResponse: CoreSiteCheckResponse): Promise<void> {
        const ssoNeeded = this.loginHelper.isSSOLoginNeeded(checkResponse.code);
        const pageName = 'CoreLoginCredentialsPage';
        const pageParams = {
            siteUrl: checkResponse.siteUrl,
            username: data.username,
            urlToOpen: data.redirect,
            siteConfig: checkResponse.config
        };
        let hasSitePluginsLoaded = false;

        if (this.sitesProvider.isLoggedIn()) {
            // Ask the user before changing site.
            await this.domUtils.showConfirm(this.translate.instant('core.contentlinks.confirmurlothersite'));

            if (!ssoNeeded) {
                hasSitePluginsLoaded = this.sitePluginsProvider.hasSitePluginsLoaded;
                if (hasSitePluginsLoaded) {
                    // Store the redirect since logout will restart the app.
                    this.appProvider.storeRedirect(CoreConstants.NO_SITE_ID, pageName, pageParams);
                }

                await this.sitesProvider.logout();
            }
        }

        if (ssoNeeded) {
            this.loginHelper.confirmAndOpenBrowserForSSOLogin(checkResponse.siteUrl, checkResponse.code, checkResponse.service,
                    checkResponse.config && checkResponse.config.launchurl);
        } else if (!hasSitePluginsLoaded) {
            await this.loginHelper.goToNoSitePage(undefined, pageName, pageParams);
        }
    }

    /**
     * Check whether a URL is a custom URL scheme.
     *
     * @param url URL to check.
     * @return Whether it's a custom URL scheme.
     */
    isCustomURL(url: string): boolean {
        if (!url) {
            return false;
        }

        return url.indexOf(CoreConfigConstants.customurlscheme + '://') != -1;
    }

    /**
     * Check whether a URL is a custom URL scheme with the "link" param (deprecated).
     *
     * @param url URL to check.
     * @return Whether it's a custom URL scheme.
     */
    isCustomURLLink(url: string): boolean {
        if (!url) {
            return false;
        }

        return url.indexOf(CoreConfigConstants.customurlscheme + '://link=') != -1;
    }

    /**
     * Check whether a URL is a custom URL scheme with a "token" param (deprecated).
     *
     * @param url URL to check.
     * @return Whether it's a custom URL scheme.
     */
    isCustomURLToken(url: string): boolean {
        if (!url) {
            return false;
        }

        return url.indexOf(CoreConfigConstants.customurlscheme + '://token=') != -1;
    }

    /**
     * Remove the scheme from a custom URL.
     *
     * @param url URL to treat.
     * @return URL without scheme.
     */
    removeCustomURLScheme(url: string): string {
        return url.replace(CoreConfigConstants.customurlscheme + '://', '');
    }

    /**
     * Remove the scheme and the "link=" prefix from a link custom URL.
     *
     * @param url URL to treat.
     * @return URL without scheme and prefix.
     */
    removeCustomURLLinkScheme(url: string): string {
        return url.replace(CoreConfigConstants.customurlscheme + '://link=', '');
    }

    /**
     * Remove the scheme and the "token=" prefix from a token custom URL.
     *
     * @param url URL to treat.
     * @return URL without scheme and prefix.
     */
    removeCustomURLTokenScheme(url: string): string {
        return url.replace(CoreConfigConstants.customurlscheme + '://token=', '');
    }

    /**
     * Treat error returned by handleCustomURL.
     *
     * @param error Error data.
     */
    treatHandleCustomURLError(error: CoreCustomURLSchemesHandleError): void {
        if (error.error == 'Duplicated') {
            // Duplicated request
        } else if (error.error && error.data && error.data.isSSOToken) {
            // An error occurred, display the error and logout the user.
            this.loginHelper.treatUserTokenError(error.data.siteUrl, error.error);
            this.sitesProvider.logout();
        } else {
            this.domUtils.showErrorModalDefault(error.error, this.translate.instant('core.login.invalidsite'));
        }
    }

    /**
     * Check if a site URL is one of the fixed sites for the app (in case there are fixed sites).
     *
     * @param siteUrl Site URL to check.
     * @return Promise resolved with boolean: whether is one of the fixed sites.
     */
    protected async isInFixedSiteUrls(siteUrl: string): Promise<boolean> {
        if (this.loginHelper.isFixedUrlSet()) {

            return CoreUrl.sameDomainAndPath(siteUrl, <string> this.loginHelper.getFixedSites());
        } else if (this.loginHelper.hasSeveralFixedSites()) {
            const sites = <any[]> this.loginHelper.getFixedSites();

            const site = sites.find((site) => {
                return CoreUrl.sameDomainAndPath(siteUrl, site.url);
            });

            return !!site;
        } else if (CoreConfigConstants.multisitesdisplay == 'sitefinder' && CoreConfigConstants.onlyallowlistedsites) {
            // Call the sites finder to validate the site.
            const result = await this.sitesProvider.findSites(siteUrl.replace(/^https?\:\/\/|\.\w{2,3}\/?$/g, ''));

            const site = result && result.find((site) => {
                return CoreUrl.sameDomainAndPath(siteUrl, site.url);
            });

            return !!site;
        }

        return true;
    }
}

/**
 * Error returned by handleCustomURL.
 */
export class CoreCustomURLSchemesHandleError {

    /**
     * Constructor.
     *
     * @param error The error message or object.
     * @param data Data obtained from the URL (if any).
     */
    constructor(public error: any, public data?: CoreCustomURLSchemesParams) { }
}

export class CoreCustomURLSchemes extends makeSingleton(CoreCustomURLSchemesProvider) {}
