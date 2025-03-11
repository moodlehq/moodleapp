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
import { CoreFileUploaderStoreFilesResult } from '@features/fileuploader/services/fileuploader';
import { CoreFile } from '@services/file';
import { CoreSites } from '@services/sites';
import { CoreText } from '@singletons/text';
import { makeSingleton } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { CorePath } from '@singletons/path';
import { AddonModGlossaryOfflineEntryDBRecord, OFFLINE_ENTRIES_TABLE_NAME } from './database/glossary';
import { AddonModGlossaryEntryOption } from './glossary';
import { ADDON_MOD_GLOSSARY_ENTRY_DELETED, ADDON_MOD_GLOSSARY_ENTRY_ADDED, ADDON_MOD_GLOSSARY_ENTRY_UPDATED } from '../constants';

/**
 * Service to handle offline glossary.
 */
@Injectable({ providedIn: 'root' })
export class AddonModGlossaryOfflineProvider {

    /**
     * Delete an offline entry.
     *
     * @param glossaryId Glossary ID.
     * @param timecreated The time the entry was created.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if deleted, rejected if failure.
     */
    async deleteOfflineEntry(glossaryId: number, timecreated: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const conditions: Partial<AddonModGlossaryOfflineEntryDBRecord> = {
            glossaryid: glossaryId,
            timecreated: timecreated,
        };

        await site.getDb().deleteRecords(OFFLINE_ENTRIES_TABLE_NAME, conditions);

        CoreEvents.trigger(ADDON_MOD_GLOSSARY_ENTRY_DELETED, { glossaryId, timecreated });
    }

    /**
     * Get all the stored offline entries from all the glossaries.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with entries.
     */
    async getAllOfflineEntries(siteId?: string): Promise<AddonModGlossaryOfflineEntry[]> {
        const site = await CoreSites.getSite(siteId);

        const records = await site.getDb().getRecords<AddonModGlossaryOfflineEntryDBRecord>(OFFLINE_ENTRIES_TABLE_NAME);

        return records.map(record => this.parseRecord(record));
    }

    /**
     * Get a stored offline entry.
     *
     * @param glossaryId Glossary ID.
     * @param timeCreated The time the entry was created.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with entry.
     */
    async getOfflineEntry(
        glossaryId: number,
        timeCreated: number,
        siteId?: string,
    ): Promise<AddonModGlossaryOfflineEntry> {
        const site = await CoreSites.getSite(siteId);

        const conditions: Partial<AddonModGlossaryOfflineEntryDBRecord> = {
            glossaryid: glossaryId,
            timecreated: timeCreated,
        };

        const record = await site.getDb().getRecord<AddonModGlossaryOfflineEntryDBRecord>(OFFLINE_ENTRIES_TABLE_NAME, conditions);

        return this.parseRecord(record);
    }

    /**
     * Get all the stored add entry data from a certain glossary.
     *
     * @param glossaryId Glossary ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the entries belong to. If not defined, current user in site.
     * @returns Promise resolved with entries.
     */
    async getGlossaryOfflineEntries(glossaryId: number, siteId?: string, userId?: number): Promise<AddonModGlossaryOfflineEntry[]> {
        const site = await CoreSites.getSite(siteId);

        const conditions: Partial<AddonModGlossaryOfflineEntryDBRecord> = {
            glossaryid: glossaryId,
            userid: userId || site.getUserId(),
        };

        const records = await site.getDb().getRecords<AddonModGlossaryOfflineEntryDBRecord>(OFFLINE_ENTRIES_TABLE_NAME, conditions);

        return records.map(record => this.parseRecord(record));
    }

    /**
     * Check if a concept is used offline.
     *
     * @param glossaryId Glossary ID.
     * @param concept Concept to check.
     * @param timeCreated Time of the entry we are editing.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with true if concept is found, false otherwise.
     */
    async isConceptUsed(glossaryId: number, concept: string, timeCreated?: number, siteId?: string): Promise<boolean> {
        try {
            const site = await CoreSites.getSite(siteId);

            const conditions: Partial<AddonModGlossaryOfflineEntryDBRecord> = {
                glossaryid: glossaryId,
                concept: concept,
            };

            const entries =
                await site.getDb().getRecords<AddonModGlossaryOfflineEntryDBRecord>(OFFLINE_ENTRIES_TABLE_NAME, conditions);

            if (!entries.length) {
                return false;
            }

            if (entries.length > 1 || !timeCreated) {
                return true;
            }

            // If there's only one entry, check that is not the one we are editing.
            return entries[0].timecreated !== timeCreated;
        } catch {
            // No offline data found, return false.
            return false;
        }
    }

