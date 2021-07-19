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

import {
    Component,
    Input,
    Output,
    EventEmitter,
    OnInit,
    OnChanges,
    OnDestroy,
    AfterViewInit,
    ViewChild,
    ElementRef,
    SimpleChange,
} from '@angular/core';
import { IonSlides } from '@ionic/angular';
import { BackButtonEvent } from '@ionic/core';
import { Subscription } from 'rxjs';

import { Platform, Translate } from '@singletons';
import { CoreSettingsHelper } from '@features/settings/services/settings-helper';
import { CoreAriaRoleTab, CoreAriaRoleTabFindable } from './aria-role-tab';

/**
 * Class to abstract some common code for tabs.
 */
@Component({
    template: '',
})
export class CoreTabsBaseComponent<T extends CoreTabBase> implements OnInit, AfterViewInit, OnChanges, OnDestroy {

    // Minimum tab's width.
    protected static readonly MIN_TAB_WIDTH = 107;
    // Max height that allows tab hiding.
    protected static readonly MAX_HEIGHT_TO_HIDE_TABS = 768;

    @Input() protected selectedIndex = 0; // Index of the tab to select.
    @Input() hideUntil = false; // Determine when should the contents be shown.
    @Output() protected ionChange = new EventEmitter<T>(); // Emitted when the tab changes.

    @ViewChild(IonSlides) protected slides?: IonSlides;

    tabs: T[] = []; // List of tabs.

    selected?: string; // Selected tab id.
    showPrevButton = false;
    showNextButton = false;
    maxSlides = 3;
    numTabsShown = 0;
    direction = 'ltr';
    description = '';
    slidesOpts = {
        initialSlide: 0,
        slidesPerView: 3,
        centerInsufficientSlides: true,
    };

    protected initialized = false;
    protected afterViewInitTriggered = false;

    protected tabBarHeight = 0;
    protected tabsElement?: HTMLElement; // The tabs parent element. It's the element that will be "scrolled" to hide tabs.
    protected tabBarElement?: HTMLIonTabBarElement; // The top tab bar element.
    protected tabsShown = true;
    protected resizeFunction?: EventListenerOrEventListenerObject;
    protected isDestroyed = false;
    protected isCurrentView = true;
    protected shouldSlideToInitial = false; // Whether we need to slide to the initial slide because it's out of view.
    protected hasSliddenToInitial = false; // Whether we've already slidden to the initial slide or there was no need.
    protected selectHistory: string[] = [];

    protected firstSelectedTab?: string; // ID of the first selected tab to control history.
    protected backButtonFunction: (event: BackButtonEvent) => void;
    protected languageChangedSubscription?: Subscription;
    protected isInTransition = false; // Weather Slides is in transition.
    protected slidesSwiper: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    protected slidesSwiperLoaded = false;
    protected scrollElements: Record<string | number, HTMLElement> = {}; // Scroll elements for each loaded tab.
    protected lastScroll = 0;
    protected previousLastScroll = 0;

    tabAction: CoreTabsRoleTab<T>;

    constructor(
        protected element: ElementRef,
    ) {
        this.backButtonFunction = this.backButtonClicked.bind(this);
        this.tabAction = new CoreTabsRoleTab(this);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.direction = Platform.isRTL ? 'rtl' : 'ltr';

        // Change the side when the language changes.
        this.languageChangedSubscription = Translate.onLangChange.subscribe(() => {
            setTimeout(() => {
                this.direction = Platform.isRTL ? 'rtl' : 'ltr';
            });
        });
    }

    /**
     * View has been initialized.
     */
    async ngAfterViewInit(): Promise<void> {
        if (this.isDestroyed) {
            return;
        }

        this.afterViewInitTriggered = true;
        this.tabBarElement = this.element.nativeElement.querySelector('ion-tab-bar');

        if (!this.initialized && this.hideUntil) {
            // Tabs should be shown, initialize them.
            await this.initializeTabs();
        }

        this.resizeFunction = this.windowResized.bind(this);

        window.addEventListener('resize', this.resizeFunction!);
    }

