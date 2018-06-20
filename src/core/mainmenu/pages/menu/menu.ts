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

import { Component, OnDestroy } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { CoreSitesProvider } from '@providers/sites';
import { CoreMainMenuProvider } from '../../providers/mainmenu';
import { CoreMainMenuDelegate, CoreMainMenuHandlerToDisplay } from '../../providers/delegate';

/**
 * Page that displays the main menu of the app.
 */
@IonicPage({segment: 'core-mainmenu'})
@Component({
    selector: 'page-core-mainmenu',
    templateUrl: 'menu.html',
})
export class CoreMainMenuPage implements OnDestroy {
    tabs: CoreMainMenuHandlerToDisplay[] = [];
    loaded = false;
    redirectPage: string;
    redirectParams: any;
    initialTab: number;
    showTabs = false;

    protected subscription;
    protected redirectPageLoaded = false;

    constructor(private menuDelegate: CoreMainMenuDelegate, private sitesProvider: CoreSitesProvider, navParams: NavParams,
            private navCtrl: NavController) {
        this.redirectPage = navParams.get('redirectPage');
        this.redirectParams = navParams.get('redirectParams');
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        if (!this.sitesProvider.isLoggedIn()) {
            this.navCtrl.setRoot('CoreLoginInitPage');

            return;
        }

        this.showTabs = true;

        const site = this.sitesProvider.getCurrentSite(),
            displaySiteHome = site.getInfo() && site.getInfo().userhomepage === 0;

        this.subscription = this.menuDelegate.getHandlers().subscribe((handlers) => {
            handlers = handlers.slice(0, CoreMainMenuProvider.NUM_MAIN_HANDLERS); // Get main handlers.

            // Re-build the list of tabs. If a handler is already in the list, use existing object to prevent re-creating the tab.
            const newTabs = [];

            for (let i = 0; i < handlers.length; i++) {
                const handler = handlers[i];

                // Check if the handler is already in the tabs list. If so, use it.
                const tab = this.tabs.find((tab) => {
                    return tab.title == handler.title && tab.icon == handler.icon;
                });

                newTabs.push(tab || handler);
            }

            this.tabs = newTabs;

            // Sort them by priority so new handlers are in the right position.
            this.tabs.sort((a, b) => {
                return b.priority - a.priority;
            });

            if (typeof this.initialTab == 'undefined' && !this.loaded) {
                // Calculate the tab to load.
                if (this.redirectPage) {
                    // Check if the redirect page is the root page of any of the tabs.
                    this.initialTab = 0;

                    for (let i = 0; i < this.tabs.length; i++) {
                        const tab = this.tabs[i];
                        if (tab.page == this.redirectPage) {
                            this.initialTab = i + 1;
                            tab.pageParams = Object.assign(tab.pageParams || {}, this.redirectParams);
                            break;
                        }
                    }
                } else {
                    // By default, course overview will be loaded (3.3+). Check if we need to select Site Home or My Courses.
                    for (let i = 0; i < this.tabs.length; i++) {
                        const handler = handlers[i];
                        if ((displaySiteHome && handler.name == 'CoreSiteHome') ||
                                (!displaySiteHome && handler.name == 'CoreCourses')) {
                            this.initialTab = i;
                            break;
                        }
                    }
                }
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
