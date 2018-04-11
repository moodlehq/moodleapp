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

import { Component, } from '@angular/core';
import { IonicPage } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreFileProvider } from '@providers/file';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreSitesProvider } from '@providers/sites';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreDomUtilsProvider } from '@providers/utils/dom';

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
    freeSpace = 0;

    constructor(private fileProvider: CoreFileProvider, private filePoolProvider: CoreFilepoolProvider,
            private sitesProvider: CoreSitesProvider, private textUtils: CoreTextUtilsProvider,
            private translate: TranslateService, private domUtils: CoreDomUtilsProvider) {
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
     * @return {Promise<any>} Resolved when done.
     */
    protected calculateSizeUsage(): Promise<any> {
        return this.sitesProvider.getSortedSites().then((sites) => {
            this.sites = sites;

            // Get space usage.
            const promises = this.sites.map((siteEntry) => {
                return this.sitesProvider.getSite(siteEntry.id).then((site) => {
                    return site.getSpaceUsage().then((size) => {
                        siteEntry.spaceUsage = size;
                    });
                });
            });

            return Promise.all(promises);
        });
    }

    /**
     * Convenience function to calculate total usage.
     */
    protected calculateTotalUsage(): void {
        let total = 0;
        this.sites.forEach((site) => {
            if (site.spaceUsage) {
                total += parseInt(site.spaceUsage, 10);
            }
        });
        this.totalUsage = total;
    }

    /**
     * Convenience function to calculate free space in the device.
     *
     * @return {Promise<any>} Resolved when done.
     */
    protected calculateFreeSpace(): Promise<any> {
        if (this.fileProvider.isAvailable()) {
            return this.fileProvider.calculateFreeSpace().then((freeSpace) => {
                this.freeSpace = freeSpace;
            }).catch(() => {
                this.freeSpace = 0;
            });
        } else {
            this.freeSpace = 0;

            return Promise.resolve(null);
        }
    }

    /**
     * Convenience function to calculate space usage and free space in the device.
     *
     * @return {Promise<any>} Resolved when done.
     */
    protected fetchData(): Promise<any> {
        return Promise.all([
            this.calculateSizeUsage().then(() => this.calculateTotalUsage()),
            this.calculateFreeSpace(),
        ]);
    }

    /**
     * Refresh the data.
     *
     * @param {any} refresher Refresher.
     */
    refreshData(refresher: any): void {
        this.fetchData().finally(() => {
            refresher.complete();
        });
    }

    /**
     * Convenience function to update site size, along with total usage and free space.
     *
     * @param {any} site Site object with space usage.
     * @param {number} newUsage New space usage of the site in bytes.
     */
    protected updateSiteUsage(site: any, newUsage: number): void {
        const oldUsage = site.spaceUsage;
        site.spaceUsage = newUsage;
        this.totalUsage -= oldUsage - newUsage;
        this.freeSpace += oldUsage - newUsage;
    }

    /**
     * Deletes files of a site.
     *
     * @param {any} siteData Site object with space usage.
     */
    deleteSiteFiles(siteData: any): void {
        this.textUtils.formatText(siteData.siteName).then((siteName) => {
            const title = this.translate.instant('core.settings.deletesitefilestitle');
            const message = this.translate.instant('core.settings.deletesitefiles', {sitename: siteName});

            this.domUtils.showConfirm(message, title).then(() => {
                return this.sitesProvider.getSite(siteData.id);
            }).then((site) => {
                site.deleteFolder().then(() => {
                    this.filePoolProvider.clearAllPackagesStatus(site.id);
                    this.filePoolProvider.clearFilepool(site.id);
                    this.updateSiteUsage(siteData, 0);
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
                });
            }).catch(() => {
                // Ignore cancelled confirmation modal.
            });
        });
    }
}