    /**
     * Calculate the tab bar height.
     */
    protected calculateTabBarHeight(): void {
        if (!this.tabBarElement) {
            return;
        }

        this.tabBarHeight = this.tabBarElement.offsetHeight;

        this.applyScroll(this.tabsShown, this.lastScroll);
    }

    /**
     * Apply scroll to hiding tabs.
     *
     * @param showTabs Show or completely hide tabs.
     * @param scroll Scroll position.
     */
    protected applyScroll(showTabs: boolean, scroll?: number): void {
        if (!this.tabBarElement || !this.tabBarHeight) {

            return;
        }

        if (showTabs) {
            // Smooth translation.
            this.tabBarElement!.classList.remove('tabs-hidden');
            if (scroll === 0) {
                this.tabBarElement!.style.height = '';
                this.previousLastScroll = this.lastScroll;
                this.lastScroll = 0;
            } else if (scroll !== undefined) {
                this.tabBarElement!.style.height = (this.tabBarHeight - scroll) + 'px';
            }
        } else {
            this.tabBarElement!.classList.add('tabs-hidden');
            this.tabBarElement!.style.height = '';
        }

        this.tabsShown = showTabs;
    }

    /**
     * Detect changes on input properties.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ngOnChanges(changes: Record<string, SimpleChange>): void {
        // Wait for ngAfterViewInit so it works in the case that each tab has its own component.
        if (!this.initialized && this.hideUntil && this.afterViewInitTriggered) {
            // Tabs should be shown, initialize them.
            // Use a setTimeout so child components update their inputs before initializing the tabs.
            setTimeout(() => {
                this.initializeTabs();
            });
        }
    }

    /**
     * User entered the page that contains the component.
     */
    ionViewDidEnter(): void {
        this.isCurrentView = true;

        this.calculateSlides();

        document.addEventListener('ionBackButton', this.backButtonFunction);
    }

    /**
     * Back button clicked.
     *
     * @param event Event.
     */
    protected backButtonClicked(event: BackButtonEvent): void {
        event.detail.register(40, (processNextHandler: () => void) => {
            if (this.selectHistory.length > 1) {
                // The previous page in history is not the last one, we need the previous one.
                const previousTabId = this.selectHistory[this.selectHistory.length - 2];

                // Remove curent and previous tabs from history.
                this.selectHistory = this.selectHistory.filter((tabId) => this.selected != tabId && previousTabId != tabId);

                this.selectTab(previousTabId);

                return;
            }

            if (this.firstSelectedTab && this.selected != this.firstSelectedTab) {
                // All history is gone but we are not in the first selected tab.
                this.selectHistory = [];

                this.selectTab(this.firstSelectedTab);

                return;
            }

            processNextHandler();
        });
    }

    /**
     * User left the page that contains the component.
     */
    ionViewDidLeave(): void {
        // Unregister the custom back button action for this component.
        document.removeEventListener('ionBackButton', this.backButtonFunction);

        this.isCurrentView = false;
    }

    /**
     * Calculate slides.
     */
    protected async calculateSlides(): Promise<void> {
        if (!this.isCurrentView || !this.initialized) {
            // Don't calculate if component isn't in current view, the calculations are wrong.
            return;
        }

        if (window.innerHeight >= CoreTabsBaseComponent.MAX_HEIGHT_TO_HIDE_TABS) {
            // Ensure tabbar is shown.
            this.applyScroll(true, 0);
            this.calculateTabBarHeight();
        } else if (!this.tabsShown) {
            // Don't recalculate.
            return;
        }

        await this.calculateMaxSlides();

        await this.updateSlides();
    }

    /**
     * Get the tab on a index.
     *
     * @param tabId Tab ID.
     * @return Selected tab.
     */
    protected getTabIndex(tabId: string): number {
        return this.tabs.findIndex((tab) => tabId == tab.id);
    }

