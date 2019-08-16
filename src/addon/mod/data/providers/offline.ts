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
import { CoreSitesProvider, CoreSiteSchema } from '@providers/sites';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreFileProvider } from '@providers/file';
import { CoreFileUploaderProvider } from '@core/fileuploader/providers/fileuploader';
import { SQLiteDB } from '@classes/sqlitedb';
import { AddonModDataSubfieldData } from './data';

/**
 * Entry action stored offline.
 */
export interface AddonModDataOfflineAction {
    dataid: number;
    courseid: number;
    groupid: number;
    action: string;
    entryid: number; // Negative for offline entries.
    fields: AddonModDataSubfieldData[];
    timemodified: number;
}

/**
 * Service to handle Offline data.
 */
@Injectable()
export class AddonModDataOfflineProvider {

    protected logger;

    // Variables for database.
    static DATA_ENTRY_TABLE = 'addon_mod_data_entry_1';
    protected siteSchema: CoreSiteSchema = {
        name: 'AddonModDataOfflineProvider',
        version: 1,
        tables: [
            {
                name: AddonModDataOfflineProvider.DATA_ENTRY_TABLE,
                columns: [
                    {
                        name: 'dataid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'courseid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'groupid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'action',
                        type: 'TEXT'
                    },
                    {
                        name: 'entryid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'fields',
                        type: 'TEXT'
                    },
                    {
                        name: 'timemodified',
                        type: 'INTEGER'
                    }
                ],
                primaryKeys: ['dataid', 'entryid', 'action']
            }
        ],
        migrate(db: SQLiteDB, oldVersion: number, siteId: string): Promise<any> | void {
            if (oldVersion == 0) {
                // Move the records from the old table.
                const newTable = AddonModDataOfflineProvider.DATA_ENTRY_TABLE;
                const oldTable = 'addon_mod_data_entry';

                return db.tableExists(oldTable).then(() => {
                    return db.insertRecordsFrom(newTable, oldTable).then(() => {
                        return db.dropTable(oldTable);
                    });
                }).catch(() => {
                    // Old table does not exist, ignore.
                });
            }
        }
    };

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private textUtils: CoreTextUtilsProvider,
            private fileProvider: CoreFileProvider, private fileUploaderProvider: CoreFileUploaderProvider,
            private utils: CoreUtilsProvider) {
        this.logger = logger.getInstance('AddonModDataOfflineProvider');
        this.sitesProvider.registerSiteSchema(this.siteSchema);
    }

    /**
     * Delete all the actions of an entry.
     *
     * @param  {number} dataId   Database ID.
     * @param  {number} entryId  Database entry ID.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}         Promise resolved if deleted, rejected if failure.
     */
    deleteAllEntryActions(dataId: number, entryId: number, siteId?: string): Promise<any> {
        return this.getEntryActions(dataId, entryId, siteId).then((actions) => {
            const promises = [];

            actions.forEach((action) => {
                promises.push(this.deleteEntry(dataId, entryId, action.action, siteId));
            });

            return Promise.all(promises);
        });
    }

    /**
     * Delete an stored entry.
     *
     * @param  {number} dataId       Database ID.
     * @param  {number} entryId      Database entry Id.
     * @param  {string} action       Action to be done
     * @param  {string} [siteId]     Site ID. If not defined, current site.
     * @return {Promise<any>}             Promise resolved if deleted, rejected if failure.
     */
    deleteEntry(dataId: number, entryId: number, action: string, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.deleteEntryFiles(dataId, entryId, action, site.id).then(() => {
                return site.getDb().deleteRecords(AddonModDataOfflineProvider.DATA_ENTRY_TABLE, {dataid: dataId, entryid: entryId,
                    action: action});
            });
        });
    }

    /**
     * Delete entry offline files.
     *
     * @param  {number} dataId Database ID.
     * @param  {number} entryId Database entry ID.
     * @param  {string} action Action to be done.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved if deleted, rejected if failure.
     */
    protected deleteEntryFiles(dataId: number, entryId: number, action: string, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.getEntry(dataId, entryId, action, site.id).then((entry) => {
                if (!entry.fields) {
                    return;
                }

                const promises = [];

                entry.fields.forEach((field) => {
                    const value = this.textUtils.parseJSON(field.value);
                    if (!value.offline) {
                        return;
                    }

                    const promise = this.getEntryFieldFolder(dataId, entryId, field.fieldid, site.id).then((folderPath) => {
                        return this.fileUploaderProvider.getStoredFiles(folderPath);
                    }).then((files) => {
                        return this.fileUploaderProvider.clearTmpFiles(files);
                    }).catch(() => {
                        // Files not found, ignore.
                    });

                    promises.push(promise);
                });

                return Promise.all(promises);
            }).catch(() => {
                // Entry not found, ignore.
            });
        });
    }

    /**
     * Get all the stored entry data from all the databases.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<AddonModDataOfflineAction[]>} Promise resolved with entries.
     */
    getAllEntries(siteId?: string): Promise<AddonModDataOfflineAction[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getAllRecords(AddonModDataOfflineProvider.DATA_ENTRY_TABLE);
        }).then((entries) => {
            return entries.map(this.parseRecord.bind(this));
        });
    }

    /**
     * Get all the stored entry actions from a certain database, sorted by modification time.
     *
     * @param  {number} dataId Database ID.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<AddonModDataOfflineAction[]>} Promise resolved with entries.
     */
    getDatabaseEntries(dataId: number, siteId?: string): Promise<AddonModDataOfflineAction[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecords(AddonModDataOfflineProvider.DATA_ENTRY_TABLE, {dataid: dataId}, 'timemodified');
        }).then((entries) => {
            return entries.map(this.parseRecord.bind(this));
        });
    }

    /**
     * Get an stored entry data.
     *
     * @param  {number} dataId      Database ID.
     * @param  {number} entryId     Database entry Id.
     * @param  {string} action      Action to be done
     * @param  {string} [siteId]    Site ID. If not defined, current site.
     * @return {Promise<AddonModDataOfflineAction>} Promise resolved with entry.
     */
    getEntry(dataId: number, entryId: number, action: string, siteId?: string): Promise<AddonModDataOfflineAction> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecord(AddonModDataOfflineProvider.DATA_ENTRY_TABLE, {dataid: dataId, entryid: entryId,
                    action: action});
        }).then((entry) => {
            return this.parseRecord(entry);
        });
    }

    /**
     * Get an all stored entry actions data.
     *
     * @param  {number} dataId      Database ID.
     * @param  {number} entryId     Database entry Id.
     * @param  {string} [siteId]    Site ID. If not defined, current site.
     * @return {Promise<AddonModDataOfflineAction[]>} Promise resolved with entry actions.
     */
    getEntryActions(dataId: number, entryId: number, siteId?: string): Promise<AddonModDataOfflineAction[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecords(AddonModDataOfflineProvider.DATA_ENTRY_TABLE, {dataid: dataId, entryid: entryId});
        }).then((entries) => {
            return entries.map(this.parseRecord.bind(this));
        });
    }

    /**
     * Check if there are offline entries to send.
     *
     * @param  {number} dataId    Database ID.
     * @param  {string} [siteId]  Site ID. If not defined, current site.
     * @return {Promise<any>}          Promise resolved with boolean: true if has offline answers, false otherwise.
     */
    hasOfflineData(dataId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.utils.promiseWorks(
                site.getDb().recordExists(AddonModDataOfflineProvider.DATA_ENTRY_TABLE, {dataid: dataId})
            );
        });
    }

    /**
     * Get the path to the folder where to store files for offline files in a database.
     *
     * @param  {number} dataId      Database ID.
     * @param  {string} [siteId]    Site ID. If not defined, current site.
     * @return {Promise<string>}    Promise resolved with the path.
     */
    protected getDatabaseFolder(dataId: number, siteId?: string): Promise<string> {
        return this.sitesProvider.getSite(siteId).then((site) => {

            const siteFolderPath = this.fileProvider.getSiteFolder(site.getId()),
                folderPath = 'offlinedatabase/' + dataId;

            return this.textUtils.concatenatePaths(siteFolderPath, folderPath);
        });
    }

    /**
     * Get the path to the folder where to store files for a new offline entry.
     *
     * @param  {number} dataId      Database ID.
     * @param  {number} entryId     The ID of the entry.
     * @param  {number} fieldId     Field ID.
     * @param  {string} [siteId]    Site ID. If not defined, current site.
     * @return {Promise<string>}    Promise resolved with the path.
     */
    getEntryFieldFolder(dataId: number, entryId: number, fieldId: number, siteId?: string): Promise<string> {
        return this.getDatabaseFolder(dataId, siteId).then((folderPath) => {
            return this.textUtils.concatenatePaths(folderPath, entryId + '_' + fieldId);
        });
    }

    /**
     * Parse "fields" of an offline record.
     *
     * @param {any} record Record object
     * @return {AddonModDataOfflineAction} Record object with columns parsed.
     */
    protected parseRecord(record: any): AddonModDataOfflineAction {
        record.fields = this.textUtils.parseJSON(record.fields);

        return record;
    }

    /**
     * Save an entry data to be sent later.
     *
     * @param  {number} dataId          Database ID.
     * @param  {number} entryId         Database entry Id. If action is add entryId should be 0 and -timemodified will be used.
     * @param  {string} action          Action to be done to the entry: [add, edit, delete, approve, disapprove]
     * @param  {number} courseId        Course ID of the database.
     * @param  {number} [groupId]       Group ID. Only provided when adding.
     * @param  {any[]}  [fields]        Array of field data of the entry if needed.
     * @param  {number} [timemodified]  The time the entry was modified. If not defined, current time.
     * @param  {string} [siteId]        Site ID. If not defined, current site.
     * @return {Promise<any>}           Promise resolved if stored, rejected if failure.
     */
    saveEntry(dataId: number, entryId: number, action: string, courseId: number, groupId?: number,
            fields?: AddonModDataSubfieldData[], timemodified?: number, siteId?: string): Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            timemodified = timemodified || new Date().getTime();
            entryId = typeof entryId == 'undefined' || entryId === null ? -timemodified : entryId;
            const entry = {
                    dataid: dataId,
                    courseid: courseId,
                    groupid: groupId,
                    action: action,
                    entryid: entryId,
                    fields: JSON.stringify(fields || []),
                    timemodified: timemodified
                };

            return site.getDb().insertRecord(AddonModDataOfflineProvider.DATA_ENTRY_TABLE, entry);
        });
    }

}
