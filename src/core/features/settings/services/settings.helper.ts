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
import { CoreApp } from '@services/app';
import { CoreCron } from '@services/cron';
import { CoreEvents } from '@singletons/events';
import { CoreFilepool } from '@services/filepool';
import { CoreSite } from '@classes/site';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CoreConstants } from '@/core/constants';
import { CoreConfig } from '@services/config';
// import { CoreFilterProvider } from '@features/filter/providers/filter';
import { CoreDomUtils } from '@services/utils/dom';
// import { CoreCourseProvider } from '@features/course/providers/course';
import { makeSingleton, Translate } from '@singletons/core.singletons';
import { CoreError } from '@classes/errors/error';

/**
 * Object with space usage and cache entries that can be erased.
 */
export interface CoreSiteSpaceUsage {
    cacheEntries: number; // Number of cached entries that can be cleared.
    spaceUsage: number; // Space used in this site (total files + estimate of cache).
}

/**
 * Constants to define color schemes.
 */
export const enum CoreColorScheme {
    AUTO = 'auto',
    LIGHT = 'light',
    DARK = 'dark',
}

/**
 * Settings helper service.
 */
@Injectable({
    providedIn: 'root',
})
export class CoreSettingsHelperProvider {

    protected syncPromises: { [s: string]: Promise<void> } = {};
    protected prefersDark?: MediaQueryList;

