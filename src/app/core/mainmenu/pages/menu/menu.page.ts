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

import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { NavController, IonTabs } from '@ionic/angular';
import { Subscription } from 'rxjs';

import { CoreApp } from '@services/app';
import { CoreSites } from '@services/sites';
import { CoreEvents, CoreEventObserver, CoreEventLoadPageMainMenuData } from '@singletons/events';
import { CoreMainMenu } from '../../services/mainmenu';
import { CoreMainMenuDelegate, CoreMainMenuHandlerToDisplay } from '../../services/mainmenu.delegate';
import { CoreDomUtils } from '@/app/services/utils/dom';
import { Translate } from '@/app/singletons/core.singletons';

/**
 * Page that displays the main menu of the app.
 */
@Component({
    selector: 'page-core-mainmenu',
    templateUrl: 'menu.html',
    styleUrls: ['menu.scss'],
})
export class CoreMainMenuPage implements OnInit, OnDestroy {

    tabs: CoreMainMenuHandlerToDisplay[] = [];
    allHandlers?: CoreMainMenuHandlerToDisplay[];
    loaded = false;
    redirectPage?: string;
    redirectParams?: Params;
    showTabs = false;
    tabsPlacement = 'bottom';
    hidden = false;

    protected subscription?: Subscription;
    protected redirectObs?: CoreEventObserver;
    protected pendingRedirect?: CoreEventLoadPageMainMenuData;
    protected urlToOpen?: string;
    protected mainMenuId: number;
    protected keyboardObserver?: CoreEventObserver;

    @ViewChild('mainTabs') mainTabs?: IonTabs;

    constructor(
        protected route: ActivatedRoute,
        protected navCtrl: NavController,
        protected menuDelegate: CoreMainMenuDelegate,
        protected changeDetector: ChangeDetectorRef,
        protected router: Router,
    ) {
        this.mainMenuId = CoreApp.instance.getMainMenuId();
    }

    /**
     * Initialize the component.
     */
    ngOnInit(): void {
        if (!CoreSites.instance.isLoggedIn()) {
            this.navCtrl.navigateRoot('/login/init');

            return;
        }

        this.route.queryParams.subscribe(params => {
            const redirectPage = params['redirectPage'];
            if (redirectPage) {
                this.pendingRedirect = {
                    redirectPage: redirectPage,
                    redirectParams: params['redirectParams'],
                };
            }

            this.urlToOpen = params['urlToOpen'];
        });

        this.showTabs = true;

        this.redirectObs = CoreEvents.on(CoreEvents.LOAD_PAGE_MAIN_MENU, (data: CoreEventLoadPageMainMenuData) => {
            if (!this.loaded) {
                // View isn't ready yet, wait for it to be ready.
                this.pendingRedirect = data;
            } else {
                delete this.pendingRedirect;
                this.handleRedirect(data);
            }
        });

        this.subscription = this.menuDelegate.getHandlersObservable().subscribe((handlers) => {
            // Remove the handlers that should only appear in the More menu.
            this.allHandlers = handlers.filter((handler) => !handler.onlyInMore);

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

        if (CoreApp.instance.isIOS()) {
            // In iOS, the resize event is triggered before the keyboard is opened/closed and not triggered again once done.
            // Init handlers again once keyboard is closed since the resize event doesn't have the updated height.
            this.keyboardObserver = CoreEvents.on(CoreEvents.KEYBOARD_CHANGE, (kbHeight: number) => {
                if (kbHeight === 0) {
                    this.initHandlers();

                    // If the device is slow it can take a bit more to update the window height. Retry in a few ms.
                    setTimeout(() => {
                        this.initHandlers();
                    }, 250);
                }
            });
        }

        CoreApp.instance.setMainMenuOpen(this.mainMenuId, true);
    }

    /**
     * Init handlers on change (size or handlers).
     */
    initHandlers(): void {
        if (this.allHandlers) {
            this.tabsPlacement = CoreMainMenu.instance.getTabPlacement();

            const handlers = this.allHandlers.slice(0, CoreMainMenu.instance.getNumItems()); // Get main handlers.

            // Re-build the list of tabs. If a handler is already in the list, use existing object to prevent re-creating the tab.
            const newTabs: CoreMainMenuHandlerToDisplay[] = [];

            for (let i = 0; i < handlers.length; i++) {
                const handler = handlers[i];

                // Check if the handler is already in the tabs list. If so, use it.
                const tab = this.tabs.find((tab) => tab.title == handler.title && tab.icon == handler.icon);

                tab ? tab.hide = false : null;
                handler.hide = false;

                newTabs.push(tab || handler);
            }

            this.tabs = newTabs;

            // Sort them by priority so new handlers are in the right position.
            this.tabs.sort((a, b) => (b.priority || 0) - (a.priority || 0));

            this.loaded = this.menuDelegate.areHandlersLoaded();

            if (this.loaded && this.mainTabs && !this.mainTabs.getSelected()) {
                // Select the first tab.
                setTimeout(() => {
                    this.mainTabs!.select(this.tabs[0]?.page || 'more');
                });
            }
        }

        if (this.urlToOpen) {
            // There's a content link to open.
            // @todo: Treat URL.
        }
    }

    /**
     * Change tabs visibility to show/hide them from the view.
     *
     * @param visible If show or hide the tabs.
     */
    changeVisibility(visible: boolean): void {
        if (this.hidden == visible) {
            // Change needed.
            this.hidden = !visible;

            /* setTimeout(() => {
                this.viewCtrl.getContent().resize();
            });*/
        }
    }

    /**
     * Handle a redirect.
     *
     * @param data Data received.
     */
    protected handleRedirect(data: CoreEventLoadPageMainMenuData): void {
        // Check if the redirect page is the root page of any of the tabs.
        const i = this.tabs.findIndex((tab) => tab.page == data.redirectPage);

        if (i >= 0) {
            // Tab found. Open it with the params.
            this.navCtrl.navigateForward(data.redirectPage, {
                queryParams: data.redirectParams,
                animated: false,
            });
        } else {
            // Tab not found, use a phantom tab.
            // @todo
        }

        // Force change detection, otherwise sometimes the tab was selected before the params were applied.
        this.changeDetector.detectChanges();
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.subscription?.unsubscribe();
        this.redirectObs?.off();
        window.removeEventListener('resize', this.initHandlers.bind(this));
        CoreApp.instance.setMainMenuOpen(this.mainMenuId, false);
        this.keyboardObserver?.off();
    }

    /**
     * Tab clicked.
     *
     * @param e Event.
     * @param page Page of the tab.
     */
    async tabClicked(e: Event, page: string): Promise<void> {
        if (this.mainTabs?.getSelected() != page) {
            // Just change the tab.
            return;
        }

        // Current tab was clicked. Check if user is already at root level.
        if (this.router.url == '/mainmenu/' + page) {
            // Already at root level, nothing to do.
            return;
        }

        // Ask the user if he wants to go back to the root page of the tab.
        e.preventDefault();
        e.stopPropagation();

        try {
            const tab = this.tabs.find((tab) => tab.page == page);

            if (tab?.title) {
                await CoreDomUtils.instance.showConfirm(Translate.instance.instant('core.confirmgotabroot', { name: tab.title }));
            } else {
                await CoreDomUtils.instance.showConfirm(Translate.instance.instant('core.confirmgotabrootdefault'));
            }

            // User confirmed, go to root.
            this.mainTabs?.select(page);
        } catch {
            // User canceled.
        }
    }

}
