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
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from './app';
import { CoreInitDelegate } from './init';
import { CoreLoggerProvider } from './logger';
import { CoreSitesProvider } from './sites';
import { CoreDomUtilsProvider } from './utils/dom';
import { CoreTextUtilsProvider } from './utils/text';
import { CoreUrlUtilsProvider } from './utils/url';
import { CoreUtilsProvider } from './utils/utils';
import { CoreLoginHelperProvider } from '@core/login/providers/helper';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { CoreContentLinksDelegate } from '@core/contentlinks/providers/delegate';
import { CoreSitePluginsProvider } from '@core/siteplugins/providers/siteplugins';
import { CoreConfigConstants } from '../configconstants';
import { CoreConstants } from '@core/constants';

/**
 * All params that can be in a custom URL scheme.
 */
export interface CoreCustomURLSchemesParams {
    /**
     * The site's URL.
     * @type {string}
     */
    siteUrl: string;

    /**
     * User's token. If set, user will be authenticated.
     * @type {string}
     */
    token?: string;

    /**
     * User's private token.
     * @type {string}
     */
    privateToken?: string;

    /**
     * Username.
     * @type {string}
     */
    username?: string;

    /**
     * URL to open once authenticated.
     * @type {string}
     */
    redirect?: any;

    /**
     * Name of the page to go once authenticated.
     * @type {string}
     */
    pageName?: string;

    /**
     * Params to pass to the page.
     * @type {string}
     */
    pageParams?: any;
}

/*
 * Provider to handle custom URL schemes.
 */
@Injectable()
export class CoreCustomURLSchemesProvider {
    protected logger;
    protected lastUrls = {};

    constructor(logger: CoreLoggerProvider, private appProvider: CoreAppProvider, private utils: CoreUtilsProvider,
            private loginHelper: CoreLoginHelperProvider, private linksHelper: CoreContentLinksHelperProvider,
            private initDelegate: CoreInitDelegate, private domUtils: CoreDomUtilsProvider, private urlUtils: CoreUrlUtilsProvider,
            private sitesProvider: CoreSitesProvider, private textUtils: CoreTextUtilsProvider,
            private linksDelegate: CoreContentLinksDelegate, private translate: TranslateService,
            private sitePluginsProvider: CoreSitePluginsProvider) {
        this.logger = logger.getInstance('CoreCustomURLSchemesProvider');
    }

