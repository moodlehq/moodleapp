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
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreContentLinksDelegate, CoreContentLinksAction } from './contentlinks-delegate';
import { CoreSite } from '@classes/site';
import { makeSingleton, Translate } from '@singletons';
import { CoreNavigator } from '@services/navigator';
import { Params } from '@angular/router';
import { CoreContentLinksChooseSiteModalComponent } from '../components/choose-site-modal/choose-site-modal';
import { CoreCustomURLSchemes } from '@services/urlschemes';

/**
 * Service that provides some features regarding content links.
 */
@Injectable({ providedIn: 'root' })
export class CoreContentLinksHelperProvider {

    /**
     * Check whether a link can be handled by the app.
     *
     * @param url URL to handle.
     * @param courseId Unused param: Course ID related to the URL.
     * @param username Username to use to filter sites.
     * @param checkRoot Whether to check if the URL is the root URL of a site.
     * @returns Promise resolved with a boolean: whether the URL can be handled.
     */
    async canHandleLink(url: string, courseId?: number, username?: string, checkRoot?: boolean): Promise<boolean> {
        try {
            if (checkRoot) {
                const data = await CoreSites.isStoredRootURL(url, username);

                if (data.site) {
                    // URL is the root of the site, can handle it.
                    return true;
                }
            }

            const action = await this.getFirstValidActionFor(url, undefined, username);

            return !!action;
        } catch {
            return false;
        }
    }

    /**
     * Get the first valid action for a URL.
     *
     * @param url URL to handle.
     * @param courseId Course ID related to the URL. Optional but recommended.
     * @param username Username to use to filter sites.
     * @param data Extra data to handle the URL.
     * @returns Promise resolved with the first valid action. Returns undefined if no valid action found..
     */
    async getFirstValidActionFor(
        url: string,
        courseId?: number,
        username?: string,
        data?: unknown,
    ): Promise<CoreContentLinksAction | undefined> {
        const actions = await CoreContentLinksDelegate.getActionsFor(url, courseId, username, data);
        if (!actions) {
            return;
        }

        return this.getFirstValidAction(actions);
    }

    /**
     * Get the first valid action in a list of possible actions.
     *
     * @param actions Actions.
     * @returns First valid action if any.
     */
    getFirstValidAction(actions: CoreContentLinksAction[]): CoreContentLinksAction | undefined {
        return actions.find((action) => action && action.sites && action.sites.length);
    }

    /**
     * Goes to a certain page in a certain site. If the site is current site it will perform a regular navigation,
     * otherwise it will 'redirect' to the other site.
     *
     * @param navCtrlUnused Deprecated param.
     * @param pageName Name of the page to go.
     * @param pageParams Params to send to the page.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     * @deprecated since 3.9.5. Use CoreNavigator.navigateToSitePath instead.
     */
    async goInSite(navCtrlUnused: unknown, pageName: string, pageParams: Params, siteId?: string): Promise<void> {
        await CoreNavigator.navigateToSitePath(pageName, { params: pageParams, siteId });
    }

    /**
     * Go to the page to choose a site.
     *
     * @param url URL to treat.
     * @todo set correct root.
     */
    async goToChooseSite(url: string): Promise<void> {
        await CoreDomUtils.openModal({
            component: CoreContentLinksChooseSiteModalComponent,
            componentProps: {
                url: url,
            },
            cssClass: 'core-modal-fullscreen',
        });
    }

    /**
     * Handle a link.
     *
     * @param url URL to handle.
     * @param username Username related with the URL. E.g. in 'http://myuser@m.com', url would be 'http://m.com' and
     *                 the username 'myuser'. Don't use it if you don't want to filter by username.
     * @param checkRoot Whether to check if the URL is the root URL of a site.
     * @param openBrowserRoot Whether to open in browser if it's root URL and it belongs to current site.
     * @returns Promise resolved with a boolean: true if URL was treated, false otherwise.
     */
    async handleLink(
        url: string,
        username?: string,
        checkRoot?: boolean,
        openBrowserRoot?: boolean,
    ): Promise<boolean> {
        try {
            if (CoreCustomURLSchemes.isCustomURL(url)) {
                await CoreCustomURLSchemes.handleCustomURL(url);

                return true;
            }

            if (checkRoot) {
                const data = await CoreSites.isStoredRootURL(url, username);

                if (data.site) {
                    // URL is the root of the site.
                    this.handleRootURL(data.site, openBrowserRoot);

                    return true;
                }
            }

            // Check if the link should be treated by some component/addon.
            const action = await this.getFirstValidActionFor(url, undefined, username);
            if (!action) {
                return false;
            }
            if (!CoreSites.isLoggedIn()) {
                // No current site. Perform the action if only 1 site found, choose the site otherwise.
                if (action.sites?.length == 1) {
                    action.action(action.sites[0]);
                } else {
                    this.goToChooseSite(url);
                }
            } else if (action.sites?.length == 1 && action.sites[0] == CoreSites.getCurrentSiteId()) {
                // Current site.
                action.action(action.sites[0]);
            } else {
                try {
                    // Not current site or more than one site. Ask for confirmation.
                    await CoreDomUtils.showConfirm(Translate.instant('core.contentlinks.confirmurlothersite'));
                    if (action.sites?.length == 1) {
                        action.action(action.sites[0]);
                    } else {
                        this.goToChooseSite(url);
                    }
                } catch {
                    // User canceled.
                }
            }

            return true;
        } catch {
            // Ignore errors.
        }

        return false;
    }

    /**
     * Handle a root URL of a site.
     *
     * @param site Site to handle.
     * @param openBrowserRoot Whether to open in browser if it's root URL and it belongs to current site.
     * @param checkToken Whether to check that token is the same to verify it's current site. If false or not defined,
     *                   only the URL will be checked.
     * @returns Promise resolved when done.
     */
    async handleRootURL(site: CoreSite, openBrowserRoot?: boolean, checkToken?: boolean): Promise<void> {
        const currentSite = CoreSites.getCurrentSite();

        if (currentSite && currentSite.getURL() == site.getURL() && (!checkToken || currentSite.getToken() == site.getToken())) {
            // Already logged in.
            if (openBrowserRoot) {
                return site.openInBrowserWithAutoLogin(site.getURL());
            }
        } else {
            // Login in the site.
            await CoreNavigator.navigateToSiteHome({ siteId: site.getId() });
        }
    }

}

export const CoreContentLinksHelper = makeSingleton(CoreContentLinksHelperProvider);
