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
import { ActivatedRoute, ActivatedRouteSnapshot, Params } from '@angular/router';

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
import { CoreApp } from './app';
import { CoreSitePlugins } from '@features/siteplugins/services/siteplugins';

const DEFAULT_MAIN_MENU_TAB = CoreMainMenuHomeHandlerService.PAGE_NAME;

/**
 * Redirect payload.
 */
export type CoreRedirectPayload = {
    redirectPath: string;
    redirectOptions?: CoreNavigationOptions;
};

/**
 * Navigation options.
 */
export type CoreNavigationOptions = Pick<NavigationOptions, 'animated'|'animation'|'animationDirection'> & {
    params?: Params;
    reset?: boolean;
    preferCurrentTab?: boolean; // Default true.
    nextNavigation?: {
        path: string;
        isSitePath?: boolean;
        options?: CoreNavigationOptions;
    };
};

/**
 * Route options to get route or params values.
 */
export type CoreNavigatorCurrentRouteOptions = Partial<{
    params: Params; // Params to get the value from.
    route: ActivatedRoute; // Current Route.
    pageComponent: unknown;
    routeData: Record<string, unknown>;
}>;

/**
 * Service to provide some helper functions regarding navigation.
 */
@Injectable({ providedIn: 'root' })
export class CoreNavigatorService {

    protected routesDepth: Record<string, number> = {};
    protected storedParams: Record<number, unknown> = {};
    protected lastParamId = 0;

    /**
     * Check whether the active route is using the given path.
     *
     * @param path Path, can be a glob pattern.
     * @return Whether the active route is using the given path.
     */
    isCurrent(path: string): boolean {
        return CoreTextUtils.matchesGlob(this.getCurrentPath(), path);
    }

    /**
     * Get current main menu tab.
     *
     * @return Current main menu tab or null if the current route is not using the main menu.
     */
    getCurrentMainMenuTab(): string | null {
        return this.getMainMenuTabFromPath(this.getCurrentPath());
    }

    /**
     * Get main menu tab from a path.
     *
     * @param path The path to check.
     * @return Path's main menu tab or null if the path is not using the main menu.
     */
    getMainMenuTabFromPath(path: string): string | null {
        const matches = /^\/main\/([^/]+).*$/.exec(path);

        return matches?.[1] ?? null;
    }

    /**
     * Returns if a section is loaded on the split view (tablet mode).
     *
     * @param path Path, can be a glob pattern.
     * @return Whether the active route is using the given path.
     */
    isCurrentPathInTablet(path: string): boolean {
        if (CoreScreen.isMobile) {
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
            animation: options.animation,
            animationDirection: options.animationDirection,
            queryParams: CoreObject.isEmpty(options.params ?? {}) ? null : CoreObject.withoutEmpty(options.params),
            relativeTo: path.startsWith('/') ? null : this.getCurrentRoute(),
        });

        // Remove objects from queryParams and replace them with an ID.
        this.replaceObjectParams(navigationOptions.queryParams);

        const navigationResult = (options.reset ?? false)
            ? await NavController.navigateRoot(url, navigationOptions)
            : await NavController.navigateForward(url, navigationOptions);

