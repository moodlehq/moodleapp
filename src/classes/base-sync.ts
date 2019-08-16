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

import { TranslateService } from '@ngx-translate/core';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSyncProvider } from '@providers/sync';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreAppProvider } from '@providers/app';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';

/**
 * Base class to create sync providers. It provides some common functions.
 */
export class CoreSyncBaseProvider {

    /**
     * Logger instance get from CoreLoggerProvider.
     * @type {any}
     */
    protected logger;

    /**
     * Component of the sync provider.
     * @type {string}
     */
    component = 'core';

    /**
     * Sync provider's interval.
     * @type {number}
     */
    syncInterval = 300000;

    // Store sync promises.
    protected syncPromises: { [siteId: string]: { [uniqueId: string]: Promise<any> } } = {};

    constructor(component: string, loggerProvider: CoreLoggerProvider, protected sitesProvider: CoreSitesProvider,
            protected appProvider: CoreAppProvider, protected syncProvider: CoreSyncProvider,
            protected textUtils: CoreTextUtilsProvider, protected translate: TranslateService,
            protected timeUtils: CoreTimeUtilsProvider) {

        this.logger = loggerProvider.getInstance(component);
        this.component = component;
    }

    /**
     * Add an ongoing sync to the syncPromises list. On finish the promise will be removed.
     *
     * @param {string | number} id Unique sync identifier per component.
     * @param {Promise<any>} promise The promise of the sync to add.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} The sync promise.
     */
    addOngoingSync(id: string | number, promise: Promise<any>, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const uniqueId = this.getUniqueSyncId(id);
        if (!this.syncPromises[siteId]) {
            this.syncPromises[siteId] = {};
        }

        this.syncPromises[siteId][uniqueId] = promise;

        // Promise will be deleted when finish.
        return promise.finally(() => {
            delete this.syncPromises[siteId][uniqueId];
        });
    }

    /**
     * If there's an ongoing sync for a certain identifier return it.
     *
     * @param {string | number} id Unique sync identifier per component.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise of the current sync or undefined if there isn't any.
     */
    getOngoingSync(id: string | number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        if (this.isSyncing(id, siteId)) {
            // There's already a sync ongoing for this discussion, return the promise.
            const uniqueId = this.getUniqueSyncId(id);

            return this.syncPromises[siteId][uniqueId];
        }
    }

    /**
     * Get the synchronization time in a human readable format.
     *
     * @param {string | number} id Unique sync identifier per component.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved with the readable time.
     */
    getReadableSyncTime(id: string | number, siteId?: string): Promise<string> {
        return this.getSyncTime(id, siteId).then((time) => {
            return this.getReadableTimeFromTimestamp(time);
        });
    }

    /**
     * Given a timestamp return it in a human readable format.
     *
     * @param {number} timestamp Timestamp
     * @return {string} Human readable time.
     */
    getReadableTimeFromTimestamp(timestamp: number): string {
        if (!timestamp) {
            return this.translate.instant('core.never');
        } else {
            return this.timeUtils.userDate(timestamp);
        }
    }

    /**
     * Get the synchronization time. Returns 0 if no time stored.
     *
     * @param {string | number} id Unique sync identifier per component.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<number>} Promise resolved with the time.
     */
    getSyncTime(id: string | number, siteId?: string): Promise<number> {
        return this.syncProvider.getSyncRecord(this.component, id, siteId).then((entry) => {
            return entry.time;
        }).catch(() => {
            return 0;
        });
    }

    /**
     * Get the synchronization warnings of an instance.
     *
     * @param {string | number} id Unique sync identifier per component.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<string[]>} Promise resolved with the warnings.
     */
    getSyncWarnings(id: string | number, siteId?: string): Promise<string[]> {
        return this.syncProvider.getSyncRecord(this.component, id, siteId).then((entry) => {
            return this.textUtils.parseJSON(entry.warnings, []);
        }).catch(() => {
            return [];
        });
    }

