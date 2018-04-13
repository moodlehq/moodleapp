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
import { NavController } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '@providers/app';
import { CoreEventsProvider } from '@providers/events';
import { CoreInitDelegate } from '@providers/init';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { CoreLoginHelperProvider } from '@core/login/providers/helper';
import { CoreContentLinksDelegate, CoreContentLinksAction } from './delegate';
import { CoreConstants } from '@core/constants';
import { CoreConfigConstants } from '../../../configconstants';
import { CoreSitePluginsProvider } from '@core/siteplugins/providers/siteplugins';

/**
 * Service that provides some features regarding content links.
 */
@Injectable()
export class CoreContentLinksHelperProvider {
    protected logger;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private loginHelper: CoreLoginHelperProvider,
            private contentLinksDelegate: CoreContentLinksDelegate, private appProvider: CoreAppProvider,
            private domUtils: CoreDomUtilsProvider, private urlUtils: CoreUrlUtilsProvider, private translate: TranslateService,
            private initDelegate: CoreInitDelegate, eventsProvider: CoreEventsProvider, private textUtils: CoreTextUtilsProvider,
            private sitePluginsProvider: CoreSitePluginsProvider) {
        this.logger = logger.getInstance('CoreContentLinksHelperProvider');

        // Listen for app launched URLs. If we receive one, check if it's a content link.
        eventsProvider.on(CoreEventsProvider.APP_LAUNCHED_URL, this.handleCustomUrl.bind(this));
    }

    /**
     * Get the first valid action in a list of actions.
     *
     * @param {CoreContentLinksAction[]} actions List of actions.
     * @return {CoreContentLinksAction} First valid action. Returns undefined if no valid action found.
     */
    getFirstValidAction(actions: CoreContentLinksAction[]): CoreContentLinksAction {
        if (actions) {
            for (let i = 0; i < actions.length; i++) {
                const action = actions[i];
                if (action && action.sites && action.sites.length) {
                    return action;
                }
            }
        }
    }

    /**
     * Goes to a certain page in a certain site. If the site is current site it will perform a regular navigation,
     * otherwise it will 'redirect' to the other site.
     *
     * @param {NavController} navCtrl The NavController instance to use.
     * @param {string} pageName Name of the page to go.
     * @param {any} [pageParams] Params to send to the page.
     * @param {string} [siteId] Site ID. If not defined, current site.
     */
    goInSite(navCtrl: NavController, pageName: string, pageParams: any, siteId?: string): void {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();
        if (navCtrl && siteId == this.sitesProvider.getCurrentSiteId()) {
            navCtrl.push(pageName, pageParams);
        } else {
            this.loginHelper.redirect(pageName, pageParams, siteId);
        }
    }

    /**
     * Go to the page to choose a site.
     *
     * @param {string} url URL to treat.
     */
    goToChooseSite(url: string): void {
        this.appProvider.getRootNavController().setRoot('CoreContentLinksChooseSitePage', { url: url });
    }

    /**
     * Handle a URL received by Custom URL Scheme.
     *
     * @param {string} url URL to handle.
     * @return {boolean} True if the URL should be handled by this component, false otherwise.
     */
    handleCustomUrl(url: string): boolean {
        const contentLinksScheme = CoreConfigConstants.customurlscheme + '://link';
        if (url.indexOf(contentLinksScheme) == -1) {
            return false;
        }

        const modal = this.domUtils.showModalLoading();
        let username;

        url = this.textUtils.decodeURIComponent(url);

        // App opened using custom URL scheme.
        this.logger.debug('Treating custom URL scheme: ' + url);

        // Delete the scheme from the URL.
        url = url.replace(contentLinksScheme + '=', '');

        // Detect if there's a user specified.
        username = this.urlUtils.getUsernameFromUrl(url);
        if (username) {
            url = url.replace(username + '@', ''); // Remove the username from the URL.
        }

        // Wait for the app to be ready.
        this.initDelegate.ready().then(() => {
            // Check if the site is stored.
            return this.sitesProvider.getSiteIdsFromUrl(url, false, username);
        }).then((siteIds) => {
            if (siteIds.length) {
                modal.dismiss(); // Dismiss modal so it doesn't collide with confirms.

                return this.handleLink(url, username).then((treated) => {
                    if (!treated) {
                        this.domUtils.showErrorModal('core.contentlinks.errornoactions', true);
                    }
                });
            } else {
                // Get the site URL.
                const siteUrl = this.contentLinksDelegate.getSiteUrl(url);
                if (!siteUrl) {
                    this.domUtils.showErrorModal('core.login.invalidsite', true);

                    return;
                }

                // Check that site exists.
                return this.sitesProvider.checkSite(siteUrl).then((result) => {
                    // Site exists. We'll allow to add it.
                    const ssoNeeded = this.loginHelper.isSSOLoginNeeded(result.code),
                        pageName = 'CoreLoginCredentialsPage',
                        pageParams = {
                            siteUrl: result.siteUrl,
                            username: username,
                            urlToOpen: url,
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
                            this.appProvider.getRootNavController().setRoot(pageName, pageParams);
                        }
                    });

                }).catch((error) => {
                    if (error) {
                        this.domUtils.showErrorModal(error);
                    }
                });
            }
        }).finally(() => {
            modal.dismiss();
        });

        return true;
    }

    /**
     * Handle a link.
     *
     * @param {string} url URL to handle.
     * @param {string} [username] Username related with the URL. E.g. in 'http://myuser@m.com', url would be 'http://m.com' and
     *                            the username 'myuser'. Don't use it if you don't want to filter by username.
     * @param {NavController} [navCtrl] Nav Controller to use to navigate.
     * @return {Promise<boolean>} Promise resolved with a boolean: true if URL was treated, false otherwise.
     */
    handleLink(url: string, username?: string, navCtrl?: NavController): Promise<boolean> {
        // Check if the link should be treated by some component/addon.
        return this.contentLinksDelegate.getActionsFor(url, undefined, username).then((actions) => {
            const action = this.getFirstValidAction(actions);
            if (action) {
                if (!this.sitesProvider.isLoggedIn()) {
                    // No current site. Perform the action if only 1 site found, choose the site otherwise.
                    if (action.sites.length == 1) {
                        action.action(action.sites[0], navCtrl);
                    } else {
                        this.goToChooseSite(url);
                    }
                } else if (action.sites.length == 1 && action.sites[0] == this.sitesProvider.getCurrentSiteId()) {
                    // Current site.
                    action.action(action.sites[0], navCtrl);
                } else {
                    // Not current site or more than one site. Ask for confirmation.
                    this.domUtils.showConfirm(this.translate.instant('core.contentlinks.confirmurlothersite')).then(() => {
                        if (action.sites.length == 1) {
                            action.action(action.sites[0], navCtrl);
                        } else {
                            this.goToChooseSite(url);
                        }
                    }).catch(() => {
                        // User canceled.
                    });
                }

                return true;
            }

            return false;
        }).catch(() => {
            return false;
        });
    }
}
