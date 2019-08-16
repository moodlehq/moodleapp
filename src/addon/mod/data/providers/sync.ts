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
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSyncBaseProvider } from '@classes/base-sync';
import { CoreAppProvider } from '@providers/app';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { AddonModDataOfflineProvider, AddonModDataOfflineAction } from './offline';
import { AddonModDataProvider } from './data';
import { AddonModDataHelperProvider } from './helper';
import { CoreEventsProvider } from '@providers/events';
import { TranslateService } from '@ngx-translate/core';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseLogHelperProvider } from '@core/course/providers/log-helper';
import { CoreSyncProvider } from '@providers/sync';
import { CoreRatingSyncProvider } from '@core/rating/providers/sync';

/**
 * Service to sync databases.
 */
@Injectable()
export class AddonModDataSyncProvider extends CoreSyncBaseProvider {

    static AUTO_SYNCED = 'addon_mod_data_autom_synced';
    protected componentTranslate: string;

    constructor(protected sitesProvider: CoreSitesProvider, protected loggerProvider: CoreLoggerProvider,
            protected appProvider: CoreAppProvider, private dataOffline: AddonModDataOfflineProvider,
            private eventsProvider: CoreEventsProvider,  private dataProvider: AddonModDataProvider,
            protected translate: TranslateService, private utils: CoreUtilsProvider, courseProvider: CoreCourseProvider,
            syncProvider: CoreSyncProvider, protected textUtils: CoreTextUtilsProvider, timeUtils: CoreTimeUtilsProvider,
            private dataHelper: AddonModDataHelperProvider, private logHelper: CoreCourseLogHelperProvider,
            private ratingSync: CoreRatingSyncProvider) {
        super('AddonModDataSyncProvider', loggerProvider, sitesProvider, appProvider, syncProvider, textUtils, translate,
                timeUtils);

        this.componentTranslate = courseProvider.translateModuleName('data');
    }

    /**
     * Check if a database has data to synchronize.
     *
     * @param  {number} dataId   Database ID.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<boolean>}         Promise resolved with boolean: true if has data to sync, false otherwise.
     */
    hasDataToSync(dataId: number, siteId?: string): Promise<boolean> {
        return this.dataOffline.hasOfflineData(dataId, siteId);
    }

    /**
     * Try to synchronize all the databases in a certain site or in all sites.
     *
     * @param  {string} [siteId] Site ID to sync. If not defined, sync all sites.
     * @param {boolean} force Wether to force sync not depending on last execution.
     * @return {Promise<any>}    Promise resolved if sync is successful, rejected if sync fails.
     */
    syncAllDatabases(siteId?: string, force?: boolean): Promise<any> {
        return this.syncOnSites('all databases', this.syncAllDatabasesFunc.bind(this), [force], siteId);
    }

    /**
     * Sync all pending databases on a site.
     *
     * @param {string}  [siteId] Site ID to sync. If not defined, sync all sites.
     * @param {boolean} force    Wether to force sync not depending on last execution.
     * @param {Promise<any>}     Promise resolved if sync is successful, rejected if sync fails.
     */
    protected syncAllDatabasesFunc(siteId?: string, force?: boolean): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const promises = [];

        // Get all data answers pending to be sent in the site.
        promises.push(this.dataOffline.getAllEntries(siteId).then((offlineActions) => {
            const promises = {};

            // Do not sync same database twice.
            offlineActions.forEach((action) => {
                if (typeof promises[action.dataid] != 'undefined') {
                    return;
                }

                promises[action.dataid] = force ? this.syncDatabase(action.dataid, siteId) :
                    this.syncDatabaseIfNeeded(action.dataid, siteId);

                promises[action.dataid].then((result) => {
                    if (result && result.updated) {
                        // Sync done. Send event.
                        this.eventsProvider.trigger(AddonModDataSyncProvider.AUTO_SYNCED, {
                            dataId: action.dataid,
                            warnings: result.warnings
                        }, siteId);
                    }
                });
            });

            // Promises will be an object so, convert to an array first;
            return Promise.all(this.utils.objectToArray(promises));
        }));

        promises.push(this.syncRatings(undefined, force, siteId));

