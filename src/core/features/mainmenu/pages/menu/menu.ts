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

import { Component, OnInit, OnDestroy, effect, viewChild, signal, ElementRef, inject, computed } from '@angular/core';
import { IonTabs } from '@ionic/angular';
import { BackButtonEvent } from '@ionic/core';
import { Subscription } from 'rxjs';

import { CoreEvents, CoreEventObserver } from '@singletons/events';
import { CoreMainMenu } from '../../services/mainmenu';
import {
    CoreMainMenuDelegate,
    CoreMainMenuHandlerToDisplay,
    CoreMainMenuPageNavHandlerToDisplay,
} from '../../services/mainmenu-delegate';
import { Router } from '@singletons';
import { CoreUtils } from '@singletons/utils';
import { CoreAriaRoleTab, CoreAriaRoleTabFindable } from '@classes/aria-role-tab';
import { CoreNavigator } from '@services/navigator';
import { filter } from 'rxjs/operators';
import { NavigationEnd } from '@angular/router';
import { CoreSites } from '@services/sites';
import { CoreDom } from '@singletons/dom';
import { CoreLogger } from '@singletons/logger';
import { CorePlatform } from '@services/platform';
import { CoreWait } from '@singletons/wait';
import { CoreMainMenuDeepLinkManager } from '@features/mainmenu/classes/deep-link-manager';
import { CoreSiteInfoUserHomepage } from '@classes/sites/unauthenticated-site';
import { CoreContentLinksHelper } from '@features/contentlinks/services/contentlinks-helper';
import {
    MAIN_MENU_MORE_PAGE_NAME,
    MAIN_MENU_HANDLER_BADGE_UPDATED_EVENT,
    MAIN_MENU_VISIBILITY_UPDATED_EVENT,
    CoreMainMenuPlacement,
} from '@features/mainmenu/constants';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreMainMenuUserButtonComponent } from '../../components/user-menu-button/user-menu-button';
import { BackButtonPriority } from '@/core/constants';
import { CoreKeyboard } from '@singletons/keyboard';

/**
 * Page that displays the main menu of the app.
 */
@Component({
    selector: 'page-core-mainmenu',
    templateUrl: 'menu.html',
    styleUrl: 'menu.scss',
    imports: [
        CoreSharedModule,
        CoreMainMenuUserButtonComponent,
    ],
})
export default class CoreMainMenuPage implements OnInit, OnDestroy {

    readonly tabsPlacement = signal<CoreMainMenuPlacement>(CoreMainMenuPlacement.BOTTOM);
    readonly isMainScreen = signal(false);
    readonly visibility = computed(() => {
        const tabsPlacement = this.tabsPlacement();
        const isMainScreen = this.isMainScreen();

        const visibility = tabsPlacement === CoreMainMenuPlacement.SIDE
            ? ''
            : (isMainScreen ? 'visible' : 'hidden');

        return visibility;
    });

    readonly hiddenAnimationFinished = signal(false);

    tabs: HandlerToDisplay[] = [];
    allHandlers?: CoreMainMenuHandlerToDisplay[];
    readonly loaded = signal(false);
    showTabs = false;
    morePageName = MAIN_MENU_MORE_PAGE_NAME;
    selectedTab?: string;
    moreBadge = false;
    loadingTabsLength = this.getLoadingTabsLength();

    protected subscription?: Subscription;
    protected navSubscription?: Subscription;
    protected keyboardObserver?: CoreEventObserver;
    protected badgeUpdateObserver?: CoreEventObserver;
    protected resizeListener?: CoreEventObserver;
    protected backButtonFunction: (event: BackButtonEvent) => void;
    protected selectHistory: string[] = [];
    protected firstSelectedTab?: string;
    protected logger: CoreLogger;

    readonly mainTabs = viewChild.required<IonTabs>('mainTabs');
    protected hostElement: HTMLElement = inject(ElementRef).nativeElement;

    tabAction: CoreMainMenuRoleTab;

