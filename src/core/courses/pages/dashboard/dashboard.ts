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
import { IonicPage, NavController } from 'ionic-angular';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreCoursesProvider } from '../../providers/courses';
import { CoreSiteHomeProvider } from '@core/sitehome/providers/sitehome';
import { AddonBlockMyOverviewComponent } from '@addon/block/myoverview/component/myoverview';
import { AddonBlockTimelineComponent } from '@addon/block/timeline/components/timeline/timeline';
import { CoreTabsComponent } from '@components/tabs/tabs';
import { CoreSiteHomeIndexComponent } from '@core/sitehome/components/index/index';

/**
 * Page that displays the dashboard.
 */
@IonicPage({ segment: 'core-courses-dashboard' })
@Component({
    selector: 'page-core-courses-dashboard',
    templateUrl: 'dashboard.html',
})
export class CoreCoursesDashboardPage implements OnDestroy {
    @ViewChild(CoreTabsComponent) tabsComponent: CoreTabsComponent;
    @ViewChild(CoreSiteHomeIndexComponent) siteHomeComponent: CoreSiteHomeIndexComponent;
    @ViewChild(AddonBlockMyOverviewComponent) blockMyOverview: AddonBlockMyOverviewComponent;
    @ViewChild(AddonBlockTimelineComponent) blockTimeline: AddonBlockTimelineComponent;

    firstSelectedTab: number;
    siteHomeEnabled: boolean;
    tabsReady = false;
    tabShown = 'courses';
    searchEnabled: boolean;
    tabs = [];
    siteName: string;

    protected isDestroyed;
    protected updateSiteObserver;
    protected courseIds = '';

    constructor(private navCtrl: NavController, private coursesProvider: CoreCoursesProvider,
            private sitesProvider: CoreSitesProvider, private siteHomeProvider: CoreSiteHomeProvider,
            private eventsProvider: CoreEventsProvider) {
        this.loadSiteName();
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.searchEnabled = !this.coursesProvider.isSearchCoursesDisabledInSite();

        // Refresh the enabled flags if site is updated.
        this.updateSiteObserver = this.eventsProvider.on(CoreEventsProvider.SITE_UPDATED, () => {
            this.searchEnabled = !this.coursesProvider.isSearchCoursesDisabledInSite();
            this.loadSiteName();
        });

        // Decide which tab to load first.
        this.siteHomeProvider.isAvailable().then((enabled) => {
            const site = this.sitesProvider.getCurrentSite(),
                displaySiteHome = site.getInfo() && site.getInfo().userhomepage === 0;

            this.siteHomeEnabled = enabled;
            this.firstSelectedTab = displaySiteHome ? 0 : 1;
            this.tabsReady = true;
        });
    }

    /**
     * User entered the page.
     */
    ionViewDidEnter(): void {
        this.tabsComponent && this.tabsComponent.ionViewDidEnter();
    }

    /**
     * User left the page.
     */
    ionViewDidLeave(): void {
        this.tabsComponent && this.tabsComponent.ionViewDidLeave();
    }

    /**
     * The tab has changed.
     *
     * @param {string} tab Name of the new tab.
     */
    tabChanged(tab: string): void {
        this.tabShown = tab;
    }

    /**
     * Go to search courses.
     */
    openSearch(): void {
        this.navCtrl.push('CoreCoursesSearchPage');
    }

    /**
     * Load the site name.
     */
    protected loadSiteName(): void {
        this.siteName = this.sitesProvider.getCurrentSite().getInfo().sitename;
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.updateSiteObserver && this.updateSiteObserver.off();
    }
}
