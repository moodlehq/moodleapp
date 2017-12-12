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
import { IonicPage, NavController } from 'ionic-angular';
import { CoreEventsProvider } from '../../../../providers/events';
import { CoreSitesProvider } from '../../../../providers/sites';
import { CoreMainMenuProvider } from '../../providers/mainmenu';
import { CoreMainMenuDelegate, CoreMainMenuHandlerData } from '../../providers/delegate';

/**
 * Page that displays the main menu of the app.
 */
@IonicPage()
@Component({
    selector: 'page-core-mainmenu',
    templateUrl: 'menu.html',
})
export class CoreMainMenuPage implements OnDestroy {
    tabs: CoreMainMenuHandlerData[] = [];
    loaded: boolean;
    protected subscription;
    protected moreTabData = {
        page: 'CoreMainMenuMorePage',
        title: 'core.more',
        icon: 'more'
    };
    protected moreTabAdded = false;
    protected logoutObserver;

    constructor(private menuDelegate: CoreMainMenuDelegate, private sitesProvider: CoreSitesProvider,
            private navCtrl: NavController, eventsProvider: CoreEventsProvider) {

        // Go to sites page when user is logged out.
        this.logoutObserver = eventsProvider.on(CoreEventsProvider.LOGOUT, () => {
            this.navCtrl.setRoot('CoreLoginSitesPage');
        });
    }

    /**
     * View loaded.
     */
    ionViewDidLoad() {
        if (!this.sitesProvider.isLoggedIn()) {
            this.navCtrl.setRoot('CoreLoginSitesPage');
            return;
        }

        this.subscription = this.menuDelegate.getHandlers().subscribe((handlers) => {
            this.tabs = handlers.slice(0, CoreMainMenuProvider.NUM_MAIN_HANDLERS); // Get main handlers.

            // Check if handlers are already in tabs. Add the ones that aren't.
            // @todo: https://github.com/ionic-team/ionic/issues/13633
            for (let i in handlers) {
                let handler = handlers[i],
                    found = false;

                for (let j in this.tabs) {
                    let tab = this.tabs[j];
                    if (tab.title == handler.title && tab.icon == handler.icon) {
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    this.tabs.push(handler);
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
    ngOnDestroy() {
        this.subscription && this.subscription.unsubscribe();
        this.logoutObserver && this.logoutObserver.off();
    }
}
