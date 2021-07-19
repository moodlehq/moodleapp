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
    AfterViewInit,
    ViewChild,
    ElementRef,
} from '@angular/core';

import { CoreTabsBaseComponent } from '@classes/tabs';
import { CoreTabComponent } from './tab';

/**
 * This component displays some top scrollable tabs that will autohide on vertical scroll.
 * Unlike core-tabs-outlet, this component does NOT use Angular router.
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
 */
@Component({
    selector: 'core-tabs',
    templateUrl: 'core-tabs.html',
    styleUrls: ['tabs.scss'],
})
export class CoreTabsComponent extends CoreTabsBaseComponent<CoreTabComponent> implements AfterViewInit {

    @Input() parentScrollable = false; // Determine if the scroll should be in the parent content or the tab itself.
    @Input() layout: 'icon-top' | 'icon-start' | 'icon-end' | 'icon-bottom' | 'icon-hide' | 'label-hide' = 'icon-hide';

    @ViewChild('originalTabs') originalTabsRef?: ElementRef;

    protected originalTabsContainer?: HTMLElement; // The container of the original tabs. It will include each tab's content.

    constructor(
        element: ElementRef,
    ) {
        super(element);
    }

    /**
     * View has been initialized.
     */
    async ngAfterViewInit(): Promise<void> {
        super.ngAfterViewInit();

        if (this.isDestroyed) {
            return;
        }

        this.tabsElement = this.element.nativeElement;
        this.originalTabsContainer = this.originalTabsRef?.nativeElement;
    }

    /**
     * Initialize the tabs, determining the first tab to be shown.
     */
    protected async initializeTabs(): Promise<void> {
        await super.initializeTabs();

        // @todo: Is this still needed?
        // if (this.content) {
        //     if (!this.parentScrollable) {
        //         // Parent scroll element (if core-tabs is inside a ion-content).
        //         const scroll = await this.content.getScrollElement();
        //         if (scroll) {
        //             scroll.classList.add('no-scroll');
        //         }
        //     } else {
        //         this.originalTabsContainer?.classList.add('no-scroll');
        //     }
        // }
    }

    /**
     * Add a new tab if it isn't already in the list of tabs.
     *
     * @param tab The tab to add.
     */
    addTab(tab: CoreTabComponent): void {
        // Check if tab is already in the list.
        if (this.getTabIndex(tab.id!) == -1) {
            this.tabs.push(tab);
            this.sortTabs();

            setTimeout(() => {
                this.calculateSlides();
            });

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
     * Remove a tab from the list of tabs.
     *
     * @param tab The tab to remove.
     */
    removeTab(tab: CoreTabComponent): void {
        const index = this.getTabIndex(tab.id!);
        this.tabs.splice(index, 1);

        this.calculateSlides();
    }

    /**
     * Load the tab.
     *
     * @param tabToSelect Tab to load.
     * @return Promise resolved with true if tab is successfully loaded.
     */
    protected async loadTab(tabToSelect: CoreTabComponent): Promise<boolean> {
        const currentTab = this.getSelected();
        currentTab?.unselectTab();
        tabToSelect.selectTab();

        return true;
    }

    /**
     * Sort the tabs, keeping the same order as in the original list.
     */
    protected sortTabs(): void {
        if (!this.originalTabsContainer) {
            return;
        }

        const newTabs: CoreTabComponent[] = [];

        this.tabs.forEach((tab) => {
            const originalIndex = Array.prototype.indexOf.call(this.originalTabsContainer?.children, tab.element);
            if (originalIndex != -1) {
                newTabs[originalIndex] = tab;
            }
        });

        this.tabs = newTabs;
    }

    /**
     * Function to call when the visibility of a tab has changed.
     */
    tabVisibilityChanged(): void {
        this.calculateSlides();
    }

}
