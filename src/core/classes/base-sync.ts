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

import { CoreApp } from '@services/app';
import { CoreSites } from '@services/sites';
import { CoreSync } from '@services/sync';
import { CoreTextUtils } from '@services/utils/text';
import { CoreTimeUtils } from '@services/utils/time';
import { Translate } from '@singletons';
import { CoreLogger } from '@singletons/logger';
import { CoreAnyError, CoreError } from '@classes/errors/error';

/**
 * Blocked sync error.
 */
export class CoreSyncBlockedError extends CoreError {}

/**
 * Base class to create sync providers. It provides some common functions.
 */
export class CoreSyncBaseProvider<T = void> {

    /**
     * Logger instance.
     */
    protected logger: CoreLogger;

    /**
     * Component of the sync provider.
     */
    component = 'core';

    /**
     * Translatable component name string.
     */
    protected componentTranslatableString = 'generic component';

    /**
     * Translated name of the component.
     */
    protected componentTranslateInternal?: string;

    /**
     * Sync provider's interval.
     */
    syncInterval = 300000;

    // Store sync promises.
    protected syncPromises: { [siteId: string]: { [uniqueId: string]: Promise<T> } } = {};

    constructor(component: string) {
        this.logger = CoreLogger.getInstance(component);
        this.component = component;
    }

    /**
     * Add an offline data deleted warning to a list of warnings.
     *
     * @param warnings List of warnings.
     * @param name Instance name.
     * @param error Specific error message.
     */
    protected addOfflineDataDeletedWarning(warnings: string[], name: string, error: CoreAnyError): void {
        const warning = this.getOfflineDataDeletedWarning(name, error);

        if (warnings.indexOf(warning) == -1) {
            warnings.push(warning);
        }
    }

    /**
     * Add an ongoing sync to the syncPromises list. On finish the promise will be removed.
     *
     * @param id Unique sync identifier per component.
     * @param promise The promise of the sync to add.
     * @param siteId Site ID. If not defined, current site.
     * @return The sync promise.
     */
    async addOngoingSync(id: string | number, promise: Promise<T>, siteId?: string): Promise<T> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        if (!siteId) {
            throw new CoreError('CoreSyncBaseProvider: Site ID not supplied');
        }

        const uniqueId = this.getUniqueSyncId(id);
        if (!this.syncPromises[siteId]) {
            this.syncPromises[siteId] = {};
        }

        this.syncPromises[siteId][uniqueId] = promise;

