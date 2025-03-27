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
import { CoreContentLinksDelegate, CoreContentLinksAction } from './contentlinks-delegate';
import { CoreSite } from '@classes/sites/site';
import { makeSingleton, Translate } from '@singletons';
import { CoreNavigator } from '@services/navigator';
import { CoreCustomURLSchemes } from '@services/urlschemes';
import { CoreModals } from '@services/overlays/modals';
import { CoreAlerts } from '@services/overlays/alerts';

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

            const action = await this.getFirstValidActionFor(url, courseId, username);

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
     * Go to the page to choose a site.
     *
     * @param url URL to treat.
     * @todo set correct root.
     */
    async goToChooseSite(url: string): Promise<void> {
        const { CoreContentLinksChooseSiteModalComponent }
            = await import('@features/contentlinks/components/choose-site-modal/choose-site-modal');

        await CoreModals.openModal({
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
                    await this.handleRootURL(data.site, openBrowserRoot);

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
                    await action.action(action.sites[0]);
                } else {
                    this.goToChooseSite(url);
                }
            } else if (action.sites?.length === 1 && action.sites[0] === CoreSites.getCurrentSiteId()) {
                // Current site.
                await action.action(action.sites[0]);
            } else {
                try {
                    // Not current site or more than one site. Ask for confirmation.
                    await CoreAlerts.confirm(Translate.instant('core.contentlinks.confirmurlothersite'));
                    if (action.sites?.length === 1) {
                        await action.action(action.sites[0]);
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
     */
    async handleRootURL(site: CoreSite, openBrowserRoot?: boolean, checkToken?: boolean): Promise<void> {
        const currentSite = CoreSites.getCurrentSite();

        if (currentSite && currentSite.getURL() === site.getURL() && (!checkToken || currentSite.getToken() === site.getToken())) {
            // Already logged in.
            if (openBrowserRoot) {
                await site.openInBrowserWithAutoLogin(site.getURL());
            }

            return;
        }

        // Login in the site.
        await CoreNavigator.navigateToSiteHome({ siteId: site.getId() });
    }

    /**
     * Visit a site link.
     *
     * @param url URL to handle.
     * @param options Behaviour options.
     * @param options.siteId Site Id.
     * @param options.username Username related with the URL. E.g. in 'http://myuser@m.com', url would be 'http://m.com' and
     *                 the username 'myuser'. Don't use it if you don't want to filter by username.
     * @param options.checkRoot Whether to check if the URL is the root URL of a site.
     * @param options.openBrowserRoot Whether to open in browser if it's root URL and it belongs to current site.
     */
    async visitLink(
        url: string,
        options: {
            siteId?: string;
            username?: string;
            checkRoot?: boolean;
            openBrowserRoot?: boolean;
        } = {},
    ): Promise<void> {
        const treated = await this.handleLink(url, options.username, options.checkRoot, options.openBrowserRoot);

        if (treated) {
            return;
        }

        const site = options.siteId
            ? await CoreSites.getSite(options.siteId)
            : CoreSites.getCurrentSite();

        await site?.openInBrowserWithAutoLogin(url);
    }

}

export const CoreContentLinksHelper = makeSingleton(CoreContentLinksHelperProvider);
