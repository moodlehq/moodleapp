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

import { CoreSitesProvider } from '../providers/sites';
import { CoreSyncProvider } from '../providers/sync';

/**
 * Base class to create sync providers. It provides some common functions.
 */
export class CoreSyncBaseProvider {
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

    constructor(private sitesProvider: CoreSitesProvider) { }

    /**
     * Add an ongoing sync to the syncPromises list. On finish the promise will be removed.
     *
     * @param {number} id Unique sync identifier per component.
     * @param {Promise<any>} promise The promise of the sync to add.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} The sync promise.
     */
    addOngoingSync(id: number, promise: Promise<any>, siteId?: string): Promise<any> {
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
     * @param {number} id Unique sync identifier per component.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise of the current sync or undefined if there isn't any.
     */
    getOngoingSync(id: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        if (this.isSyncing(id, siteId)) {
            // There's already a sync ongoing for this discussion, return the promise.
            const uniqueId = this.getUniqueSyncId(id);

            return this.syncPromises[siteId][uniqueId];
        }
    }

    /**
     * Get the synchronization time. Returns 0 if no time stored.
     *
     * @param {number} id Unique sync identifier per component.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<number>} Promise resolved with the time.
     */
    getSyncTime(id: number, siteId?: string): Promise<number> {
        return this.sitesProvider.getSiteDb(siteId).then((db) => {
            return db.getRecord(CoreSyncProvider.SYNC_TABLE, { component: this.component, id: id }).then((entry) => {
                return entry.time;
            }).catch(() => {
                return 0;
            });
        });
    }

    /**
     * Get the synchronization warnings of an instance.
     *
     * @param {number} id Unique sync identifier per component.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<string[]>} Promise resolved with the warnings.
     */
    getSyncWarnings(id: number, siteId?: string): Promise<string[]> {
        return this.sitesProvider.getSiteDb(siteId).then((db) => {
            return db.getRecord(CoreSyncProvider.SYNC_TABLE, { component: this.component, id: id }).then((entry) => {
                try {
                    return JSON.parse(entry.warnings);
                } catch (ex) {
                    return [];
                }
            }).catch(() => {
                return [];
            });
        });
    }

    /**
     * Create a unique identifier from component and id.
     *
     * @param {number} id Unique sync identifier per component.
     * @return {string} Unique identifier from component and id.
     */
    protected getUniqueSyncId(id: number): string {
        return this.component + '#' + id;
    }

    /**
     * Check if a there's an ongoing syncronization for the given id.
     *
     * @param {number} id Unique sync identifier per component.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {boolean} Whether it's synchronizing.
     */
    isSyncing(id: number, siteId?: string): boolean {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const uniqueId = this.getUniqueSyncId(id);

        return !!(this.syncPromises[siteId] && this.syncPromises[siteId][uniqueId]);
    }

    /**
     * Check if a sync is needed: if a certain time has passed since the last time.
     *
     * @param {number} id Unique sync identifier per component.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with boolean: whether sync is needed.
     */
    isSyncNeeded(id: number, siteId?: string): Promise<boolean> {
        return this.getSyncTime(id, siteId).then((time) => {
            return Date.now() - this.syncInterval >= time;
        });
    }

    /**
     * Set the synchronization time.
     *
     * @param {number} id Unique sync identifier per component.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {number} [time] Time to set. If not defined, current time.
     * @return {Promise<any>} Promise resolved when the time is set.
     */
    setSyncTime(id: number, siteId?: string, time?: number): Promise<any> {
        return this.sitesProvider.getSiteDb(siteId).then((db) => {
            time = typeof time != 'undefined' ? time : Date.now();

            return db.insertOrUpdateRecord(CoreSyncProvider.SYNC_TABLE, { time: time }, { component: this.component, id: id });
        });
    }

    /**
     * Set the synchronization warnings.
     *
     * @param {number} id Unique sync identifier per component.
     * @param {string[]} warnings Warnings to set.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when done.
     */
    setSyncWarnings(id: number, warnings: string[], siteId?: string): Promise<any> {
        return this.sitesProvider.getSiteDb(siteId).then((db) => {
            warnings = warnings || [];

            return db.insertOrUpdateRecord(CoreSyncProvider.SYNC_TABLE, { warnings: JSON.stringify(warnings) },
                { component: this.component, id: id });
        });
    }

    /**
     * If there's an ongoing sync for a certain identifier, wait for it to end.
     * If there's no sync ongoing the promise will be resolved right away.
     *
     * @param {number} id Unique sync identifier per component.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when there's no sync going on for the identifier.
     */
    waitForSync(id: number, siteId?: string): Promise<any> {
        const promise = this.getOngoingSync(id, siteId);
        if (promise) {
            return promise.catch(() => {
                // Ignore errors.
            });
        }

        return Promise.resolve();
    }
}
