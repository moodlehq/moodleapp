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

import { CoreError } from '@classes/errors/error';
import { CoreWSError } from '@classes/errors/wserror';
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreContentLinksHelper } from '@features/contentlinks/services/contentlinks-helper';
import { CoreLoginHelper, CoreLoginSSOData } from '@features/login/services/login-helper';
import { ApplicationInit, makeSingleton, Translate } from '@singletons';
import { CoreLogger } from '@singletons/logger';
import { CorePath } from '@singletons/path';
import { CoreConstants } from '../constants';
import { CoreSSO } from '@singletons/sso';
import { CoreNavigator, CoreRedirectPayload } from './navigator';
import { CoreSiteCheckResponse, CoreSites } from './sites';
import { CoreDomUtils } from './utils/dom';
import { CoreErrorHelper, CoreErrorObject } from './error-helper';
import { CoreUrl } from '@singletons/url';
import { CoreLoadings } from './loadings';

/*
 * Provider to handle custom URL schemes.
 */
@Injectable({ providedIn: 'root' })
export class CoreCustomURLSchemesProvider {

    protected logger: CoreLogger;
    protected lastUrls: Record<string, number> = {};

    constructor() {
        this.logger = CoreLogger.getInstance('CoreCustomURLSchemesProvider');
    }

