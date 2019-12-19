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
import { CoreSitesProvider } from '@providers/sites';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreConstants } from '@core/constants';
import { CoreConfigProvider } from '@providers/config';
import { CoreConfigConstants } from '../../../configconstants';
import { TranslateService } from '@ngx-translate/core';

/**
 * Settings helper service.
 */
@Injectable()
export class CoreSettingsHelper {
    protected logger;
    protected syncPromises = {};

    constructor(loggerProvider: CoreLoggerProvider, private appProvider: CoreAppProvider, private cronDelegate: CoreCronDelegate,
            private eventsProvider: CoreEventsProvider, private filePoolProvider: CoreFilepoolProvider,
            private sitesProvider: CoreSitesProvider, private utils: CoreUtilsProvider, private translate: TranslateService,
            private configProvider: CoreConfigProvider) {
        this.logger = loggerProvider.getInstance('CoreSettingsHelper');
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
    synchronizeSite(syncOnlyOnWifi: boolean, siteId: string): Promise<any> {
        if (this.syncPromises[siteId]) {
            // There's already a sync ongoing for this site, return the promise.
            return this.syncPromises[siteId];
        }

        const promises = [];
        const hasSyncHandlers = this.cronDelegate.hasManualSyncHandlers();

        if (hasSyncHandlers && !this.appProvider.isOnline()) {
            // We need connection to execute sync.
            return Promise.reject(this.translate.instant('core.settings.cannotsyncoffline'));
        } else if (hasSyncHandlers && syncOnlyOnWifi && this.appProvider.isNetworkAccessLimited()) {
            return Promise.reject(this.translate.instant('core.settings.cannotsyncwithoutwifi'));
        }

        // Invalidate all the site files so they are re-downloaded.
        promises.push(this.filePoolProvider.invalidateAllFiles(siteId).catch(() => {
            // Ignore errors.
        }));

        // Get the site to invalidate data.
        promises.push(this.sitesProvider.getSite(siteId).then((site) => {
            // Invalidate the WS cache.
            return site.invalidateWsCache().then(() => {
                const subPromises = [];

                // Check if local_mobile was installed in Moodle.
                subPromises.push(site.checkIfLocalMobileInstalledAndNotUsed().then(() => {
                    // Local mobile was added. Throw invalid session to force reconnect and create a new token.
                    this.eventsProvider.trigger(CoreEventsProvider.SESSION_EXPIRED, {}, siteId);

                    return Promise.reject(this.translate.instant('core.lostconnection'));
                }, () => {
                    // Update site info.
                    return this.sitesProvider.updateSiteInfo(siteId);
                }));

                // Execute cron if needed.
                subPromises.push(this.cronDelegate.forceSyncExecution(siteId));

                return Promise.all(subPromises);
            });
        }));

        let syncPromise = Promise.all(promises);
        this.syncPromises[siteId] = syncPromise;
        syncPromise = syncPromise.finally(() => {
            delete this.syncPromises[siteId];
        });

        return syncPromise;
    }

    /**
     * Init Settings related to DOM.
     */
    initDomSettings(): void {
        // Set the font size based on user preference.
        this.configProvider.get(CoreConstants.SETTINGS_FONT_SIZE, CoreConfigConstants.font_sizes[0].toString()).then((fontSize) => {
            this.setFontSize(fontSize);
        });

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
