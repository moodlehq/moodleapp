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

import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavParams, Platform } from 'ionic-angular';
import { CoreSettingsDelegate, CoreSettingsHandlerData } from '../../providers/delegate';
import { CoreSite } from '@classes/site';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider, CoreSiteBasicInfo } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreSettingsHelper, CoreSiteSpaceUsage } from '../../providers/helper';

/**
 * Page that displays the list of site settings pages.
 */
@IonicPage({segment: 'core-settings-site'})
@Component({
    selector: 'page-core-settings-site',
    templateUrl: 'site.html',
})
export class CoreSiteSettingsPage {
    @ViewChild(CoreSplitViewComponent) splitviewCtrl: CoreSplitViewComponent;

    handlers: CoreSettingsHandlerData[];
    isIOS: boolean;
    selectedPage: string;
    currentSite: CoreSite;
    siteInfo: CoreSiteBasicInfo[] = [];
    siteName: string;
    siteUrl: string;
    spaceUsage: CoreSiteSpaceUsage = {
        cacheEntries: 0,
        spaceUsage: 0
    };
    loaded = false;
     protected sitesObserver: any;
    protected isDestroyed = false;

    constructor(protected settingsDelegate: CoreSettingsDelegate,
            protected settingsHelper: CoreSettingsHelper,
            protected sitesProvider: CoreSitesProvider,
            protected domUtils: CoreDomUtilsProvider,
            protected eventsProvider: CoreEventsProvider,
            platorm: Platform,
            navParams: NavParams) {

        this.isIOS = platorm.is('ios');

        this.selectedPage = navParams.get('page') || false;

        this.sitesObserver = this.eventsProvider.on(CoreEventsProvider.SITE_UPDATED, (data) => {
            if (data.siteId == this.currentSite.id) {
                this.refreshData();
            }
        });
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.fetchData().finally(() => {
            this.loaded = true;
        });

        if (this.selectedPage) {
            this.openHandler(this.selectedPage);
        }
    }

    /**
     * Fetch Data.
     */
    protected async fetchData(): Promise<void[]> {
        const promises = [];

        this.handlers = this.settingsDelegate.getHandlers();
        this.currentSite = this.sitesProvider.getCurrentSite();
        this.siteInfo = this.currentSite.getInfo();
        this.siteName = this.currentSite.getSiteName();
        this.siteUrl = this.currentSite.getURL();

        promises.push(this.settingsHelper.getSiteSpaceUsage(this.sitesProvider.getCurrentSiteId()).then((spaceUsage) => {
            this.spaceUsage = spaceUsage;
        }));

        return Promise.all(promises);
    }

    /**
     * Syncrhonizes the site.
     */
    synchronize(siteId: string): void {
        // Using syncOnlyOnWifi false to force manual sync.
        this.settingsHelper.synchronizeSite(false, this.currentSite.id).catch((error) => {
            if (this.isDestroyed) {
                return;
            }
            this.domUtils.showErrorModalDefault(error, 'core.settings.errorsyncsite', true);
        });
    }

    /**
     * Returns true if site is beeing synchronized.
     *
     * @return True if site is beeing synchronized, false otherwise.
     */
    isSynchronizing(): boolean {
        return this.currentSite && !!this.settingsHelper.getSiteSyncPromise(this.currentSite.id);
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     */
    refreshData(refresher?: any): void {
        this.fetchData().finally(() => {
            refresher && refresher.complete();
        });
    }

    /**
     * Deletes files of a site and the tables that can be cleared.
     *
     * @param siteData Site object with space usage.
     */
    deleteSiteStorage(): void {
        this.settingsHelper.deleteSiteStorage(this.currentSite.getSiteName(), this.currentSite.getId()).then((newInfo) => {
            this.spaceUsage = newInfo;
        }).catch(() => {
            // Ignore cancelled confirmation modal.
        });
    }

    /**
     * Open a handler.
     *
     * @param page Page to open.
     * @param params Params of the page to open.
     */
    openHandler(page: string, params?: any): void {
        this.selectedPage = page;
        this.splitviewCtrl.push(page, params);
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.sitesObserver && this.sitesObserver.off();
    }
}
