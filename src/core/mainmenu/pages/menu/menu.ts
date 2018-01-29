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

import { Component, OnDestroy, ViewChild } from '@angular/core';
import { IonicPage, NavController, NavParams, Tabs } from 'ionic-angular';
import { CoreEventsProvider } from '../../../../providers/events';
import { CoreSitesProvider } from '../../../../providers/sites';
import { CoreMainMenuProvider } from '../../providers/mainmenu';
import { CoreMainMenuDelegate, CoreMainMenuHandlerData } from '../../providers/delegate';

/**
 * Page that displays the main menu of the app.
 */
@IonicPage({segment: 'core-mainmenu'})
@Component({
    selector: 'page-core-mainmenu',
    templateUrl: 'menu.html',
})
export class CoreMainMenuPage implements OnDestroy {
    // Use a setter to wait for ion-tabs to be loaded because it's inside a ngIf.
    @ViewChild('mainTabs') set mainTabs(ionTabs: Tabs) {
        if (ionTabs && this.redirectPage && !this.redirectPageLoaded) {
            // Tabs ready and there is a redirect page set. Load it.
            this.redirectPageLoaded = true;

            // Check if the page is the root page of any of the tabs.
            let indexToSelect = 0;
            for (let i = 0; i < this.tabs.length; i++) {
                if (this.tabs[i].page == this.redirectPage) {
                    indexToSelect = i + 1;
                    break;
                }
            }

            // Use a setTimeout, otherwise loading the first tab opens a new state for some reason.
            setTimeout(() => {
                ionTabs.select(indexToSelect);
            });
        }
    }

    tabs: CoreMainMenuHandlerData[] = [];
    loaded: boolean;
    redirectPage: string;
    redirectParams: any;
    initialTab: number;

    protected subscription;
    protected moreTabData = {
        page: 'CoreMainMenuMorePage',
        title: 'core.more',
        icon: 'more'
    };
    protected moreTabAdded = false;
    protected redirectPageLoaded = false;

    constructor(private menuDelegate: CoreMainMenuDelegate, private sitesProvider: CoreSitesProvider, navParams: NavParams,
            private navCtrl: NavController, eventsProvider: CoreEventsProvider) {
        this.redirectPage = navParams.get('redirectPage');
        this.redirectParams = navParams.get('redirectParams');
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        if (!this.sitesProvider.isLoggedIn()) {
            this.navCtrl.setRoot('CoreLoginSitesPage');

            return;
        }

        const site = this.sitesProvider.getCurrentSite(),
            displaySiteHome = site.getInfo() && site.getInfo().userhomepage === 0;

        this.subscription = this.menuDelegate.getHandlers().subscribe((handlers) => {
            handlers = handlers.slice(0, CoreMainMenuProvider.NUM_MAIN_HANDLERS); // Get main handlers.

            // Check if handlers are already in tabs. Add the ones that aren't.
            // @todo: https://github.com/ionic-team/ionic/issues/13633
            for (let i = 0; i < handlers.length; i++) {
                const handler = handlers[i],
                    shouldSelect = (displaySiteHome && handler.name == 'CoreSiteHome') ||
                                   (!displaySiteHome && handler.name == 'CoreCourses');
                let found = false;

                for (let j = 0; j < this.tabs.length; j++) {
                    const tab = this.tabs[j];
                    if (tab.title == handler.title && tab.icon == handler.icon) {
                        found = true;
                        if (shouldSelect) {
                            this.initialTab = j;
                        }
                        break;
                    }
                }

                if (!found) {
                    this.tabs.push(handler);
                    if (shouldSelect) {
                        this.initialTab = this.tabs.length;
                    }
                }
            }

            if (!this.moreTabAdded) {
                this.moreTabAdded = true;
                this.tabs.push(this.moreTabData); // Add "More" tab.
            }

            this.loaded = this.menuDelegate.areHandlersLoaded();
        });
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.subscription && this.subscription.unsubscribe();
    }
}
