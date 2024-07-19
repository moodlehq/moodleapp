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
import { ActivatedRoute, ActivatedRouteSnapshot, Data, NavigationEnd, Params, UrlSegment } from '@angular/router';

import { NavigationOptions } from '@ionic/angular/common/providers/nav-controller';

import { CoreConstants } from '@/core/constants';
import { CoreMainMenu } from '@features/mainmenu/services/mainmenu';
import { CoreObject } from '@singletons/object';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CoreUrl, CoreUrlPartNames } from '@singletons/url';
import { CoreText } from '@singletons/text';
import { makeSingleton, NavController, Router } from '@singletons';
import { CoreScreen } from './screen';
import { CoreError } from '@classes/errors/error';
import { CoreMainMenuDelegate } from '@features/mainmenu/services/mainmenu-delegate';
import { CorePlatform } from '@services/platform';
import { filter } from 'rxjs/operators';
import { CorePromisedValue } from '@classes/promised-value';
import { BehaviorSubject } from 'rxjs';
import { CoreLoadings } from './loadings';

/**
 * Redirect payload.
 */
export type CoreRedirectPayload = {
    redirectPath?: string; // Path of the page to redirect to.
    redirectOptions?: CoreNavigationOptions; // Options of the navigation using redirectPath.
    urlToOpen?: string; // URL to open instead of a page + options.
};

/**
 * Navigation options.
 */
