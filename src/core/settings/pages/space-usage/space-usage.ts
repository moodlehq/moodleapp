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
import { CoreAppProvider } from '@providers/app';
import { CoreEventsProvider } from '@providers/events';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreFilterProvider } from '@core/filter/providers/filter';

/**
 * Page that displays the space usage settings.
 */
@IonicPage({segment: 'core-settings-space-usage'})
@Component({
    selector: 'page-core-settings-space-usage',
    templateUrl: 'space-usage.html',
})
export class CoreSettingsSpaceUsagePage {

    usageLoaded = false;
    sites = [];
    currentSiteId = '';
    totalUsage = 0;
    totalEntries = 0;

    constructor(private filePoolProvider: CoreFilepoolProvider,
            private eventsProvider: CoreEventsProvider,
            private sitesProvider: CoreSitesProvider,
            private filterProvider: CoreFilterProvider,
            private translate: TranslateService,
            private domUtils: CoreDomUtilsProvider,
            appProvider: CoreAppProvider,
            private courseProvider: CoreCourseProvider) {
        this.currentSiteId = this.sitesProvider.getCurrentSiteId();
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.fetchData().finally(() => {
            this.usageLoaded = true;
        });
    }

    /**
     * Convenience function to calculate each site's usage, and the total usage.
     *
     * @return Resolved when done.
     */
    protected calculateSizeUsage(): Promise<any> {
        return this.sitesProvider.getSortedSites().then((sites) => {
            this.sites = sites;

            // Get space usage.
            const promises = this.sites.map((siteEntry) => {
                return this.sitesProvider.getSite(siteEntry.id).then((site) => {
                    const proms2 = [];

                    proms2.push(this.calcSiteClearRows(site).then((rows) => {
                        siteEntry.cacheEntries = rows;
                    }));

                    proms2.push(site.getSpaceUsage().then((size) => {
                        siteEntry.spaceUsage = size;
                    }));

                    return Promise.all(proms2);
                });
            });

            return Promise.all(promises);
        });
    }

    /**
     * Convenience function to calculate total usage.
     */
    protected calculateTotalUsage(): void {
        let totalSize = 0,
            totalEntries = 0;
        this.sites.forEach((site) => {
            totalSize += (site.spaceUsage ? parseInt(site.spaceUsage, 10) : 0);
            totalEntries += (site.cacheEntries ? parseInt(site.cacheEntries, 10) : 0);
        });
        this.totalUsage = totalSize;
        this.totalEntries = totalEntries;
    }

    /**
     * Convenience function to calculate space usage.
     *
     * @return Resolved when done.
     */
    protected fetchData(): Promise<any> {
        const promises = [
            this.calculateSizeUsage().then(() => this.calculateTotalUsage()),
        ];

        return Promise.all(promises);
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     */
    refreshData(refresher: any): void {
        this.fetchData().finally(() => {
            refresher.complete();
        });
    }

    /**
     * Convenience function to update site size, along with total usage.
     *
     * @param site Site object with space usage.
     * @param newUsage New space usage of the site in bytes.
     */
    protected updateSiteUsage(site: any, newUsage: number): void {
        const oldUsage = site.spaceUsage;
        site.spaceUsage = newUsage;
        this.totalUsage -= oldUsage - newUsage;
    }

    /**
     * Calculate the number of rows to be deleted on a site.
     *
     * @param site Site object.
     * @return If there are rows to delete or not.
     */
    protected calcSiteClearRows(site: any): Promise<number> {
        const clearTables = this.sitesProvider.getSiteTableSchemasToClear();

        let totalEntries = 0;

        const promises = clearTables.map((name) => {
            return site.getDb().countRecords(name).then((rows) => {
                totalEntries += rows;
            });
        });

        return Promise.all(promises).then(() => {
            return totalEntries;
        });
    }

    /**
     * Deletes files of a site and the tables that can be cleared.
     *
     * @param siteData Site object with space usage.
     */
    deleteSiteStorage(siteData: any): void {
        this.filterProvider.formatText(siteData.siteName, {clean: true, singleLine: true, filter: false}, [], siteData.id)
                .then((siteName) => {

            const title = this.translate.instant('core.settings.deletesitefilestitle');
            const message = this.translate.instant('core.settings.deletesitefiles', {sitename: siteName});

            this.domUtils.showConfirm(message, title).then(() => {
                return this.sitesProvider.getSite(siteData.id);
            }).then((site) => {

                // Clear cache tables.
                const cleanSchemas = this.sitesProvider.getSiteTableSchemasToClear();
                const promises = cleanSchemas.map((name) => {
                    return site.getDb().deleteRecords(name);
                });

                promises.push(site.deleteFolder().then(() => {
                    this.filePoolProvider.clearAllPackagesStatus(site.id);
                    this.filePoolProvider.clearFilepool(site.id);
                    this.updateSiteUsage(siteData, 0);
                    this.courseProvider.clearAllCoursesStatus(site.id);
                }).catch((error) => {
                    if (error && error.code === FileError.NOT_FOUND_ERR) {
                        // Not found, set size 0.
                        this.filePoolProvider.clearAllPackagesStatus(site.id);
                        this.updateSiteUsage(siteData, 0);
                    } else {
                        // Error, recalculate the site usage.
                        this.domUtils.showErrorModal('core.settings.errordeletesitefiles', true);
                        site.getSpaceUsage().then((size) => {
                            this.updateSiteUsage(siteData, size);
                        });
                    }
                }).finally(() => {
                    this.eventsProvider.trigger(CoreEventsProvider.SITE_STORAGE_DELETED, {}, site.getId());

                    this.calcSiteClearRows(site).then((rows) => {
                        siteData.cacheEntries = rows;
                    });
                }));

                return Promise.all(promises);
            }).catch(() => {
                // Ignore cancelled confirmation modal.
            });
        });
    }
}
