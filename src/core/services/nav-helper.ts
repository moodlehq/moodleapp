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
import { Params, Router } from '@angular/router';
import { CoreMainMenu } from '@features/mainmenu/services/mainmenu';
import { NavController } from '@ionic/angular';
import { NavigationOptions } from '@ionic/angular/providers/nav-controller';

import { makeSingleton } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { CoreConstants } from '../constants';
import { CoreSites } from './sites';
import { CoreDomUtils } from './utils/dom';
import { CoreTextUtils } from './utils/text';
import { CoreUrlUtils } from './utils/url';

/**
 * Provider to provide some helper functions regarding navigation.
 */
@Injectable({ providedIn: 'root' })
export class CoreNavHelperService {

    static readonly OPEN_COURSE = 'open_course';

    protected pageToLoad?: {page: string; params?: Params; time: number}; // Page to load once main menu is opened.
    protected mainMenuOpen?: number;
    protected mainMenuId = 0;

    constructor(
        protected router: Router,
        protected navCtrl: NavController,
    ) {
        CoreEvents.on(CoreEvents.MAIN_MENU_OPEN, () => {
            /* If there is any page pending to be opened, do it now. Don't open pages stored more than 5 seconds ago, probably
               the function to open the page was called when it shouldn't. */
            if (this.pageToLoad && Date.now() - this.pageToLoad.time < 5000) {
                this.loadPageInMainMenu(this.pageToLoad.page, this.pageToLoad.params);
                delete this.pageToLoad;
            }
        });
    }

    /**
     * Get current page route without params.
     *
     * @return Current page route.
     */
    getCurrentPage(): string {
        return CoreUrlUtils.instance.removeUrlParams(this.router.url);
    }

    /**
     * Open a new page in the current main menu tab.
     *
     * @param page Page to open.
     * @param pageParams Params to send to the page.
     * @return Promise resolved when done.
     */
    async goInCurrentMainMenuTab(page: string, pageParams: Params): Promise<void> {
        const currentPage = this.getCurrentPage();

        const routeMatch = currentPage.match(/^\/main\/([^/]+)/);
        if (!routeMatch || !routeMatch[0]) {
            // Not in a tab. Stop.
            return;
        }

        let path = '';
        if (routeMatch[1] && page.match(new RegExp(`^/${routeMatch[1]}(/|$)`))) {
            path = CoreTextUtils.instance.concatenatePaths('/main', page);
        } else {
            path = CoreTextUtils.instance.concatenatePaths(routeMatch[0], page);
        }

        await this.navCtrl.navigateForward(path, {
            queryParams: pageParams,
        });
    }

    /**
     * Goes to a certain page in a certain site. If the site is current site it will perform a regular navigation,
     * otherwise it will load the other site and open the page in main menu.
     *
     * @param pageName Name of the page to go.
     * @param pageParams Params to send to the page.
     * @param siteId Site ID. If not defined, current site.
     * @param checkMenu If true, check if the root page of a main menu tab. Only the page name will be checked.
     * @return Promise resolved when done.
     */
    async goInSite(pageName: string, pageParams: Params, siteId?: string, checkMenu?: boolean): Promise<void> {
        siteId = siteId || CoreSites.instance.getCurrentSiteId();

        // @todo: When this function was in ContentLinksHelper, this code was inside NgZone. Check if it's needed.

        if (!CoreSites.instance.isLoggedIn() || siteId != CoreSites.instance.getCurrentSiteId()) {
            await this.openInSiteMainMenu(pageName, pageParams, siteId);

            return;
        }

        if (checkMenu) {
            let isInMenu = false;
            // Check if the page is in the main menu.
            try {
                isInMenu = await CoreMainMenu.instance.isCurrentMainMenuHandler(pageName);
            } catch {
                isInMenu = false;
            }

            if (isInMenu) {
                // Just select the tab. @todo test.
                CoreNavHelper.instance.loadPageInMainMenu(pageName, pageParams);

                return;
            }
        }

        await this.goInCurrentMainMenuTab(pageName, pageParams);
    }

    /**
     * Get an ID for a main menu.
     *
     * @return Main menu ID.
     */
    getMainMenuId(): number {
        return this.mainMenuId++;
    }

    /**
     * Open a page that doesn't belong to any site.
     *
     * @param page Page to open.
     * @param params Params of the page.
     * @return Promise resolved when done.
     */
    async goToNoSitePage(page: string, params?: Params): Promise<void> {
        const currentPage = this.getCurrentPage();

        if (currentPage == page) {
            // Already at page, nothing to do.
            return;
        }

        if (page == '/login/sites') {
            // Just open the page as root.
            await this.navCtrl.navigateRoot(page, { queryParams: params });

            return;
        }

        if (page == '/login/credentials' && currentPage == '/login/site') {
            // Just open the new page to keep the navigation history.
            await this.navCtrl.navigateForward(page, { queryParams: params });

            return;
        }

        // Check if there is any site stored.
        const hasSites = await CoreSites.instance.hasSites();

        if (!hasSites) {
            // There are sites stored, open sites page first to be able to go back.
            await this.navCtrl.navigateRoot('/login/sites');

            await this.navCtrl.navigateForward(page, { queryParams: params });

            return;
        }

        if (page != '/login/site') {
            // Open the new site page to be able to go back.
            await this.navCtrl.navigateRoot('/login/site');

            await this.navCtrl.navigateForward(page, { queryParams: params });
        } else {
            // Just open the page as root.
            await this.navCtrl.navigateRoot(page, { queryParams: params });
        }
    }

