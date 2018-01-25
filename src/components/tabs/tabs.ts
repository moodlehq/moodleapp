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

import { Component, Input, Output, EventEmitter, OnInit, OnChanges, AfterViewInit, ViewChild, ElementRef,
    SimpleChange } from '@angular/core';
import { CoreTabComponent } from './tab';
import { Content } from 'ionic-angular';

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
    templateUrl: 'tabs.html'
})
export class CoreTabsComponent implements OnInit, AfterViewInit, OnChanges {
    @Input() selectedIndex?: number = 0; // Index of the tab to select.
    @Input() hideUntil: boolean; // Determine when should the contents be shown.
    @Output() ionChange: EventEmitter<CoreTabComponent> = new EventEmitter<CoreTabComponent>(); // Emitted when the tab changes.
    @ViewChild('originalTabs') originalTabsRef: ElementRef;
    @ViewChild('topTabs') topTabs: ElementRef;

    tabs: CoreTabComponent[] = []; // List of tabs.
    selected: number; // Selected tab number.
    protected originalTabsContainer: HTMLElement; // The container of the original tabs. It will include each tab's content.
    protected initialized = false;
    protected afterViewInitTriggered = false;

    protected topTabsElement: HTMLElement; // The container of the original tabs. It will include each tab's content.
    protected tabBarHeight;
    protected tabBarElement: HTMLElement; // Host element.
    protected tabsShown = true;
    protected scroll: HTMLElement; // Parent scroll element (if core-tabs is inside a ion-content).

    constructor(element: ElementRef, content: Content) {
        this.tabBarElement = element.nativeElement;
        setTimeout(() => {
            if (content) {
                this.scroll = content.getScrollElement();
            }
        }, 1);
    }

    /**
     * Component being initialized.
     */
    ngOnInit() {
        this.originalTabsContainer = this.originalTabsRef.nativeElement;
        this.topTabsElement = this.topTabs.nativeElement;
    }

    /**
     * View has been initialized.
     */
    ngAfterViewInit() {
        this.afterViewInitTriggered = true;
        if (!this.initialized && this.hideUntil) {
            // Tabs should be shown, initialize them.
            this.initializeTabs();
        }
    }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(changes: {[name: string]: SimpleChange}) {
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
     * Add a new tab if it isn't already in the list of tabs.
     *
     * @param {CoreTabComponent} tab The tab to add.
     */
    addTab(tab: CoreTabComponent) : void {
        // Check if tab is already in the list.
        if (this.getIndex(tab) == -1) {
            this.tabs.push(tab);
            this.sortTabs();
        }
    }

    /**
     * Get the index of tab.
     *
     * @param  {any}    tab [description]
     * @return {number}     [description]
     */
    getIndex(tab: any) : number {
        for (let i = 0; i < this.tabs.length; i++) {
            let t = this.tabs[i];
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
    getSelected() : CoreTabComponent {
        return this.tabs[this.selected];
    }

    /**
     * Initialize the tabs, determining the first tab to be shown.
     */
    protected initializeTabs() : void {
        let selectedIndex = this.selectedIndex || 0,
            selectedTab = this.tabs[selectedIndex];

        if (!selectedTab.enabled || !selectedTab.show) {
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
            this.selectTab(selectedIndex);
        }

        // Setup tab scrolling.
        this.tabBarHeight = this.topTabsElement.offsetHeight;
        this.originalTabsContainer.style.paddingBottom = this.tabBarHeight  + 'px';
        if (this.scroll) {
            this.scroll.classList.add('no-scroll');
        }

        this.initialized = true;
    }

    /**
     * Show or hide the tabs. This is used when the user is scrolling inside a tab.
     *
     * @param {any} e Scroll event.
     */
    showHideTabs(e: any) : void {
        if (e.target.scrollTop < this.tabBarHeight) {
            if (!this.tabsShown) {
                this.tabBarElement.classList.remove('tabs-hidden');
                this.tabsShown = true;
            }
        } else {
            if (this.tabsShown) {
                this.tabBarElement.classList.add('tabs-hidden');
                this.tabsShown = false;
            }
        }
    }

    /**
     * Remove a tab from the list of tabs.
     *
     * @param {CoreTabComponent} tab The tab to remove.
     */
    removeTab(tab: CoreTabComponent) : void {
        const index = this.getIndex(tab);
        this.tabs.splice(index, 1);
    }

    /**
     * Select a certain tab.
     *
     * @param {number} index The index of the tab to select.
     */
    selectTab(index: number) : void {
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

        if (!newTab.enabled || !newTab.show) {
            // The tab isn't enabled or shown, stop.
            return;
        }

        if (currentTab) {
            // Unselect previous selected tab.
            currentTab.unselectTab();
        }

        this.selected = index;
        newTab.selectTab();
        this.ionChange.emit(newTab);
    }

    /**
     * Sort the tabs, keeping the same order as in the original list.
     */
    protected sortTabs() {
        if (this.originalTabsContainer) {
            let newTabs = [],
                newSelected;

            this.tabs.forEach((tab, index) => {
                let originalIndex = Array.prototype.indexOf.call(this.originalTabsContainer.children, tab.element);
                if (originalIndex != -1) {
                    newTabs[originalIndex] = tab;
                    if (this.selected == index) {
                        newSelected = originalIndex;
                    }
                }
            });

            this.tabs = newTabs;
        }
    }
}
