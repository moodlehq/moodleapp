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
import { ActivatedRoute } from '@angular/router';
import { IonTabs } from '@ionic/angular';
import { BackButtonEvent } from '@ionic/core';
import { Subscription } from 'rxjs';

import { CoreApp } from '@services/app';
import { CoreEvents, CoreEventObserver } from '@singletons/events';
import { CoreMainMenu, CoreMainMenuProvider } from '../../services/mainmenu';
import { CoreMainMenuDelegate, CoreMainMenuHandlerToDisplay } from '../../services/mainmenu-delegate';
import { CoreDomUtils } from '@services/utils/dom';
import { Translate } from '@singletons';
import { CoreUtils } from '@services/utils/utils';
import { CoreAriaRoleTab, CoreAriaRoleTabFindable } from '@classes/aria-role-tab';
import { CoreNavigator } from '@services/navigator';

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
    showTabs = false;
    tabsPlacement: 'bottom' | 'side' = 'bottom';
    hidden = false;
    morePageName = CoreMainMenuProvider.MORE_PAGE_NAME;
    selectedTab?: string;

    protected subscription?: Subscription;
    protected keyboardObserver?: CoreEventObserver;
    protected resizeFunction: () => void;
    protected backButtonFunction: (event: BackButtonEvent) => void;
    protected selectHistory: string[] = [];
    protected firstSelectedTab?: string;

    @ViewChild('mainTabs') mainTabs?: IonTabs;

    tabAction: CoreMainMenuRoleTab;

    constructor(
        protected route: ActivatedRoute,
        protected changeDetector: ChangeDetectorRef,
    ) {
        this.resizeFunction = this.initHandlers.bind(this);
        this.backButtonFunction = this.backButtonClicked.bind(this);
        this.tabAction = new CoreMainMenuRoleTab(this);
    }

    /**
     * Initialize the component.
     */
    ngOnInit(): void {
        this.showTabs = true;

        this.subscription = CoreMainMenuDelegate.getHandlersObservable().subscribe((handlers) => {
            // Remove the handlers that should only appear in the More menu.
            this.allHandlers = handlers.filter((handler) => !handler.onlyInMore);

            this.initHandlers();
        });

        window.addEventListener('resize', this.resizeFunction);
        document.addEventListener('ionBackButton', this.backButtonFunction);

        if (CoreApp.isIOS()) {
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
    }

    /**
     * Init handlers on change (size or handlers).
     */
    initHandlers(): void {
        if (this.allHandlers) {
            this.tabsPlacement = CoreMainMenu.getTabPlacement();

            const handlers = this.allHandlers.slice(0, CoreMainMenu.getNumItems()); // Get main handlers.

            // Re-build the list of tabs. If a handler is already in the list, use existing object to prevent re-creating the tab.
            const newTabs: CoreMainMenuHandlerToDisplay[] = [];

            for (let i = 0; i < handlers.length; i++) {
                const handler = handlers[i];

                // Check if the handler is already in the tabs list. If so, use it.
                const tab = this.tabs.find((tab) => tab.page == handler.page);

                tab ? tab.hide = false : null;
                handler.hide = false;
                handler.id = handler.id || 'core-mainmenu-' + CoreUtils.getUniqueId('CoreMainMenuPage');

                newTabs.push(tab || handler);
            }

            this.tabs = newTabs;

            // Sort them by priority so new handlers are in the right position.
            this.tabs.sort((a, b) => (b.priority || 0) - (a.priority || 0));

            this.loaded = CoreMainMenuDelegate.areHandlersLoaded();
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
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.subscription?.unsubscribe();
        window.removeEventListener('resize', this.resizeFunction);
        document.removeEventListener('ionBackButton', this.backButtonFunction);
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

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        // Current tab was clicked. Check if user is already at root level.
        const isMainMenuRoot = await this.currentRouteIsMainMenuRoot();
        if (isMainMenuRoot) {
            return; // Already at root level, nothing to do.
        }

        // Maybe the route isn't defined as it should. Check if the current path is the tab one.
        const currentPath = CoreNavigator.getCurrentPath();
        if (currentPath == `/main/${page}`) {
            return; // Already at root level, nothing to do.
        }

        // Ask the user if he wants to go back to the root page of the tab.
        try {
            const tab = this.tabs.find((tab) => tab.page == page);

            if (tab?.title) {
                await CoreDomUtils.showConfirm(Translate.instant('core.confirmgotabroot', {
                    name: Translate.instant(tab.title),
                }));
            } else {
                await CoreDomUtils.showConfirm(Translate.instant('core.confirmgotabrootdefault'));
            }

            // User confirmed, go to root.
            this.mainTabs?.select(page);
        } catch {
            // User canceled.
        }
    }

    /**
     * Selected tab has changed.
     *
     * @param event Event.
     */
    tabChanged(event: {tab: string}): void {
        this.selectedTab = event.tab;
        this.firstSelectedTab = this.firstSelectedTab ?? event.tab;
        this.selectHistory.push(event.tab);
    }

    /**
     * Back button clicked.
     *
     * @param event Event.
     */
    protected backButtonClicked(event: BackButtonEvent): void {
        // Use a priority lower than 0 (navigation).
        event.detail.register(-10, async (processNextHandler: () => void) => {
            // This callback can be called at the same time as Ionic's back navigation callback.
            // Check if user is already at the root of a tab.
            const isMainMenuRoot = await this.currentRouteIsMainMenuRoot();
            if (!isMainMenuRoot) {
                return; // Not at root level, let Ionic handle the navigation.
            }

            // No back navigation, already at root level. Check if we should change tab.
            if (this.selectHistory.length > 1) {
                // The previous page in history is not the last one, we need the previous one.
                const previousTab = this.selectHistory[this.selectHistory.length - 2];

                // Remove curent and previous tabs from history.
                this.selectHistory = this.selectHistory.filter((tab) => this.selectedTab != tab && previousTab != tab);

                this.mainTabs?.select(previousTab);

                return;
            }

            if (this.firstSelectedTab && this.selectedTab != this.firstSelectedTab) {
                // All history is gone but we are not in the first selected tab.
                this.selectHistory = [];
                this.mainTabs?.select(this.firstSelectedTab);

                return;
            }

            processNextHandler();
        });
    }

    /**
     * Check if current route is the root of the current main menu tab.
     *
     * @return Promise.
     */
    protected async currentRouteIsMainMenuRoot(): Promise<boolean> {
        // Check if the current route is the root of the current main menu tab.
        return !!CoreNavigator.getCurrentRoute({ routeData: { mainMenuTabRoot: CoreNavigator.getCurrentMainMenuTab() } });
    }

}

/**
 * Helper class to manage rol tab.
 */
class CoreMainMenuRoleTab extends CoreAriaRoleTab<CoreMainMenuPage> {

    /**
     * @inheritdoc
     */
    selectTab(tabId: string, e: Event): void {
        this.componentInstance.tabClicked(e, tabId);
    }

    /**
     * @inheritdoc
     */
    getSelectableTabs(): CoreAriaRoleTabFindable[] {
        const allTabs: CoreAriaRoleTabFindable[] =
            this.componentInstance.tabs.filter((tab) => !tab.hide).map((tab) => ({
                id: tab.id || tab.page,
                findIndex: tab.page,
            }));

        allTabs.push({
            id: this.componentInstance.morePageName,
            findIndex: this.componentInstance.morePageName,
        });

        return allTabs;
    }

    /**
     * @inheritdoc
     */
    isHorizontal(): boolean {
        return this.componentInstance.tabsPlacement == 'bottom';
    }

}