    /**
     * Given some data of a custom URL with a token, create a site if it needs to be created.
     *
     * @param data URL data.
     * @returns Promise resolved with the site ID if created or already exists.
     */
    protected async createSiteIfNeeded(data: CoreCustomURLSchemesParams): Promise<string | undefined> {
        if (!data.token) {
            return;
        }

        const currentSite = CoreSites.getCurrentSite();

        if (!currentSite || currentSite.getToken() != data.token || currentSite.isLoggedOut()) {
            // Token belongs to a different site or site is logged out, create it. It doesn't matter if it already exists.

            if (!data.siteUrl.match(/^https?:\/\//)) {
                // URL doesn't have a protocol and it's required to be able to create the site. Check which one to use.
                const result = await CoreSites.checkSite(data.siteUrl);

                data.siteUrl = result.siteUrl;

                await CoreSites.checkApplication(result.config);
            }

            return CoreSites.newSite(
                data.siteUrl,
                data.token,
                data.privateToken,
                !!data.isSSOToken,
                CoreLoginHelper.getOAuthIdFromParams(data.ssoUrlParams),
            );
        } else {
            // Token belongs to current site, no need to create it.
            return CoreSites.getCurrentSiteId();
        }
    }

    /**
     * Handle an URL received by custom URL scheme.
     *
     * @param url URL to treat.
     * @returns Promise resolved when done. If rejected, the parameter is of type CoreCustomURLSchemesHandleError.
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
        url = CoreUrl.decodeURIComponent(url);

        // Wait for app to be ready.
        await ApplicationInit.donePromise;

        // Some platforms like Windows add a slash at the end. Remove it.
        // Some sites add a # at the end of the URL. If it's there, remove it.
        url = url.replace(/\/?(#.*)?\/?$/, '');

        const modal = await CoreLoadings.show();
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
            const isValid = await CoreLoginHelper.isSiteUrlAllowed(data.siteUrl);

            if (!isValid) {
                throw Translate.instant('core.errorurlschemeinvalidsite');
            }

            if (data.redirect && data.redirect.match(/^https?:\/\//) && data.redirect.indexOf(data.siteUrl) == -1) {
                // Redirect URL must belong to the same site. Reject.
                throw Translate.instant('core.contentlinks.errorredirectothersite');
            }

            // First of all, create the site if needed.
            const siteId = await this.createSiteIfNeeded(data);

            if (data.isSSOToken || (data.isAuthenticationURL && siteId && CoreSites.getCurrentSiteId() == siteId)) {
                // Site created and authenticated, open the page to go.
                CoreNavigator.navigateToSiteHome({
                    params: <CoreRedirectPayload> {
                        redirectPath: data.redirectPath,
                        redirectOptions: data.redirectOptions,
                        urlToOpen: data.urlToOpen,
                    },
                });

                return;
            }

            if (data.redirect && !data.redirect.match(/^https?:\/\//)) {
                // Redirect is a relative URL. Append the site URL.
                data.redirect = CorePath.concatenatePaths(data.siteUrl, data.redirect);
            }

            let siteIds = [siteId];

            if (!siteId) {
                // No site created, check if the site is stored (to know which one to use).
                siteIds = await CoreSites.getSiteIdsFromUrl(data.siteUrl, true, data.username);
            }

            if (siteIds.length > 1) {
                // More than one site to treat the URL, let the user choose.
                CoreContentLinksHelper.goToChooseSite(data.redirect || data.siteUrl);

            } else if (siteIds.length == 1) {
                // Only one site, handle the link.
                const site = await CoreSites.getSite(siteIds[0]);

                if (!data.redirect) {
                    // No redirect, go to the root URL if needed.
                    await CoreContentLinksHelper.handleRootURL(site, false, true);
                } else {
                    // Handle the redirect link.
                    modal.dismiss(); // Dismiss modal so it doesn't collide with confirms.

                    /* Always use the username from the site in this case. If the link has a username and a token,
                       this will make sure that the link is opened with the user the token belongs to. */
                    const username = site.getInfo()?.username || data.username;

                    const treated = await CoreContentLinksHelper.handleLink(data.redirect, username);

                    if (!treated) {
                        CoreDomUtils.showErrorModal('core.contentlinks.errornoactions', true);
                    }
                }

            } else {
                // Site not stored. Try to add the site.
                const result = await CoreSites.checkSite(data.siteUrl);

                // Site exists. We'll allow to add it.
                modal.dismiss(); // Dismiss modal so it doesn't collide with confirms.

                await this.goToAddSite(data, result);
            }

        } catch (error) {
            throw new CoreCustomURLSchemesHandleError(error, data);
        } finally {
            modal.dismiss();

            if (data.isSSOToken) {
                CoreSSO.finishSSOAuthentication();
            }
        }
    }

    /**
     * Get the data from a custom URL scheme. The structure of the URL is:
     * moodlemobile://username@domain.com?token=TOKEN&privatetoken=PRIVATETOKEN&redirect=http://domain.com/course/view.php?id=2
     *
     * @param url URL to treat.
     * @returns Promise resolved with the data.
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
        const username = CoreUrl.getUsernameFromUrl(url);
        if (username) {
            url = url.replace(username + '@', ''); // Remove the username from the URL.
        }

        // Get the params of the URL.
        const params = CoreUrl.extractUrlParams(url);

        // Remove the params to get the site URL.
        if (url.indexOf('?') != -1) {
            url = url.substring(0, url.indexOf('?'));
        }

        if (!url.match(/https?:\/\//)) {
            // Url doesn't have a protocol. Check if the site is stored in the app to be able to determine the protocol.
            const siteIds = await CoreSites.getSiteIdsFromUrl(url, true, username);

            if (siteIds.length) {
                // There is at least 1 site with this URL. Use it to know the full URL.
                const site = await CoreSites.getSite(siteIds[0]);

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
     * @returns Promise resolved with the data.
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
        const username = CoreUrl.getUsernameFromUrl(url);
        if (username) {
            url = url.replace(username + '@', ''); // Remove the username from the URL.
        }

        // First of all, check if it's the root URL of a site.
        const data = await CoreSites.isStoredRootURL(url, username);

        if (data.site) {
            // Root URL.
            return {
                siteUrl: data.site.getURL(),
                username: username,
            };

        } else if (data.siteIds.length > 0) {
            // Not the root URL, but at least 1 site supports the URL. Get the site URL from the list of sites.
            const site = await CoreSites.getSite(data.siteIds[0]);

            return {
                siteUrl: site.getURL(),
                username: username,
                redirect: url,
            };

        } else {
            // Get the site URL.
            let siteUrl = CoreContentLinksDelegate.getSiteUrl(url);
            let redirect: string | undefined = url;

            if (!siteUrl) {
                // Site URL not found, use the original URL since it could be the root URL of the site.
                siteUrl = url;
                redirect = undefined;
            }

            return {
                siteUrl: siteUrl,
                username: username,
                redirect: redirect,
            };
        }
    }

    /**
     * Get the data from a "token" custom URL scheme. This kind of URL is deprecated.
     *
     * @param url URL to treat.
     * @returns Promise resolved with the data.
     */
    protected async getCustomURLTokenData(url: string): Promise<CoreCustomURLSchemesParams> {
        if (!this.isCustomURLToken(url)) {
            throw new CoreCustomURLSchemesHandleError(null);
        }

        if (CoreSSO.isSSOAuthenticationOngoing()) {
            // Authentication ongoing, probably duplicated request.
            throw new CoreCustomURLSchemesHandleError('Duplicated');
        }

        // App opened using custom URL scheme. Probably an SSO authentication.
        CoreSSO.startSSOAuthentication();
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

        const data: CoreCustomURLSchemesParams = await CoreLoginHelper.validateBrowserSSOLogin(url);

        data.isSSOToken = true;
        data.isAuthenticationURL = true;

        return data;
    }

    /**
     * Go to page to add a site, or open a browser if SSO.
     *
     * @param data URL data.
     * @param siteCheck Result of checkSite.
     * @returns Promise resolved when done.
     */
    protected async goToAddSite(data: CoreCustomURLSchemesParams, siteCheck: CoreSiteCheckResponse): Promise<void> {
        const pageParams = {
            username: data.username,
            urlToOpen: data.redirect,
            siteCheck,
        };

        if (CoreSites.isLoggedIn()) {
            // Ask the user before changing site.
            await CoreDomUtils.showConfirm(Translate.instant('core.contentlinks.confirmurlothersite'));

            const willReload = await CoreSites.logoutForRedirect(CoreConstants.NO_SITE_ID, {
                redirectPath: '/login/credentials',
                redirectOptions: { params: pageParams },
            });

            if (willReload) {
                return;
            }
        }

        await CoreNavigator.navigateToLoginCredentials(pageParams);
    }

    /**
     * Check whether a URL is a custom URL scheme.
     *
     * @param url URL to check.
     * @returns Whether it's a custom URL scheme.
     */
    isCustomURL(url: string): boolean {
        if (!url) {
            return false;
        }

        return url.indexOf(CoreConstants.CONFIG.customurlscheme + '://') != -1;
    }

    /**
     * Check whether a URL is a custom URL scheme with the "link" param (deprecated).
     *
     * @param url URL to check.
     * @returns Whether it's a custom URL scheme.
     */
    isCustomURLLink(url: string): boolean {
        if (!url) {
            return false;
        }

        return url.indexOf(CoreConstants.CONFIG.customurlscheme + '://link=') != -1;
    }

    /**
     * Check whether a URL is a custom URL scheme with a "token" param (deprecated).
     *
     * @param url URL to check.
     * @returns Whether it's a custom URL scheme.
     */
    isCustomURLToken(url: string): boolean {
        if (!url) {
            return false;
        }

        return url.indexOf(CoreConstants.CONFIG.customurlscheme + '://token=') != -1;
    }

    /**
     * Remove the scheme from a custom URL.
     *
     * @param url URL to treat.
     * @returns URL without scheme.
     */
    removeCustomURLScheme(url: string): string {
        return url.replace(CoreConstants.CONFIG.customurlscheme + '://', '');
    }

    /**
     * Remove the scheme and the "link=" prefix from a link custom URL.
     *
     * @param url URL to treat.
     * @returns URL without scheme and prefix.
     */
    removeCustomURLLinkScheme(url: string): string {
        return url.replace(CoreConstants.CONFIG.customurlscheme + '://link=', '');
    }

    /**
     * Remove the scheme and the "token=" prefix from a token custom URL.
     *
     * @param url URL to treat.
     * @returns URL without scheme and prefix.
     */
    removeCustomURLTokenScheme(url: string): string {
        return url.replace(CoreConstants.CONFIG.customurlscheme + '://token=', '');
    }

    /**
     * Treat error returned by handleCustomURL.
     *
     * @param error Error data.
     */
    treatHandleCustomURLError(error: CoreCustomURLSchemesHandleError): void {
        if (error.error == 'Duplicated') {
            // Duplicated request
        } else if (CoreWSError.isWebServiceError(error.error) && error.data && error.data.isSSOToken) {
            // An error occurred, display the error and logout the user.
            CoreLoginHelper.treatUserTokenError(error.data.siteUrl, <CoreWSError> error.error);
            CoreSites.logout();
        } else {
            CoreDomUtils.showErrorModalDefault(error.error, Translate.instant('core.login.invalidsite'));
        }
    }

    /**
     * Get the last URL used to open the app using a URL scheme.
     *
     * @returns URL.
     */
    getLastLaunchURL(): Promise<string | undefined> {
        return new Promise((resolve) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (<any> window).plugins.launchmyapp.getLastIntent(intent => resolve(intent), () => resolve(undefined));
        });
    }

    /**
     * Check if the last URL used to open the app was a token URL.
     *
     * @returns Whether was launched with token URL.
     */
    async appLaunchedWithTokenURL(): Promise<boolean> {
        const launchUrl = await this.getLastLaunchURL();

        return !!launchUrl && this.isCustomURLToken(launchUrl);
    }

}

/**
 * Error returned by handleCustomURL.
 */
export class CoreCustomURLSchemesHandleError extends CoreError {

    /**
     * Constructor.
     *
     * @param error The error message or object.
     * @param data Data obtained from the URL (if any).
     */
    constructor(public error: string | CoreError | CoreErrorObject | null, public data?: CoreCustomURLSchemesParams) {
        super(CoreErrorHelper.getErrorMessageFromError(error));
    }

}

export const CoreCustomURLSchemes = makeSingleton(CoreCustomURLSchemesProvider);

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
    redirect?: string;

    /**
     * Whether it's an SSO token URL.
     */
    isSSOToken?: boolean;

    /**
     * Whether the URL is meant to perform an authentication.
     */
    isAuthenticationURL?: boolean;
}