export type CoreNavigationOptions = Pick<NavigationOptions, 'animated'|'animation'|'animationDirection'> & {
    params?: Params;
    reset?: boolean;
    replace?: boolean;
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
     * @returns Whether the active route is using the given path.
     */
    isCurrent(path: string): boolean {
        return CoreText.matchesGlob(this.getCurrentPath(), path);
    }

    /**
     * Get current main menu tab.
     *
     * @returns Current main menu tab or null if the current route is not using the main menu.
     */
    getCurrentMainMenuTab(): string | null {
        return this.getMainMenuTabFromPath(this.getCurrentPath());
    }

    /**
     * Get main menu tab from a path.
     *
     * @param path The path to check.
     * @returns Path's main menu tab or null if the path is not using the main menu.
     */
    getMainMenuTabFromPath(path: string): string | null {
        const matches = /^\/main\/([^/]+).*$/.exec(path);

        return matches?.[1] ?? null;
    }

    /**
     * Returns if a section is loaded on the split view (tablet mode).
     *
     * @param path Path, can be a glob pattern.
     * @returns Whether the active route is using the given path.
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
     * @returns Whether navigation suceeded.
     */
    async navigate(path: string, options: CoreNavigationOptions = {}): Promise<boolean> {
        const url: string[] = [/^[./]/.test(path) ? path : `./${path}`];
        const navigationOptions: NavigationOptions = CoreObject.withoutEmpty({
            animated: options.animated,
            animation: options.animation,
            animationDirection: options.animationDirection,
            queryParams: CoreObject.isEmpty(options.params ?? {}) ? null : CoreObject.withoutEmpty(options.params ?? {}),
            relativeTo: path.startsWith('/') ? null : this.getCurrentRoute(),
            replaceUrl: options.replace,
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
     * @returns Whether navigation suceeded.
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
     * @returns Whether navigation suceeded.
     */
    async navigateToSiteHome(options: Omit<CoreNavigationOptions, 'reset'> & { siteId?: string } = {}): Promise<boolean> {
        const siteId = options.siteId ?? CoreSites.getCurrentSiteId();
        const landingPagePath = CoreSites.isLoggedIn() && CoreSites.getCurrentSiteId() === siteId ?
            this.getLandingTabPage() : 'main';

        return this.navigateToSitePath(landingPagePath, {
            ...options,
            reset: true,
            preferCurrentTab: false,
        });
    }

    /**
     * Navigate to a site path, loading the site if necessary.
     *
     * @param path Site path to visit.
     * @param options Navigation and site options.
     * @returns Whether navigation suceeded.
     */
    async navigateToSitePath(
        path: string,
        options: CoreNavigationOptions & { siteId?: string } = {},
    ): Promise<boolean> {
        const siteId = options.siteId ?? CoreSites.getCurrentSiteId();
        const navigationOptions: CoreNavigationOptions = CoreObject.without(options, ['siteId']);

        // If we are logged into a different site, log out first.
        if (CoreSites.isLoggedIn() && CoreSites.getCurrentSiteId() !== siteId) {
            const willReload = await CoreSites.logoutForRedirect(siteId, {
                redirectPath: path,
                redirectOptions: options || {},
            });

            if (willReload) {
                return true;
            }
        }

        // If the path doesn't belong to a site, call standard navigation.
        if (siteId === CoreConstants.NO_SITE_ID) {
            return this.navigate(path, {
                ...navigationOptions,
                reset: true,
            });
        }

        // If we are not logged into the site, load the site.
        if (!CoreSites.isLoggedIn()) {
            const modal = await CoreLoadings.show();

            try {
                const loggedIn = await CoreSites.loadSite(siteId, {
                    redirectPath: path,
                    redirectOptions: options,
                });

                if (!loggedIn) {
                    // User has been redirected to the login page and will be redirected to the site path after login.
                    return true;
                }
            } catch {
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
     * @returns Current path.
     */
    getCurrentPath(): string {
        return CoreUrl.removeUrlParts(Router.url, [CoreUrlPartNames.Query, CoreUrlPartNames.Fragment]);
    }

    /**
     * Iterately get the params checking parent routes.
     *
     * @param name Name of the parameter.
     * @param route Current route.
     * @returns Value of the parameter, undefined if not found.
     */
    protected getRouteSnapshotParam<T = unknown>(name: string, route?: ActivatedRoute): T | undefined {
        if (!route) {
            return;
        }

        if (route.snapshot) {
            const value = route.snapshot.queryParams[name] ?? route.snapshot.params[name];

            if (value !== undefined) {
                return value;
            }
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
     * @returns Value of the parameter, undefined if not found.
     */
    getRouteParam<T = string>(name: string, routeOptions: CoreNavigatorCurrentRouteOptions = {}): T | undefined {
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

        if (value === undefined) {
            return;
        }

        let storedParam = this.storedParams[value];

        // Remove the parameter from our map if it's in there.
        delete this.storedParams[value];

        if (!CorePlatform.isMobile() && !storedParam) {
            // Try to retrieve the param from local storage in browser.
            const storageParam = localStorage.getItem(value);
            if (storageParam) {
                storedParam = CoreText.parseJSON(storageParam);
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
     * @returns Value of the parameter, undefined if not found.
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
     * @returns Value of the parameter, undefined if not found.
     */
    getRouteBooleanParam(name: string, routeOptions: CoreNavigatorCurrentRouteOptions = {}): boolean | undefined {
        const value = this.getRouteParam<string>(name, routeOptions);

        if (value === undefined) {
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
     * Get a parameter for the current route.
     * Please notice that objects can only be retrieved once. You must call this function only once per page and parameter,
     * unless there's a new navigation to the page.
     *
     * This function will fail if parameter is not found.
     *
     * @param name Name of the parameter.
     * @param routeOptions Optional routeOptions to get the params or route value from. If missing, it will autodetect.
     * @returns Value of the parameter, undefined if not found.
     */
    getRequiredRouteParam<T = unknown>(name: string, routeOptions: CoreNavigatorCurrentRouteOptions = {}): T {
        const value = this.getRouteParam<T>(name, routeOptions);

        if (value === undefined) {
            throw new CoreError(`Required param '${name}' not found.`);
        }

        return value;
    }

    /**
     * Get a number route param.
     * Angular router automatically converts numbers to string, this function automatically converts it back to number.
     *
     * This function will fail if parameter is not found.
     *
     * @param name Name of the parameter.
     * @param routeOptions Optional routeOptions to get the params or route value from. If missing, it will autodetect.
     * @returns Value of the parameter, undefined if not found.
     */
    getRequiredRouteNumberParam(name: string, routeOptions: CoreNavigatorCurrentRouteOptions = {}): number {
        const value = this.getRouteNumberParam(name, routeOptions);

        if (value === undefined) {
            throw new CoreError(`Required number param '${name}' not found.`);
        }

        return value;
    }

    /**
     * Get a boolean route param.
     * Angular router automatically converts booleans to string, this function automatically converts it back to boolean.
     *
     * This function will fail if parameter is not found.
     *
     * @param name Name of the parameter.
     * @param routeOptions Optional routeOptions to get the params or route value from. If missing, it will autodetect.
     * @returns Value of the parameter, undefined if not found.
     */
    getRequiredRouteBooleanParam(name: string, routeOptions: CoreNavigatorCurrentRouteOptions = {}): boolean {
        const value = this.getRouteBooleanParam(name, routeOptions);

        if (value === undefined) {
            throw new CoreError(`Required boolean param '${name}' not found.`);
        }

        return value;
    }

    /**
     * Navigate back.
     *
     * @returns Promise resolved when done.
     */
    async back(): Promise<void> {
        await NavController.pop();
    }

    /**
     * Get current activated route.
     *
     * @param options
     *     - route: Parent route, if this isn't provided the current active route will be used.
     *     - pageComponent: Page component of the route to find, if this isn't provided the deepest route in the hierarchy
     *                      will be returned.
     * @returns Current activated route.
     */
    getCurrentRoute(): ActivatedRoute;
    getCurrentRoute(options: CoreNavigatorCurrentRouteOptions): ActivatedRoute | null;
    getCurrentRoute({ route, pageComponent, routeData }: CoreNavigatorCurrentRouteOptions = {}): ActivatedRoute | null {
        route = route ?? Router.routerState.root;

        if (pageComponent && route.component === pageComponent) {
            return route;
        }

        if (routeData && CoreUtils.basicLeftCompare(routeData, this.getRouteData(route), 3)) {
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
     * @returns Whether the route is active or not.
     */
    isRouteActive(route: ActivatedRoute): boolean {
        const routePath = this.getRouteFullPath(route);
        let activeRoute: ActivatedRoute | null = Router.routerState.root;

        while (activeRoute) {
            if (this.getRouteFullPath(activeRoute) === routePath) {
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
     * @returns Route depth.
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
     * @returns Whether navigation suceeded.
     */
    protected async navigateToMainMenuPath(path: string, options: CoreNavigationOptions = {}): Promise<boolean> {
        options = {
            preferCurrentTab: true,
            ...options,
        };

        path = path.replace(/^(\.|\/main)?\//, '');

        const pathRoot = /^[^/]+/.exec(path)?.[0] ?? '';
        if (!pathRoot) {
            // No path root, going to the site home.
            return this.navigate('/main', options);
        }

        const currentMainMenuTab = this.getCurrentMainMenuTab();
        const isMainMenuTab = pathRoot === currentMainMenuTab || (!currentMainMenuTab && path === this.getLandingTabPage()) ||
            await CoreUtils.ignoreErrors(CoreMainMenu.isMainMenuTab(pathRoot), false);

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

        if (this.isCurrent('/main')) {
            // Main menu is loaded, but no tab selected yet. Wait for a tab to be loaded.
            await this.waitForMainMenuTab();

            return this.navigate(`/main/${this.getCurrentMainMenuTab()}/${path}`, options);
        }

        // Open the path within in main menu.
        return this.navigate('/main', {
            ...options,
            params: {
                redirectPath: path,
                redirectOptions: options.params || options.nextNavigation ? options : undefined,
            } as CoreRedirectPayload,
        });
    }

    /**
     * Get the first page path using priority.
     *
     * @returns Landing page path.
     */
    protected getLandingTabPage(): string {
        if (!CoreMainMenuDelegate.areHandlersLoaded()) {
            // Handlers not loaded yet, landing page is the root page.
            return '';
        }

        const handlers = CoreMainMenuDelegate.getHandlers().filter((handler) => !handler.onlyInMore);

        return handlers[0]?.page || '';
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

            if (!CorePlatform.isMobile()) {
                // In browser, save the param in local storage to be able to retrieve it if the app is refreshed.
                localStorage.setItem(id, JSON.stringify(value));
            }
        }
    }

    /**
     * Get an ID for a new parameter.
     *
     * @returns New param Id.
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
     * @returns Path.
     */
    getRouteFullPath(route: ActivatedRouteSnapshot | ActivatedRoute | null): string {
        if (!route) {
            return '';
        }

        const parentPath = this.getRouteFullPath(this.getRouteParent(route));
        const routePath = this.getRouteUrl(route).join('/');

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

    /**
     * Given a route, get url segments.
     *
     * @param route Route.
     * @returns Url segments.
     */
    getRouteUrl(route: ActivatedRouteSnapshot | ActivatedRoute): UrlSegment[] {
        return this.getRouteProperty(route, 'url', []);
    }

    /**
     * Given a route, get its parent.
     *
     * @param route Route.
     * @returns Parent.
     */
    getRouteParent(route: ActivatedRouteSnapshot | ActivatedRoute): ActivatedRouteSnapshot | ActivatedRoute | null {
        return this.getRouteProperty(route, 'parent', null);
    }

    /**
     * Given a route, get its data.
     *
     * @param route Route.
     * @returns Data.
     */
    getRouteData(route: ActivatedRouteSnapshot | ActivatedRoute): Data {
        return this.getRouteProperty(route, 'data', {});
    }

    /**
     * Given a route, get its params.
     *
     * @param route Route.
     * @returns Params.
     */
    getRouteParams(route: ActivatedRouteSnapshot | ActivatedRoute): Params {
        return this.getRouteProperty(route, 'params', {});
    }

    /**
     * Given a route, get its query params.
     *
     * @param route Route.
     * @returns Query params.
     */
    getRouteQueryParams(route: ActivatedRouteSnapshot | ActivatedRoute): Params {
        return this.getRouteProperty(route, 'queryParams', {});
    }

    /**
     * Check if the current route page can block leaving the route.
     *
     * @returns Whether the current route page can block leaving the route.
     */
    currentRouteCanBlockLeave(): boolean {
        return !!this.getCurrentRoute().snapshot?.routeConfig?.canDeactivate?.length;
    }

    /**
     * Wait for a main menu tab route to be loaded.
     *
     * @returns Promise resolved when the route is loaded.
     */
    protected waitForMainMenuTab(): Promise<void> {
        if (this.getCurrentMainMenuTab()) {
            return Promise.resolve();
        }

        const promise = new CorePromisedValue<void>();

        const navSubscription = Router.events
            .pipe(filter(event => event instanceof NavigationEnd))
            .subscribe(() => {
                if (this.getCurrentMainMenuTab()) {
                    navSubscription?.unsubscribe();
                    promise.resolve();
                }
            });

        return promise;
    }

    /**
     * Get the relative path to a parent path.
     * E.g. if parent path is '/foo' and current path is '/foo/bar/baz' it will return '../../'.
     *
     * @param parentPath Parent path.
     * @returns Relative path to the parent, empty if same path or parent path not found.
     * @todo If messaging is refactored to use list managers, this function might not be needed anymore.
     */
    getRelativePathToParent(parentPath: string): string {
        // Add an ending slash to avoid collisions with other routes (e.g. /foo and /foobar).
        parentPath = CoreText.addEndingSlash(parentPath);

        const path = this.getCurrentPath();
        const parentRouteIndex = path.indexOf(parentPath);
        if (parentRouteIndex === -1) {
            return '';
        }

        const depth = (path.substring(parentRouteIndex + parentPath.length - 1).match(/\//g) ?? []).length;

        return '../'.repeat(depth);
    }

    /**
     * Given a route, get one of its properties.
     *
     * @param route Route.
     * @param property Route property.
     * @param defaultValue Fallback value if the property is not set.
     * @returns Property value.
     */
    private getRouteProperty<T extends keyof ActivatedRouteSnapshot>(
        route: ActivatedRouteSnapshot | ActivatedRoute,
        property: T,
        defaultValue: ActivatedRouteSnapshot[T],
    ): ActivatedRouteSnapshot[T]  {
        if (route instanceof ActivatedRouteSnapshot) {
            return route[property];
        }

        if (route.snapshot instanceof ActivatedRouteSnapshot) {
            return route.snapshot[property];
        }

        const propertyObservable = route[property];

        if (propertyObservable instanceof BehaviorSubject) {
            return propertyObservable.value;
        }

        return defaultValue;
    }

}

export const CoreNavigator = makeSingleton(CoreNavigatorService);
