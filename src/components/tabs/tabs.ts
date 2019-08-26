// (C) Copyright 2015 Martin Dougiamas
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
    Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy, AfterViewInit, ViewChild, ElementRef,
    SimpleChange
} from '@angular/core';
import { Content, Slides, Platform } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreAppProvider } from '@providers/app';
import { CoreTabComponent } from './tab';

/**
 * This component displays some tabs that usually share data between them.
 *
 * If your tabs don't share any data then you should probably use ion-tabs. This component doesn't use different ion-nav
 * for each tab, so it will not load pages.
 *
 * Example usage:
 *
 * <core-tabs selectedIndex="1">
 *     <core-tab [title]="'core.courses.timeline' | translate" (ionSelect)="switchTab('timeline')">
 *         <ng-template> <!-- This ng-template is required, @see CoreTabComponent. -->
 *             <!-- Tab contents. -->
 *         </ng-template>
 *     </core-tab>
 * </core-tabs>
 *
 * Obviously, the tab contents will only be shown if that tab is selected.
 */
@Component({
    selector: 'core-tabs',
    templateUrl: 'core-tabs.html'
})
export class CoreTabsComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
    @Input() selectedIndex = 0; // Index of the tab to select.
    @Input() hideUntil = true; // Determine when should the contents be shown.
    @Input() parentScrollable = false; // Determine if the scroll should be in the parent content or the tab itself.
    @Output() ionChange: EventEmitter<CoreTabComponent> = new EventEmitter<CoreTabComponent>(); // Emitted when the tab changes.
    @ViewChild('originalTabs') originalTabsRef: ElementRef;
    @ViewChild('topTabs') topTabs: ElementRef;
    @ViewChild(Slides) slides: Slides;

    tabs: CoreTabComponent[] = []; // List of tabs.
    selected: number; // Selected tab number.
    showPrevButton: boolean;
    showNextButton: boolean;
    maxSlides = 3;
    slidesShown = this.maxSlides;
    numTabsShown = 0;
    direction = 'ltr';
    description = '';
    lastScroll = 0;

    protected originalTabsContainer: HTMLElement; // The container of the original tabs. It will include each tab's content.
    protected initialized = false;
    protected afterViewInitTriggered = false;

    protected topTabsElement: HTMLElement; // The container of the original tabs. It will include each tab's content.
    protected tabBarHeight;
    protected tabBarElement: HTMLElement; // Host element.
    protected tabsShown = true;
    protected resizeFunction;
    protected isDestroyed = false;
    protected isCurrentView = true;
    protected shouldSlideToInitial = false; // Whether we need to slide to the initial slide because it's out of view.
    protected hasSliddenToInitial = false; // Whether we've already slidden to the initial slide or there was no need.
    protected selectHistory = [];

    protected firstSelectedTab: number;
    protected unregisterBackButtonAction: any;
    protected languageChangedSubscription: Subscription;

    constructor(element: ElementRef, protected content: Content, protected domUtils: CoreDomUtilsProvider,
            protected appProvider: CoreAppProvider, platform: Platform, translate: TranslateService) {
        this.tabBarElement = element.nativeElement;

        this.direction = platform.isRTL ? 'rtl' : 'ltr';

        // Change the side when the language changes.
        this.languageChangedSubscription = translate.onLangChange.subscribe((event: any) => {
            setTimeout(() => {
                this.direction = platform.isRTL ? 'rtl' : 'ltr';
            });
        });
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.originalTabsContainer = this.originalTabsRef.nativeElement;
        this.topTabsElement = this.topTabs.nativeElement;
    }

    /**
     * View has been initialized.
     */
    ngAfterViewInit(): void {
        if (this.isDestroyed) {
            return;
        }

        this.afterViewInitTriggered = true;

        if (!this.initialized && this.hideUntil) {
            // Tabs should be shown, initialize them.
            this.initializeTabs();
        }

        this.resizeFunction = this.calculateSlides.bind(this);

        window.addEventListener('resize', this.resizeFunction);
    }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        // We need to wait for ngAfterViewInit because we need core-tab components to be executed.
        if (!this.initialized && this.hideUntil && this.afterViewInitTriggered) {
            // Tabs should be shown, initialize them.
            // Use a setTimeout so child core-tab update their inputs before initializing the tabs.
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

        this.registerBackButtonAction();
    }

    /**
     * Register back button action.
     */
    protected registerBackButtonAction(): void {
        this.unregisterBackButtonAction = this.appProvider.registerBackButtonAction(() => {
            // The previous page in history is not the last one, we need the previous one.
            if (this.selectHistory.length > 1) {
                const tab = this.selectHistory[this.selectHistory.length - 2];

                // Remove curent and previous tabs from history.
                this.selectHistory = this.selectHistory.filter((tabId) => {
                    return this.selected != tabId && tab != tabId;
                });

                this.selectTab(tab);

                return true;
            } else if (this.selected != this.firstSelectedTab) {
                // All history is gone but we are not in the first selected tab.
                this.selectHistory = [];

                this.selectTab(this.firstSelectedTab);

                return true;
            }

            return false;
        }, 750);
    }

    /**
     * User left the page that contains the component.
     */
    ionViewDidLeave(): void {
        // Unregister the custom back button action for this page
        this.unregisterBackButtonAction && this.unregisterBackButtonAction();

        this.isCurrentView = false;
    }

    /**
     * Add a new tab if it isn't already in the list of tabs.
     *
     * @param {CoreTabComponent} tab The tab to add.
     */
    addTab(tab: CoreTabComponent): void {
        // Check if tab is already in the list.
        if (this.getIndex(tab) == -1) {
            this.tabs.push(tab);
            this.sortTabs();

            this.calculateSlides();

            if (this.initialized && this.tabs.length > 1 && this.tabBarHeight == 0) {
                // Calculate the tabBarHeight again now that there is more than 1 tab and the bar will be seen.
                // Use timeout to wait for the view to be rendered. 0 ms should be enough, use 50 to be sure.
                setTimeout(() => {
                    this.calculateTabBarHeight();
                }, 50);
            }
        }
    }

    /**
     * Calculate slides.
     */
    calculateSlides(): void {
        if (!this.isCurrentView || !this.tabsShown || !this.initialized) {
            // Don't calculate if component isn't in current view, the calculations are wrong.
            return;
        }

        setTimeout(() => {
            this.calculateMaxSlides();
            this.updateSlides();
        });
    }

    /**
     * Calculate the tab bar height.
     */
    calculateTabBarHeight(): void {
        this.tabBarHeight = this.topTabsElement.offsetHeight;

        if (this.tabsShown) {
            // Smooth translation.
            this.topTabsElement.style.transform = 'translateY(-' + this.lastScroll + 'px)';
            this.originalTabsContainer.style.transform = 'translateY(-' + this.lastScroll + 'px)';
            this.originalTabsContainer.style.paddingBottom = this.tabBarHeight - this.lastScroll + 'px';
        } else {
            this.tabBarElement.classList.add('tabs-hidden');
        }
    }

    /**
     * Get the index of tab.
     *
     * @param  {any}    tab Tab object to check.
     * @return {number}     Index number on the tabs array or -1 if not found.
     */
    getIndex(tab: any): number {
        for (let i = 0; i < this.tabs.length; i++) {
            const t = this.tabs[i];
            if (t === tab || (typeof t.id != 'undefined' && t.id === tab.id)) {
                return i;
            }
        }

        return -1;
    }

    /**
     * Get the current selected tab.
     *
     * @return {CoreTabComponent} Selected tab.
     */
    getSelected(): CoreTabComponent {
        return this.tabs[this.selected];
    }

    /**
     * Initialize the tabs, determining the first tab to be shown.
     */
    protected initializeTabs(): void {
        let selectedIndex = this.selectedIndex || 0,
            selectedTab = this.tabs[selectedIndex];

        if (!selectedTab || !selectedTab.enabled || !selectedTab.show) {
            // The tab is not enabled or not shown. Get the first tab that is enabled.
            selectedTab = this.tabs.find((tab, index) => {
                if (tab.enabled && tab.show) {
                    selectedIndex = index;

                    return true;
                }

                return false;
            });
        }

        if (selectedTab) {
            this.firstSelectedTab = selectedIndex;
            this.selectTab(selectedIndex);
        }

        // Setup tab scrolling.
        this.calculateTabBarHeight();
        if (this.content) {
            if (!this.parentScrollable) {
                // Parent scroll element (if core-tabs is inside a ion-content).
                const scroll = this.content.getScrollElement();
                if (scroll) {
                    scroll.classList.add('no-scroll');
                }
            } else {
                this.originalTabsContainer.classList.add('no-scroll');
            }
        }

        this.initialized = true;

        // Check which arrows should be shown.
        this.calculateSlides();
    }

    /**
     * Method executed when the slides are changed.
     */
    slideChanged(): void {
        const currentIndex = this.slides.getActiveIndex();
        if (this.slidesShown >= this.numTabsShown) {
            this.showPrevButton = false;
            this.showNextButton = false;
        } else if (typeof currentIndex !== 'undefined') {
            this.showPrevButton = currentIndex > 0;
            this.showNextButton = currentIndex < this.numTabsShown - this.slidesShown;
        } else {
            this.showPrevButton = false;
            this.showNextButton = this.numTabsShown > this.slidesShown;
        }

        if (this.shouldSlideToInitial && currentIndex != this.selected) {
            // Current tab has changed, don't slide to initial anymore.
            this.shouldSlideToInitial = false;
        }

        this.updateAriaHidden(); // Sliding resets the aria-hidden, update it.
    }

    /**
     * Update slides.
     */
    protected updateSlides(): void {
        this.numTabsShown = this.tabs.reduce((prev: number, current: any) => {
            return current.show ? prev + 1 : prev;
        }, 0);

        this.slidesShown = Math.min(this.maxSlides, this.numTabsShown);

        this.slideChanged();

        setTimeout(() => {
            this.calculateTabBarHeight();
            this.slides.update();
            this.slides.resize();

            if (!this.hasSliddenToInitial && this.selected && this.selected >= this.slidesShown) {
                this.hasSliddenToInitial = true;
                this.shouldSlideToInitial = true;

                setTimeout(() => {
                    if (this.shouldSlideToInitial) {
                        this.slides.slideTo(this.selected, 0);
                        this.shouldSlideToInitial = false;
                        this.updateAriaHidden(); // Slide's slideTo() sets aria-hidden to true, update it.
                    }
                }, 400);

                return;
            } else if (this.selected) {
                this.hasSliddenToInitial = true;
            }

            setTimeout(() => {
                this.updateAriaHidden(); // Slide's update() sets aria-hidden to true, update it.
            }, 400);
        });
    }

    protected calculateMaxSlides(): void {
        if (this.slides) {
            const width = this.domUtils.getElementWidth(this.slides.getNativeElement()) || this.slides.renderedWidth;

            if (width) {
                this.maxSlides = Math.floor(width / 100);

                return;
            }
        }

        this.maxSlides = 3;
    }

    /**
     * Method that shows the next slide.
     */
    slideNext(): void {
        if (this.showNextButton) {
            this.slides.slideNext();
        }
    }

    /**
     * Method that shows the previous slide.
     */
    slidePrev(): void {
        if (this.showPrevButton) {
            this.slides.slidePrev();
        }
    }

    /**
     * Show or hide the tabs. This is used when the user is scrolling inside a tab.
     *
     * @param {any} scrollElement Scroll element to check scroll position.
     */
    showHideTabs(scrollElement: any): void {
        if (!this.tabBarHeight) {
            // We don't have the tab bar height, this means the tab bar isn't shown.
            return;
        }

        const scroll = parseInt(scrollElement.scrollTop, 10);
        if (scroll == this.lastScroll) {
            if (scroll == 0) {
                // Ensure tabbar is shown.
                this.topTabsElement.style.transform = '';
                this.originalTabsContainer.style.transform = '';
                this.originalTabsContainer.style.paddingBottom = this.tabBarHeight + 'px';
            }

            // Ensure scroll has been modified to avoid flicks.
            return;
        }

        if (this.tabsShown && scroll > this.tabBarHeight) {
            this.tabsShown = false;

            // Hide tabs.
            this.tabBarElement.classList.add('tabs-hidden');
        } else if (!this.tabsShown && scroll <= this.tabBarHeight) {
            this.tabsShown = true;
            this.tabBarElement.classList.remove('tabs-hidden');
            this.calculateSlides();
        }

        if (this.tabsShown) {
            // Smooth translation.
            this.topTabsElement.style.transform = 'translateY(-' + scroll + 'px)';
            this.originalTabsContainer.style.transform = 'translateY(-' + scroll + 'px)';
            this.originalTabsContainer.style.paddingBottom = this.tabBarHeight - scroll + 'px';
        }
        // Use lastScroll after moving the tabs to avoid flickering.
        this.lastScroll = parseInt(scrollElement.scrollTop, 10);
    }

    /**
     * Remove a tab from the list of tabs.
     *
     * @param {CoreTabComponent} tab The tab to remove.
     */
    removeTab(tab: CoreTabComponent): void {
        const index = this.getIndex(tab);
        this.tabs.splice(index, 1);

        this.calculateSlides();
    }

    /**
     * Select a certain tab.
     *
     * @param {number} index The index of the tab to select.
     */
    selectTab(index: number): void {
        if (index == this.selected) {
            // Already selected.
            return;
        }

        if (index < 0 || index >= this.tabs.length) {
            // Index isn't valid, select the first one.
            index = 0;
        }

        const currentTab = this.getSelected(),
            newTab = this.tabs[index];

        if (!newTab || !newTab.enabled || !newTab.show) {
            // The tab isn't enabled or shown, stop.
            return;
        }

        if (currentTab) {
            // Unselect previous selected tab.
            currentTab.unselectTab();
        }

        if (this.selected) {
            this.slides.slideTo(index);
            this.updateAriaHidden(); // Slide's slideTo() sets aria-hidden to true, update it.
        }

        this.selectHistory.push(index);
        this.selected = index;
        newTab.selectTab();
        this.ionChange.emit(newTab);
    }

    /**
     * Sort the tabs, keeping the same order as in the original list.
     */
    protected sortTabs(): void {
        if (this.originalTabsContainer) {
            const newTabs = [];

            this.tabs.forEach((tab, index) => {
                const originalIndex = Array.prototype.indexOf.call(this.originalTabsContainer.children, tab.element);
                if (originalIndex != -1) {
                    newTabs[originalIndex] = tab;
                }
            });

            this.tabs = newTabs;
        }
    }

    /**
     * Function to call when the visibility of a tab has changed.
     */
    tabVisibilityChanged(): void {
        this.calculateSlides();
    }

    /**
     * Update aria-hidden of all tabs.
     */
    protected updateAriaHidden(): void {
        this.tabs.forEach((tab, index) => {
            tab.updateAriaHidden();
        });
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;

        if (this.resizeFunction) {
            window.removeEventListener('resize', this.resizeFunction);
        }
    }
}
