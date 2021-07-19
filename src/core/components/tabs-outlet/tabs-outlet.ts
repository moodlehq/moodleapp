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
    OnInit,
    OnChanges,
    OnDestroy,
    AfterViewInit,
    ViewChild,
    ElementRef,
    SimpleChange,
} from '@angular/core';
import { IonTabs, ViewDidEnter, ViewDidLeave } from '@ionic/angular';
import { Subscription } from 'rxjs';

import { CoreUtils } from '@services/utils/utils';
import { Params } from '@angular/router';
import { CoreNavBarButtonsComponent } from '../navbar-buttons/navbar-buttons';
import { CoreDomUtils } from '@services/utils/dom';
import { StackEvent } from '@ionic/angular/directives/navigation/stack-utils';
import { CoreNavigator } from '@services/navigator';
import { CoreTabBase, CoreTabsBaseComponent } from '@classes/tabs';

/**
 * This component displays some top scrollable tabs that will autohide on vertical scroll.
 * Each tab will load a page using Angular router.
 *
 * Example usage:
 *
 * <core-tabs-outlet selectedIndex="1" [tabs]="tabs"></core-tabs-outlet>
 *
 * Tab contents will only be shown if that tab is selected.
 *
 * @todo: Test RTL and tab history.
 * @todo: This should behave like the split-view in relation to routing (maybe we could reuse some code from
 *  CorePageItemsListManager).
 */
@Component({
    selector: 'core-tabs-outlet',
    templateUrl: 'core-tabs-outlet.html',
    styleUrls: ['../tabs/tabs.scss'],
})
export class CoreTabsOutletComponent extends CoreTabsBaseComponent<CoreTabsOutletTab>
    implements OnInit, AfterViewInit, OnChanges, OnDestroy {

    /**
     * Determine tabs layout.
     */
    @Input() layout: 'icon-top' | 'icon-start' | 'icon-end' | 'icon-bottom' | 'icon-hide' | 'label-hide' = 'icon-hide';
    @Input() tabs: CoreTabsOutletTab[] = [];

    @ViewChild(IonTabs) protected ionTabs?: IonTabs;

    protected stackEventsSubscription?: Subscription;
    protected outletActivatedSubscription?: Subscription;
    protected lastActiveComponent?: Partial<ViewDidLeave>;
    protected existsInNavigationStack = false;

    constructor(element: ElementRef) {
        super(element);
    }

    /**
     * Init tab info.
     *
     * @param tab Tab.
     */
    protected initTab(tab: CoreTabsOutletTab): void {
        tab.id = tab.id || 'core-tab-outlet-' + CoreUtils.getUniqueId('CoreTabsOutletComponent');
        if (typeof tab.enabled == 'undefined') {
            tab.enabled = true;
        }
    }

    /**
     * View has been initialized.
     */
    async ngAfterViewInit(): Promise<void> {
        super.ngAfterViewInit();

        if (this.isDestroyed) {
            return;
        }

        this.tabsElement = this.element.nativeElement.querySelector('ion-tabs');
        this.stackEventsSubscription = this.ionTabs?.outlet.stackEvents.subscribe(async (stackEvent: StackEvent) => {
            if (!this.isCurrentView) {
                return;
            }

            this.showHideNavBarButtons(stackEvent.enteringView.element.tagName);

            await this.listenContentScroll(stackEvent.enteringView.element, stackEvent.enteringView.id);

            const scrollElement = this.scrollElements[stackEvent.enteringView.id];
            if (scrollElement) {
                // Show or hide tabs based on the new page scroll.
                this.showHideTabs(scrollElement.scrollTop, scrollElement);
            }
        });
        this.outletActivatedSubscription = this.ionTabs?.outlet.activateEvents.subscribe(() => {
            this.lastActiveComponent = this.ionTabs?.outlet.component;
        });
    }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(changes: Record<string, SimpleChange>): void {
        if (changes.tabs) {
            this.tabs.forEach((tab) => {
                this.initTab(tab);
            });

            this.calculateSlides();
        }

        super.ngOnChanges(changes);
    }

    /**
     * @inheritdoc
     */
    ionViewDidEnter(): void {
        super.ionViewDidEnter();

        // The `ionViewDidEnter` method is not called on nested outlets unless the parent page is leaving the navigation stack,
        // that's why we need to call it manually if the page that is entering already existed in the stack (meaning that it is
        // entering in response to a back navigation from the page on top).
        if (this.existsInNavigationStack && this.ionTabs?.outlet.isActivated) {
            (this.ionTabs?.outlet.component as Partial<ViewDidEnter>).ionViewDidEnter?.();
        }

        // After the view has entered for the first time, we can assume that it'll always be in the navigation stack
        // until it's destroyed.
        this.existsInNavigationStack = true;
    }

    /**
     * @inheritdoc
     */
    ionViewDidLeave(): void {
        super.ionViewDidLeave();

        // The `ionViewDidLeave` method is not called on nested outlets unless the active view changes, that's why
        // we need to call it manually if the page is leaving and the last active component was not notified.
        this.lastActiveComponent?.ionViewDidLeave?.();
    }

    /**
     * Load the tab.
     *
     * @param tabToSelect Tab to load.
     * @return Promise resolved with true if tab is successfully loaded.
     */
    protected async loadTab(tabToSelect: CoreTabsOutletTab): Promise<boolean> {
        return CoreNavigator.navigate(tabToSelect.page, {
            params: tabToSelect.pageParams,
        });
    }

    /**
     * Get all child core-navbar-buttons and show or hide depending on the page state.
     * We need to use querySelectorAll because ContentChildren doesn't work with ng-template.
     * https://github.com/angular/angular/issues/14842
     *
     * @param activatedPageName Activated page name.
     */
    protected showHideNavBarButtons(activatedPageName: string): void {
        const elements = this.ionTabs!.outlet.nativeEl.querySelectorAll('core-navbar-buttons');
        const domUtils = CoreDomUtils.instance;
        elements.forEach((element) => {
            const instance = domUtils.getInstanceByElement<CoreNavBarButtonsComponent>(element);

            if (instance) {
                const pagetagName = element.closest('.ion-page')?.tagName;
                instance.forceHide(activatedPageName != pagetagName);
            }
        });
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        super.ngOnDestroy();
        this.stackEventsSubscription?.unsubscribe();
        this.outletActivatedSubscription?.unsubscribe();
        this.existsInNavigationStack = false;
    }

}

/**
 * Tab to be displayed in CoreTabsOutlet.
 */
export type CoreTabsOutletTab = CoreTabBase & {
    page: string; // Page to navigate to.
    pageParams?: Params; // Page params.
};