    /**
     * Handle an URL received by custom URL scheme.
     *
     * @param {string} url URL to treat.
     * @return {Promise<any>} Promise resolved when done.
     */
    handleCustomURL(url: string): Promise<any> {
        if (!this.isCustomURL(url)) {
            return Promise.reject(null);
        }

        let modal,
            isSSOToken = false,
            data: CoreCustomURLSchemesParams;

        /* First check that this URL hasn't been treated a few seconds ago. The function that handles custom URL schemes already
           does this, but this function is called from other places so we need to handle it in here too. */
        if (this.lastUrls[url] && Date.now() - this.lastUrls[url] < 3000) {
            // Function called more than once, stop.
            return;
        }

        this.lastUrls[url] = Date.now();

        // Wait for app to be ready.
        return this.initDelegate.ready().then(() => {
            url = this.textUtils.decodeURIComponent(url);

            // Some platforms like Windows add a slash at the end. Remove it.
            // Some sites add a # at the end of the URL. If it's there, remove it.
            url = url.replace(/\/?#?\/?$/, '');

            modal = this.domUtils.showModalLoading();

            // Get the data from the URL.
            if (this.isCustomURLToken(url)) {
                isSSOToken = true;

                return this.getCustomURLTokenData(url);
            } else if (this.isCustomURLLink(url)) {
                // In iOS, the protocol after the scheme doesn't have ":". Add it.
                url = url.replace(/\/\/link=(https?)\/\//, '//link=$1://');

                return this.getCustomURLLinkData(url);
            } else {
                // In iOS, the protocol after the scheme doesn't have ":". Add it.
                url = url.replace(/\/\/(https?)\/\//, '//$1://');

                return this.getCustomURLData(url);
            }
        }).then((result) => {
            data = result;

            if (data.redirect && data.redirect.match(/^https?:\/\//) && data.redirect.indexOf(data.siteUrl) == -1) {
                // Redirect URL must belong to the same site. Reject.
                return Promise.reject(this.translate.instant('core.contentlinks.errorredirectothersite'));
            }

            // First of all, authenticate the user if needed.
            const currentSite = this.sitesProvider.getCurrentSite();

            if (data.token) {
                if (!currentSite || currentSite.getToken() != data.token) {
                    // Token belongs to a different site, create it. It doesn't matter if it already exists.
                    let promise;

                    if (!data.siteUrl.match(/^https?:\/\//)) {
                        // URL doesn't have a protocol and it's required to be able to create the site. Check which one to use.
                        promise = this.sitesProvider.checkSite(data.siteUrl).then((result) => {
                            data.siteUrl = result.siteUrl;
                        });
                    } else {
                        promise = Promise.resolve();
                    }

                    return promise.then(() => {
                        return this.sitesProvider.newSite(data.siteUrl, data.token, data.privateToken, isSSOToken);
                    });
                } else {
                    // Token belongs to current site, no need to create it.
                    return this.sitesProvider.getCurrentSiteId();
                }
            }
        }).then((siteId) => {
            if (isSSOToken) {
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

            let promise;

            if (siteId) {
                // Site created, we know the site to use.
                promise = Promise.resolve([siteId]);
            } else {
                // Check if the site is stored.
                promise = this.sitesProvider.getSiteIdsFromUrl(data.siteUrl, true, data.username);
            }

            return promise.then((siteIds) => {
                if (siteIds.length > 1) {
                    // More than one site to treat the URL, let the user choose.
                    this.linksHelper.goToChooseSite(data.redirect || data.siteUrl);

                } else if (siteIds.length == 1) {
                    // Only one site, handle the link.
                    return this.sitesProvider.getSite(siteIds[0]).then((site) => {
                        if (!data.redirect) {
                            // No redirect, go to the root URL if needed.

                            return this.linksHelper.handleRootURL(site, false, true);
                        } else {
                            // Handle the redirect link.
                            modal.dismiss(); // Dismiss modal so it doesn't collide with confirms.

                            /* Always use the username from the site in this case. If the link has a username and a token,
                               this will make sure that the link is opened with the user the token belongs to. */
                            const username = site.getInfo().username || data.username;

                            return this.linksHelper.handleLink(data.redirect, username).then((treated) => {
                                if (!treated) {
                                    this.domUtils.showErrorModal('core.contentlinks.errornoactions', true);
                                }
                            });
                        }
                    });

                } else {
                    // Site not stored. Try to add the site.
                    return this.sitesProvider.checkSite(data.siteUrl).then((result) => {
                        // Site exists. We'll allow to add it.
                        const ssoNeeded = this.loginHelper.isSSOLoginNeeded(result.code),
                            pageName = 'CoreLoginCredentialsPage',
                            pageParams = {
                                siteUrl: result.siteUrl,
                                username: data.username,
                                urlToOpen: data.redirect,
                                siteConfig: result.config
                            };
                        let promise,
                            hasSitePluginsLoaded = false;

                        modal.dismiss(); // Dismiss modal so it doesn't collide with confirms.

                        if (!this.sitesProvider.isLoggedIn()) {
                            // Not logged in, no need to confirm. If SSO the confirm will be shown later.
                            promise = Promise.resolve();
                        } else {
                            // Ask the user before changing site.
                            const confirmMsg = this.translate.instant('core.contentlinks.confirmurlothersite');
                            promise = this.domUtils.showConfirm(confirmMsg).then(() => {
                                if (!ssoNeeded) {
                                    hasSitePluginsLoaded = this.sitePluginsProvider.hasSitePluginsLoaded;
                                    if (hasSitePluginsLoaded) {
                                        // Store the redirect since logout will restart the app.
                                        this.appProvider.storeRedirect(CoreConstants.NO_SITE_ID, pageName, pageParams);
                                    }

                                    return this.sitesProvider.logout().catch(() => {
                                        // Ignore errors (shouldn't happen).
                                    });
                                }
                            });
                        }

                        return promise.then(() => {
                            if (ssoNeeded) {
                                this.loginHelper.confirmAndOpenBrowserForSSOLogin(
                                    result.siteUrl, result.code, result.service, result.config && result.config.launchurl);
                            } else if (!hasSitePluginsLoaded) {
                                return this.loginHelper.goToNoSitePage(undefined, pageName, pageParams);
                            }
                        });

                    });
                }
            });

        }).catch((error) => {
            if (error == 'Duplicated') {
                // Duplicated request
            } else if (error && isSSOToken) {
                // An error occurred, display the error and logout the user.
                this.loginHelper.treatUserTokenError(data.siteUrl, error);
                this.sitesProvider.logout();
            } else {
                this.domUtils.showErrorModalDefault(error, this.translate.instant('core.login.invalidsite'));
            }
        }).finally(() => {
            modal.dismiss();

            if (isSSOToken) {
                this.appProvider.finishSSOAuthentication();
            }
        });

    }

    /**
     * Get the data from a custom URL scheme. The structure of the URL is:
     * moodlemobile://username@domain.com?token=TOKEN&privatetoken=PRIVATETOKEN&redirect=http://domain.com/course/view.php?id=2
     *
     * @param {string} url URL to treat.
     * @return {Promise<CoreCustomURLSchemesParams>} Promise resolved with the data.
     */
    protected getCustomURLData(url: string): Promise<CoreCustomURLSchemesParams> {
        const urlScheme = CoreConfigConstants.customurlscheme + '://';
        if (url.indexOf(urlScheme) == -1) {
            return Promise.reject(null);
        }

        // App opened using custom URL scheme.
        this.logger.debug('Treating custom URL scheme: ' + url);

        // Delete the sso scheme from the URL.
        url = url.replace(urlScheme, '');

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

        let promise;

        if (!url.match(/https?:\/\//)) {
            // Url doesn't have a protocol. Check if the site is stored in the app to be able to determine the protocol.
            promise = this.sitesProvider.getSiteIdsFromUrl(url, true, username).then((siteIds) => {
                if (siteIds.length) {
                    // There is at least 1 site with this URL. Use it to know the full URL.
                    return this.sitesProvider.getSite(siteIds[0]).then((site) => {
                        return site.getURL();
                    });
                } else {
                    // No site stored with this URL, just use the URL as it is.
                    return url;
                }
            });
        } else {
            promise = Promise.resolve(url);
        }

        return promise.then((url) => {
            return {
                siteUrl: url,
                username: username,
                token: params.token,
                privateToken: params.privateToken,
                redirect: params.redirect
            };
        });
    }

    /**
     * Get the data from a "link" custom URL scheme. This kind of URL is deprecated.
     *
     * @param {string} url URL to treat.
     * @return {Promise<CoreCustomURLSchemesParams>} Promise resolved with the data.
     */
    protected getCustomURLLinkData(url: string): Promise<CoreCustomURLSchemesParams> {
        const contentLinksScheme = CoreConfigConstants.customurlscheme + '://link=';
        if (url.indexOf(contentLinksScheme) == -1) {
            return Promise.reject(null);
        }

        // App opened using custom URL scheme.
        this.logger.debug('Treating custom URL scheme with link param: ' + url);

        // Delete the sso scheme from the URL.
        url = url.replace(contentLinksScheme, '');

        // Detect if there's a user specified.
        const username = this.urlUtils.getUsernameFromUrl(url);
        if (username) {
            url = url.replace(username + '@', ''); // Remove the username from the URL.
        }

        // First of all, check if it's the root URL of a site.
        return this.sitesProvider.isStoredRootURL(url, username).then((data): any => {

            if (data.site) {
                // Root URL.
                return {
                    siteUrl: data.site.getURL(),
                    username: username
                };

            } else if (data.siteIds.length > 0) {
                // Not the root URL, but at least 1 site supports the URL. Get the site URL from the list of sites.
                return this.sitesProvider.getSite(data.siteIds[0]).then((site) => {
                    return {
                        siteUrl: site.getURL(),
                        username: username,
                        redirect: url
                    };
                });

            } else {
                // Get the site URL.
                let siteUrl = this.linksDelegate.getSiteUrl(url),
                    redirect = url;

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
        });
    }

    /**
     * Get the data from a "token" custom URL scheme. This kind of URL is deprecated.
     *
     * @param {string} url URL to treat.
     * @return {Promise<CoreCustomURLSchemesParams>} Promise resolved with the data.
     */
    protected getCustomURLTokenData(url: string): Promise<CoreCustomURLSchemesParams> {
        const ssoScheme = CoreConfigConstants.customurlscheme + '://token=';
        if (url.indexOf(ssoScheme) == -1) {
            return Promise.reject(null);
        }

        if (this.appProvider.isSSOAuthenticationOngoing()) {
            // Authentication ongoing, probably duplicated request.
            return Promise.reject('Duplicated');
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

            return Promise.reject(null);
        }

        return this.loginHelper.validateBrowserSSOLogin(url);
    }

    /**
     * Check whether a URL is a custom URL scheme.
     *
     * @param {string} url URL to check.
     * @return {boolean} Whether it's a custom URL scheme.
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
     * @param {string} url URL to check.
     * @return {boolean} Whether it's a custom URL scheme.
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
     * @param {string} url URL to check.
     * @return {boolean} Whether it's a custom URL scheme.
     */
    isCustomURLToken(url: string): boolean {
        if (!url) {
            return false;
        }

        return url.indexOf(CoreConfigConstants.customurlscheme + '://token=') != -1;
    }
}