        // Promise will be deleted when finish.
        try {
            return await promise;
        } finally {
            delete this.syncPromises[siteId!][uniqueId];
        }
    }

    /**
     * Add an offline data deleted warning to a list of warnings.
     *
     * @param name Instance name.
     * @param error Specific error message.
     * @return Warning message.
     */
    protected getOfflineDataDeletedWarning(name: string, error: CoreAnyError): string {
        return Translate.instant('core.warningofflinedatadeleted', {
            component: this.componentTranslate,
            name: name,
            error: CoreTextUtils.getErrorMessageFromError(error),
        });
    }

    /**
     * If there's an ongoing sync for a certain identifier return it.
     *
     * @param id Unique sync identifier per component.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise of the current sync or undefined if there isn't any.
     */
    getOngoingSync(id: string | number, siteId?: string): Promise<T> | undefined {
        siteId = siteId || CoreSites.getCurrentSiteId();

        if (!this.isSyncing(id, siteId)) {
            return;
        }

        // There's already a sync ongoing for this id, return the promise.
        const uniqueId = this.getUniqueSyncId(id);

        return this.syncPromises[siteId][uniqueId];
    }

    /**
     * Get the synchronization time in a human readable format.
     *
     * @param id Unique sync identifier per component.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the readable time.
     */
    async getReadableSyncTime(id: string | number, siteId?: string): Promise<string> {
        const time = await this.getSyncTime(id, siteId);

        return this.getReadableTimeFromTimestamp(time);
    }

    /**
     * Given a timestamp return it in a human readable format.
     *
     * @param timestamp Timestamp
     * @return Human readable time.
     */
    getReadableTimeFromTimestamp(timestamp: number): string {
        if (!timestamp) {
            return Translate.instant('core.never');
        } else {
            return CoreTimeUtils.userDate(timestamp);
        }
    }

    /**
     * Get the synchronization time. Returns 0 if no time stored.
     *
     * @param id Unique sync identifier per component.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the time.
     */
    async getSyncTime(id: string | number, siteId?: string): Promise<number> {
        try {
            const entry = await CoreSync.getSyncRecord(this.component, id, siteId);

            return entry.time;
        } catch {
            return 0;
        }
    }

    /**
     * Get the synchronization warnings of an instance.
     *
     * @param id Unique sync identifier per component.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the warnings.
     */
    async getSyncWarnings(id: string | number, siteId?: string): Promise<string[]> {
        try {
            const entry = await CoreSync.getSyncRecord(this.component, id, siteId);

            return <string[]> CoreTextUtils.parseJSON(entry.warnings, []);
        } catch {
            return [];
        }
    }

    /**
     * Create a unique identifier from component and id.
     *
     * @param id Unique sync identifier per component.
     * @return Unique identifier from component and id.
     */
    protected getUniqueSyncId(id: string | number): string {
        return this.component + '#' + id;
    }

    /**
     * Check if a there's an ongoing syncronization for the given id.
     *
     * @param id Unique sync identifier per component.
     * @param siteId Site ID. If not defined, current site.
     * @return Whether it's synchronizing.
     */
    isSyncing(id: string | number, siteId?: string): boolean {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const uniqueId = this.getUniqueSyncId(id);

        return !!(this.syncPromises[siteId] && this.syncPromises[siteId][uniqueId]);
    }

    /**
     * Check if a sync is needed: if a certain time has passed since the last time.
     *
     * @param id Unique sync identifier per component.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with boolean: whether sync is needed.
     */
    async isSyncNeeded(id: string | number, siteId?: string): Promise<boolean> {
        const time = await this.getSyncTime(id, siteId);

        return Date.now() - this.syncInterval >= time;
    }

    /**
     * Set the synchronization time.
     *
     * @param id Unique sync identifier per component.
     * @param siteId Site ID. If not defined, current site.
     * @param time Time to set. If not defined, current time.
     * @return Promise resolved when the time is set.
     */
    async setSyncTime(id: string | number, siteId?: string, time?: number): Promise<void> {
        time = typeof time != 'undefined' ? time : Date.now();

        await CoreSync.insertOrUpdateSyncRecord(this.component, id, { time: time }, siteId);
    }

    /**
     * Set the synchronization warnings.
     *
     * @param id Unique sync identifier per component.
     * @param warnings Warnings to set.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async setSyncWarnings(id: string | number, warnings: string[], siteId?: string): Promise<void> {
        const warningsText = JSON.stringify(warnings || []);

        await CoreSync.insertOrUpdateSyncRecord(this.component, id, { warnings: warningsText }, siteId);
    }

    /**
     * Execute a sync function on selected sites.
     *
     * @param syncFunctionLog Log message to explain the sync function purpose.
     * @param syncFunction Sync function to execute.
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @return Resolved with siteIds selected. Rejected if offline.
     */
    async syncOnSites(syncFunctionLog: string, syncFunction: (siteId: string) => void, siteId?: string): Promise<void> {
        if (!CoreApp.isOnline()) {
            const message = `Cannot sync '${syncFunctionLog}' because device is offline.`;
            this.logger.debug(message);

            throw new CoreError(message);
        }

        let siteIds: string[] = [];

        if (!siteId) {
            // No site ID defined, sync all sites.
            this.logger.debug(`Try to sync '${syncFunctionLog}' in all sites.`);
            siteIds = await CoreSites.getLoggedInSitesIds();
        } else {
            this.logger.debug(`Try to sync '${syncFunctionLog}' in site '${siteId}'.`);
            siteIds = [siteId];
        }

        // Execute function for every site.
        await Promise.all(siteIds.map((siteId) => syncFunction(siteId)));
    }

    /**
     * If there's an ongoing sync for a certain identifier, wait for it to end.
     * If there's no sync ongoing the promise will be resolved right away.
     *
     * @param id Unique sync identifier per component.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when there's no sync going on for the identifier.
     */
    async waitForSync(id: string | number, siteId?: string): Promise<T | undefined> {
        const promise = this.getOngoingSync(id, siteId);

        if (!promise) {
            return;
        }

        try {
            return await promise;
        } catch {
            return;
        }
    }

    /**
     * Get component name translated.
     *
     * @return Component name translated.
     */
    protected get componentTranslate(): string {
        if (!this.componentTranslateInternal) {
            this.componentTranslateInternal = Translate.instant(this.componentTranslatableString);
        }

        return this.componentTranslateInternal!;
    }

}
