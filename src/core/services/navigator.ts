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
import { ActivatedRoute, Params } from '@angular/router';

import { NavigationOptions } from '@ionic/angular/providers/nav-controller';

import { CoreConstants } from '@/core/constants';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreMainMenu } from '@features/mainmenu/services/mainmenu';
import { CoreMainMenuHomeHandlerService } from '@features/mainmenu/services/handlers/mainmenu';
import { CoreObject } from '@singletons/object';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CoreUrlUtils } from '@services/utils/url';
import { makeSingleton, NavController, Router } from '@singletons';

const DEFAULT_MAIN_MENU_TAB = CoreMainMenuHomeHandlerService.PAGE_NAME;

/**
 * Redirect payload.
 */
export type CoreRedirectPayload = {
    redirectPath: string;
    redirectParams?: Params;
};

/**
 * Navigation options.
 */
export type CoreNavigationOptions = {
    animated?: boolean;
    params?: Params;
    reset?: boolean;
};

/**
 * Service to provide some helper functions regarding navigation.
 */
@Injectable({ providedIn: 'root' })
export class CoreNavigatorService {

    /**
     * Check whether the active route is using the given path.
     *
     * @param path Path.
     * @return Whether the active route is using the given path.
     */
    isCurrent(path: string): boolean {
        return this.getCurrentPath() === path;
    }

    /**
     * Get current main menu tab.
     *
     * @return Current main menu tab or null if the current route is not using the main menu.
     */
    getCurrentMainMenuTab(): string | null {
        const currentPath = this.getCurrentPath();
        const matches = /^\/main\/([^/]+).*$/.exec(currentPath);

        return matches?.[1] ?? null;
    }

    /**
     * Navigate to a new path.
     *
     * @param path Path to navigate to.
     * @param options Navigation options.
     * @return Whether navigation suceeded.
     */
    async navigate(path: string, options: CoreNavigationOptions = {}): Promise<boolean> {
        const url: string[] = [/^[./]/.test(path) ? path : `./${path}`];
        const navigationOptions: NavigationOptions = CoreObject.withoutEmpty({
            animated: options.animated,
            queryParams: CoreObject.isEmpty(options.params ?? {}) ? null : options.params,
            relativeTo: path.startsWith('/') ? null : this.getCurrentRoute(),
        });
        const navigationResult = (options.reset ?? false)
            ? await NavController.instance.navigateRoot(url, navigationOptions)
            : await NavController.instance.navigateForward(url, navigationOptions);

        return navigationResult !== false;
    }

    /**
     * Navigate to the login credentials route.
     *
     * @param params Page params.
     * @return Whether navigation suceeded.
     */
    async navigateToLoginCredentials(params: Params = {}): Promise<boolean> {
        // If necessary, open the previous path to keep the navigation history.
        if (!this.isCurrent('/login/site') && !this.isCurrent('/login/sites')) {
            const hasSites = await CoreSites.instance.hasSites();

            await this.navigate(hasSites ? '/login/sites' : '/login/site', { reset: true });
        }

        // Navigate to login credentials page.
        return this.navigate('/login/credentials', { params });
    }

    /**
     * Navigate to the home route of the current site.
     *
     * @param options Navigation options.
     * @return Whether navigation suceeded.
     */
    async navigateToSiteHome(options: Omit<CoreNavigationOptions, 'reset'> & { siteId?: string } = {}): Promise<boolean> {
        return this.navigateToSitePath(DEFAULT_MAIN_MENU_TAB, options);
    }

    /**
     * Navigate to a site path, loading the site if necessary.
     *
     * @param path Site path to visit.
     * @param options Navigation and site options.
     * @return Whether navigation suceeded.
     */
    async navigateToSitePath(
        path: string,
        options: Omit<CoreNavigationOptions, 'reset'> & { siteId?: string } = {},
    ): Promise<boolean> {
        const siteId = options.siteId ?? CoreSites.instance.getCurrentSiteId();
        const navigationOptions: CoreNavigationOptions = CoreObject.without(options, ['siteId']);

        // @todo: When this function was in ContentLinksHelper, this code was inside NgZone. Check if it's needed.

        // If the path doesn't belong to a site, call standard navigation.
        if (siteId === CoreConstants.NO_SITE_ID) {
            return this.navigate(path, {
                ...navigationOptions,
                reset: true,
            });
        }

        // If we are logged into a different site, log out first.
        if (CoreSites.instance.isLoggedIn() && CoreSites.instance.getCurrentSiteId() !== siteId) {
            // @todo: Check site plugins and store redirect.

            await CoreSites.instance.logout();
        }

        // If we are not logged into the site, load the site.
        if (!CoreSites.instance.isLoggedIn()) {
            const modal = await CoreDomUtils.instance.showModalLoading();

            try {
                const loggedIn = await CoreSites.instance.loadSite(siteId, path, options.params);

                if (!loggedIn) {
                    // User has been redirected to the login page and will be redirected to the site path after login.
                    return true;
                }
            } catch (error) {
                // Site doesn't exist.
                return this.navigate('/login/sites', { reset: true });
            } finally {
                modal.dismiss();
            }
        }

        // User is logged in, navigate to the site path.
        return this.navigateToMainMenuPath(path, navigationOptions);
    }

    /**
     * Get the active route path.
     *
     * @return Current path.
     */
    protected getCurrentPath(): string {
        return CoreUrlUtils.instance.removeUrlParams(Router.instance.url);
    }

    /**
     * Get current activated route.
     *
     * @param route Parent route.
     * @return Current activated route.
     */
    protected getCurrentRoute(route?: ActivatedRoute): ActivatedRoute {
        route = route ?? Router.instance.routerState.root;

        return route.children.length === 0 ? route : this.getCurrentRoute(route.children[0]);
    }

    /**
     * Navigate to a path within the main menu.
     * If the path belongs to a visible tab, that tab will be selected.
     * If it doesn't, the current tab or the default tab will be used instead.
     *
     * @param path Main menu path.
     * @param options Navigation options.
     * @return Whether navigation suceeded.
     */
    protected async navigateToMainMenuPath(path: string, options: Omit<CoreNavigationOptions, 'reset'> = {}): Promise<boolean> {
        // Due to DeepLinker, we need to remove the path from the URL before going to main menu.
        // IonTabs checks the URL to determine which path to load for deep linking, so we clear the URL.
        // @todo this.location.replaceState('');

        path = path.replace(/^(\.|\/main)?\//, '');

        const pathRoot = /^[^/]+/.exec(path)?.[0] ?? '';
        const currentMainMenuTab = this.getCurrentMainMenuTab();
        const isMainMenuTab = await CoreUtils.instance.ignoreErrors(
            CoreMainMenu.instance.isMainMenuTab(pathRoot),
            false,
        );

        // Open the path within the current main tab.
        if (currentMainMenuTab && (!isMainMenuTab || pathRoot !== currentMainMenuTab)) {
            return this.navigate(`/main/${currentMainMenuTab}/${path}`, options);
        }

        // Open the path within the corresponding main tab.
        if (isMainMenuTab) {
            return this.navigate(`/main/${path}`, options);
        }

        // Open the path within the default main tab.
        // @todo test that this is working as expected
        return this.navigate(`/main/${DEFAULT_MAIN_MENU_TAB}`, {
            ...options,
            params: {
                redirectPath: `/main/${DEFAULT_MAIN_MENU_TAB}/${path}`,
                redirectParams: options.params,
            } as CoreRedirectPayload,
        });
    }

}

export class CoreNavigator extends makeSingleton(CoreNavigatorService) {}
