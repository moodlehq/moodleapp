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

import { Component, } from '@angular/core';
import { IonicPage } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreSitesProvider, CoreSiteBasicInfo } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreSettingsHelper, CoreSiteSpaceUsage } from '../../providers/helper';

/**
 * Page that displays the space usage settings.
 */
@IonicPage({segment: 'core-settings-space-usage'})
@Component({
    selector: 'page-core-settings-space-usage',
    templateUrl: 'space-usage.html',
})
export class CoreSettingsSpaceUsagePage {

    loaded = false;
    sites = [];
    currentSiteId = '';
    totals: CoreSiteSpaceUsage = {
        cacheEntries: 0,
        spaceUsage: 0
    };

    constructor(protected sitesProvider: CoreSitesProvider,
            protected settingsHelper: CoreSettingsHelper,
            protected domUtils: CoreDomUtilsProvider,
            protected translate: TranslateService,
    ) {
        this.currentSiteId = this.sitesProvider.getCurrentSiteId();
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.loadSiteData().finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Convenience function to load site data/usage and calculate the totals.
     *
     * @return Resolved when done.
     */
    protected async loadSiteData(): Promise<void> {
        // Calculate total usage.
        let totalSize = 0;
        let totalEntries = 0;

        this.sites = await this.sitesProvider.getSortedSites();

        // Get space usage.
        await Promise.all(this.sites.map(async (site) => {
            const siteInfo = await this.settingsHelper.getSiteSpaceUsage(site.id);

            site.cacheEntries = siteInfo.cacheEntries;
            site.spaceUsage = siteInfo.spaceUsage;

            totalSize += (site.spaceUsage ? parseInt(site.spaceUsage, 10) : 0);
            totalEntries += (site.cacheEntries ? parseInt(site.cacheEntries, 10) : 0);
        }));

        this.totals.spaceUsage = totalSize;
        this.totals.cacheEntries = totalEntries;
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     */
    refreshData(refresher: any): void {
        this.loadSiteData().finally(() => {
            refresher.complete();
        });
    }

    /**
     * Deletes files of a site and the tables that can be cleared.
     *
     * @param siteData Site object with space usage.
     */
    deleteSiteStorage(siteData: CoreSiteBasicInfoWithUsage): void {
        this.settingsHelper.deleteSiteStorage(siteData.siteName, siteData.id).then((newInfo) => {
            this.totals.spaceUsage -= siteData.spaceUsage - newInfo.spaceUsage;
            this.totals.spaceUsage -= siteData.cacheEntries - newInfo.cacheEntries;
            siteData.spaceUsage = newInfo.spaceUsage;
            siteData.cacheEntries = newInfo.cacheEntries;
        }).catch(() => {
            // Ignore cancelled confirmation modal.
        });
    }

    /**
     * Show information about space usage actions.
     */
    showInfo(): void {
        this.domUtils.showAlert(this.translate.instant('core.help'),
            this.translate.instant('core.settings.spaceusagehelp'));
    }
}

/**
 * Basic site info with space usage and cache entries that can be erased.
 */
export interface CoreSiteBasicInfoWithUsage extends CoreSiteBasicInfo {
    cacheEntries?: number; // Number of cached entries that can be cleared.
    spaceUsage?: number; // Space used in this site.
}