        if (options.nextNavigation?.path && navigationResult !== false) {
            if (options.nextNavigation.isSitePath) {
                return this.navigateToSitePath(options.nextNavigation.path, options.nextNavigation.options);
            }

            return this.navigate(options.nextNavigation.path, options.nextNavigation.options);
        }

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
            const hasSites = await CoreSites.hasSites();

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
        return this.navigateToSitePath(DEFAULT_MAIN_MENU_TAB, {
            ...options,
            reset: true,
        });
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
        options: CoreNavigationOptions & { siteId?: string } = {},
    ): Promise<boolean> {
        const siteId = options.siteId ?? CoreSites.getCurrentSiteId();
        const navigationOptions: CoreNavigationOptions = CoreObject.without(options, ['siteId']);

        // If the path doesn't belong to a site, call standard navigation.
        if (siteId === CoreConstants.NO_SITE_ID) {
            return this.navigate(path, {
                ...navigationOptions,
                reset: true,
            });
        }

        // If we are logged into a different site, log out first.
        if (CoreSites.isLoggedIn() && CoreSites.getCurrentSiteId() !== siteId) {
            if (CoreSitePlugins.hasSitePluginsLoaded) {
                // The site has site plugins so the app will be restarted. Store the data and logout.
                CoreApp.storeRedirect(siteId, path, options || {});

                await CoreSites.logout();

                return true;
            }

            await CoreSites.logout();
        }

        // If we are not logged into the site, load the site.
        if (!CoreSites.isLoggedIn()) {
            const modal = await CoreDomUtils.showModalLoading();

            try {
                const loggedIn = await CoreSites.loadSite(siteId, path, options.params);

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
        return CoreUrlUtils.removeUrlParams(Router.url);
    }

    /**
     * Iterately get the params checking parent routes.
     *
     * @param name Name of the parameter.
     * @param route Current route.
     * @return Value of the parameter, undefined if not found.
     */
    protected getRouteSnapshotParam<T = unknown>(name: string, route?: ActivatedRoute): T | undefined {
        if (!route?.snapshot) {
            return;
        }

        const value = route.snapshot.queryParams[name] ?? route.snapshot.params[name];

        if (typeof value != 'undefined') {
            return value;
        }

        return this.getRouteSnapshotParam(name, route.parent || undefined);
    }

    /**
     * Get a parameter for the current route.
     * Please notice that objects can only be retrieved once. You must call this function only once per page and parameter,
     * unless there's a new navigation to the page.
     *
     * @param name Name of the parameter.
     * @param routeOptions Optional routeOptions to get the params or route value from. If missing, it will autodetect.
     * @return Value of the parameter, undefined if not found.
     */
    getRouteParam<T = unknown>(name: string, routeOptions: CoreNavigatorCurrentRouteOptions = {}): T | undefined {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let value: any;

        if (!routeOptions.params) {
            let route = this.getCurrentRoute();
            if (!route?.snapshot && routeOptions.route) {
                route = routeOptions.route;
            }

            value = this.getRouteSnapshotParam(name, route);
        } else {
            value = routeOptions.params[name];
        }

        if (typeof value == 'undefined') {
            return;
        }

        let storedParam = this.storedParams[value];

        // Remove the parameter from our map if it's in there.
        delete this.storedParams[value];

        if (!CoreApp.isMobile() && !storedParam) {
            // Try to retrieve the param from local storage in browser.
            const storageParam = localStorage.getItem(value);
            if (storageParam) {
                storedParam = CoreTextUtils.parseJSON(storageParam);
            }
        }

        return <T> storedParam ?? value;
    }

    /**
     * Get a number route param.
     * Angular router automatically converts numbers to string, this function automatically converts it back to number.
     *
     * @param name Name of the parameter.
     * @param routeOptions Optional routeOptions to get the params or route value from. If missing, it will autodetect.
     * @return Value of the parameter, undefined if not found.
     */
    getRouteNumberParam(name: string, routeOptions: CoreNavigatorCurrentRouteOptions = {}): number | undefined {
        const value = this.getRouteParam<string>(name, routeOptions);

        return value !== undefined ? Number(value) : value;
    }

    /**
     * Get a boolean route param.
     * Angular router automatically converts booleans to string, this function automatically converts it back to boolean.
     *
     * @param name Name of the parameter.
     * @param routeOptions Optional routeOptions to get the params or route value from. If missing, it will autodetect.
     * @return Value of the parameter, undefined if not found.
     */
    getRouteBooleanParam(name: string, routeOptions: CoreNavigatorCurrentRouteOptions = {}): boolean | undefined {
        const value = this.getRouteParam<string>(name, routeOptions);

        if (typeof value == 'undefined') {
            return value;
        }

        if (CoreUtils.isTrueOrOne(value)) {
            return true;
        }

        if (CoreUtils.isFalseOrZero(value)) {
            return false;
        }

        return Boolean(value);
    }

    /**
     * Navigate back.
     *
     * @return Promise resolved when done.
     */
    back(): Promise<void> {
        return NavController.pop();
    }

    /**
     * Get current activated route.
     *
     * @param options
     *     - route: Parent route, if this isn't provided the current active route will be used.
     *     - pageComponent: Page component of the route to find, if this isn't provided the deepest route in the hierarchy
     *                      will be returned.
     * @return Current activated route.
     */
    getCurrentRoute(): ActivatedRoute;
    getCurrentRoute(options: CoreNavigatorCurrentRouteOptions): ActivatedRoute | null;
    getCurrentRoute({ route, pageComponent, routeData }: CoreNavigatorCurrentRouteOptions = {}): ActivatedRoute | null {
        route = route ?? Router.routerState.root;

        if (pageComponent && route.component === pageComponent) {
            return route;
        }

        if (routeData && CoreUtils.basicLeftCompare(routeData, route.snapshot.data, 3)) {
            return route;
        }

        if (route.firstChild) {
            return this.getCurrentRoute({ route: route.firstChild, pageComponent, routeData });
        }

        return pageComponent || routeData ? null : route;
    }

    /**
     * Check whether a route is active within the current stack.
     *
     * @param route Route to check.
     * @return Whether the route is active or not.
     */
    isRouteActive(route: ActivatedRoute): boolean {
        const routePath = this.getRouteFullPath(route.snapshot);
        let activeRoute: ActivatedRoute | null = Router.routerState.root;

        while (activeRoute) {
            if (this.getRouteFullPath(activeRoute.snapshot) === routePath) {
                return true;
            }

            activeRoute = activeRoute.firstChild;
        }

        return false;
    }

    /**
     * Increase the number of times a route is repeated on the navigation stack.
     *
     * @param path Absolute route path.
     */
    increaseRouteDepth(path: string): void {
        this.routesDepth[path] = this.getRouteDepth(path) + 1;
    }

    /**
     * Decrease the number of times a route is repeated on the navigation stack.
     *
     * @param path Absolute route path.
     */
    decreaseRouteDepth(path: string): void {
        if (this.getRouteDepth(path) <= 1) {
            delete this.routesDepth[path];
        } else {
            this.routesDepth[path]--;
        }
    }

    /**
     * Get the number of times a route is repeated on the navigation stack.
     *
     * @param path Absolute route path.
     * @return Route depth.
     */
    getRouteDepth(path: string): number {
        return this.routesDepth[path] ?? 0;
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
    protected async navigateToMainMenuPath(path: string, options: CoreNavigationOptions = {}): Promise<boolean> {
        options = {
            preferCurrentTab: true,
            ...options,
        };

        path = path.replace(/^(\.|\/main)?\//, '');

        const pathRoot = /^[^/]+/.exec(path)?.[0] ?? '';
        const currentMainMenuTab = this.getCurrentMainMenuTab();
        const isMainMenuTab = await CoreUtils.ignoreErrors(
            CoreMainMenu.isMainMenuTab(pathRoot),
            false,
        );

        if (!options.preferCurrentTab && isMainMenuTab) {
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
        return this.navigate(`/main/${DEFAULT_MAIN_MENU_TAB}`, {
            ...options,
            params: {
                redirectPath: `/main/${DEFAULT_MAIN_MENU_TAB}/${path}`,
                redirectOptions: options.params || options.nextNavigation ? options : undefined,
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

            if (!CoreApp.isMobile()) {
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

    /**
     * Replace the route params in a path with the params values.
     *
     * @param path Path.
     * @param params Params.
     * @returns Path with params replaced.
     */
    replaceRoutePathParams(path: string, params?: Params): string {
        for (const name in params) {
            path = path.replace(`:${name}`, params[name]);
        }

        return path;
    }

    /**
     * Get the full path of a certain route, including parent routes paths.
     *
     * @param route Route snapshot.
     * @return Path.
     */
    getRouteFullPath(route: ActivatedRouteSnapshot | null): string {
        if (!route) {
            return '';
        }

        const parentPath = this.getRouteFullPath(route.parent);
        const routePath = route.url.join('/');

        if (!parentPath && !routePath) {
            return '';
        } else if (parentPath && !routePath) {
            return parentPath;
        } else if (!parentPath && routePath) {
            return '/' + routePath;
        } else {
            return parentPath + '/' + routePath;
        }
    }

}

export const CoreNavigator = makeSingleton(CoreNavigatorService);
