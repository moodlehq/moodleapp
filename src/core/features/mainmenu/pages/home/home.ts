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

import { Component, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';

import { CoreSites } from '@services/sites';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreTabsOutletComponent, CoreTabsOutletTab } from '@components/tabs-outlet/tabs-outlet';
import { CoreMainMenuHomeDelegate, CoreMainMenuHomeHandlerToDisplay } from '../../services/home-delegate';

/**
 * Page that displays the Home.
 */
@Component({
    selector: 'page-core-mainmenu-home',
    templateUrl: 'home.html',
    styleUrls: ['home.scss'],
})
export class CoreMainMenuHomePage implements OnInit {

    @ViewChild(CoreTabsOutletComponent) tabsComponent?: CoreTabsOutletComponent;

    siteName!: string;
    tabs: CoreTabsOutletTab[] = [];
    loaded = false;
    selectedTab?: number;

    protected subscription?: Subscription;
    protected updateSiteObserver?: CoreEventObserver;

    /**
     * Initialize the component.
     */
    ngOnInit(): void {
        this.loadSiteName();

        this.subscription = CoreMainMenuHomeDelegate.instance.getHandlersObservable().subscribe((handlers) => {
            handlers && this.initHandlers(handlers);
        });

        // Refresh the enabled flags if site is updated.
        this.updateSiteObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, () => {
            this.loadSiteName();
        }, CoreSites.instance.getCurrentSiteId());
    }

    /**
     * Init handlers on change (size or handlers).
     */
    initHandlers(handlers: CoreMainMenuHomeHandlerToDisplay[]): void {
        // Re-build the list of tabs. If a handler is already in the list, use existing object to prevent re-creating the tab.
        const newTabs: CoreMainMenuHomeHandlerToDisplay[] = handlers.map((handler) => {
            handler.page = '/main/home/' + handler.page;

            // Check if the handler is already in the tabs list. If so, use it.
            const tab = this.tabs.find((tab) => tab.title == handler.title);

            return tab || handler;
        });

        // Sort them by priority so new handlers are in the right position.
        newTabs.sort((a, b) => (b.priority || 0) - (a.priority || 0));

        if (typeof this.selectedTab == 'undefined' && newTabs.length > 0) {
            let maxPriority = 0;
            let maxIndex = 0;

            newTabs.forEach((tab, index) => {
                if ((tab.selectPriority || 0) > maxPriority) {
                    maxPriority = tab.selectPriority || 0;
                    maxIndex = index;
                }
            });

            this.selectedTab = maxIndex;
        }

        this.tabs = newTabs;

        this.loaded = CoreMainMenuHomeDelegate.instance.areHandlersLoaded();
    }

    /**
     * Load the site name.
     */
    protected loadSiteName(): void {
        this.siteName = CoreSites.instance.getCurrentSite()!.getSiteName();
    }

    /**
     * User entered the page.
     */
    ionViewDidEnter(): void {
        this.tabsComponent?.ionViewDidEnter();
    }

    /**
     * User left the page.
     */
    ionViewDidLeave(): void {
        this.tabsComponent?.ionViewDidLeave();
    }

}
