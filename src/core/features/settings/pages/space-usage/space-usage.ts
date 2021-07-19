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

import { Component, OnDestroy, OnInit } from '@angular/core';
import { IonRefresher } from '@ionic/angular';

import { CoreSiteBasicInfo, CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { Translate } from '@singletons';
import { CoreEventObserver, CoreEvents } from '@singletons/events';

import { CoreSettingsHelper, CoreSiteSpaceUsage } from '../../services/settings-helper';

/**
 * Page that displays the space usage settings.
 */
@Component({
    selector: 'page-core-app-settings-space-usage',
    templateUrl: 'space-usage.html',
})
export class CoreSettingsSpaceUsagePage implements OnInit, OnDestroy {

    loaded = false;
    sites: CoreSiteBasicInfoWithUsage[] = [];
    currentSiteId = '';
    totals: CoreSiteSpaceUsage = {
        cacheEntries: 0,
        spaceUsage: 0,
    };

    protected sitesObserver: CoreEventObserver;

    constructor() {
        this.currentSiteId = CoreSites.getCurrentSiteId();

        this.sitesObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, async (data) => {
            const site = await CoreSites.getSite(data.siteId);

            const siteEntry = this.sites.find((siteEntry) => siteEntry.id == site.id);
            if (siteEntry) {
                const siteInfo = site.getInfo();

                siteEntry.siteName = site.getSiteName();

                if (siteInfo) {
                    siteEntry.siteUrl = siteInfo.siteurl;
                    siteEntry.fullName = siteInfo.fullname;
                }
            }
        });
    }

    /**
     * View loaded.
     */
    ngOnInit(): void {
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

        this.sites = await CoreSites.getSortedSites();

        const settingsHelper = CoreSettingsHelper.instance;

        // Get space usage.
        await Promise.all(this.sites.map(async (site) => {
            const siteInfo = await settingsHelper.getSiteSpaceUsage(site.id);

            site.cacheEntries = siteInfo.cacheEntries;
            site.spaceUsage = siteInfo.spaceUsage;

            totalSize += site.spaceUsage || 0;
            totalEntries += site.cacheEntries || 0;
        }));

        this.totals.spaceUsage = totalSize;
        this.totals.cacheEntries = totalEntries;
    }

    /**
     * Refresh the data.
     *
     * @param event Refresher event.
     */
    refreshData(refresher?: IonRefresher): void {
        this.loadSiteData().finally(() => {
            refresher?.complete();
        });
    }

    /**
     * Deletes files of a site and the tables that can be cleared.
     *
     * @param siteData Site object with space usage.
     */
    async deleteSiteStorage(siteData: CoreSiteBasicInfoWithUsage): Promise<void> {
        try {
            const newInfo = await CoreSettingsHelper.deleteSiteStorage(siteData.siteName || '', siteData.id);

            this.totals.spaceUsage -= siteData.spaceUsage! - newInfo.spaceUsage;
            this.totals.spaceUsage -= siteData.cacheEntries! - newInfo.cacheEntries;

            siteData.spaceUsage = newInfo.spaceUsage;
            siteData.cacheEntries = newInfo.cacheEntries;
        } catch {
            // Ignore cancelled confirmation modal.
        }
    }

    /**
     * Show information about space usage actions.
     */
    showInfo(): void {
        CoreDomUtils.showAlert(
            Translate.instant('core.help'),
            Translate.instant('core.settings.spaceusagehelp'),
        );
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.sitesObserver?.off();
    }

}

/**
 * Basic site info with space usage and cache entries that can be erased.
 */
export interface CoreSiteBasicInfoWithUsage extends CoreSiteBasicInfo {
    cacheEntries?: number; // Number of cached entries that can be cleared.
    spaceUsage?: number; // Space used in this site.
}
