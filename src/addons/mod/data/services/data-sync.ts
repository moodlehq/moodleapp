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

import { ContextLevel } from '@/core/constants';
import { Injectable } from '@angular/core';
import { CoreSyncBlockedError } from '@classes/base-sync';
import { CoreNetworkError } from '@classes/errors/network-error';
import { CoreCourseActivitySyncBaseProvider } from '@features/course/classes/activity-sync';
import { CoreCourseCommonModWSOptions } from '@features/course/services/course';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreFileUploaderStoreFilesResult } from '@features/fileuploader/services/fileuploader';
import { CoreRatingSync } from '@features/rating/services/rating-sync';
import { CoreNetwork } from '@services/network';
import { CoreFileEntry } from '@services/file-helper';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreSync, CoreSyncResult } from '@services/sync';
import { CoreErrorHelper } from '@services/error-helper';
import { CoreObject } from '@singletons/object';
import { Translate, makeSingleton } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { AddonModData, AddonModDataData } from './data';
import { AddonModDataHelper } from './data-helper';
import { AddonModDataOffline, AddonModDataOfflineAction } from './data-offline';
import { ADDON_MOD_DATA_AUTO_SYNCED, ADDON_MOD_DATA_COMPONENT, AddonModDataAction } from '../constants';
import { CoreText } from '@singletons/text';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreWSError } from '@classes/errors/wserror';

/**
 * Service to sync databases.
 */
@Injectable({ providedIn: 'root' })
export class AddonModDataSyncProvider extends CoreCourseActivitySyncBaseProvider<AddonModDataSyncResult> {

    protected componentTranslatableString = 'data';

    constructor() {
        super('AddonModDataSyncProvider');
    }

    /**
     * Check if a database has data to synchronize.
     *
     * @param dataId Database ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: true if has data to sync, false otherwise.
     */
    hasDataToSync(dataId: number, siteId?: string): Promise<boolean> {
        return AddonModDataOffline.hasOfflineData(dataId, siteId);
    }

    /**
     * Try to synchronize all the databases in a certain site or in all sites.
     *
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @param force Wether to force sync not depending on last execution.
     * @returns Promise resolved if sync is successful, rejected if sync fails.
     */
    syncAllDatabases(siteId?: string, force?: boolean): Promise<void> {
        return this.syncOnSites('all databases', (siteId) => this.syncAllDatabasesFunc(!!force, siteId), siteId);
    }

    /**
     * Sync all pending databases on a site.
     *
     * @param force Wether to force sync not depending on last execution.
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @returns Promise resolved if sync is successful, rejected if sync fails.
     */
    protected async syncAllDatabasesFunc(force: boolean, siteId: string): Promise<void> {
        const promises: Promise<unknown>[] = [];

        // Get all data answers pending to be sent in the site.
        promises.push(AddonModDataOffline.getAllEntries(siteId).then(async (offlineActions) => {
            // Get data id.
            let dataIds: number[] = offlineActions.map((action) => action.dataid);
            // Get unique values.
            dataIds = dataIds.filter((id, pos) => dataIds.indexOf(id) == pos);

            const entriesPromises = dataIds.map(async (dataId) => {
                const result = force
                    ? await this.syncDatabase(dataId, siteId)
                    : await this.syncDatabaseIfNeeded(dataId, siteId);

                if (result && result.updated) {
                    // Sync done. Send event.
                    CoreEvents.trigger(ADDON_MOD_DATA_AUTO_SYNCED, {
                        dataId: dataId,
                        warnings: result.warnings,
                    }, siteId);
                }
            });

            await Promise.all(entriesPromises);

            return;
        }));

        promises.push(this.syncRatings(undefined, force, siteId));

        await Promise.all(promises);
    }