        return Promise.all(promises);
    }

    /**
     * Sync a database only if a certain time has passed since the last time.
     *
     * @param {number} dataId      Database ID.
     * @param {string} [siteId]     Site ID. If not defined, current site.
     * @return {Promise<any>}            Promise resolved when the data is synced or if it doesn't need to be synced.
     */
    syncDatabaseIfNeeded(dataId: number, siteId?: string): Promise<any> {
        return this.isSyncNeeded(dataId, siteId).then((needed) => {
            if (needed) {
                return this.syncDatabase(dataId, siteId);
            }
        });
    }

    /**
     * Synchronize a data.
     *
     * @param  {number} dataId Data ID.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}    Promise resolved if sync is successful, rejected otherwise.
     */
    syncDatabase(dataId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        if (this.isSyncing(dataId, siteId)) {
            // There's already a sync ongoing for this data and user, return the promise.
            return this.getOngoingSync(dataId, siteId);
        }

        // Verify that data isn't blocked.
        if (this.syncProvider.isBlocked(AddonModDataProvider.COMPONENT, dataId, siteId)) {
            this.logger.debug(`Cannot sync database '${dataId}' because it is blocked.`);

            return Promise.reject(this.translate.instant('core.errorsyncblocked', {$a: this.componentTranslate}));
        }

        this.logger.debug(`Try to sync data '${dataId}' in site ${siteId}'`);

        let courseId,
            data;
        const result = {
            warnings: [],
            updated: false
        };

        // Sync offline logs.
        const syncPromise = this.logHelper.syncIfNeeded(AddonModDataProvider.COMPONENT, dataId, siteId).catch(() => {
            // Ignore errors.
        }).then(() => {
            // Get answers to be sent.
            return this.dataOffline.getDatabaseEntries(dataId, siteId).catch(() => {
                // No offline data found, return empty object.
                return [];
            });
        }).then((offlineActions: AddonModDataOfflineAction[]) => {
            if (!offlineActions.length) {
                // Nothing to sync.
                return;
            }

            if (!this.appProvider.isOnline()) {
                // Cannot sync in offline.
                return Promise.reject(null);
            }

            courseId = offlineActions[0].courseid;

            // Send the answers.
            return this.dataProvider.getDatabaseById(courseId, dataId, siteId).then((database) => {
                data = database;

                const offlineEntries = {};

                offlineActions.forEach((entry) => {
                    if (typeof offlineEntries[entry.entryid] == 'undefined') {
                        offlineEntries[entry.entryid] = [];
                    }
                    offlineEntries[entry.entryid].push(entry);
                });

                const promises = this.utils.objectToArray(offlineEntries).map((entryActions) => {
                    return this.syncEntry(data, entryActions, result, siteId);
                });

                return Promise.all(promises);
            }).then(() => {
                if (result.updated) {
                    // Data has been sent to server. Now invalidate the WS calls.
                    return this.dataProvider.invalidateContent(data.cmid, courseId, siteId).catch(() => {
                        // Ignore errors.
                    });
                }
            });
        }).then(() => {
            // Sync finished, set sync time.
            return this.setSyncTime(dataId, siteId);
        }).then(() => {
            return result;
        });

        return this.addOngoingSync(dataId, syncPromise, siteId);
    }

    /**
     * Synchronize an entry.
     *
     * @param {any} data Database.
     * @param {AddonModDataOfflineAction[]} entryActions  Entry actions.
     * @param {any} result Object with the result of the sync.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved if success, rejected otherwise.
     */
    protected syncEntry(data: any, entryActions: AddonModDataOfflineAction[], result: any, siteId?: string): Promise<any> {
        let discardError,
            timePromise,
            entryId = entryActions[0].entryid,
            offlineId,
            deleted = false;

        const editAction = entryActions.find((action) => action.action == 'add' || action.action == 'edit');
        const approveAction = entryActions.find((action) => action.action == 'approve' || action.action == 'disapprove');
        const deleteAction = entryActions.find((action) => action.action == 'delete');

        if (entryId > 0) {
            timePromise = this.dataProvider.getEntry(data.id, entryId, true, siteId).then((entry) => {
                return entry.entry.timemodified;
            }).catch((error) => {
                if (error && this.utils.isWebServiceError(error)) {
                    // The WebService has thrown an error, this means the entry has been deleted.
                    return Promise.resolve(-1);
                }

                return Promise.reject(error);
            });
        } else if (editAction) {
            // New entry.
            offlineId = entryId;
            timePromise = Promise.resolve(0);
        } else {
            // New entry but the add action is missing, discard.
            timePromise = Promise.resolve(-1);
        }

        return timePromise.then((timemodified) => {
            if (timemodified < 0 || timemodified >= entryActions[0].timemodified) {
                // The entry was not found in Moodle or the entry has been modified, discard the action.
                result.updated = true;
                discardError = this.translate.instant('addon.mod_data.warningsubmissionmodified');

                return this.dataOffline.deleteAllEntryActions(data.id, entryId, siteId);
            }

            if (deleteAction) {
                return this.dataProvider.deleteEntryOnline(entryId, siteId).then(() => {
                    deleted = true;
                }).catch((error) => {
                    if (error && this.utils.isWebServiceError(error)) {
                        // The WebService has thrown an error, this means it cannot be performed. Discard.
                        discardError = this.textUtils.getErrorMessageFromError(error);
                    } else {
                        // Couldn't connect to server, reject.
                        return Promise.reject(error);
                    }
                }).then(() => {
                    // Delete the offline data.
                    result.updated = true;

                    return this.dataOffline.deleteAllEntryActions(deleteAction.dataid, deleteAction.entryid, siteId);
                });
            }

            let editPromise;

            if (editAction) {
                editPromise = Promise.all(editAction.fields.map((field) => {
                    // Upload Files if asked.
                    const value = this.textUtils.parseJSON(field.value);
                    if (value.online || value.offline) {
                        let files = value.online || [];
                        const fileProm = value.offline ?
                                this.dataHelper.getStoredFiles(editAction.dataid, entryId, field.fieldid) :
                                Promise.resolve([]);

                        return fileProm.then((offlineFiles) => {
                            files = files.concat(offlineFiles);

                            return this.dataHelper.uploadOrStoreFiles(editAction.dataid, 0, entryId, field.fieldid, files,
                                    false, siteId).then((filesResult) => {
                                field.value = JSON.stringify(filesResult);
                            });
                        });
                    }
                })).then(() => {
                    if (editAction.action == 'add') {
                        return this.dataProvider.addEntryOnline(editAction.dataid, editAction.fields, editAction.groupid, siteId)
                                .then((result) => {
                            entryId = result.newentryid;
                        });
                    } else {
                        return this.dataProvider.editEntryOnline(entryId, editAction.fields, siteId);
                    }
                }).catch((error) => {
                    if (error && this.utils.isWebServiceError(error)) {
                        // The WebService has thrown an error, this means it cannot be performed. Discard.
                        discardError = this.textUtils.getErrorMessageFromError(error);
                    } else {
                        // Couldn't connect to server, reject.
                        return Promise.reject(error);
                    }
                }).then(() => {
                    // Delete the offline data.
                    result.updated = true;

                    return this.dataOffline.deleteEntry(editAction.dataid, editAction.entryid, editAction.action, siteId);
                });
            } else {
                editPromise = Promise.resolve();
            }

            if (approveAction) {
                editPromise = editPromise.then(() => {
                    return this.dataProvider.approveEntryOnline(entryId, approveAction.action == 'approve', siteId);
                }).catch((error) => {
                    if (error && this.utils.isWebServiceError(error)) {
                        // The WebService has thrown an error, this means it cannot be performed. Discard.
                        discardError = this.textUtils.getErrorMessageFromError(error);
                    } else {
                        // Couldn't connect to server, reject.
                        return Promise.reject(error);
                    }
                }).then(() => {
                    // Delete the offline data.
                    result.updated = true;

                    return this.dataOffline.deleteEntry(approveAction.dataid, approveAction.entryid, approveAction.action, siteId);
                });
            }

            return editPromise;

        }).then(() => {
            if (discardError) {
                // Submission was discarded, add a warning.
                const message = this.translate.instant('core.warningofflinedatadeleted', {
                    component: this.componentTranslate,
                    name: data.name,
                    error: discardError
                });

                if (result.warnings.indexOf(message) == -1) {
                    result.warnings.push(message);
                }
            }

            // Sync done. Send event.
            this.eventsProvider.trigger(AddonModDataSyncProvider.AUTO_SYNCED, {
                dataId: data.id,
                entryId: entryId,
                offlineEntryId: offlineId,
                warnings: result.warnings,
                deleted: deleted
            }, siteId);
        });
    }

    /**
     * Synchronize offline ratings.
     *
     * @param {number} [cmId] Course module to be synced. If not defined, sync all databases.
     * @param {boolean} [force] Wether to force sync not depending on last execution.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved if sync is successful, rejected otherwise.
     */
    syncRatings(cmId?: number, force?: boolean, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

         return this.ratingSync.syncRatings('mod_data', 'entry', 'module', cmId, 0, force, siteId).then((results) => {
            let updated = false;
            const warnings = [];
            const promises = [];

            results.forEach((result) => {
                promises.push(this.dataProvider.getDatabase(result.itemSet.courseId, result.itemSet.instanceId, siteId)
                        .then((data) => {
                    const promises = [];

                    if (result.updated.length) {
                        updated = true;

                        // Invalidate entry of updated ratings.
                        result.updated.forEach((itemId) => {
                            promises.push(this.dataProvider.invalidateEntryData(data.id, itemId, siteId));
                        });
                    }

                    if (result.warnings.length) {
                        result.warnings.forEach((warning) => {
                            warnings.push(this.translate.instant('core.warningofflinedatadeleted', {
                                component: this.componentTranslate,
                                name: data.name,
                                error: warning
                            }));
                        });
                    }

                    return this.utils.allPromises(promises);
                }));
            });

            return Promise.all(promises).then(() => {
                return { updated, warnings };
            });
        });
    }
}