    /**
     * Create a unique identifier from component and id.
     *
     * @param {string | number} id Unique sync identifier per component.
     * @return {string} Unique identifier from component and id.
     */
    protected getUniqueSyncId(id: string | number): string {
        return this.component + '#' + id;
    }

    /**
     * Check if a there's an ongoing syncronization for the given id.
     *
     * @param {string | number} id Unique sync identifier per component.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {boolean} Whether it's synchronizing.
     */
    isSyncing(id: string | number, siteId?: string): boolean {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const uniqueId = this.getUniqueSyncId(id);

        return !!(this.syncPromises[siteId] && this.syncPromises[siteId][uniqueId]);
    }

    /**
     * Check if a sync is needed: if a certain time has passed since the last time.
     *
     * @param {string | number} id Unique sync identifier per component.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with boolean: whether sync is needed.
     */
    isSyncNeeded(id: string | number, siteId?: string): Promise<boolean> {
        return this.getSyncTime(id, siteId).then((time) => {
            return Date.now() - this.syncInterval >= time;
        });
    }

    /**
     * Set the synchronization time.
     *
     * @param {string | number} id Unique sync identifier per component.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {number} [time] Time to set. If not defined, current time.
     * @return {Promise<any>} Promise resolved when the time is set.
     */
    setSyncTime(id: string | number, siteId?: string, time?: number): Promise<any> {
        time = typeof time != 'undefined' ? time : Date.now();

        return this.syncProvider.insertOrUpdateSyncRecord(this.component, id, { time: time }, siteId);
    }

    /**
     * Set the synchronization warnings.
     *
     * @param {string | number} id Unique sync identifier per component.
     * @param {string[]} warnings Warnings to set.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when done.
     */
    setSyncWarnings(id: string | number, warnings: string[], siteId?: string): Promise<any> {
        const warningsText = JSON.stringify(warnings || []);

        return this.syncProvider.insertOrUpdateSyncRecord(this.component, id, { warnings: warningsText }, siteId);
    }

    /**
     * Execute a sync function on selected sites.
     *
     * @param  {string} syncFunctionLog Log message to explain the sync function purpose.
     * @param  {Function} syncFunction  Sync function to execute.
     * @param  {any[]}    [params]      Array that defines the params that admit the funcion.
     * @param  {string} [siteId]        Site ID to sync. If not defined, sync all sites.
     * @return {Promise<any>}           Resolved with siteIds selected. Rejected if offline.
     */
    syncOnSites(syncFunctionLog: string, syncFunction: Function, params?: any[], siteId?: string): Promise<any> {
        if (!this.appProvider.isOnline()) {
            this.logger.debug(`Cannot sync '${syncFunctionLog}' because device is offline.`);

            return Promise.reject(null);
        }

        let promise;
        if (!siteId) {
            // No site ID defined, sync all sites.
            this.logger.debug(`Try to sync '${syncFunctionLog}' in all sites.`);
            promise = this.sitesProvider.getLoggedInSitesIds();
        } else {
            this.logger.debug(`Try to sync '${syncFunctionLog}' in site '${siteId}'.`);
            promise = Promise.resolve([siteId]);
        }

        params = params || [];

        return promise.then((siteIds) => {
            const sitePromises = [];
            siteIds.forEach((siteId) => {
                // Execute function for every site selected.
                sitePromises.push(syncFunction.apply(syncFunction, [siteId].concat(params)));
            });

            return Promise.all(sitePromises);
        });
    }

    /**
     * If there's an ongoing sync for a certain identifier, wait for it to end.
     * If there's no sync ongoing the promise will be resolved right away.
     *
     * @param {string | number} id Unique sync identifier per component.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when there's no sync going on for the identifier.
     */
    waitForSync(id: string | number, siteId?: string): Promise<any> {
        const promise = this.getOngoingSync(id, siteId);
        if (promise) {
            return promise.catch(() => {
                // Ignore errors.
            });
        }

        return Promise.resolve();
    }
}
