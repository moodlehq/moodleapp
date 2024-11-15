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

import { CoreSiteBasicInfo, CoreSites } from '@services/sites';
import { CoreObject } from '@singletons/object';
import { CoreEventObserver, CoreEvents } from '@singletons/events';

import { CoreSettingsHelper } from '../../services/settings-helper';
import { CoreAccountsList } from '@features/login/services/login-helper';
import { CorePromiseUtils } from '@singletons/promise-utils';

/**
 * Page that displays the space usage settings.
 */
@Component({
    selector: 'page-core-app-settings-space-usage',
    templateUrl: 'space-usage.html',
})
export class CoreSettingsSpaceUsagePage implements OnInit, OnDestroy {

    loaded = false;
    totalSpaceUsage = 0;

    accountsList: CoreAccountsList<CoreSiteBasicInfoWithUsage> = {
        sameSite: [],
        otherSites: [],
        count: 0,
    };

    protected sitesObserver: CoreEventObserver;

    constructor() {
        this.sitesObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, async (data) => {
            const siteId = data.siteId;

            let siteEntry = siteId === this.accountsList.currentSite?.id
                ? this.accountsList.currentSite
                : undefined;

            if (!siteEntry) {
                siteEntry = this.accountsList.sameSite.find((siteEntry) => siteEntry.id === siteId);
            }

            if (!siteEntry) {
                this.accountsList.otherSites.some((sites) => {
                    siteEntry = sites.find((siteEntry) => siteEntry.id === siteId);

                    return siteEntry;
                });
            }

            if (!siteEntry) {
                return;
            }

            const site = await CoreSites.getSite(siteId);
            const siteInfo = site.getInfo();
            siteEntry.siteName = await site.getSiteName();

            if (siteInfo) {
                siteEntry.siteUrl = siteInfo.siteurl;
                siteEntry.fullname = siteInfo.fullname;
            }
        });
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.loadSiteData().finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Convenience function to load site data/usage and calculate the totals.
     *
     * @returns Resolved when done.
     */
    protected async loadSiteData(): Promise<void> {
        // Calculate total usage.
        let totalSize = 0;

        const sites = await CorePromiseUtils.ignoreErrors(CoreSites.getSortedSites(), [] as CoreSiteBasicInfo[]);
        const sitesWithUsage = await Promise.all(sites.map((site) => this.getSiteWithUsage(site)));

        let siteUrl = '';

        const currentSiteId = CoreSites.getCurrentSiteId();

        if (currentSiteId) {
            const index = sitesWithUsage.findIndex((site) => site.id === currentSiteId);

            const siteWithUsage = sitesWithUsage.splice(index, 1)[0];
            this.accountsList.currentSite = siteWithUsage;
            totalSize += siteWithUsage.spaceUsage || 0;

            siteUrl = this.accountsList.currentSite.siteUrlWithoutProtocol;
        }

        const otherSites: Record<string, CoreSiteBasicInfoWithUsage[]> = {};

        // Get space usage.
        sitesWithUsage.forEach((siteWithUsage) => {
            totalSize += siteWithUsage.spaceUsage || 0;

            if (siteWithUsage.siteUrlWithoutProtocol === siteUrl) {
                this.accountsList.sameSite.push(siteWithUsage);
            } else {
                if (otherSites[siteWithUsage.siteUrlWithoutProtocol] === undefined) {
                    otherSites[siteWithUsage.siteUrlWithoutProtocol] = [];
                }

                otherSites[siteWithUsage.siteUrlWithoutProtocol].push(siteWithUsage);
            }
        });

        this.accountsList.otherSites = CoreObject.toArray(otherSites);
        this.accountsList.count = sites.length;

        this.totalSpaceUsage = totalSize;
    }

    /**
     * Get site with space usage.
     *
     * @param site Site to check.
     * @returns Site with usage.
     */
    protected async getSiteWithUsage(site: CoreSiteBasicInfo): Promise<CoreSiteBasicInfoWithUsage> {
        const siteInfo = await CoreSettingsHelper.getSiteSpaceUsage(site.id);

        return Object.assign(site, {
            hasCacheEntries: siteInfo.cacheEntries > 0,
            spaceUsage: siteInfo.spaceUsage,
        });
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher event.
     */
    refreshData(refresher?: HTMLIonRefresherElement): void {
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

            this.totalSpaceUsage -= siteData.spaceUsage - newInfo.spaceUsage;

            siteData.spaceUsage = newInfo.spaceUsage;
            siteData.hasCacheEntries = newInfo.cacheEntries > 0;
        } catch {
            // Ignore cancelled confirmation modal.
        }
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.sitesObserver.off();
    }

}

/**
 * Basic site info with space usage and cache entries that can be erased.
 */
interface CoreSiteBasicInfoWithUsage extends CoreSiteBasicInfo {
    hasCacheEntries: boolean; // If has cached entries that can be cleared.
    spaceUsage: number; // Space used in this site.
}
