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

import { Injectable } from '@angular/core';
import { CoreConfigProvider } from './config';
import { CoreFilepoolProvider } from './filepool';
import { CoreInitHandler, CoreInitDelegate } from './init';
import { CoreLocalNotificationsProvider } from './local-notifications';
import { CoreLoggerProvider } from './logger';
import { CoreSitesProvider } from './sites';
import { CoreConfigConstants } from '../configconstants';

/**
 * Factory to handle app updates. This factory shouldn't be used outside of core.
 *
 * This service handles processes that need to be run when updating the app, like migrate Ionic 1 database data to Ionic 3.
 */
@Injectable()
export class CoreUpdateManagerProvider implements CoreInitHandler {
    // Data for init delegate.
    name = 'CoreUpdateManager';
    priority = CoreInitDelegate.MAX_RECOMMENDED_PRIORITY + 300;
    blocking = true;

    protected VERSION_APPLIED = 'version_applied';
    protected logger;

    constructor(logger: CoreLoggerProvider, private configProvider: CoreConfigProvider, private sitesProvider: CoreSitesProvider,
            private filepoolProvider: CoreFilepoolProvider, private notifProvider: CoreLocalNotificationsProvider) {
        this.logger = logger.getInstance('CoreUpdateManagerProvider');
    }

    /**
     * Check if the app has been updated and performs the needed processes.
     * This function shouldn't be used outside of core.
     *
     * @return {Promise<any>} Promise resolved when the update process finishes.
     */
    load(): Promise<any> {
        const promises = [],
            versionCode = CoreConfigConstants.versioncode;

        return this.configProvider.get(this.VERSION_APPLIED, 0).then((versionApplied: number) => {
            // @todo: Migrate all data from ydn-db to SQLite if there is no versionApplied.

            if (versionCode >= 2013 && versionApplied < 2013) {
                promises.push(this.migrateFileExtensions());
            }

            if (versionCode >= 2017 && versionApplied < 2017) {
                promises.push(this.setCalendarDefaultNotifTime());
                promises.push(this.setSitesConfig());
            }

            if (versionCode >= 2018 && versionApplied < 2018) {
                promises.push(this.adaptForumOfflineStores());
            }

            return Promise.all(promises).then(() => {
                return this.configProvider.set(this.VERSION_APPLIED, versionCode);
            }).catch((error) => {
                this.logger.error(`Error applying update from ${versionApplied} to ${versionCode}`, error);
            });
        });
    }

    /**
     * Migrates files filling extensions.
     *
     * @return {Promise<any>} Promise resolved when the site migration is finished.
     */
    protected migrateFileExtensions(): Promise<any> {
        return this.sitesProvider.getSitesIds().then((sites) => {
            const promises = [];
            sites.forEach((siteId) => {
                promises.push(this.filepoolProvider.fillMissingExtensionInFiles(siteId));
            });
            promises.push(this.filepoolProvider.treatExtensionInQueue());

            return Promise.all(promises);
        });
    }

    /**
     * Calendar default notification time is configurable from version 3.2.1, and a new option "Default" is added.
     * All events that were configured to use the fixed default time should now be configured to use "Default" option.
     *
     * @return {Promise<any>} Promise resolved when the events are configured.
     */
    protected setCalendarDefaultNotifTime(): Promise<any> {
        if (!this.notifProvider.isAvailable()) {
            // Local notifications not available, nothing to do.
            return Promise.resolve();
        }

        // @todo: Implement it once Calendar addon is implemented.
        return Promise.resolve();
    }

    /**
     * In version 3.2.1 we want the site config to be stored in each site if available.
     * Since it can be slow, we'll only block retrieving the config of current site, the rest will be in background.
     *
     * @return {Promise<any>} Promise resolved when the config is loaded for the current site (if any).
     */
    protected setSitesConfig(): Promise<any> {
        return this.sitesProvider.getSitesIds().then((siteIds) => {

            return this.sitesProvider.getStoredCurrentSiteId().catch(() => {
                // Error getting current site.
            }).then((currentSiteId) => {
                let promise;

                // Load the config of current site first.
                if (currentSiteId) {
                    promise = this.setSiteConfig(currentSiteId);
                } else {
                    promise = Promise.resolve();
                }

                // Load the config of rest of sites in background.
                siteIds.forEach((siteId) => {
                    if (siteId != currentSiteId) {
                        this.setSiteConfig(siteId);
                    }
                });

                return promise;
            });
        });
    }

    /**
     * Store the config of a site.
     *
     * @param {String} siteId Site ID.
     * @return {Promise<any>} Promise resolved when the config is loaded for the site.
     */
    protected setSiteConfig(siteId: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            if (site.getStoredConfig() || !site.wsAvailable('tool_mobile_get_config')) {
                // Site already has the config or it cannot be retrieved. Stop.
                return;
            }

            // Get the site config.
            return site.getConfig().then((config) => {
                return this.sitesProvider.addSite(
                    site.getId(), site.getURL(), site.getToken(), site.getInfo(), site.getPrivateToken(), config);
            }).catch(() => {
                // Ignore errors.
            });
        });
    }

    /**
     * The data stored for offline discussions and posts changed its format. Adapt the entries already stored.
     * Since it can be slow, we'll only block migrating the db of current site, the rest will be in background.
     *
     * @return {Promise<any>} Promise resolved when the db is migrated.
     */
    protected adaptForumOfflineStores(): Promise<any> {
        // @todo: Implement it once Forum addon is implemented.
        return Promise.resolve();
    }
}