    /**
     * Get the current selected tab.
     *
     * @return Selected tab.
     */
    getSelected(): T | undefined {
        const index = this.selected && this.getTabIndex(this.selected);

        return index !== undefined && index >= 0 ? this.tabs[index] : undefined;
    }

    /**
     * Initialize the tabs, determining the first tab to be shown.
     */
    protected async initializeTabs(): Promise<void> {
        // Initialize slider.
        this.slidesSwiper = await this.slides?.getSwiper();
        this.slidesSwiper.once('progress', () => {
            this.slidesSwiperLoaded = true;
            this.calculateSlides();
        });

        let selectedTab: T | undefined = this.tabs[this.selectedIndex || 0] || undefined;

        if (!selectedTab || !selectedTab.enabled) {
            // The tab is not enabled or not shown. Get the first tab that is enabled.
            selectedTab = this.tabs.find((tab) => tab.enabled) || undefined;
        }

        if (!selectedTab) {
            return;
        }

        this.firstSelectedTab = selectedTab.id!;
        this.selectTab(this.firstSelectedTab);

        // Setup tab scrolling.
        this.calculateTabBarHeight();

        this.initialized = true;

        // Check which arrows should be shown.
        this.calculateSlides();
    }

    /**
     * Method executed when the slides are changed.
     */
    async slideChanged(): Promise<void> {
        if (!this.slidesSwiperLoaded) {
            return;
        }

        this.isInTransition = false;
        const slidesCount = await this.slides?.length() || 0;
        if (slidesCount > 0) {
            this.showPrevButton = !await this.slides?.isBeginning();
            this.showNextButton = !await this.slides?.isEnd();
        } else {
            this.showPrevButton = false;
            this.showNextButton = false;
        }

        const currentIndex = await this.slides?.getActiveIndex();
        if (this.shouldSlideToInitial && currentIndex != this.selectedIndex) {
            // Current tab has changed, don't slide to initial anymore.
            this.shouldSlideToInitial = false;
        }
    }

    /**
     * Updates the number of slides to show.
     */
    protected async updateSlides(): Promise<void> {
        this.numTabsShown = this.tabs.reduce((prev: number, current) => current.enabled ? prev + 1 : prev, 0);

        this.slidesOpts = { ...this.slidesOpts, slidesPerView: Math.min(this.maxSlides, this.numTabsShown) };

        this.slideChanged();

        this.calculateTabBarHeight();

        // @todo: This call to update() can trigger JS errors in the console if tabs are re-loaded and there's only 1 tab.
        // For some reason, swiper.slides is undefined inside the Slides class, and the swiper is marked as destroyed.
        // Changing *ngIf="hideUntil" to [hidden] doesn't solve the issue, and it causes another error to be raised.
        // This can be tested in lesson as a student, play a lesson and go back to the entry page.
        await this.slides!.update();

        if (!this.hasSliddenToInitial && this.selectedIndex && this.selectedIndex >= this.slidesOpts.slidesPerView) {
            this.hasSliddenToInitial = true;
            this.shouldSlideToInitial = true;

            setTimeout(() => {
                if (this.shouldSlideToInitial) {
                    this.slides!.slideTo(this.selectedIndex, 0);
                    this.shouldSlideToInitial = false;
                }
            }, 400);

            return;
        } else if (this.selectedIndex) {
            this.hasSliddenToInitial = true;
        }

        setTimeout(() => {
            this.slideChanged(); // Call slide changed again, sometimes the slide active index takes a while to be updated.
        }, 400);
    }

    /**
     * Calculate the number of slides that can fit on the screen.
     */
    protected async calculateMaxSlides(): Promise<void> {
        if (!this.slidesSwiperLoaded) {
            return;
        }

        this.maxSlides = 3;
        let width = this.slidesSwiper.width;
        if (!width) {
            this.slidesSwiper.updateSize();
            width = this.slidesSwiper.width;

            if (!width) {
                return;
            }
        }

        const zoomLevel = await CoreSettingsHelper.getZoom();

        this.maxSlides = Math.floor(width / (zoomLevel / 100 * CoreTabsBaseComponent.MIN_TAB_WIDTH));
    }