    /**
     * Sync a database only if a certain time has passed since the last time.
     *
     * @param dataId Database ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is synced or if it doesn't need to be synced.
     */
    async syncDatabaseIfNeeded(dataId: number, siteId?: string): Promise<AddonModDataSyncResult | undefined> {
        const needed = await this.isSyncNeeded(dataId, siteId);

        if (needed) {
            return this.syncDatabase(dataId, siteId);
        }
    }

    /**
     * Synchronize a data.
     *
     * @param dataId Data ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if sync is successful, rejected otherwise.
     */
    syncDatabase(dataId: number, siteId?: string): Promise<AddonModDataSyncResult> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const currentSyncPromise = this.getOngoingSync(dataId, siteId);
        if (currentSyncPromise) {
            // There's already a sync ongoing for this database, return the promise.
            return currentSyncPromise;
        }

        // Verify that database isn't blocked.
        if (CoreSync.isBlocked(ADDON_MOD_DATA_COMPONENT, dataId, siteId)) {
            this.logger.debug(`Cannot sync database '${dataId}' because it is blocked.`);

            throw new CoreSyncBlockedError(Translate.instant('core.errorsyncblocked', { $a: this.componentTranslate }));
        }

        this.logger.debug(`Try to sync data '${dataId}' in site ${siteId}'`);

        const syncPromise = this.performSyncDatabase(dataId, siteId);

