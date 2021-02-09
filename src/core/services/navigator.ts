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
import { ActivatedRoute, NavigationStart, Params, Router as RouterService } from '@angular/router';

import { NavigationOptions } from '@ionic/angular/providers/nav-controller';

import { CoreConstants } from '@/core/constants';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreMainMenu } from '@features/mainmenu/services/mainmenu';
import { CoreMainMenuHomeHandlerService } from '@features/mainmenu/services/handlers/mainmenu';
import { CoreObject } from '@singletons/object';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CoreUrlUtils } from '@services/utils/url';
import { CoreTextUtils } from '@services/utils/text';
import { makeSingleton, NavController, Router } from '@singletons';
import { CoreScreen } from './screen';
import { filter } from 'rxjs/operators';
import { CoreApp } from './app';

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
    preferCurrentTab?: boolean; // Default true.
};

/**
 * Options for CoreNavigatorService#getCurrentRoute method.
 */
type GetCurrentRouteOptions = Partial<{
    parentRoute: ActivatedRoute;
    pageComponent: unknown;
}>;

/**
 * Service to provide some helper functions regarding navigation.
 */
@Injectable({ providedIn: 'root' })
export class CoreNavigatorService {

    protected storedParams: Record<number, unknown> = {};
    protected lastParamId = 0;
    protected currentPath?: string;
    protected previousPath?: string;

    // @todo Param router is an optional param to let the mocking work.
    constructor(router?: RouterService) {
        router?.events.pipe(filter(event => event instanceof NavigationStart)).subscribe((routerEvent: NavigationStart) => {
            // Using NavigationStart instead of NavigationEnd so it can be check on ngOnInit.
            this.previousPath = this.currentPath;
            this.currentPath = routerEvent.url;
        });
    }

    /**
     * Check whether the active route is using the given path.
     *
     * @param path Path, can be a glob pattern.
     * @return Whether the active route is using the given path.
     */
    isCurrent(path: string): boolean {
        return CoreTextUtils.instance.matchesGlob(this.getCurrentPath(), path);
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
     * Returns if a section is loaded on the split view (tablet mode).
     *
     * @param path Path, can be a glob pattern.
     * @return Whether the active route is using the given path.
     */
    isCurrentPathInTablet(path: string): boolean {
        if (CoreScreen.instance.isMobile) {
            // Split view is off.
            return false;
        }

        return this.isCurrent(path);
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

        // Remove objects from queryParams and replace them with an ID.
        this.replaceObjectParams(navigationOptions.queryParams);

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
    getCurrentPath(): string {
        return CoreUrlUtils.instance.removeUrlParams(Router.instance.url);
    }

    /**
     * Get the previous navigation route path.
     *
     * @return Previous path.
     */
    getPreviousPath(): string {
        // @todo: Remove this method and the used attributes.
        // This is a quick workarround to avoid loops. Ie, in messages we can navigate to user profile and there to messages.
        return CoreUrlUtils.instance.removeUrlParams(this.previousPath || '');
    }

    /**
     * Get a parameter for the current route.
     * Please notice that objects can only be retrieved once. You must call this function only once per page and parameter,
     * unless there's a new navigation to the page.
     *
     * @param name Name of the parameter.
     * @return Value of the parameter, undefined if not found.
     */
    getRouteParam<T = unknown>(name: string, params?: Params): T | undefined {
        let value: any;

        if (!params) {
            const route = this.getCurrentRoute();
            if (!route.snapshot) {
                return;
            }

            value = route.snapshot.queryParams[name] ?? route.snapshot.params[name];
        } else {
            value = params[name];
        }

        let storedParam = this.storedParams[value];

        // Remove the parameter from our map if it's in there.
        delete this.storedParams[value];

        if (!CoreApp.instance.isMobile() && !storedParam) {
            // Try to retrieve the param from local storage in browser.
            const storageParam = localStorage.getItem(value);
            if (storageParam) {
                storedParam = CoreTextUtils.instance.parseJSON(storageParam);
            }
        }

        return <T> storedParam ?? value;
    }

    /**
     * Get a number route param.
     * Angular router automatically converts numbers to string, this function automatically converts it back to number.
     *
     * @param name Name of the parameter.
     * @return Value of the parameter, undefined if not found.
     */
    getRouteNumberParam(name: string, params?: Params): number | undefined {
        const value = this.getRouteParam<string>(name, params);

        return value !== undefined ? Number(value) : value;
    }

    /**
     * Get a boolean route param.
     * Angular router automatically converts booleans to string, this function automatically converts it back to boolean.
     *
     * @param name Name of the parameter.
     * @return Value of the parameter, undefined if not found.
     */
    getRouteBooleanParam(name: string, params?: Params): boolean | undefined {
        const value = this.getRouteParam<string>(name, params);

        return value !== undefined ? Boolean(value) : value;
    }

    /**
     * Navigate back.
     *
     * @return Promise resolved when done.
     */
    back(): Promise<void> {
        return NavController.instance.pop();
    }

    /**
     * Get current activated route.
     *
     * @param options
     *     - parent: Parent route, if this isn't provided the current active route will be used.
     *     - pageComponent: Page component of the route to find, if this isn't provided the deepest route in the hierarchy
     *                      will be returned.
     * @return Current activated route.
     */
    getCurrentRoute(): ActivatedRoute;
    getCurrentRoute(options: GetCurrentRouteOptions): ActivatedRoute | null;
    getCurrentRoute({ parentRoute, pageComponent }: GetCurrentRouteOptions = {}): ActivatedRoute | null {
        parentRoute = parentRoute ?? Router.instance.routerState.root;

        if (pageComponent && parentRoute.component === pageComponent) {
            return parentRoute;
        }

        if (parentRoute.firstChild) {
            return this.getCurrentRoute({ parentRoute: parentRoute.firstChild, pageComponent });
        }

        return pageComponent ? null : parentRoute;
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

        if (options.preferCurrentTab === false && isMainMenuTab) {
            return this.navigate(`/main/${path}`, options);
        }

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

    /**
     * Replace all objects in query params with an ID that can be used to retrieve the object later.
     *
     * @param queryParams Params.
     */
    protected replaceObjectParams(queryParams?: Params | null): void {
        for (const name in queryParams) {
            const value = queryParams[name];
            if (typeof value != 'object' || value === null) {
                continue;
            }

            const id = this.getNewParamId();
            this.storedParams[id] = value;
            queryParams[name] = id;

            if (!CoreApp.instance.isMobile()) {
                // In browser, save the param in local storage to be able to retrieve it if the app is refreshed.
                localStorage.setItem(id, JSON.stringify(value));
            }
        }
    }

    /**
     * Get an ID for a new parameter.
     */
    protected getNewParamId(): string {
        return 'param-' + (++this.lastParamId);
    }

}

export class CoreNavigator extends makeSingleton(CoreNavigatorService) {}
