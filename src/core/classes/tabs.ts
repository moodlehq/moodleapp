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
    SimpleChange,
    ElementRef,
} from '@angular/core';
import { IonSlides } from '@ionic/angular';
import { BackButtonEvent } from '@ionic/core';
import { Subscription } from 'rxjs';

import { Translate } from '@singletons';
import { CoreSettingsHelper } from '@features/settings/services/settings-helper';
import { CoreAriaRoleTab, CoreAriaRoleTabFindable } from './aria-role-tab';
import { CoreEventObserver } from '@singletons/events';
import { CoreDom } from '@singletons/dom';
import { CoreUtils } from '@services/utils/utils';
import { CoreError } from './errors/error';
import { CorePromisedValue } from './promised-value';
import { AsyncDirective } from './async-directive';
import { CoreDirectivesRegistry } from '@singletons/directives-registry';
import { CorePlatform } from '@services/platform';

/**
 * Class to abstract some common code for tabs.
 */
@Component({
    template: '',
})
export class CoreTabsBaseComponent<T extends CoreTabBase> implements OnInit, AfterViewInit, OnChanges, OnDestroy, AsyncDirective {

    // Minimum tab's width.
    protected static readonly MIN_TAB_WIDTH = 107;

    @Input() selectedIndex = 0; // Index of the tab to select.
    @Input() hideUntil = false; // Determine when should the contents be shown.
    @Output() protected ionChange = new EventEmitter<T>(); // Emitted when the tab changes.

    @ViewChild(IonSlides) protected slides?: IonSlides;

    tabs: T[] = []; // List of tabs.