    constructor() {
        // protected filterProvider: CoreFilterProvider,
        // protected courseProvider: CoreCourseProvider,

        if (!CoreConstants.CONFIG.forceColorScheme) {
            // Update color scheme when a user enters or leaves a site, or when the site info is updated.
            const applySiteScheme = (): void => {
                if (this.isColorSchemeDisabledInSite()) {
                    // Dark mode is disabled, force light mode.
                    this.setColorScheme(CoreColorScheme.LIGHT);
                } else {
                    this.prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
                    // Reset color scheme settings.
                    this.initColorScheme();
                }
            };

            CoreEvents.on(CoreEvents.LOGIN, applySiteScheme.bind(this));

            CoreEvents.on(CoreEvents.SITE_UPDATED, applySiteScheme.bind(this));

            CoreEvents.on(CoreEvents.LOGOUT, () => {
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
     * @todo filterProvider and courseProviderpart.
     */
    async deleteSiteStorage(siteName: string, siteId: string): Promise<CoreSiteSpaceUsage> {
        const siteInfo: CoreSiteSpaceUsage = {
            cacheEntries: 0,
            spaceUsage: 0,
        };

        // siteName = await this.filterProvider.formatText(siteName, { clean: true, singleLine: true, filter: false }, [], siteId);

        const title = Translate.instance.instant('core.settings.deletesitefilestitle');
        const message = Translate.instance.instant('core.settings.deletesitefiles', { sitename: siteName });

        await CoreDomUtils.instance.showConfirm(message, title);

        const site = await CoreSites.instance.getSite(siteId);

        // Clear cache tables.
        const cleanSchemas = CoreSites.instance.getSiteTableSchemasToClear(site);
        const promises: Promise<number | void>[] = cleanSchemas.map((name) => site.getDb().deleteRecords(name));
        const filepoolService = CoreFilepool.instance;


        promises.push(site.deleteFolder().then(() => {
            filepoolService.clearAllPackagesStatus(siteId);
            filepoolService.clearFilepool(siteId);
            // this.courseProvider.clearAllCoursesStatus(siteId);

            siteInfo.spaceUsage = 0;

            return;
        }).catch(async (error) => {
            if (error && error.code === FileError.NOT_FOUND_ERR) {
                // Not found, set size 0.
                filepoolService.clearAllPackagesStatus(siteId);
                siteInfo.spaceUsage = 0;
            } else {
                // Error, recalculate the site usage.
                CoreDomUtils.instance.showErrorModal('core.settings.errordeletesitefiles', true);

                siteInfo.spaceUsage = await site.getSpaceUsage();
            }
        }).then(async () => {
            CoreEvents.trigger(CoreEvents.SITE_STORAGE_DELETED, {}, siteId);

            siteInfo.cacheEntries = await this.calcSiteClearRows(site);

            return;
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
        const site = await CoreSites.instance.getSite(siteId);

        // Get space usage.
        const siteInfo: CoreSiteSpaceUsage = {
            cacheEntries: 0,
            spaceUsage: 0,
        };

        siteInfo.cacheEntries = await this.calcSiteClearRows(site);
        siteInfo.spaceUsage = await site.getTotalUsage();

        return siteInfo;
    }

    /**
     * Calculate the number of rows to be deleted on a site.
     *
     * @param site Site object.
     * @return If there are rows to delete or not.
     */
    protected async calcSiteClearRows(site: CoreSite): Promise<number> {
        const clearTables = CoreSites.instance.getSiteTableSchemasToClear(site);

        let totalEntries = 0;

        await Promise.all(clearTables.map(async (name) =>
            totalEntries = await site.getDb().countRecords(name) + totalEntries));

        return totalEntries;
    }

    /**
     * Get a certain processor from a list of processors.
     *
     * @param processors List of processors.
     * @param name Name of the processor to get.
     * @param fallback True to return first processor if not found, false to not return any. Defaults to true.
     * @return Processor.
     * @todo
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
     * @todo
     */
    getProcessorComponents(processor: string, components: any[]): any[] {
        return processor? components : [];
        /*
        const result = [];

        components.forEach((component) => {
            // Create a copy of the component with an empty list of notifications.
            const componentCopy = CoreUtils.instance.clone(component);
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

        return result;*/
    }

    /**
     * Get the synchronization promise of a site.
     *
     * @param siteId ID of the site.
     * @return Sync promise or null if site is not being syncrhonized.
     */
    getSiteSyncPromise(siteId: string): Promise<void> | void {
        if (this.syncPromises[siteId]) {
            return this.syncPromises[siteId];
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

        const site = await CoreSites.instance.getSite(siteId);
        const hasSyncHandlers = CoreCron.instance.hasManualSyncHandlers();

        if (site.isLoggedOut()) {
            // Cannot sync logged out sites.
            throw new CoreError(Translate.instance.instant('core.settings.cannotsyncloggedout'));
        } else if (hasSyncHandlers && !CoreApp.instance.isOnline()) {
            // We need connection to execute sync.
            throw new CoreError(Translate.instance.instant('core.settings.cannotsyncoffline'));
        } else if (hasSyncHandlers && syncOnlyOnWifi && CoreApp.instance.isNetworkAccessLimited()) {
            throw new CoreError(Translate.instance.instant('core.settings.cannotsyncwithoutwifi'));
        }

        const syncPromise = Promise.all([
            // Invalidate all the site files so they are re-downloaded.
            CoreUtils.instance.ignoreErrors(CoreFilepool.instance.invalidateAllFiles(siteId)),
            // Invalidate and synchronize site data.
            site.invalidateWsCache(),
            this.checkSiteLocalMobile(site),
            CoreSites.instance.updateSiteInfo(site.getId()),
            CoreCron.instance.forceSyncExecution(site.getId()),
        // eslint-disable-next-line arrow-body-style
        ]).then(() => {
            return;
        });

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
        } catch {
            // Not added, nothing to do.
            return;
        }

        // Local mobile was added. Throw invalid session to force reconnect and create a new token.
        CoreEvents.trigger(CoreEvents.SESSION_EXPIRED, {}, site.getId());

        throw new CoreError(Translate.instance.instant('core.lostconnection'));
    }

    /**
     * Init Settings related to DOM.
     */
    async initDomSettings(): Promise<void> {
        // Set the font size based on user preference.
        const fontSize = await CoreConfig.instance.get(CoreConstants.SETTINGS_FONT_SIZE, CoreConstants.CONFIG.font_sizes[0]);
        this.setFontSize(fontSize);

        this.initColorScheme();
    }

    /**
     * Init the color scheme.
     */
    async initColorScheme(): Promise<void> {
        if (CoreConstants.CONFIG.forceColorScheme) {
            this.setColorScheme(CoreConstants.CONFIG.forceColorScheme);
        } else {
            const scheme = await CoreConfig.instance.get(CoreConstants.SETTINGS_COLOR_SCHEME, CoreColorScheme.LIGHT);
            this.setColorScheme(scheme);
        }
    }

    /**
     * Check if color scheme is disabled in a site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with whether color scheme is disabled.
     */
    async isColorSchemeDisabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.instance.getSite(siteId);

        return this.isColorSchemeDisabledInSite(site);
    }

    /**
     * Check if color scheme is disabled in a site.
     *
     * @param site Site instance. If not defined, current site.
     * @return Whether color scheme is disabled.
     */
    isColorSchemeDisabledInSite(site?: CoreSite): boolean {
        site = site || CoreSites.instance.getCurrentSite();

        return site ? site.isFeatureDisabled('NoDelegate_DarkMode') : false;
    }

    /**
     * Set document default font size.
     *
     * @param fontSize Font size in percentage.
     */
    setFontSize(fontSize: number): void {
        // @todo Since zoom is deprecated and fontSize is not working, we should do some research here.
        document.documentElement.style.zoom = fontSize + '%';
    }

    /**
     * Set body color scheme.
     *
     * @param colorScheme Name of the color scheme.
     */
    setColorScheme(colorScheme: CoreColorScheme): void {
        if (colorScheme == CoreColorScheme.AUTO && this.prefersDark) {
            // Listen for changes to the prefers-color-scheme media query.
            this.prefersDark.addEventListener('change', this.toggleDarkModeListener);

            this.toggleDarkMode(this.prefersDark.matches);
        } else {
            // Stop listening to changes.
            this.prefersDark?.removeEventListener('change', this.toggleDarkModeListener);

            this.toggleDarkMode(colorScheme == CoreColorScheme.DARK);
        }
    }

    /**
     * Listener function to toggle dark mode.
     *
     * @param e Event object.
     */
    protected toggleDarkModeListener = (e: MediaQueryListEvent): void => {
        document.body.classList.toggle('dark', e.matches);
    };

    /**
     * Toggles dark mode based on enabled boolean.
     *
     * @param enable True to enable dark mode, false to disable.
     */
    protected toggleDarkMode(enable: boolean = false): void {
        document.body.classList.toggle('dark', enable);
    }

}

export class CoreSettingsHelper extends makeSingleton(CoreSettingsHelperProvider) {}
