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
import { CoreFileUploader, CoreFileUploaderStoreFilesResult } from '@features/fileuploader/services/fileuploader';
import { CoreFile } from '@services/file';
import { CoreSites } from '@services/sites';
import { CoreText } from '@singletons/text';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { makeSingleton } from '@singletons';
import { CorePath } from '@singletons/path';
import { AddonModDataEntryWSField } from './data';
import { AddonModDataEntryDBRecord, DATA_ENTRY_TABLE } from './database/data';
import { AddonModDataAction } from '../constants';

/**
 * Service to handle Offline data.
 */
@Injectable({ providedIn: 'root' })
export class AddonModDataOfflineProvider {

    /**
     * Delete all the actions of an entry.
     *
     * @param dataId Database ID.
     * @param entryId Database entry ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if deleted, rejected if failure.
     */
    async deleteAllEntryActions(dataId: number, entryId: number, siteId?: string): Promise<void> {
        const actions = await this.getEntryActions(dataId, entryId, siteId);

        const promises = actions.map((action) => {
            this.deleteEntry(dataId, entryId, action.action, siteId);
        });

        await Promise.all(promises);
    }

    /**
     * Delete an stored entry.
     *
     * @param dataId Database ID.
     * @param entryId Database entry Id.
     * @param action Action to be done
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if deleted, rejected if failure.
     */
    async deleteEntry(dataId: number, entryId: number, action: AddonModDataAction, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await this.deleteEntryFiles(dataId, entryId, action, site.id);

        await site.getDb().deleteRecords(DATA_ENTRY_TABLE, {
            dataid: dataId,
            entryid: entryId,
            action,
        });
    }

    /**
     * Delete entry offline files.
     *
     * @param dataId Database ID.
     * @param entryId Database entry ID.
     * @param action Action to be done.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if deleted, rejected if failure.
     */
    protected async deleteEntryFiles(dataId: number, entryId: number, action: AddonModDataAction, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        const entry = await CorePromiseUtils.ignoreErrors(this.getEntry(dataId, entryId, action, site.id));

        if (!entry || !entry.fields) {
            // Entry not found or no fields, ignore.
            return;
        }

        const promises: Promise<void>[] = [];

        entry.fields.forEach((field) => {
            const value = CoreText.parseJSON<CoreFileUploaderStoreFilesResult | null>(field.value, null);

            if (!value || !value.offline) {
                return;
            }

            const promise = this.getEntryFieldFolder(dataId, entryId, field.fieldid, site.id).then((folderPath) =>
                CoreFileUploader.getStoredFiles(folderPath)).then((files) =>
                CoreFileUploader.clearTmpFiles(files)).catch(() => { // Files not found, ignore.
            });

            promises.push(promise);
        });

        await Promise.all(promises);
    }

    /**
     * Get all the stored entry data from all the databases.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with entries.
     */
    async getAllEntries(siteId?: string): Promise<AddonModDataOfflineAction[]> {
        const site = await CoreSites.getSite(siteId);
        const entries = await site.getDb().getAllRecords<AddonModDataEntryDBRecord>(DATA_ENTRY_TABLE);

        return entries.map((entry) => this.parseRecord(entry));
    }

    /**
     * Get all the stored entry actions from a certain database, sorted by modification time.
     *
     * @param dataId Database ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with entries.
     */
    async getDatabaseEntries(dataId: number, siteId?: string): Promise<AddonModDataOfflineAction[]> {
        const site = await CoreSites.getSite(siteId);
        const entries = await site.getDb().getRecords<AddonModDataEntryDBRecord>(
            DATA_ENTRY_TABLE,
            { dataid: dataId },
            'timemodified',
        );

        return entries.map((entry) => this.parseRecord(entry));
    }

    /**
     * Get an stored entry data.
     *
     * @param dataId Database ID.
     * @param entryId Database entry Id.
     * @param action Action to be done
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with entry.
     */
    async getEntry(
        dataId: number,
        entryId: number,
        action: AddonModDataAction,
        siteId?: string,
    ): Promise<AddonModDataOfflineAction> {
        const site = await CoreSites.getSite(siteId);

        const entry = await site.getDb().getRecord<AddonModDataEntryDBRecord>(DATA_ENTRY_TABLE, {
            dataid: dataId, entryid: entryId,
            action,
        });

        return this.parseRecord(entry);
    }