    /**
     * Method that shows the next tab.
     */
    async slideNext(): Promise<void> {
        // Stop if slides are in transition.
        if (!this.showNextButton || this.isInTransition) {
            return;
        }

        if (await this.slides!.isBeginning()) {
            // Slide to the second page.
            this.slides!.slideTo(this.maxSlides);
        } else {
            const currentIndex = await this.slides!.getActiveIndex();
            if (typeof currentIndex !== 'undefined') {
                const nextSlideIndex = currentIndex + this.maxSlides;
                this.isInTransition = true;
                if (nextSlideIndex < this.numTabsShown) {
                    // Slide to the next page.
                    await this.slides!.slideTo(nextSlideIndex);
                } else {
                    // Slide to the latest slide.
                    await this.slides!.slideTo(this.numTabsShown - 1);
                }
            }

        }
    }

    /**
     * Method that shows the previous tab.
     */
    async slidePrev(): Promise<void> {
        // Stop if slides are in transition.
        if (!this.showPrevButton || this.isInTransition) {
            return;
        }

        if (await this.slides!.isEnd()) {
            this.slides!.slideTo(this.numTabsShown - this.maxSlides * 2);
            // Slide to the previous of the latest page.
        } else {
            const currentIndex = await this.slides!.getActiveIndex();
            if (typeof currentIndex !== 'undefined') {
                const prevSlideIndex = currentIndex - this.maxSlides;
                this.isInTransition = true;
                if (prevSlideIndex >= 0) {
                    // Slide to the previous page.
                    await this.slides!.slideTo(prevSlideIndex);
                } else {
                    // Slide to the first page.
                    await this.slides!.slideTo(0);
                }
            }
        }
    }

    /**
     * Show or hide the tabs. This is used when the user is scrolling inside a tab.
     *
     * @param scrollTop Scroll top.
     * @param scrollElement Content scroll element to check measures.
     */
    showHideTabs(scrollTop: number, scrollElement: HTMLElement): void {
        if (!this.tabBarElement || !this.tabsElement || !scrollElement) {
            return;
        }

        // Always show on very tall screens.
        if (window.innerHeight >= CoreTabsBaseComponent.MAX_HEIGHT_TO_HIDE_TABS) {
            return;
        }

        if (!this.tabBarHeight && this.tabBarElement.offsetHeight != this.tabBarHeight) {
            // Wrong tab height, recalculate it.
            this.calculateTabBarHeight();
        }

        if (!this.tabBarHeight) {
            // We don't have the tab bar height, this means the tab bar isn't shown.
            return;
        }

        if (scrollTop <= 0) {
            // Ensure tabbar is shown.
            this.applyScroll(true, 0);

            return;
        }

        if (scrollTop == this.lastScroll || scrollTop == this.previousLastScroll) {
            // Ensure scroll has been modified to avoid flicks.
            return;
        }

        if (this.tabsShown && scrollTop > this.tabBarHeight) {
            // Hide tabs.
            this.applyScroll(false);
        } else if (!this.tabsShown && scrollTop <= this.tabBarHeight) {
            this.applyScroll(true);
        }

        if (this.tabsShown && scrollElement.scrollHeight > scrollElement.clientHeight + (this.tabBarHeight - scrollTop)) {
            // Smooth translation.
            this.applyScroll(true, scrollTop);
        }

        // Use lastScroll after moving the tabs to avoid flickering.
        this.previousLastScroll = this.lastScroll;
        this.lastScroll = scrollTop;
    }

    /**
     * Select a tab by ID.
     *
     * @param tabId Tab ID.
     * @param e Event.
     * @return Promise resolved when done.
     */
    async selectTab(tabId: string, e?: Event): Promise<void> {
        const index = this.tabs.findIndex((tab) => tabId == tab.id);

        return this.selectByIndex(index, e);
    }