    hideTabs = false;
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
        threshold: 10,
    };

    protected slidesElement?: HTMLIonSlidesElement;
    protected initialized = false;

    protected resizeListener?: CoreEventObserver;
    protected isDestroyed = false;
    protected isCurrentView = true;
    protected shouldSlideToInitial = false; // Whether we need to slide to the initial slide because it's out of view.
    protected hasSliddenToInitial = false; // Whether we've already slidden to the initial slide or there was no need.
    protected selectHistory: string[] = [];

    protected firstSelectedTab?: string; // ID of the first selected tab to control history.
    protected backButtonFunction: (event: BackButtonEvent) => void;
    // Swiper 6 documentation: https://swiper6.vercel.app/
    protected isInTransition = false; // Wether Slides is in transition.
    protected subscriptions: Subscription[] = [];
    protected onReadyPromise = new CorePromisedValue<void>();

    tabAction: CoreTabsRoleTab<T>;

    constructor(element: ElementRef) {
        this.backButtonFunction = (event) => this.backButtonClicked(event);

        this.tabAction = new CoreTabsRoleTab(this);

        CoreDirectivesRegistry.register(element.nativeElement, this);
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.direction = CorePlatform.isRTL ? 'rtl' : 'ltr';

        // Change the side when the language changes.
        this.subscriptions.push(Translate.onLangChange.subscribe(() => {
            setTimeout(() => {
                this.direction = CorePlatform.isRTL ? 'rtl' : 'ltr';
            });
        }));
    }

    /**
     * @inheritdoc
     */
    ngAfterViewInit(): void {
        if (this.isDestroyed) {
            return;
        }

        this.init();
    }

    /**
     * @inheritdoc
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ngOnChanges(changes: Record<string, SimpleChange>): void {
        this.init();
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

        this.numTabsShown = this.tabs.reduce((prev: number, current) => current.enabled ? prev + 1 : prev, 0);

        if (this.numTabsShown <= 1) {
            this.hideTabs = true;

            // Only one, nothing to do here.
            return;
        }
        this.hideTabs = false;

        await this.calculateMaxSlides();

        await this.updateSlides();
    }

    /**
     * Get the tab on a index.
     *
     * @param tabId Tab ID.
     * @returns Selected tab.
     */
    protected getTabIndex(tabId: string): number {
        return this.tabs.findIndex((tab) => tabId == tab.id);
    }

    /**
     * Get the current selected tab.
     *
     * @returns Selected tab.
     */
    getSelected(): T | undefined {
        const index = this.selected && this.getTabIndex(this.selected);

        return index !== undefined && index >= 0 ? this.tabs[index] : undefined;
    }

    /**
     * Init the component.
     */
    protected async init(): Promise<void> {
        if (!this.hideUntil) {
            // Hidden, do nothing.
            return;
        }

        try {
            await this.initializeSlider();
            await this.initializeTabs();
        } catch {
            // Something went wrong, ignore.
        }
    }

    /**
     * Initialize the slider elements.
     */
    protected async initializeSlider(): Promise<void> {
        if (this.initialized) {
            return;
        }

        if (this.slidesElement) {
            // Already initializated, await for ready.
            await this.slidesElement.componentOnReady();

            return;
        }

        if (!this.slides) {
            await CoreUtils.nextTick();
        }
        const slidesSwiper = await this.slides?.getSwiper();
        if (!slidesSwiper || !this.slides) {
            throw new CoreError('Swiper not found, will try on next change.');
        }

        this.slidesElement = <HTMLIonSlidesElement>slidesSwiper.el;
        await this.slidesElement.componentOnReady();

        this.initialized = true;

        // Subscribe to changes.
        this.subscriptions.push(this.slides.ionSlideDidChange.subscribe(() => {
            this.slideChanged();
        }));
    }

    /**
     * Initialize the tabs, determining the first tab to be shown.
     */
    protected async initializeTabs(): Promise<void> {
        if (!this.initialized || !this.slidesElement) {
            return;
        }

        const selectedTab = this.calculateInitialTab();
        if (!selectedTab) {
            // No enabled tabs, return.
            throw new CoreError('No enabled tabs.');
        }

        this.firstSelectedTab = selectedTab.id;
        if (this.firstSelectedTab !== undefined) {
            this.selectTab(this.firstSelectedTab);
        }

        // Check which arrows should be shown.
        this.calculateSlides();

        this.resizeListener = CoreDom.onWindowResize(() => {
            this.calculateSlides();
        });
    }

    /**
     * Calculate the initial tab to load.
     *
     * @returns Initial tab, undefined if no valid tab found.
     */
    protected calculateInitialTab(): T | undefined {
        const selectedTab: T | undefined = this.tabs[this.selectedIndex || 0] || undefined;

        if (selectedTab && selectedTab.enabled) {
            return selectedTab;
        }

        // The tab is not enabled or not shown. Get the first tab that is enabled.
        return this.tabs.find((tab) => tab.enabled) || undefined;
    }

    /**
     * Method executed when the slides are changed.
     */
    async slideChanged(): Promise<void> {
        if (!this.slidesElement) {
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
        if (!this.slides) {
            return;
        }

        this.slidesOpts = { ...this.slidesOpts, slidesPerView: Math.min(this.maxSlides, this.numTabsShown) };

        await this.slideChanged();

        await this.slides.update();

        if (!this.hasSliddenToInitial && this.selectedIndex && this.selectedIndex >= this.slidesOpts.slidesPerView) {
            this.hasSliddenToInitial = true;
            this.shouldSlideToInitial = true;

            setTimeout(() => {
                if (this.shouldSlideToInitial) {
                    this.slides?.slideTo(this.selectedIndex, 0);
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
        if (!this.slidesElement || !this.slides) {
            return;
        }

        this.maxSlides = 3;
        await CoreUtils.nextTick();

        let width: number = this.slidesElement.getBoundingClientRect().width;
        if (!width) {
            const slidesSwiper = await this.slides.getSwiper();

            await slidesSwiper.updateSize();
            await CoreUtils.nextTick();

            width = slidesSwiper.width;
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
        if (!this.showNextButton || this.isInTransition || !this.slides) {
            return;
        }

        if (await this.slides.isBeginning()) {
            // Slide to the second page.
            this.slides.slideTo(this.maxSlides);
        } else {
            const currentIndex = await this.slides.getActiveIndex();
            if (currentIndex !== undefined) {
                const nextSlideIndex = currentIndex + this.maxSlides;
                this.isInTransition = true;
                if (nextSlideIndex < this.numTabsShown) {
                    // Slide to the next page.
                    await this.slides.slideTo(nextSlideIndex);
                } else {
                    // Slide to the latest slide.
                    await this.slides.slideTo(this.numTabsShown - 1);
                }
            }

        }
    }

    /**
     * Method that shows the previous tab.
     */
    async slidePrev(): Promise<void> {
        // Stop if slides are in transition.
        if (!this.showPrevButton || this.isInTransition || !this.slides) {
            return;
        }

        if (await this.slides.isEnd()) {
            this.slides.slideTo(this.numTabsShown - this.maxSlides * 2);
            // Slide to the previous of the latest page.
        } else {
            const currentIndex = await this.slides.getActiveIndex();
            if (currentIndex !== undefined) {
                const prevSlideIndex = currentIndex - this.maxSlides;
                this.isInTransition = true;
                if (prevSlideIndex >= 0) {
                    // Slide to the previous page.
                    await this.slides.slideTo(prevSlideIndex);
                } else {
                    // Slide to the first page.
                    await this.slides.slideTo(0);
                }
            }
        }
    }

    /**
     * Select a tab by ID.
     *
     * @param tabId Tab ID.
     * @param e Event.
     * @returns Promise resolved when done.
     */
    async selectTab(tabId: string, e?: Event): Promise<void> {
        const index = this.tabs.findIndex((tab) => tabId == tab.id);
        if (index < 0) {
            return;
        }

        return this.selectByIndex(index, e);
    }

    /**
     * Select a tab by index.
     *
     * @param index Index to select.
     * @param e Event.
     * @returns Promise resolved when done.
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
        if (!tabToSelect || !tabToSelect.enabled) {
            // Not enabled.
            return;
        }

        if (this.selected && this.slides) {
            // Check if we need to slide to the tab because it's not visible.
            const firstVisibleTab = await this.slides.getActiveIndex();
            const lastVisibleTab = firstVisibleTab + this.slidesOpts.slidesPerView - 1;
            if (index < firstVisibleTab || index > lastVisibleTab) {
                await this.slides.slideTo(index, 0, true);
            }
        }

        if (tabToSelect.id === this.selected) {
            // Already selected.
            return;
        }

        const suceeded = await this.loadTab(tabToSelect);

        if (suceeded !== false) {
            this.tabSelected(tabToSelect, index);
        }
        this.onReadyPromise.resolve();
    }

    /**
     * Update selected tab.
     *
     * @param tab Tab.
     * @param tabIndex Tab index.
     */
    protected tabSelected(tab: T, tabIndex: number): void {
        this.selectHistory.push(tab.id ?? '');
        this.selected = tab.id;
        this.selectedIndex = tabIndex;

        this.ionChange.emit(tab);
    }

    /**
     * Load the tab.
     *
     * @param tabToSelect Tab to load.
     * @returns Promise resolved with true if tab is successfully loaded.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected async loadTab(tabToSelect: T): Promise<boolean> {
        // Each implementation should override this function.
        return true;
    }

    /**
     * @inheritdoc
     */
    async ready(): Promise<void> {
        return this.onReadyPromise;
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;

        this.resizeListener?.off();
        this.subscriptions.forEach((subscription) => subscription.unsubscribe());
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
            id: tab.id || '',
            findIndex: tab.id || '',
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
