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

import { Component, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { CoreAppProvider } from '@providers/app';
import { CoreSitesProvider } from '@providers/sites';
import { CoreEventsProvider } from '@providers/events';
import { CoreIonTabsComponent } from '@components/ion-tabs/ion-tabs';
import { CoreMainMenuProvider } from '../../providers/mainmenu';
import { CoreMainMenuDelegate, CoreMainMenuHandlerToDisplay } from '../../providers/delegate';
import { CoreContentLinksDelegate } from '@core/contentlinks/providers/delegate';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';

/**
 * Page that displays the main menu of the app.
 */
@IonicPage({segment: 'core-mainmenu'})
@Component({
    selector: 'page-core-mainmenu',
    templateUrl: 'menu.html',
})
export class CoreMainMenuPage implements OnDestroy {
    tabs: CoreMainMenuHandlerToDisplay[] = [];
    allHandlers: CoreMainMenuHandlerToDisplay[];
    loaded = false;
    redirectPage: string;
    redirectParams: any;
    showTabs = false;
    tabsPlacement = 'bottom';

    protected subscription;
    protected redirectObs: any;
    protected pendingRedirect: any;
    protected urlToOpen: string;
    protected mainMenuId: number;

    @ViewChild('mainTabs') mainTabs: CoreIonTabsComponent;

    constructor(private menuDelegate: CoreMainMenuDelegate, private sitesProvider: CoreSitesProvider, navParams: NavParams,
            private navCtrl: NavController, private eventsProvider: CoreEventsProvider, private cdr: ChangeDetectorRef,
            private mainMenuProvider: CoreMainMenuProvider, private linksDelegate: CoreContentLinksDelegate,
            private linksHelper: CoreContentLinksHelperProvider, private appProvider: CoreAppProvider) {

        this.mainMenuId = this.appProvider.getMainMenuId();

        // Check if the menu was loaded with a redirect.
        const redirectPage = navParams.get('redirectPage');
        if (redirectPage) {
            this.pendingRedirect = {
                redirectPage: redirectPage,
                redirectParams: navParams.get('redirectParams')
            };
        }

        this.urlToOpen = navParams.get('urlToOpen');
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        if (!this.sitesProvider.isLoggedIn()) {
            this.navCtrl.setRoot('CoreLoginInitPage');

            return;
        }

        this.showTabs = true;

        this.redirectObs = this.eventsProvider.on(CoreEventsProvider.LOAD_PAGE_MAIN_MENU, (data) => {
            if (!this.loaded) {
                // View isn't ready yet, wait for it to be ready.
                this.pendingRedirect = data;
            } else {
                delete this.pendingRedirect;
                this.handleRedirect(data);
            }
        });

        this.subscription = this.menuDelegate.getHandlers().subscribe((handlers) => {
            // Remove the handlers that should only appear in the More menu.
            this.allHandlers = handlers.filter((handler) => {
                return !handler.onlyInMore;
            });

            this.initHandlers();

            if (this.loaded && this.pendingRedirect) {
                // Wait for tabs to be initialized and then handle the redirect.
                setTimeout(() => {
                    if (this.pendingRedirect) {
                        this.handleRedirect(this.pendingRedirect);
                        delete this.pendingRedirect;
                    }
                });
            }
        });

        window.addEventListener('resize', this.initHandlers.bind(this));

        this.appProvider.setMainMenuOpen(this.mainMenuId, true);
    }

    /**
     * Init handlers on change (size or handlers).
     */
    initHandlers(): void {
        if (this.allHandlers) {
            this.tabsPlacement = this.mainMenuProvider.getTabPlacement(this.navCtrl);

            const handlers = this.allHandlers.slice(0, this.mainMenuProvider.getNumItems()); // Get main handlers.

            // Re-build the list of tabs. If a handler is already in the list, use existing object to prevent re-creating the tab.
            const newTabs = [];

            for (let i = 0; i < handlers.length; i++) {
                const handler = handlers[i];

                // Check if the handler is already in the tabs list. If so, use it.
                const tab = this.tabs.find((tab) => {
                    return tab.title == handler.title && tab.icon == handler.icon;
                });

                tab ? tab.hide = false : null;
                handler.hide = false;

                newTabs.push(tab || handler);
            }

            // Maintain tab in phantom mode in case is not visible.
            const selectedTab = this.mainTabs.getSelected();
            if (selectedTab) {
                const oldTab = this.tabs.find((tab) => {
                    return tab.page == selectedTab.root && tab.icon == selectedTab.tabIcon;
                });

                if (oldTab) {
                    // Check if the selected handler is visible.
                    const isVisible = newTabs.some((newTab) => {
                        return oldTab.title == newTab.title && oldTab.icon == newTab.icon;
                    });

                    if (!isVisible) {
                        oldTab.hide = true;
                        newTabs.push(oldTab);
                    }
                }
            }

            this.tabs = newTabs;

            // Sort them by priority so new handlers are in the right position.
            this.tabs.sort((a, b) => {
                return b.priority - a.priority;
            });

            this.loaded = this.menuDelegate.areHandlersLoaded();
        }

        if (this.urlToOpen) {
            // There's a content link to open.
            const url = this.urlToOpen;
            delete this.urlToOpen;

            this.linksDelegate.getActionsFor(url, undefined).then((actions) => {
                const action = this.linksHelper.getFirstValidAction(actions);
                if (action && action.sites.length) {
                    // Action should only have 1 site because we're filtering by username.
                    action.action(action.sites[0]);
                }
            });
        }
    }

    /**
     * Handle a redirect.
     *
     * @param data Data received.
     */
    protected handleRedirect(data: any): void {
        // Check if the redirect page is the root page of any of the tabs.
        const i = this.tabs.findIndex((tab, i) => {
            return tab.page == data.redirectPage;
        });

        if (i >= 0) {
            // Tab found. Set the params.
            this.tabs[i].pageParams = Object.assign({}, data.redirectParams);
        } else {
            // Tab not found, use a phantom tab.
            this.redirectPage = data.redirectPage;
            this.redirectParams = data.redirectParams;
        }

        // Force change detection, otherwise sometimes the tab was selected before the params were applied.
        this.cdr.detectChanges();

        setTimeout(() => {
            // Let the tab load the params before navigating.
            this.mainTabs.selectTabRootByIndex(i + 1);
        });
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.subscription && this.subscription.unsubscribe();
        this.redirectObs && this.redirectObs.off();
        window.removeEventListener('resize', this.initHandlers.bind(this));
        this.appProvider.setMainMenuOpen(this.mainMenuId, false);
    }
}