    /**
     * Save an offline entry to be sent later.
     *
     * @param glossaryId Glossary ID.
     * @param concept Glossary entry concept.
     * @param definition Glossary entry concept definition.
     * @param courseId Course ID of the glossary.
     * @param timecreated The time the entry was created. If not defined, current time.
     * @param options Options for the entry.
     * @param attachments Result of CoreFileUploaderProvider#storeFilesToUpload for attachments.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the entry belong to. If not defined, current user in site.
     * @returns Promise resolved if stored, rejected if failure.
     */
    async addOfflineEntry(
        glossaryId: number,
        concept: string,
        definition: string,
        courseId: number,
        timecreated: number,
        options?: Record<string, AddonModGlossaryEntryOption>,
        attachments?: CoreFileUploaderStoreFilesResult,
        siteId?: string,
        userId?: number,
    ): Promise<false> {
        const site = await CoreSites.getSite(siteId);

        const entry: AddonModGlossaryOfflineEntryDBRecord = {
            glossaryid: glossaryId,
            courseid: courseId,
            concept: concept,
            definition: definition,
            definitionformat: 'html',
            options: JSON.stringify(options || {}),
            attachments: JSON.stringify(attachments),
            userid: userId || site.getUserId(),
            timecreated,
        };

        await site.getDb().insertRecord(OFFLINE_ENTRIES_TABLE_NAME, entry);

        CoreEvents.trigger(ADDON_MOD_GLOSSARY_ENTRY_ADDED, { glossaryId, timecreated }, siteId);

        return false;
    }

    /**
     * Update an offline entry to be sent later.
     *
     * @param originalEntry Original entry data.
     * @param concept Glossary entry concept.
     * @param definition Glossary entry concept definition.
     * @param options Options for the entry.
     * @param attachments Result of CoreFileUploaderProvider#storeFilesToUpload for attachments.
     */
    async updateOfflineEntry(
        originalEntry: Pick< AddonModGlossaryOfflineEntryDBRecord, 'glossaryid'|'courseid'|'concept'|'timecreated'>,
        concept: string,
        definition: string,
        options?: Record<string, AddonModGlossaryEntryOption>,
        attachments?: CoreFileUploaderStoreFilesResult,
    ): Promise<void> {
        const site = await CoreSites.getSite();
        const entry: Omit<AddonModGlossaryOfflineEntryDBRecord, 'courseid'|'glossaryid'|'userid'|'timecreated'> = {
            concept: concept,
            definition: definition,
            definitionformat: 'html',
            options: JSON.stringify(options || {}),
            attachments: JSON.stringify(attachments),
        };

        await site.getDb().updateRecords(OFFLINE_ENTRIES_TABLE_NAME, entry, {
            ...originalEntry,
            userid: site.getUserId(),
        });

        CoreEvents.trigger(ADDON_MOD_GLOSSARY_ENTRY_UPDATED, {
            glossaryId: originalEntry.glossaryid,
            timecreated: originalEntry.timecreated,
        });
    }

    /**
     * Get the path to the folder where to store files for offline attachments in a glossary.
     *
     * @param glossaryId Glossary ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the path.
     */
    async getGlossaryFolder(glossaryId: number, siteId?: string): Promise<string> {
        const site = await CoreSites.getSite(siteId);

        const siteFolderPath = CoreFile.getSiteFolder(site.getId());
        const folderPath = `offlineglossary/${glossaryId}`;

        return CorePath.concatenatePaths(siteFolderPath, folderPath);
    }

    /**
     * Get the path to the folder where to store files for an offline entry.
     *
     * @param glossaryId Glossary ID.
     * @param concept The name of the entry.
     * @param timeCreated Time to allow duplicated entries.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the path.
     */
    async getEntryFolder(glossaryId: number, concept: string, timeCreated: number, siteId?: string): Promise<string> {
        const folderPath = await this.getGlossaryFolder(glossaryId, siteId);

        return CorePath.concatenatePaths(folderPath, `newentry_${concept}_${timeCreated}`);
    }

    /**
     * Parse "options" and "attachments" columns of a fetched record.
     *
     * @param record Record object
     * @returns Record object with columns parsed.
     */
    protected parseRecord(record: AddonModGlossaryOfflineEntryDBRecord): AddonModGlossaryOfflineEntry {
        return Object.assign(record, {
            options: <Record<string, AddonModGlossaryEntryOption>> CoreText.parseJSON(record.options),
            attachments: record.attachments ?
                <CoreFileUploaderStoreFilesResult> CoreText.parseJSON(record.attachments) : undefined,
        });
    }

}

export const AddonModGlossaryOffline = makeSingleton(AddonModGlossaryOfflineProvider);

/**
 * Glossary offline entry with parsed data.
 */
export type AddonModGlossaryOfflineEntry = Omit<AddonModGlossaryOfflineEntryDBRecord, 'options'|'attachments'> & {
    options: Record<string, AddonModGlossaryEntryOption>;
    attachments?: CoreFileUploaderStoreFilesResult;
};
