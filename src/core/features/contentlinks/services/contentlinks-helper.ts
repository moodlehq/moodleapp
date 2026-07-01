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
                url,
            },
            initialBreakpoint: 1,
            breakpoints: [0, 1],
            cssClass: 'no-header core-modal-auto-height',
        });
    }

    /**
     * Handle a link.
     *
     * @param url URL to handle.
     * @param options Behaviour options.
     * @returns Promise resolved with a boolean: true if URL was treated, false otherwise.
     */
    async handleLink(url: string, options?: HandleLinkOptions): Promise<boolean>;
    /**
     * @deprecated since 5.2. Use the overload accepting HandleLinkOptions instead.
     */
    async handleLink(
        url: string,
        username?: string,
        checkRoot?: boolean,
        openBrowserRoot?: boolean,
    ): Promise<boolean>;
    async handleLink(
        url: string,
        usernameOrOptions?: string | HandleLinkOptions,
        checkRoot?: boolean,
        openBrowserRoot?: boolean,
    ): Promise<boolean> {
        const options =
            typeof usernameOrOptions === 'string' || usernameOrOptions === undefined
                ? {
                    username: usernameOrOptions,
                    checkRoot,
                    openBrowserRoot,
                }
                : usernameOrOptions;

        const confirmSiteChange = options.confirmSiteChange ?? true;

        try {
            if (CoreCustomURLSchemes.isCustomURL(url)) {
                await CoreCustomURLSchemes.handleCustomURL(url);

                return true;
            }

            if (options.checkRoot) {
                const data = await CoreSites.isStoredRootURL(url, options.username);

                if (data.site) {
                    // URL is the root of the site.
                    await this.handleRootURL(data.site, {
                        openBrowserRoot: options.openBrowserRoot,
                        confirmSiteChange,
                    });

                    return true;
                }
            }

            // Check if the link should be treated by some component/addon.
            const action = await this.getFirstValidActionFor(url, undefined, options.username);
            if (!action) {
                return false;
            }

            if (!CoreSites.isLoggedIn()) {
                // No current site. Perform the action if only 1 site found, choose the site otherwise.
                if (confirmSiteChange) {
                    await this.confirmLinkToSite({ siteId: action.sites?.[0], url });
                }

                if (action.sites?.length === 1) {
                    await action.action(action.sites[0]);
                } else {
                    void this.goToChooseSite(url);
                }
            } else if (action.sites?.length === 1 && action.sites[0] === CoreSites.getCurrentSiteId()) {
                // Current site.
                await action.action(action.sites[0]);
            } else {
                try {
                    // Not current site or more than one site. Ask for confirmation.
                    if (confirmSiteChange) {
                        await this.confirmLinkToSite({ siteId: action.sites?.[0], url });
                    }

                    if (action.sites?.length === 1) {
                        await action.action(action.sites[0]);
                    } else {
                        void this.goToChooseSite(url);
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
     * Confirm open a link to a certain site.
     *
     * @param data Data.
     * @param data.url Site URL.
     * @param data.siteId Site ID.
     */
    async confirmLinkToSite(data: { url: string; siteId?: string }): Promise<void>;
    async confirmLinkToSite(data: { siteId: string; url?: string }): Promise<void>;
    async confirmLinkToSite(data: { url?: string; siteId?: string }): Promise<void> {
        let siteUrl = data.url;
        if (data.siteId) {
            const site = await CoreSites.getSite(data.siteId);
            siteUrl = site.getURL();
        }

        await CoreAlerts.confirm(Translate.instant('core.contentlinks.confirmlinktosite', { url: siteUrl }), {
            header: Translate.instant('core.contentlinks.confirmlinktositetitle'),
            okText: Translate.instant('core.contentlinks.opensite'),
        });
    }

    /**
     * Handle a root URL of a site.
     *
     * @param site Site to handle.
     * @param options Behaviour options.
     */
    async handleRootURL(site: CoreSite, options?: HandleRootURLOptions): Promise<void>;
    /**
     * @deprecated since 5.2.1. Use the overload accepting HandleRootURLOptions instead.
     */
    async handleRootURL(
        site: CoreSite,
        openBrowserRoot?: boolean,
        checkToken?: boolean,
    ): Promise<void>;
    async handleRootURL(
        site: CoreSite,
        openBrowserRootOrOptions?: boolean | HandleRootURLOptions,
        checkToken?: boolean,
    ): Promise<void> {
        const options =
            typeof openBrowserRootOrOptions === 'boolean' || openBrowserRootOrOptions === undefined
                ? {
                    openBrowserRoot: openBrowserRootOrOptions,
                    checkToken,
                }
                : openBrowserRootOrOptions;

        const currentSite = CoreSites.getCurrentSite();
        const shouldConfirmSiteChange = options.confirmSiteChange ?? true;

        if (
            currentSite &&
            currentSite.getURL() === site.getURL() &&
            (!options.checkToken || currentSite.getToken() === site.getToken())
        ) {
            // Already logged in.
            if (options.openBrowserRoot) {
                await site.openInBrowserWithAutoLogin(site.getURL());
            }

            return;
        }

        if (shouldConfirmSiteChange && CoreSites.getCurrentSiteId() !== site.getId()) {
            try {
                // Ask the user before changing site.
                await this.confirmLinkToSite({ url: site.getURL() });
            } catch {
                return;
            }
        }

        // Login in the site.
        await CoreNavigator.navigateToSiteHome({ siteId: site.getId() });
    }

    /**
     * Visit a site link.
     *
     * @param url URL to handle.
     * @param options Behaviour options.
     */
    async visitLink(url: string, options: VisitLinkOptions = {}): Promise<void> {
        const treated = await this.handleLink(url, options);

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

/**
 * Options for handleLink.
 */
type HandleLinkOptions = {
    /**
     * Username to use to filter sites.
     */
    username?: string;
    /**
     * Whether to check if the URL is the root URL of a site.
     */
    checkRoot?: boolean;
    /**
     * Whether to open in browser if it's root URL and it belongs to current site.
     */
    openBrowserRoot?: boolean;
    /**
     * Whether to ask for confirmation before opening the link in a different site. Defaults to true.
     */
    confirmSiteChange?: boolean;
};

/**
 * Options for handleRootURL.
 */
type HandleRootURLOptions = {
    /**
     * Whether to open in browser if it's root URL and it belongs to current site.
     */
    openBrowserRoot?: boolean;
    /**
     * Whether to check that token is the same to verify it's current site.
     */
    checkToken?: boolean;
    /**
     * Whether to ask for confirmation before changing site. Defaults to true.
     */
    confirmSiteChange?: boolean;
};

/**
 * Options for visitLink.
 */
type VisitLinkOptions = HandleLinkOptions & {
    /**
     * Site Id.
     */
    siteId?: string;
};
