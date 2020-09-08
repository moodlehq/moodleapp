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

import { Injectable } from '@angular/core';
import { CoreAppProvider } from '@providers/app';
import { CoreCronDelegate } from '@providers/cron';
import { CoreEventsProvider } from '@providers/events';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSite } from '@classes/site';
import { CoreSitesProvider } from '@providers/sites';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreConstants } from '@core/constants';
import { CoreConfigProvider } from '@providers/config';
import { CoreFilterProvider } from '@core/filter/providers/filter';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreConfigConstants } from '../../../configconstants';
import { TranslateService } from '@ngx-translate/core';

/**
 * Object with space usage and cache entries that can be erased.
 */
export interface CoreSiteSpaceUsage {
    cacheEntries?: number; // Number of cached entries that can be cleared.
    spaceUsage?: number; // Space used in this site (total files + estimate of cache).
}

/**
 * Settings helper service.
 */
@Injectable()
export class CoreSettingsHelper {
    protected logger;
    protected syncPromises = {};

    constructor(loggerProvider: CoreLoggerProvider,
            protected appProvider: CoreAppProvider,
            protected cronDelegate: CoreCronDelegate,
            protected domUtils: CoreDomUtilsProvider,
            protected eventsProvider: CoreEventsProvider,
            protected filePoolProvider: CoreFilepoolProvider,
            protected sitesProvider: CoreSitesProvider,
            protected utils: CoreUtilsProvider,
            protected translate: TranslateService,
            protected configProvider: CoreConfigProvider,
            protected filterProvider: CoreFilterProvider,
            protected courseProvider: CoreCourseProvider,
    ) {
        this.logger = loggerProvider.getInstance('CoreSettingsHelper');

        if (!CoreConfigConstants.forceColorScheme) {
            // Update color scheme when a user enters or leaves a site, or when the site info is updated.
            const applySiteScheme = (): void => {
                if (this.isColorSchemeDisabledInSite()) {
                    // Dark mode is disabled, force light mode.
                    this.setColorScheme('light');
                } else {
                    // Reset color scheme settings.
                    this.initColorScheme();
                }
            };

            eventsProvider.on(CoreEventsProvider.LOGIN, applySiteScheme.bind(this));

            eventsProvider.on(CoreEventsProvider.SITE_UPDATED, applySiteScheme.bind(this));

            eventsProvider.on(CoreEventsProvider.LOGOUT, () => {
                // Reset color scheme settings.
                this.initColorScheme();
            });
        }
    }

    /**
     * Deletes files of a site and the tables that can be cleared.
     *
     * @param siteName Site Name.
     * @param siteId: Site ID.
     * @return Resolved with detailed new info when done.
     */
    async deleteSiteStorage(siteName: string, siteId: string): Promise<CoreSiteSpaceUsage> {
        const siteInfo: CoreSiteSpaceUsage = {
            cacheEntries: 0,
            spaceUsage: 0
        };

        siteName = await this.filterProvider.formatText(siteName, {clean: true, singleLine: true, filter: false}, [], siteId);

        const title = this.translate.instant('core.settings.deletesitefilestitle');
        const message = this.translate.instant('core.settings.deletesitefiles', {sitename: siteName});

        await this.domUtils.showConfirm(message, title);

        const site = await this.sitesProvider.getSite(siteId);

        // Clear cache tables.
        const cleanSchemas = this.sitesProvider.getSiteTableSchemasToClear(site);
        const promises = cleanSchemas.map((name) => site.getDb().deleteRecords(name));

        promises.push(site.deleteFolder().then(() => {
            this.filePoolProvider.clearAllPackagesStatus(site.id);
            this.filePoolProvider.clearFilepool(site.id);
            this.courseProvider.clearAllCoursesStatus(site.id);

            siteInfo.spaceUsage = 0;
        }).catch(async (error) => {
            if (error && error.code === FileError.NOT_FOUND_ERR) {
                // Not found, set size 0.
                this.filePoolProvider.clearAllPackagesStatus(site.id);
                siteInfo.spaceUsage = 0;
            } else {
                // Error, recalculate the site usage.
                this.domUtils.showErrorModal('core.settings.errordeletesitefiles', true);

                siteInfo.spaceUsage = await site.getSpaceUsage();
            }
        }).then(async () => {
            this.eventsProvider.trigger(CoreEventsProvider.SITE_STORAGE_DELETED, {}, site.getId());

            siteInfo.cacheEntries = await this.calcSiteClearRows(site);
        }));

        await Promise.all(promises);

        return siteInfo;
    }

