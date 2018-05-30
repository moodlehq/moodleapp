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
import { AddonModDataOfflineProvider } from './offline';
import { AddonModDataProvider } from './data';
import { AddonModDataHelperProvider } from './helper';
import { CoreEventsProvider } from '@providers/events';
import { TranslateService } from '@ngx-translate/core';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreSyncProvider } from '@providers/sync';

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
            syncProvider: CoreSyncProvider, protected textUtils: CoreTextUtilsProvider,
            private dataHelper: AddonModDataHelperProvider) {
        super('AddonModDataSyncProvider', loggerProvider, sitesProvider, appProvider, syncProvider, textUtils, translate);
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
     * @return {Promise<any>}    Promise resolved if sync is successful, rejected if sync fails.
     */
    syncAllDatabases(siteId?: string): Promise<any> {
        return this.syncOnSites('all databases', this.syncAllDatabasesFunc.bind(this), undefined, siteId);
    }

    /**
     * Sync all pending databases on a site.
     * @param  {string} [siteId] Site ID to sync. If not defined, sync all sites.
     * @param {Promise<any>}     Promise resolved if sync is successful, rejected if sync fails.
     */
    protected syncAllDatabasesFunc(siteId?: string): Promise<any> {
        // Get all data answers pending to be sent in the site.
        return this.dataOffline.getAllEntries(siteId).then((offlineActions) => {
            const promises = {};

            // Do not sync same database twice.
            offlineActions.forEach((action) => {
                if (typeof promises[action.dataid] != 'undefined') {
                    return;
                }

                promises[action.dataid] = this.syncDatabaseIfNeeded(action.dataid, siteId)
                        .then((result) => {
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
        });
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

        // Get answers to be sent.
        const syncPromise = this.dataOffline.getDatabaseEntries(dataId, siteId).catch(() => {
            // No offline data found, return empty object.
            return [];
        }).then((offlineActions) => {
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
     * @param  {any} data          Database.
     * @param  {any} entryActions  Entry actions.
     * @param  {any} result        Object with the result of the sync.
     * @param  {string} [siteId]   Site ID. If not defined, current site.
     * @return {Promise<any>}      Promise resolved if success, rejected otherwise.
     */
    protected syncEntry(data: any, entryActions: any[], result: any, siteId?: string): Promise<any> {
        let discardError,
            timePromise,
            entryId = 0,
            offlineId,
            deleted = false;

        const promises = [];

        // Sort entries by timemodified.
        entryActions = entryActions.sort((a: any, b: any) => a.timemodified - b.timemodified);

        entryId = entryActions[0].entryid;

        if (entryId > 0) {
            timePromise = this.dataProvider.getEntry(data.id, entryId, siteId).then((entry) => {
                return entry.entry.timemodified;
            }).catch(() => {
                return -1;
            });
        } else {
            offlineId = entryId;
            timePromise = Promise.resolve(0);
        }

        return timePromise.then((timemodified) => {
            if (timemodified < 0 || timemodified >= entryActions[0].timemodified) {
                // The entry was not found in Moodle or the entry has been modified, discard the action.
                result.updated = true;
                discardError = this.translate.instant('addon.mod_data.warningsubmissionmodified');

                return this.dataOffline.deleteAllEntryActions(data.id, entryId, siteId);
            }

            entryActions.forEach((action) => {
                let actionPromise;
                const proms = [];

                entryId = action.entryid > 0 ? action.entryid : entryId;

                if (action.fields) {
                    action.fields.forEach((field) => {
                        // Upload Files if asked.
                        const value = this.textUtils.parseJSON(field.value);
                        if (value.online || value.offline) {
                            let files = value.online || [];
                            const fileProm = value.offline ? this.dataHelper.getStoredFiles(action.dataid, entryId, field.fieldid) :
                                    Promise.resolve([]);

                            proms.push(fileProm.then((offlineFiles) => {
                                files = files.concat(offlineFiles);

                                return this.dataHelper.uploadOrStoreFiles(action.dataid, 0, entryId, field.fieldid, files, false,
                                        siteId).then((filesResult) => {
                                    field.value = JSON.stringify(filesResult);
                                });
                            }));
                        }
                    });
                }

                actionPromise = Promise.all(proms).then(() => {
                    // Perform the action.
                    switch (action.action) {
                        case 'add':
                            return this.dataProvider.addEntryOnline(action.dataid, action.fields, data.groupid, siteId)
                                    .then((result) => {
                                entryId = result.newentryid;
                            });
                        case 'edit':
                            return this.dataProvider.editEntryOnline(entryId, action.fields, siteId);
                        case 'approve':
                            return this.dataProvider.approveEntryOnline(entryId, true, siteId);
                        case 'disapprove':
                            return this.dataProvider.approveEntryOnline(entryId, false, siteId);
                        case 'delete':
                            return this.dataProvider.deleteEntryOnline(entryId, siteId).then(() => {
                                deleted = true;
                            });
                        default:
                            break;
                    }
                });

                promises.push(actionPromise.catch((error) => {
                    if (error && error.wserror) {
                        // The WebService has thrown an error, this means it cannot be performed. Discard.
                        discardError = error.error;
                    } else {
                        // Couldn't connect to server, reject.
                        return Promise.reject(error && error.error);
                    }
                }).then(() => {
                    // Delete the offline data.
                    result.updated = true;

                    return this.dataOffline.deleteEntry(action.dataid, action.entryid, action.action, siteId);
                }));
            });

            return Promise.all(promises);
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

}
