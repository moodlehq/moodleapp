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
import { CoreFileUploader } from '@features/fileuploader/services/fileuploader';
import { CoreFile } from '@services/file';
import { CoreFileEntry } from '@services/file-helper';
import { CoreSites } from '@services/sites';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { makeSingleton } from '@singletons';
import { CoreObject } from '@singletons/object';
import { CorePath } from '@singletons/path';
import { AddonBlogFilter } from './blog';
import {
    AddonBlogOfflineEntryDBRecord,
    OFFLINE_BLOG_ENTRIES_REMOVED_TABLE_NAME,
    OFFLINE_BLOG_ENTRIES_TABLE_NAME,
} from './database/blog';

/**
 * Service to handle offline blog.
 */
@Injectable({ providedIn: 'root' })
export class AddonBlogOfflineService {

    /**
     * Delete an offline entry.
     *
     * @param params Entry creation date or ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if deleted, rejected if failure.
     */
    async deleteOfflineEntryRecord(params: AddonBlogOfflineParams, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        const conditions = 'id' in params ? { id: params.id } : { created: params.created };
        await site.getDb().deleteRecords(OFFLINE_BLOG_ENTRIES_TABLE_NAME, conditions);
    }

    /**
     * Mark entry to be removed.
     *
     * @param id Entry ID.
     * @param siteId Site ID.
     *
     * @returns Promise resolved if stored, rejected if failure.
     */
    async markEntryAsRemoved(params: { id: number; subject: string }, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        await site.getDb().insertRecord(OFFLINE_BLOG_ENTRIES_REMOVED_TABLE_NAME, params);
    }

    /**
     * Unmark entry to be removed.
     *
     * @param id Entry ID.
     * @param siteId Site ID.
     *
     * @returns Promise resolved if stored, rejected if failure.
     */
    async unmarkEntryAsRemoved(id: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        await site.getDb().deleteRecords(OFFLINE_BLOG_ENTRIES_REMOVED_TABLE_NAME, { id });
    }

    /**
     * Retrieves entries pending to be removed.
     *
     * @param siteId Site ID.
     *
     * @returns list of entries to remove.
     */
    async getEntriesToRemove(siteId?: string): Promise<{ id: number; subject: string }[]> {
        const site = await CoreSites.getSite(siteId);

        return await site.getDb().getAllRecords<{ id: number; subject: string }>(OFFLINE_BLOG_ENTRIES_REMOVED_TABLE_NAME);
    }

    /**
     * Save an offline entry to be sent later.
     *
     * @param entry Entry.
     * @param siteId Site ID.
     *
     * @returns Promise resolved if stored, rejected if failure.
     */
    async addOfflineEntry(entry: AddonBlogOfflineEntry, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        await site.getDb().insertRecord(OFFLINE_BLOG_ENTRIES_TABLE_NAME, { ...entry, id: entry.id ?? -entry.created });
    }

    /**
     * Retrieves if there are any offline entry.
     *
     * @param filter Entry id.
     *
     * @returns Has offline entries.
     */
    async getOfflineEntry(filter: { id?: number; created?: number }, siteId?: string): Promise<AddonBlogOfflineEntry | undefined> {
        const site = await CoreSites.getSite(siteId);
        const record = await CorePromiseUtils.ignoreErrors(
            site.getDb().getRecord<AddonBlogOfflineEntry>(OFFLINE_BLOG_ENTRIES_TABLE_NAME, filter),
        );

        if (record && 'id' in record && record.id && record.id < 0) {
            delete record.id;
        }

        return record;
    }

    /**
     * Retrieves offline entries.
     *
     * @param filters Filters.
     * @param siteId Site ID.
     *
     * @returns Offline entries.
     */
    async getOfflineEntries(filters: AddonBlogFilter = {}, siteId?: string): Promise<AddonBlogOfflineEntry[]> {
        const { entryid: id, userid } = filters;
        const site = await CoreSites.getSite(siteId);
        const records = await site.getDb().getRecords<AddonBlogOfflineEntry>(
            OFFLINE_BLOG_ENTRIES_TABLE_NAME,
            CoreObject.withoutUndefined({ id, userid }),
        );

        return records.map(record => {
            if ('id' in record && record.id && record.id < 0) {
                delete record.id;
            }

            return record;
        });
    }

    /**
     * Get offline entry files folder path.
     *
     * @param params Entry creation date or entry ID.
     * @returns path.
     */
    async getOfflineEntryFilesFolderPath(params: AddonBlogOfflineParams, siteId?: string): Promise<string> {
        const site = await CoreSites.getSite(siteId);
        const siteFolderPath = CoreFile.getSiteFolder(site.id);
        const folder = 'created' in params ? `created-${params.created}` : params.id;

        return CorePath.concatenatePaths(siteFolderPath, `offlineblog/${folder}`);
    }

    /**
     * Retrieve a list of offline files stored.
     *
     * @param folderName Folder name.
     * @param siteId Site ID.
     * @returns Offline files for the provided folder name.
     */
    async getOfflineFiles(folderName: AddonBlogOfflineParams, siteId?: string): Promise<CoreFileEntry[]> {
        try {
            const folderPath = await AddonBlogOffline.getOfflineEntryFilesFolderPath(folderName, siteId);

            return await CoreFileUploader.getStoredFiles(folderPath);
        } catch (error) {
            return [];
        }
    }

}

export type AddonBlogOfflineParams = { id: number } | { created: number };

export type AddonBlogOfflineEntry = Omit<AddonBlogOfflineEntryDBRecord, 'id'> & { id?: number };

export const AddonBlogOffline = makeSingleton(AddonBlogOfflineService);
