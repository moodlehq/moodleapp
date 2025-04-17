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
import { CoreSyncBaseProvider, CoreSyncBlockedError } from '@classes/base-sync';
import { CoreFileUploader } from '@features/fileuploader/services/fileuploader';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreSync, CoreSyncResult } from '@services/sync';
import { CoreWSError } from '@classes/errors/wserror';
import { makeSingleton, Translate } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { ADDON_BLOG_AUTO_SYNCED, ADDON_BLOG_SYNC_ID } from '../constants';
import { AddonBlog, AddonBlogAddEntryOption, AddonBlogAddEntryWSParams, AddonBlogProvider } from './blog';
import { AddonBlogOffline, AddonBlogOfflineEntry } from './blog-offline';
import { AddonBlogOfflineEntryDBRecord } from './database/blog';

/**
 * Service to sync blog.
 */
 @Injectable({ providedIn: 'root' })
 export class AddonBlogSyncProvider extends CoreSyncBaseProvider<AddonBlogSyncResult> {

    protected componentTranslatableString = 'addon.blog.blog';

    constructor() {
        super('AddonBlogSyncService');
    }

     /**
      * Try to synchronize all the entries in a certain site or in all sites.
      *
      * @param siteId Site ID to sync. If not defined, sync all sites.
      * @param force Force sync.
      * @returns Promise resolved if sync is successful, rejected if sync fails.
      */
    async syncAllEntries(siteId?: string, force?: boolean): Promise<void> {
        await this.syncOnSites('All entries', (siteId) => this.syncAllEntriesFunc(siteId, !!force), siteId);
    }

    /**
     * Sync all entries on a site.
     *
     * @param siteId Site ID to sync.
     * @param force Force sync.
     */
    protected async syncAllEntriesFunc(siteId: string, force = false): Promise<void> {
        const needed = force ? true : await this.isSyncNeeded(ADDON_BLOG_SYNC_ID, siteId);

        if (!needed) {
            return;
        }

        const result = await this.syncEntriesForSite(siteId);

        if (!result.updated) {
            return;
        }

        CoreEvents.trigger(ADDON_BLOG_AUTO_SYNCED, undefined, siteId);
    }

    /**
     * Perform entries syncronization for specified site.
     *
     * @param siteId Site id.
     * @returns Syncronization result.
     */
    async syncEntriesForSite(siteId: string): Promise<AddonBlogSyncResult> {
        const currentSyncPromise = this.getOngoingSync(ADDON_BLOG_SYNC_ID, siteId);

        if (currentSyncPromise) {
            return currentSyncPromise;
        }

        this.logger.debug('Try to sync ' + ADDON_BLOG_SYNC_ID + ' in site ' + siteId);

        return await this.addOngoingSync(ADDON_BLOG_SYNC_ID, this.performEntriesSync(siteId), siteId);
    }

    /**
     * Performs entries syncronization.
     *
     * @param siteId Site ID.
     * @returns Syncronization result.
     */
    async performEntriesSync(siteId: string): Promise<AddonBlogSyncResult> {
        const { entries, result } = await this.syncEntriesToRemove(siteId);

        for (const entry of entries) {
            if (CoreSync.isBlocked(AddonBlogProvider.COMPONENT, entry.id ?? entry.created, siteId)) {
                this.logger.debug('Cannot sync entry ' + entry.created + ' because it is blocked.');

                throw new CoreSyncBlockedError(Translate.instant('core.errorsyncblocked', { $a: this.componentTranslate }));
            }

            const formattedEntry: AddonBlogAddEntryWSParams = {
                subject: entry.subject,
                summary: entry.summary,
                summaryformat: entry.summaryformat,
                options: JSON.parse(entry.options),
            };

            try {
                if (entry.id) {
                    await this.syncUpdatedEntry({ ...entry, id: entry.id, options: formattedEntry.options }, siteId);
                    result.updated = true;
                    continue;
                }

                const draftId = await this.uploadAttachments({ created: entry.created, options: formattedEntry.options }, siteId);
                const option = formattedEntry.options.find(option => option.name === 'attachmentsid');

                if (draftId) {
                    option ? option.value = draftId : formattedEntry.options.push({ name: 'attachmentsid', value: draftId });
                }

                await AddonBlog.addEntryOnline(formattedEntry, siteId);
                await AddonBlogOffline.deleteOfflineEntryRecord({ created: entry.created }, siteId);
                result.updated = true;
            } catch (error) {
                if (!CoreWSError.isWebServiceError(error)) {
                    throw error;
                }

                await AddonBlogOffline.deleteOfflineEntryRecord(entry.id ? { id: entry.id } : { created: entry.created }, siteId);
                this.addOfflineDataDeletedWarning(result.warnings, entry.subject, error);
                result.updated = true;
            }
        }

        return result;
    }

    /**
     * Sync offline blog entry.
     *
     * @param entry Entry to update.
     * @param siteId Site ID.
     */
    protected async syncUpdatedEntry(entry: AddonBlogSyncEntryToSync, siteId?: string): Promise<void> {
        const { attachmentsid } = await AddonBlog.prepareEntryForEdition({ entryid: entry.id }, siteId);
        await this.uploadAttachments({ entryId: entry.id, attachmentsId: attachmentsid, options: entry.options }, siteId);
        const optionsAttachmentsId = entry.options.find(option => option.name === 'attachmentsid');

        if (optionsAttachmentsId) {
            optionsAttachmentsId.value = attachmentsid;
        } else {
            entry.options.push({ name: 'attachmentsid', value: attachmentsid });
        }

        const { options, subject, summary, summaryformat, id } = entry;
        await AddonBlog.updateEntryOnline({ options, subject, summary, summaryformat, entryid: id }, siteId);
        await AddonBlogOffline.deleteOfflineEntryRecord({ id }, siteId);
    }

    /**
     * Upload attachments.
     *
     * @param params entry creation date or entry ID and attachments ID.
     *
     * @returns draftId.
     */
    protected async uploadAttachments(params: AddonBlogSyncUploadAttachmentsParams, siteId?: string): Promise<number | undefined> {
        const site = await CoreSites.getSite(siteId);
        const folder = 'created' in params ? { created: params.created } : { id: params.entryId };
        const offlineFiles = await AddonBlogOffline.getOfflineFiles(folder, site.id);

        if ('created' in params) {
            return await CoreFileUploader.uploadOrReuploadFiles(
                offlineFiles,
                AddonBlogProvider.COMPONENT,
                params.created,
                site.id,
            );
        }

        const { entries } = await AddonBlog.getEntries(
            { entryid: params.entryId },
            { readingStrategy: CoreSitesReadingStrategy.PREFER_NETWORK, siteId: site.id },
        );

        const onlineEntry = entries.find(entry => entry.id === params.entryId);
        const attachments = AddonBlog.getAttachmentFilesFromOptions(params.options);
        const filesToDelete = CoreFileUploader.getFilesToDelete(onlineEntry?.attachmentfiles ?? [], attachments.online);

        if (filesToDelete.length) {
            await CoreFileUploader.deleteDraftFiles(params.attachmentsId, filesToDelete, site.id);
        }

        await CoreFileUploader.uploadFiles(params.attachmentsId, [...attachments.online, ...offlineFiles], site.id);
    }

    /**
     * Sync entries to remove.
     *
     * @param siteId Site ID.
     * @returns Entries to sync avoiding removed entries and the result of the entries to remove syncronization.
     */
    protected async syncEntriesToRemove(siteId?: string): Promise<AddonBlogSyncGetPendingToSyncEntries> {
        let entriesToSync = await AddonBlogOffline.getOfflineEntries(undefined, siteId);
        const entriesToBeRemoved = await AddonBlogOffline.getEntriesToRemove(siteId);
        const warnings = [];

        await Promise.all(entriesToBeRemoved.map(async (entry) => {
            try {
                await AddonBlog.deleteEntryOnline({ entryid: entry.id }, siteId);
                await AddonBlogOffline.deleteOfflineEntryRecord({ id: entry.id }, siteId);
                await AddonBlogOffline.unmarkEntryAsRemoved(entry.id, siteId);
                const entriesPendingToSync = entriesToSync.filter(entryToSync => entryToSync.id !== entry.id);

                if (entriesPendingToSync.length !== entriesToSync.length) {
                    entriesToSync = entriesPendingToSync;
                }
            } catch (error) {
                if (!CoreWSError.isWebServiceError(error)) {
                    throw error;
                }

                await AddonBlogOffline.unmarkEntryAsRemoved(entry.id, siteId);
                this.addOfflineDataDeletedWarning(warnings, entry.subject, error);
            }
        }));

        return { entries: entriesToSync, result: { updated: entriesToBeRemoved.length > 0, warnings } };
    }

}

export const AddonBlogSync = makeSingleton(AddonBlogSyncProvider);

export type AddonBlogSyncResult = CoreSyncResult;

export type AddonBlogSyncUploadAttachmentsParams =
    ({ entryId: number; attachmentsId: number } | { created: number })
    & { options: AddonBlogAddEntryOption[] };

export type AddonBlogSyncEntryToSync = Omit<AddonBlogOfflineEntryDBRecord, 'id'|'options'>
    & { options: AddonBlogAddEntryOption[]; id: number };

export type AddonBlogSyncGetPendingToSyncEntries = { entries: AddonBlogOfflineEntry[]; result: AddonBlogSyncResult };