    /**
     * Get an all stored entry actions data.
     *
     * @param dataId Database ID.
     * @param entryId Database entry Id.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with entry actions.
     */
    async getEntryActions(dataId: number, entryId: number, siteId?: string): Promise<AddonModDataOfflineAction[]> {
        const site = await CoreSites.getSite(siteId);
        const entries = await site.getDb().getRecords<AddonModDataEntryDBRecord>(
            DATA_ENTRY_TABLE,
            { dataid: dataId, entryid: entryId },
        );

        return entries.map((entry) => this.parseRecord(entry));
    }

    /**
     * Check if there are offline entries to send.
     *
     * @param dataId Database ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: true if has offline answers, false otherwise.
     */
    async hasOfflineData(dataId: number, siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return CorePromiseUtils.promiseWorks(
            site.getDb().recordExists(DATA_ENTRY_TABLE, { dataid: dataId }),
        );
    }

    /**
     * Get the path to the folder where to store files for offline files in a database.
     *
     * @param dataId Database ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the path.
     */
    protected async getDatabaseFolder(dataId: number, siteId?: string): Promise<string> {
        const site = await CoreSites.getSite(siteId);
        const siteFolderPath = CoreFile.getSiteFolder(site.getId());
        const folderPath = 'offlinedatabase/' + dataId;

        return CorePath.concatenatePaths(siteFolderPath, folderPath);
    }

    /**
     * Get the path to the folder where to store files for a new offline entry.
     *
     * @param dataId Database ID.
     * @param entryId The ID of the entry.
     * @param fieldId Field ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the path.
     */
    async getEntryFieldFolder(dataId: number, entryId: number, fieldId: number, siteId?: string): Promise<string> {
        const folderPath = await this.getDatabaseFolder(dataId, siteId);

        return CorePath.concatenatePaths(folderPath, entryId + '_' + fieldId);
    }

    /**
     * Parse "fields" of an offline record.
     *
     * @param record Record object
     * @returns Record object with columns parsed.
     */
    protected parseRecord(record: AddonModDataEntryDBRecord): AddonModDataOfflineAction {
        return Object.assign(record, {
            fields: CoreText.parseJSON<AddonModDataEntryWSField[]>(record.fields),
        });
    }

    /**
     * Save an entry data to be sent later.
     *
     * @param dataId Database ID.
     * @param entryId Database entry Id. If action is add entryId should be 0 and -timemodified will be used.
     * @param action Action to be done to the entry: [add, edit, delete, approve, disapprove]
     * @param courseId Course ID of the database.
     * @param groupId Group ID. Only provided when adding.
     * @param fields Array of field data of the entry if needed.
     * @param timemodified The time the entry was modified. If not defined, current time.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if stored, rejected if failure.
     */
    async saveEntry(
        dataId: number,
        entryId: number,
        action: AddonModDataAction,
        courseId: number,
        groupId = 0,
        fields?: AddonModDataEntryWSField[],
        timemodified?: number,
        siteId?: string,
    ): Promise<AddonModDataEntryDBRecord> {
        const site = await CoreSites.getSite(siteId);

        timemodified = timemodified || Date.now();
        entryId = entryId === undefined || entryId === null ? -timemodified : entryId;

        const entry: AddonModDataEntryDBRecord = {
            dataid: dataId,
            courseid: courseId,
            groupid: groupId,
            action,
            entryid: entryId,
            fields: JSON.stringify(fields || []),
            timemodified,
        };

        await site.getDb().insertRecord(DATA_ENTRY_TABLE, entry);

        return entry;
    }

}
export const AddonModDataOffline = makeSingleton(AddonModDataOfflineProvider);

/**
 * Entry action stored offline.
 */
export type AddonModDataOfflineAction = Omit<AddonModDataEntryDBRecord, 'fields'> & {
    fields: AddonModDataEntryWSField[];
};