    /**
     * Go to the initial page of a site depending on 'userhomepage' setting.
     *
     * @param options Options.
     * @return Promise resolved when done.
     */
    goToSiteInitialPage(options?: CoreNavHelperOpenMainMenuOptions): Promise<void> {
        return this.openMainMenu(options);
    }

    /**
     * Check if the main menu is open.
     *
     * @return Whether the main menu is open.
     */
    isMainMenuOpen(): boolean {
        return typeof this.mainMenuOpen != 'undefined';
    }

    /**
     * Load a certain page in the main menu.
     *
     * @param page Route of the page to load.
     * @param params Params to pass to the page.
     */
    loadPageInMainMenu(page: string, params?: Params): void {
        if (!this.isMainMenuOpen()) {
            // Main menu not open. Store the page to be loaded later.
            this.pageToLoad = {
                page: page,
                params: params,
                time: Date.now(),
            };

            return;
        }

        if (page == CoreNavHelperService.OPEN_COURSE) {
            // @todo Use the openCourse function.
        } else {
            CoreEvents.trigger(CoreEvents.LOAD_PAGE_MAIN_MENU, { redirectPage: page, redirectParams: params });
        }
    }

    /**
     * Load a site and load a certain page in that site.
     *
     * @param siteId Site to load.
     * @param page Name of the page to load.
     * @param params Params to pass to the page.
     * @return Promise resolved when done.
     */
    protected async loadSiteAndPage(siteId: string, page: string, params?: Params): Promise<void> {
        if (siteId == CoreConstants.NO_SITE_ID) {
            // Page doesn't belong to a site, just load the page.
            await this.navCtrl.navigateRoot(page, params);

            return;
        }

        const modal = await CoreDomUtils.instance.showModalLoading();

        try {
            const loggedIn = await CoreSites.instance.loadSite(siteId, page, params);

            if (!loggedIn) {
                return;
            }

            await this.openMainMenu({
                redirectPage: page,
                redirectParams: params,
            });
        } catch (error) {
            // Site doesn't exist.
            await this.navCtrl.navigateRoot('/login/sites');
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Open the main menu, loading a certain page.
     *
     * @param options Options.
     * @return Promise resolved when done.
     */
    protected async openMainMenu(options?: CoreNavHelperOpenMainMenuOptions): Promise<void> {

        // Due to DeepLinker, we need to remove the path from the URL before going to main menu.
        // IonTabs checks the URL to determine which path to load for deep linking, so we clear the URL.
        // @todo this.location.replaceState('');

        if (options?.redirectPage == CoreNavHelperService.OPEN_COURSE) {
            // Load the main menu first, and then open the course.
            try {
                await this.navCtrl.navigateRoot('/');
            } finally {
                // @todo: Open course.
            }
        } else {
            // Open the main menu.
            const queryParams: Params = Object.assign({}, options);
            delete queryParams.navigationOptions;

            await this.navCtrl.navigateRoot('/', {
                queryParams,
                ...options?.navigationOptions,
            });
        }
    }

    /**
     * Open a new page, setting it as the root page and loading the right site if needed.
     *
     * @param page Name of the page to load. Special cases: OPEN_COURSE (to open course page).
     * @param params Params to pass to the page.
     * @param siteId Site to load. If not defined, current site.
     * @return Promise resolved when done.
     */
    async openInSiteMainMenu(page: string, params?: Params, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.instance.getCurrentSiteId();

        if (!CoreSites.instance.isLoggedIn()) {
            if (siteId) {
                await this.loadSiteAndPage(siteId, page, params);
            } else {
                await this.navCtrl.navigateRoot('/login/sites');
            }

            return;
        }

        if (siteId && siteId != CoreSites.instance.getCurrentSiteId()) {
            // Target page belongs to a different site. Change site.
            // @todo: Check site plugins.
            await CoreSites.instance.logout();

            await this.loadSiteAndPage(siteId, page, params);
        } else {
            // Current page, open it in main menu.
            this.loadPageInMainMenu(page, params);
        }
    }

    /**
     * Set a main menu as open or not.
     *
     * @param id Main menu ID.
     * @param open Whether it's open or not.
     */
    setMainMenuOpen(id: number, open: boolean): void {
        if (open) {
            this.mainMenuOpen = id;
            CoreEvents.trigger(CoreEvents.MAIN_MENU_OPEN);
        } else if (this.mainMenuOpen == id) {
            delete this.mainMenuOpen;
        }
    }

}

export class CoreNavHelper extends makeSingleton(CoreNavHelperService) {}

export type CoreNavHelperOpenMainMenuOptions = {
    redirectPage?: string; // Route of the page to open in main menu. If not defined, default tab will be selected.
    redirectParams?: Params; // Params to pass to the selected tab if any.
    urlToOpen?: string; // URL to open once the main menu is loaded.
    navigationOptions?: NavigationOptions; // Navigation options.
};
