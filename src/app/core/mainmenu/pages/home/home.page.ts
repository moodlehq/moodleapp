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

import { CoreSites } from '@services/sites';
import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { CoreHomeDelegate, CoreHomeHandlerToDisplay } from '../../services/home.delegate';

/**
 * Page that displays the Home.
 */
@Component({
    selector: 'page-core-home',
    templateUrl: 'home.html',
    styleUrls: ['home.scss'],
})
export class CoreHomePage implements OnInit {

    siteName!: string;
    tabs: CoreHomeHandlerToDisplay[] = [];
    loaded = false;
    selectedTab?: number;

    protected subscription?: Subscription;

    constructor(
        protected homeDelegate: CoreHomeDelegate,
    ) {
        this.loadSiteName();
    }

    /**
     * Initialize the component.
     */
    ngOnInit(): void {
        this.subscription = this.homeDelegate.getHandlers().subscribe((handlers) => {
            handlers && this.initHandlers(handlers);
        });
    }

    /**
     * Init handlers on change (size or handlers).
     */
    initHandlers(handlers: CoreHomeHandlerToDisplay[]): void {
        // Re-build the list of tabs. If a handler is already in the list, use existing object to prevent re-creating the tab.
        const newTabs: CoreHomeHandlerToDisplay[] = handlers.map((handler) => {
            // Check if the handler is already in the tabs list. If so, use it.
            const tab = this.tabs.find((tab) => tab.title == handler.title);

            return tab || handler;
        })
        // Sort them by priority so new handlers are in the right position.
            .sort((a, b) => (b.priority || 0) - (a.priority || 0));

        if (typeof this.selectedTab == 'undefined') {
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

        this.loaded = this.homeDelegate.areHandlersLoaded();
    }

    /**
     * Load the site name.
     */
    protected loadSiteName(): void {
        this.siteName = CoreSites.instance.getCurrentSite()!.getSiteName();
    }

}