    constructor() {
        this.backButtonFunction = (event) => this.backButtonClicked(event);
        this.tabAction = new CoreMainMenuRoleTab(this);
        this.logger = CoreLogger.getInstance('CoreMainMenuPage');

        // Listen navigation events to show or hide tabs.
        this.navSubscription = Router.events
            .pipe(filter(event => event instanceof NavigationEnd))
            .subscribe(() => {
                this.isMainScreen.set(!this.mainTabs().outlet?.canGoBack());
            });

        if (CorePlatform.isIOS()) {
            effect(() => {
                const shown = CoreKeyboard.keyboardShownSignal();
                // In iOS, the resize event is triggered before the keyboard is opened/closed and not triggered again once done.
                // Init handlers again once keyboard is closed since the resize event doesn't have the updated height.
                if (!shown) {
                    this.updateHandlers();

                    // If the device is slow it can take a bit more to update the window height. Retry in a few ms.
                    setTimeout(() => {
                        this.updateHandlers();
                    }, 250);
                }
            });
        }

        effect(() => {
            this.visibility();
            // Tabs changed visibility, reset hidden animation.
            this.hiddenAnimationFinished.set(false);
        });
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.showTabs = true;

        this.initAfterLoginNavigations();

        this.isMainScreen.set(!this.mainTabs().outlet?.canGoBack());

        this.subscription = CoreMainMenuDelegate.getHandlersObservable().subscribe((handlers) => {
            const previousHandlers = this.allHandlers;
            this.allHandlers = handlers;

            this.updateHandlers(previousHandlers);
        });

        this.badgeUpdateObserver = CoreEvents.on(MAIN_MENU_HANDLER_BADGE_UPDATED_EVENT, (data) => {
            if (data.siteId === CoreSites.getCurrentSiteId()) {
                this.updateMoreBadge();
            }
        });

        this.resizeListener = CoreDom.onWindowResize(() => {
            this.updateHandlers();
        });
        document.addEventListener('ionBackButton', this.backButtonFunction);

        CoreEvents.trigger(CoreEvents.MAIN_HOME_LOADED);

        const tabBar = this.hostElement.querySelector('ion-tab-bar');
        tabBar?.addEventListener('animationend', (ev) => {
            if (ev.animationName === 'slideOutBottom' &&
                !this.isMainScreen() && this.tabsPlacement() === CoreMainMenuPlacement.BOTTOM) {
                this.hiddenAnimationFinished.set(true);
            }

            CoreEvents.trigger(MAIN_MENU_VISIBILITY_UPDATED_EVENT);
        });
    }

    /**
     * Update handlers on change (size or handlers).
     *
     * @param previousHandlers Previous handlers (if they haave just been updated).
     */
    async updateHandlers(previousHandlers?: CoreMainMenuHandlerToDisplay[]): Promise<void> {
        if (!this.allHandlers) {
            return;
        }

        this.tabsPlacement.set(CoreMainMenu.getTabPlacement());

        this.loadingTabsLength = this.getLoadingTabsLength();

        const handlers = CoreMainMenuDelegate.skipOnlyMoreHandlers(this.allHandlers)
            .slice(0, CoreMainMenu.getNumItems()); // Get main handlers.

        // Re-build the list of tabs. If a handler is already in the list, use existing object to prevent re-creating the tab.
        const newTabs: HandlerToDisplay[] = [];

        for (let i = 0; i < handlers.length; i++) {
            const handler = handlers[i] as HandlerToDisplay;

            // Check if the handler is already in the tabs list. If so, use it.
            const tab = this.tabs.find((tab) => tab.page === handler.page);
            if (tab) {
                tab.hide = false;
            }

            // @todo: Ideally we shouldn't modify the original handler, but right now the badge is modified in the original
            // handler so we need to keep the reference.
            handler.hide = false;
            handler.id = handler.id || `core-mainmenu-${CoreUtils.getUniqueId('CoreMainMenuPage')}`;

            newTabs.push(tab || handler);
        }

        this.tabs = newTabs;

        // Sort them by priority so new handlers are in the right position.
        this.tabs.sort((a, b) => (b.priority || 0) - (a.priority || 0));

        this.updateMoreBadge();

        let removedHandlersPages: string[] = [];
        if (previousHandlers) {
            const allHandlers = this.allHandlers;
            removedHandlersPages = previousHandlers.filter(handler => 'page' in handler).map(handler => handler.page)
                .filter(page => !allHandlers.some(handler => 'page' in handler && handler.page === page));
        }

        const mainMenuTab = CoreNavigator.getCurrentMainMenuTab();
        this.loaded.set(CoreMainMenuDelegate.areHandlersLoaded());

        if (this.loaded() && (!mainMenuTab || removedHandlersPages.includes(mainMenuTab))) {
            // No tab selected or handler no longer available, select the first one.
            await CoreWait.nextTick();

            const tabPage = this.tabs[0] ? this.tabs[0].page : this.morePageName;
            const tabPageParams = this.tabs[0] ? this.tabs[0].pageParams : {};
            this.logger.debug(`Select first tab: ${tabPage}.`, this.tabs);

            // Use navigate instead of mainTabs.select to be able to pass page params.
            CoreNavigator.navigateToSitePath(tabPage, {
                preferCurrentTab: false,
                params: tabPageParams,
            });
        }
    }