    /**
     * Select a tab by index.
     *
     * @param index Index to select.
     * @param e Event.
     * @return Promise resolved when done.
     */
    async selectByIndex(index: number, e?: Event): Promise<void> {
        e?.preventDefault();
        e?.stopPropagation();

        if (index < 0 || index >= this.tabs.length) {
            if (this.selected) {
                // Invalid index do not change tab.
                return;
            }

            // Index isn't valid, select the first one.
            index = 0;
        }

        const tabToSelect = this.tabs[index];
        if (!tabToSelect || !tabToSelect.enabled || tabToSelect.id == this.selected) {
            // Already selected or not enabled.
            return;
        }

        if (this.selected) {
            // Check if we need to slide to the tab because it's not visible.
            const firstVisibleTab = await this.slides!.getActiveIndex();
            const lastVisibleTab = firstVisibleTab + this.slidesOpts.slidesPerView - 1;
            if (index < firstVisibleTab || index > lastVisibleTab) {
                await this.slides!.slideTo(index, 0, true);
            }
        }

        const ok = await this.loadTab(tabToSelect);

        if (ok !== false) {
            this.selectHistory.push(tabToSelect.id!);
            this.selected = tabToSelect.id;
            this.selectedIndex = index;

            this.ionChange.emit(tabToSelect);
        }
    }

    /**
     * Load the tab.
     *
     * @param tabToSelect Tab to load.
     * @return Promise resolved with true if tab is successfully loaded.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected async loadTab(tabToSelect: T): Promise<boolean> {
        // Each implementation should override this function.
        return true;
    }

    /**
     * Listen scroll events in an element's inner ion-content (if any).
     *
     * @param element Element to search ion-content in.
     * @param id ID of the tab/page.
     * @return Promise resolved when done.
     */
    async listenContentScroll(element: HTMLElement, id: number | string): Promise<void> {
        if (this.scrollElements[id]) {
            return; // Already set.
        }

        let content = element.querySelector('ion-content');
        if (!content) {
            return;
        }

        // Search the inner ion-content if there's more than one.
        let childContent = content.querySelector('ion-content') || null;
        while (childContent != null) {
            content = childContent;
            childContent = content.querySelector('ion-content') || null;
        }

        const scroll = await content.getScrollElement();

        content.scrollEvents = true;
        this.scrollElements[id] = scroll;
        content.addEventListener('ionScroll', (e: CustomEvent): void => {
            this.showHideTabs(parseInt(e.detail.scrollTop, 10), scroll);
        });
    }

    /**
     * Adapt tabs to a window resize.
     */
    protected windowResized(): void {
        setTimeout(() => {
            this.calculateSlides();
        }, 200);
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;

        if (this.resizeFunction) {
            window.removeEventListener('resize', this.resizeFunction);
        }
        this.languageChangedSubscription?.unsubscribe();
    }

}

/**
 * Helper class to manage rol tab.
 */
class CoreTabsRoleTab<T extends CoreTabBase> extends CoreAriaRoleTab<CoreTabsBaseComponent<T>> {

    /**
     * @inheritdoc
     */
    selectTab(tabId: string, e: Event): void {
        this.componentInstance.selectTab(tabId, e);
    }

    /**
     * @inheritdoc
     */
    getSelectableTabs(): CoreAriaRoleTabFindable[] {
        return this.componentInstance.tabs.filter((tab) => tab.enabled).map((tab) => ({
            id: tab.id!,
            findIndex: tab.id!,
        }));
    }

}

/**
 * Data for each tab.
 */
export type CoreTabBase = {
    title: string; // The translatable tab title.
    id?: string; // Unique tab id.
    class?: string; // Class, if needed.
    icon?: string; // The tab icon.
    badge?: string; // A badge to add in the tab.
    badgeStyle?: string; // The badge color.
    badgeA11yText?: string; // Accessibility text to add on the badge.
    enabled?: boolean; // Whether the tab is enabled.
};