    /**
     * Calculates each site's usage, and the total usage.
     *
     * @param  siteId ID of the site. Current site if undefined.
     * @return Resolved with detailed info when done.
     */
    async getSiteSpaceUsage(siteId?: string): Promise<CoreSiteSpaceUsage> {
        const site = await this.sitesProvider.getSite(siteId);

        // Get space usage.
        const siteInfo: CoreSiteSpaceUsage = {
            cacheEntries: 0,
            spaceUsage: 0,
        };

        await Promise.all([
            this.calcSiteClearRows(site).then((rows) => siteInfo.cacheEntries = rows),
            site.getTotalUsage().then((size) => siteInfo.spaceUsage = size),
        ]);

        return siteInfo;
    }

    /**
     * Calculate the number of rows to be deleted on a site.
     *
     * @param site Site object.
     * @return If there are rows to delete or not.
     */
    protected async calcSiteClearRows(site: CoreSite): Promise<number> {
        const clearTables = this.sitesProvider.getSiteTableSchemasToClear(site);

        let totalEntries = 0;

        await Promise.all(clearTables.map(async (name) =>
            totalEntries = await site.getDb().countRecords(name) + totalEntries
        ));

        return totalEntries;
    }

    /**
     * Get a certain processor from a list of processors.
     *
     * @param processors List of processors.
     * @param name Name of the processor to get.
     * @param fallback True to return first processor if not found, false to not return any. Defaults to true.
     * @return Processor.
     */
    getProcessor(processors: any[], name: string, fallback: boolean = true): any {
        if (!processors || !processors.length) {
            return;
        }
        for (let i = 0; i < processors.length; i++) {
            if (processors[i].name == name) {
                return processors[i];
            }
        }

        // Processor not found, return first if requested.
        if (fallback) {
            return processors[0];
        }
    }

    /**
     * Return the components and notifications that have a certain processor.
     *
     * @param processor Name of the processor to filter.
     * @param components Array of components.
     * @return Filtered components.
     */
    getProcessorComponents(processor: string, components: any[]): any[] {
        const result = [];

        components.forEach((component) => {
            // Create a copy of the component with an empty list of notifications.
            const componentCopy = this.utils.clone(component);
            componentCopy.notifications = [];

            component.notifications.forEach((notification) => {
                let hasProcessor = false;
                for (let i = 0; i < notification.processors.length; i++) {
                    const proc = notification.processors[i];
                    if (proc.name == processor) {
                        hasProcessor = true;
                        notification.currentProcessor = proc;
                        break;
                    }
                }

                if (hasProcessor) {
                    // Add the notification.
                    componentCopy.notifications.push(notification);
                }
            });

            if (componentCopy.notifications.length) {
                // At least 1 notification added, add the component to the result.
                result.push(componentCopy);
            }
        });

        return result;
    }

    /**
     * Get the synchronization promise of a site.
     *
     * @param siteId ID of the site.
     * @return Sync promise or null if site is not being syncrhonized.
     */
    getSiteSyncPromise(siteId: string): Promise<any> {
        if (this.syncPromises[siteId]) {
            return this.syncPromises[siteId];
        } else {
            return null;
        }
    }