        return this.addOngoingSync(dataId, syncPromise, siteId);
    }

    /**
     * Perform the database syncronization.
     *
     * @param dataId Data ID.
     * @param siteId Site ID.
     * @returns Promise resolved if sync is successful, rejected otherwise.
     */
    protected async performSyncDatabase(dataId: number, siteId: string): Promise<AddonModDataSyncResult> {
        // Sync offline logs.
        await CorePromiseUtils.ignoreErrors(
            CoreCourseLogHelper.syncActivity(ADDON_MOD_DATA_COMPONENT, dataId, siteId),
        );

        const result: AddonModDataSyncResult = {
            warnings: [],
            updated: false,
        };

        // Get answers to be sent.
        const offlineActions: AddonModDataOfflineAction[] =
            await CorePromiseUtils.ignoreErrors(AddonModDataOffline.getDatabaseEntries(dataId, siteId), []);

        if (!offlineActions.length) {
            // Nothing to sync.
            await CorePromiseUtils.ignoreErrors(this.setSyncTime(dataId, siteId));

            return result;
        }

        if (!CoreNetwork.isOnline()) {
            // Cannot sync in offline.
            throw new CoreNetworkError();
        }

        const courseId = offlineActions[0].courseid;

        // Send the answers.
        const database = await AddonModData.getDatabaseById(courseId, dataId, { siteId });

        const offlineEntries: Record<number, AddonModDataOfflineAction[]> = {};

        offlineActions.forEach((entry) => {
            if (offlineEntries[entry.entryid] === undefined) {
                offlineEntries[entry.entryid] = [];
            }

            offlineEntries[entry.entryid].push(entry);
        });

        const promises = CoreObject.toArray(offlineEntries).map((entryActions) =>
            this.syncEntry(database, entryActions, result, siteId));

        await Promise.all(promises);

        if (result.updated) {
            // Data has been sent to server. Now invalidate the WS calls.
            await CorePromiseUtils.ignoreErrors(AddonModData.invalidateContent(database.coursemodule, courseId, siteId));
        }

        // Sync finished, set sync time.
        await CorePromiseUtils.ignoreErrors(this.setSyncTime(dataId, siteId));

        return result;
    }

    /**
     * Synchronize an entry.
     *
     * @param database Database.
     * @param entryActions Entry actions.
     * @param result Object with the result of the sync.
     * @param siteId Site ID.
     * @returns Promise resolved if success, rejected otherwise.
     */
    protected async syncEntry(
        database: AddonModDataData,
        entryActions: AddonModDataOfflineAction[],
        result: AddonModDataSyncResult,
        siteId: string,
    ): Promise<void> {
        const syncEntryResult = await this.performSyncEntry(database, entryActions, result, siteId);

        if (syncEntryResult.discardError) {
            // Submission was discarded, add a warning.
            this.addOfflineDataDeletedWarning(result.warnings, database.name, syncEntryResult.discardError);
        }

        // Sync done. Send event.
        CoreEvents.trigger(ADDON_MOD_DATA_AUTO_SYNCED, {
            dataId: database.id,
            entryId: syncEntryResult.entryId,
            offlineEntryId: syncEntryResult.offlineId,
            warnings: result.warnings,
            deleted: syncEntryResult.deleted,
        }, siteId);
    }

    /**
     * Perform the synchronization of an entry.
     *
     * @param database Database.
     * @param entryActions Entry actions.
     * @param result Object with the result of the sync.
     * @param siteId Site ID.
     * @returns Promise resolved if success, rejected otherwise.
     */
    protected async performSyncEntry(
        database: AddonModDataData,
        entryActions: AddonModDataOfflineAction[],
        result: AddonModDataSyncResult,
        siteId: string,
    ): Promise<AddonModDataSyncEntryResult> {
        let entryId = entryActions[0].entryid;

        const entryResult: AddonModDataSyncEntryResult = {
            deleted: false,
            entryId: entryId,
        };

        const editAction = entryActions.find((action) =>
            action.action == AddonModDataAction.ADD || action.action == AddonModDataAction.EDIT);
        const approveAction = entryActions.find((action) =>
            action.action == AddonModDataAction.APPROVE || action.action == AddonModDataAction.DISAPPROVE);
        const deleteAction = entryActions.find((action) => action.action == AddonModDataAction.DELETE);

        const options: CoreCourseCommonModWSOptions = {
            cmId: database.coursemodule,
            readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
            siteId,
        };

        let timemodified = 0;
        if (entryId > 0) {
            try {
                const entry = await AddonModData.getEntry(database.id, entryId, options);

                timemodified = entry.entry.timemodified;
            } catch (error) {
                if (CoreWSError.isWebServiceError(error)) {
                    // The WebService has thrown an error, this means the entry has been deleted.
                    timemodified = -1;
                } else {
                    throw error;
                }
            }

        } else if (editAction) {
            // New entry.
            entryResult.offlineId = entryId;
            timemodified = 0;
        } else {
            // New entry but the add action is missing, discard.
            timemodified = -1;
        }

        if (timemodified < 0 || timemodified >= entryActions[0].timemodified) {
            // The entry was not found in Moodle or the entry has been modified, discard the action.
            result.updated = true;
            entryResult.discardError = Translate.instant('addon.mod_data.warningsubmissionmodified');

            await AddonModDataOffline.deleteAllEntryActions(database.id, entryId, siteId);

            return entryResult;
        }

        if (deleteAction) {
            try {
                await AddonModData.deleteEntryOnline(entryId, siteId);
                entryResult.deleted = true;
            } catch (error) {
                if (CoreWSError.isWebServiceError(error)) {
                    // The WebService has thrown an error, this means it cannot be performed. Discard.
                    entryResult.discardError = CoreErrorHelper.getErrorMessageFromError(error);
                } else {
                    // Couldn't connect to server, reject.
                    throw error;
                }
            }

            // Delete the offline data.
            result.updated = true;

            await AddonModDataOffline.deleteAllEntryActions(deleteAction.dataid, deleteAction.entryid, siteId);

            return entryResult;
        }

        if (editAction) {
            try {
                await Promise.all(editAction.fields.map(async (field) => {
                    // Upload Files if asked.
                    const value = CoreText.parseJSON<CoreFileUploaderStoreFilesResult | null>(field.value || '', null);
                    if (value && (value.online || value.offline)) {
                        let files: CoreFileEntry[] = value.online || [];

                        const offlineFiles = value.offline
                            ? await AddonModDataHelper.getStoredFiles(editAction.dataid, entryId, field.fieldid)
                            : [];

                        files = files.concat(offlineFiles);

                        const filesResult = await AddonModDataHelper.uploadOrStoreFiles(
                            editAction.dataid,
                            0,
                            entryId,
                            field.fieldid,
                            files,
                            false,
                            siteId,
                        );

                        field.value = JSON.stringify(filesResult);
                    }
                }));

                if (editAction.action == AddonModDataAction.ADD) {
                    const result = await AddonModData.addEntryOnline(
                        editAction.dataid,
                        editAction.fields,
                        editAction.groupid,
                        siteId,
                    );
                    entryId = result.newentryid;
                    entryResult.entryId = entryId;
                } else {
                    await AddonModData.editEntryOnline(entryId, editAction.fields, siteId);
                }
            } catch (error) {
                if (CoreWSError.isWebServiceError(error)) {
                    // The WebService has thrown an error, this means it cannot be performed. Discard.
                    entryResult.discardError = CoreErrorHelper.getErrorMessageFromError(error);
                } else {
                    // Couldn't connect to server, reject.
                    throw error;
                }
            }
            // Delete the offline data.
            result.updated = true;

            await AddonModDataOffline.deleteEntry(editAction.dataid, editAction.entryid, editAction.action, siteId);
        }

        if (approveAction) {
            try {
                await AddonModData.approveEntryOnline(entryId, approveAction.action == AddonModDataAction.APPROVE, siteId);
            } catch (error) {
                if (CoreWSError.isWebServiceError(error)) {
                    // The WebService has thrown an error, this means it cannot be performed. Discard.
                    entryResult.discardError = CoreErrorHelper.getErrorMessageFromError(error);
                } else {
                    // Couldn't connect to server, reject.
                    throw error;
                }
            }
            // Delete the offline data.
            result.updated = true;

            await AddonModDataOffline.deleteEntry(approveAction.dataid, approveAction.entryid, approveAction.action, siteId);
        }

        return entryResult;
    }

    /**
     * Synchronize offline ratings.
     *
     * @param cmId Course module to be synced. If not defined, sync all databases.
     * @param force Wether to force sync not depending on last execution.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if sync is successful, rejected otherwise.
     */
    async syncRatings(cmId?: number, force?: boolean, siteId?: string): Promise<AddonModDataSyncResult> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const results = await CoreRatingSync.syncRatings('mod_data', 'entry', ContextLevel.MODULE, cmId, 0, force, siteId);
        let updated = false;
        const warnings = [];

        const promises = results.map((result) =>
            AddonModData.getDatabase(result.itemSet.courseId, result.itemSet.instanceId, { siteId })
                .then((database) => {
                    const subPromises: Promise<void>[] = [];

                    if (result.updated.length) {
                        updated = true;

                        // Invalidate entry of updated ratings.
                        result.updated.forEach((itemId) => {
                            subPromises.push(AddonModData.invalidateEntryData(database.id, itemId, siteId));
                        });
                    }

                    if (result.warnings.length) {
                        result.warnings.forEach((warning) => {
                            this.addOfflineDataDeletedWarning(warnings, database.name, warning);
                        });
                    }

                    return CorePromiseUtils.allPromises(subPromises);
                }));

        await Promise.all(promises);

        return ({ updated, warnings });
    }

}
export const AddonModDataSync = makeSingleton(AddonModDataSyncProvider);

/**
 * Data returned by a database sync.
 */
export type AddonModDataSyncEntryResult = {
    discardError?: string;
    offlineId?: number;
    entryId: number;
    deleted: boolean;
};

/**
 * Data returned by a database sync.
 */
export type AddonModDataSyncResult = CoreSyncResult;

export type AddonModDataAutoSyncData = {
    dataId: number;
    warnings: string[];
    entryId?: number;
    offlineEntryId?: number;
    deleted?: boolean;
};

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [ADDON_MOD_DATA_AUTO_SYNCED]: AddonModDataAutoSyncData;
    }
}