    /**
     * Calculates the total number of loading placeholders to display in the main menu.
     *
     * @returns The total number of loading tabs to display.
     */
    protected getLoadingTabsLength(): number {
        const isBottomPlacement = this.tabsPlacement() === CoreMainMenuPlacement.BOTTOM;

        return CoreMainMenu.getNumItems() + (isBottomPlacement ? 1 : 2); // +1 for the "More" tab and user button.
    }

    /**
     * Set up the code to run after the login navigation finishes.
     */
    protected initAfterLoginNavigations(): void {
        // Treat custom home page and deep link (if any) when the login navigation finishes.
        const deepLinkManager = new CoreMainMenuDeepLinkManager();

        CoreSites.runAfterLoginNavigation({
            priority: 800,
            callback: async () => {
                await deepLinkManager.treatLink();
            },
        });

        CoreSites.runAfterLoginNavigation({
            priority: 1000,
            callback: async () => {
                const userHomePage = CoreSites.getCurrentSite()?.getInfo()?.userhomepage;
                if (userHomePage !== CoreSiteInfoUserHomepage.HOMEPAGE_URL) {
                    return;
                }

                const url = CoreSites.getCurrentSite()?.getInfo()?.userhomepageurl;
                if (!url) {
                    return;
                }

                await CoreContentLinksHelper.handleLink(url);
            },
        });
    }

    /**
     * Check all non visible tab handlers for any badge text or number.
     */
    updateMoreBadge(): void {
        if (!this.allHandlers) {
            return;
        }

        // Calculate the main handlers not to display them in this view.
        const mainHandlers = CoreMainMenuDelegate.skipOnlyMoreHandlers(this.allHandlers)
            .slice(0, CoreMainMenu.getNumItems());

        // Use only the handlers that don't appear in the main view.
        this.moreBadge = this.allHandlers.some((handler) =>
            'badge' in handler && !!handler.badge && mainHandlers.indexOf(handler) === -1);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.subscription?.unsubscribe();
        this.navSubscription?.unsubscribe();
        document.removeEventListener('ionBackButton', this.backButtonFunction);
        this.keyboardObserver?.off();
        this.badgeUpdateObserver?.off();
        this.resizeListener?.off();
    }

    /**
     * Selected tab has changed.
     *
     * @param event Event.
     */
    tabChanged(event: { tab: string }): void {
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
        event.detail.register(BackButtonPriority.MAIN_MENU, async (processNextHandler: () => void) => {
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

                this.mainTabs()?.select(previousTab);

                return;
            }

            if (this.firstSelectedTab && this.selectedTab != this.firstSelectedTab) {
                // All history is gone but we are not in the first selected tab.
                this.selectHistory = [];
                this.mainTabs()?.select(this.firstSelectedTab);

                return;
            }

            processNextHandler();
        });
    }

    /**
     * Check if current route is the root of the current main menu tab.
     *
     * @returns Promise.
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
        return this.componentInstance.tabsPlacement() === CoreMainMenuPlacement.BOTTOM;
    }

    /**
     * @inheritdoc
     */
    selectTab(tabId: string): void {
        this.componentInstance.mainTabs()?.select(tabId);
    }

}

type HandlerToDisplay = CoreMainMenuPageNavHandlerToDisplay & {
    /**
     * Hide tab. Used then resizing.
     */
    hide?: boolean;

    /**
     * Used to control tabs.
     */
    id?: string;
};