    /**
     * Synchronize a site.
     *
     * @param syncOnlyOnWifi True to sync only on wifi, false otherwise.
     * @param siteId ID of the site to synchronize.
     * @return Promise resolved when synchronized, rejected if failure.
     */
    async synchronizeSite(syncOnlyOnWifi: boolean, siteId: string): Promise<void> {
        if (this.syncPromises[siteId]) {
            // There's already a sync ongoing for this site, return the promise.
            return this.syncPromises[siteId];
        }

        const site = await this.sitesProvider.getSite(siteId);
        const hasSyncHandlers = this.cronDelegate.hasManualSyncHandlers();

        if (site.isLoggedOut()) {
            // Cannot sync logged out sites.
            throw this.translate.instant('core.settings.cannotsyncloggedout');
        } else if (hasSyncHandlers && !this.appProvider.isOnline()) {
            // We need connection to execute sync.
            throw this.translate.instant('core.settings.cannotsyncoffline');
        } else if (hasSyncHandlers && syncOnlyOnWifi && this.appProvider.isNetworkAccessLimited()) {
            throw this.translate.instant('core.settings.cannotsyncwithoutwifi');
        }

        const syncPromise = Promise.all([
            // Invalidate all the site files so they are re-downloaded.
            this.utils.ignoreErrors(this.filePoolProvider.invalidateAllFiles(siteId)),
            // Invalidate and synchronize site data.
            site.invalidateWsCache(),
            this.checkSiteLocalMobile(site),
            this.sitesProvider.updateSiteInfo(site.getId()),
            this.cronDelegate.forceSyncExecution(site.getId()),
        ]);

        this.syncPromises[siteId] = syncPromise;

        try {
            await syncPromise;
        } finally {
            delete this.syncPromises[siteId];
        }
    }

    /**
     * Check if local_mobile was added to the site.
     *
     * @param site Site to check.
     * @return Promise resolved if no action needed.
     */
    protected async checkSiteLocalMobile(site: CoreSite): Promise<void> {
        try {
            // Check if local_mobile was installed in Moodle.
            await site.checkIfLocalMobileInstalledAndNotUsed();
        } catch (error) {
            // Not added, nothing to do.
            return;
        }

        // Local mobile was added. Throw invalid session to force reconnect and create a new token.
        this.eventsProvider.trigger(CoreEventsProvider.SESSION_EXPIRED, {}, site.getId());

        throw this.translate.instant('core.lostconnection');
    }

    /**
     * Init Settings related to DOM.
     */
    initDomSettings(): void {
        // Set the font size based on user preference.
        this.configProvider.get(CoreConstants.SETTINGS_FONT_SIZE, CoreConfigConstants.font_sizes[0].toString()).then((fontSize) => {
            this.setFontSize(fontSize);
        });

        this.initColorScheme();
    }

    /**
     * Init the color scheme.
     */
    initColorScheme(): void {
        if (!!CoreConfigConstants.forceColorScheme) {
            this.setColorScheme(CoreConfigConstants.forceColorScheme);
        } else {
            let defaultColorScheme = 'light';

            if (window.matchMedia('(prefers-color-scheme: dark)').matches ||
                    window.matchMedia('(prefers-color-scheme: light)').matches) {
                defaultColorScheme = 'auto';
            }

            this.configProvider.get(CoreConstants.SETTINGS_COLOR_SCHEME, defaultColorScheme).then((scheme) => {
                this.setColorScheme(scheme);
            });
        }
    }

    /**
     * Check if color scheme is disabled in a site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with whether color scheme is disabled.
     */
    async isColorSchemeDisabled(siteId?: string): Promise<boolean> {
        const site = await this.sitesProvider.getSite(siteId);

        return this.isColorSchemeDisabledInSite(site);
    }

    /**
     * Check if color scheme is disabled in a site.
     *
     * @param site Site instance. If not defined, current site.
     * @return Whether color scheme is disabled.
     */
    isColorSchemeDisabledInSite(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site ? site.isFeatureDisabled('NoDelegate_DarkMode') : false;
    }

    /**
     * Set document default font size.
     *
     * @param fontSize Font size in percentage.
     */
    setFontSize(fontSize: string): void {
        document.documentElement.style.fontSize = fontSize + '%';
    }

    /**
     * Set body color scheme.
     *
     * @param colorScheme Name of the color scheme.
     */
    setColorScheme(colorScheme: string): void {
        document.body.classList.remove('scheme-light');
        document.body.classList.remove('scheme-dark');
        document.body.classList.remove('scheme-auto');
        document.body.classList.add('scheme-' + colorScheme);
    }
}
