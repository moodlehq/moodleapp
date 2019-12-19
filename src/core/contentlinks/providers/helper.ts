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

import { Injectable, NgZone } from '@angular/core';
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
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreLoginHelperProvider } from '@core/login/providers/helper';
import { CoreContentLinksDelegate, CoreContentLinksAction } from './delegate';
import { CoreConstants } from '@core/constants';
import { CoreConfigConstants } from '../../../configconstants';
import { CoreSitePluginsProvider } from '@core/siteplugins/providers/siteplugins';
import { CoreSite } from '@classes/site';
import { CoreMainMenuProvider } from '@core/mainmenu/providers/mainmenu';

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
            private sitePluginsProvider: CoreSitePluginsProvider, private zone: NgZone, private utils: CoreUtilsProvider,
            private mainMenuProvider: CoreMainMenuProvider) {
        this.logger = logger.getInstance('CoreContentLinksHelperProvider');
    }

    /**
     * Check whether a link can be handled by the app.
     *
     * @param url URL to handle.
     * @param courseId Course ID related to the URL. Optional but recommended.
     * @param username Username to use to filter sites.
     * @param checkRoot Whether to check if the URL is the root URL of a site.
     * @return Promise resolved with a boolean: whether the URL can be handled.
     */
    canHandleLink(url: string, courseId?: number, username?: string, checkRoot?: boolean): Promise<boolean> {
        let promise;

        if (checkRoot) {
            promise = this.sitesProvider.isStoredRootURL(url, username);
        } else {
            promise = Promise.resolve({});
        }

        return promise.then((data) => {
            if (data.site) {
                // URL is the root of the site, can handle it.
                return true;
            }

            return this.contentLinksDelegate.getActionsFor(url, undefined, username).then((actions) => {
                return !!this.getFirstValidAction(actions);
            });
        }).catch(() => {
            return false;
        });
    }

    /**
     * Get the first valid action in a list of actions.
     *
     * @param actions List of actions.
     * @return First valid action. Returns undefined if no valid action found.
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
     * @param navCtrl The NavController instance to use.
     * @param pageName Name of the page to go.
     * @param pageParams Params to send to the page.
     * @param siteId Site ID. If not defined, current site.
     * @param checkMenu If true, check if the root page of a main menu tab. Only the page name will be checked.
     * @return Promise resolved when done.
     */
    goInSite(navCtrl: NavController, pageName: string, pageParams: any, siteId?: string, checkMenu?: boolean): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const deferred = this.utils.promiseDefer();

        // Execute the code in the Angular zone, so change detection doesn't stop working.
        this.zone.run(() => {
            if (navCtrl && siteId == this.sitesProvider.getCurrentSiteId()) {
                if (checkMenu) {
                    // Check if the page is in the main menu.
                    this.mainMenuProvider.isCurrentMainMenuHandler(pageName, pageParams).catch(() => {
                        return false; // Shouldn't happen.
                    }).then((isInMenu) => {
                        if (isInMenu) {
                            // Just select the tab.
                            this.loginHelper.loadPageInMainMenu(pageName, pageParams);

                            deferred.resolve();
                        } else {
                            navCtrl.push(pageName, pageParams).then(deferred.resolve, deferred.reject);
                        }
                    });
                } else {
                    navCtrl.push(pageName, pageParams).then(deferred.resolve, deferred.reject);
                }
            } else {
                this.loginHelper.redirect(pageName, pageParams, siteId).then(deferred.resolve, deferred.reject);
            }
        });

        return deferred.promise;
    }

    /**
     * Go to the page to choose a site.
     *
     * @param url URL to treat.
     */
    goToChooseSite(url: string): void {
        this.appProvider.getRootNavController().setRoot('CoreContentLinksChooseSitePage', { url: url });
    }

    /**
     * Handle a URL received by Custom URL Scheme.
     *
     * @param url URL to handle.
     * @return True if the URL should be handled by this component, false otherwise.
     * @deprecated Please use CoreCustomURLSchemesProvider.handleCustomURL instead.
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
            // Check if it's the root URL.
            return this.sitesProvider.isStoredRootURL(url, username);
        }).then((data) => {

            if (data.site) {
                // Root URL.
                modal.dismiss();

                return this.handleRootURL(data.site, false);
            } else if (data.siteIds.length > 0) {
                modal.dismiss(); // Dismiss modal so it doesn't collide with confirms.

                return this.handleLink(url, username).then((treated) => {
                    if (!treated) {
                        this.domUtils.showErrorModal('core.contentlinks.errornoactions', true);
                    }
                });
            } else {
                // Get the site URL.
                let siteUrl = this.contentLinksDelegate.getSiteUrl(url),
                    urlToOpen = url;

                if (!siteUrl) {
                    // Site URL not found, use the original URL since it could be the root URL of the site.
                    siteUrl = url;
                    urlToOpen = undefined;
                }

                // Check that site exists.
                return this.sitesProvider.checkSite(siteUrl).then((result) => {
                    // Site exists. We'll allow to add it.
                    const ssoNeeded = this.loginHelper.isSSOLoginNeeded(result.code),
                        pageName = 'CoreLoginCredentialsPage',
                        pageParams = {
                            siteUrl: result.siteUrl,
                            username: username,
                            urlToOpen: urlToOpen,
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

                }).catch((error) => {
                    this.domUtils.showErrorModalDefault(error, this.translate.instant('core.login.invalidsite'));
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
     * @param url URL to handle.
     * @param username Username related with the URL. E.g. in 'http://myuser@m.com', url would be 'http://m.com' and
     *                 the username 'myuser'. Don't use it if you don't want to filter by username.
     * @param navCtrl Nav Controller to use to navigate.
     * @param checkRoot Whether to check if the URL is the root URL of a site.
     * @param openBrowserRoot Whether to open in browser if it's root URL and it belongs to current site.
     * @return Promise resolved with a boolean: true if URL was treated, false otherwise.
     */
    handleLink(url: string, username?: string, navCtrl?: NavController, checkRoot?: boolean, openBrowserRoot?: boolean)
            : Promise<boolean> {
        let promise;

        if (checkRoot) {
            promise = this.sitesProvider.isStoredRootURL(url, username);
        } else {
            promise = Promise.resolve({});
        }

        return promise.then((data) => {
            if (data.site) {
                // URL is the root of the site.
                this.handleRootURL(data.site, openBrowserRoot);

                return true;
            }

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
        });
    }

    /**
     * Handle a root URL of a site.
     *
     * @param site Site to handle.
     * @param openBrowserRoot Whether to open in browser if it's root URL and it belongs to current site.
     * @param checkToken Whether to check that token is the same to verify it's current site. If false or not defined,
     *                   only the URL will be checked.
     * @return Promise resolved when done.
     */
    handleRootURL(site: CoreSite, openBrowserRoot?: boolean, checkToken?: boolean): Promise<any> {
        const currentSite = this.sitesProvider.getCurrentSite();

        if (currentSite && currentSite.getURL() == site.getURL() && (!checkToken || currentSite.getToken() == site.getToken())) {
            // Already logged in.
            if (openBrowserRoot) {
                return site.openInBrowserWithAutoLogin(site.getURL());
            }

            return Promise.resolve();
        } else {
            // Login in the site.
            return this.loginHelper.redirect('', {}, site.getId());
        }
    }
}
