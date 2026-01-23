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
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreRatingSync } from '@features/rating/services/rating-sync';
import { CoreNetwork } from '@services/network';
import { CoreSites } from '@services/sites';
import { CoreSync, CoreSyncResult } from '@services/sync';
import { CoreWSError } from '@classes/errors/wserror';
import { makeSingleton, Translate } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { AddonModGlossary } from './glossary';
import { AddonModGlossaryHelper } from './glossary-helper';
import { AddonModGlossaryOffline, AddonModGlossaryOfflineEntry } from './glossary-offline';
import { CoreFileUploader } from '@features/fileuploader/services/fileuploader';
import { CoreFileEntry } from '@services/file-helper';
import { ADDON_MOD_GLOSSARY_COMPONENT, ADDON_MOD_GLOSSARY_COMPONENT_LEGACY, GLOSSARY_AUTO_SYNCED } from '../constants';
import { CorePromiseUtils } from '@singletons/promise-utils';

/**
 * Service to sync glossaries.
 */
@Injectable({ providedIn: 'root' })
export class AddonModGlossarySyncProvider extends CoreCourseActivitySyncBaseProvider<AddonModGlossarySyncResult> {

    protected componentTranslatableString = 'glossary';

    constructor() {
        super('AddonModGlossarySyncProvider');
    }

    /**
     * Try to synchronize all the glossaries in a certain site or in all sites.
     *
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @param force Wether to force sync not depending on last execution.
     */
    async syncAllGlossaries(siteId?: string, force?: boolean): Promise<void> {
        await this.syncOnSites('all glossaries', (siteId) => this.syncAllGlossariesFunc(!!force, siteId), siteId);
    }

    /**
     * Sync all glossaries on a site.
     *
     * @param force Wether to force sync not depending on last execution.
     * @param siteId Site ID to sync.
     */
    protected async syncAllGlossariesFunc(force: boolean, siteId: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        await Promise.all([
            this.syncAllGlossariesEntries(force, siteId),
            this.syncRatings(undefined, force, siteId),
        ]);
    }

    /**
     * Sync entries of all glossaries on a site.
     *
     * @param force Wether to force sync not depending on last execution.
     * @param siteId Site ID to sync.
     */
    protected async syncAllGlossariesEntries(force: boolean, siteId: string): Promise<void> {
        const entries = await AddonModGlossaryOffline.getAllOfflineEntries(siteId);

        // Do not sync same glossary twice.
        const treated: Record<number, boolean> = {};

        await Promise.all(entries.map(async (entry) => {
            if (treated[entry.glossaryid]) {
                return;
            }

            treated[entry.glossaryid] = true;

            const result = force ?
                await this.syncGlossaryEntries(entry.glossaryid, entry.userid, siteId) :
                await this.syncGlossaryEntriesIfNeeded(entry.glossaryid, entry.userid, siteId);

            if (result?.updated) {
                // Sync successful, send event.
                CoreEvents.trigger(GLOSSARY_AUTO_SYNCED, {
                    glossaryId: entry.glossaryid,
                    userId: entry.userid,
                    warnings: result.warnings,
                }, siteId);
            }
        }));
    }

    /**
     * Sync a glossary only if a certain time has passed since the last time.
     *
     * @param glossaryId Glossary ID.
     * @param userId User the entry belong to.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the glossary is synced or if it doesn't need to be synced.
     */
    async syncGlossaryEntriesIfNeeded(
        glossaryId: number,
        userId: number,
        siteId?: string,
    ): Promise<AddonModGlossarySyncResult | undefined> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const syncId = this.getGlossarySyncId(glossaryId, userId);

        const needed = await this.isSyncNeeded(syncId, siteId);

        if (needed) {
            return this.syncGlossaryEntries(glossaryId, userId, siteId);
        }
    }

    /**
     * Synchronize all offline entries of a glossary.
     *
     * @param glossaryId Glossary ID to be synced.
     * @param userId User the entries belong to.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if sync is successful, rejected otherwise.
     */
    syncGlossaryEntries(glossaryId: number, userId?: number, siteId?: string): Promise<AddonModGlossarySyncResult> {
        userId = userId || CoreSites.getCurrentSiteUserId();
        siteId = siteId || CoreSites.getCurrentSiteId();

        const syncId = this.getGlossarySyncId(glossaryId, userId);
        const currentSyncPromise = this.getOngoingSync(syncId, siteId);
        if (currentSyncPromise) {
            // There's already a sync ongoing for this glossary, return the promise.
            return currentSyncPromise;
        }

        // Verify that glossary isn't blocked.
        if (CoreSync.isBlocked(ADDON_MOD_GLOSSARY_COMPONENT, syncId, siteId)) {
            this.logger.debug(`Cannot sync glossary ${glossaryId} because it is blocked.`);

            throw new CoreSyncBlockedError(Translate.instant('core.errorsyncblocked', { $a: this.componentTranslate }));
        }

        this.logger.debug(`Try to sync glossary ${glossaryId} for user ${userId}`);

        const syncPromise = this.performSyncGlossaryEntries(glossaryId, userId, siteId);

        return this.addOngoingSync(syncId, syncPromise, siteId);
    }

    protected async performSyncGlossaryEntries(
        glossaryId: number,
        userId: number,
        siteId: string,
    ): Promise<AddonModGlossarySyncResult> {
        const result: AddonModGlossarySyncResult = {
            warnings: [],
            updated: false,
        };
        const syncId = this.getGlossarySyncId(glossaryId, userId);

        // Sync offline logs.
        await CorePromiseUtils.ignoreErrors(
            CoreCourseLogHelper.syncActivity(ADDON_MOD_GLOSSARY_COMPONENT_LEGACY, glossaryId, siteId),
        );

        // Get offline responses to be sent.
        const entries = await CorePromiseUtils.ignoreErrors(
            AddonModGlossaryOffline.getGlossaryOfflineEntries(glossaryId, siteId, userId),
            <AddonModGlossaryOfflineEntry[]> [],
        );

        if (!entries.length) {
            // Nothing to sync.
            await CorePromiseUtils.ignoreErrors(this.setSyncTime(syncId, siteId));

            return result;
        } else if (!CoreNetwork.isOnline()) {
            // Cannot sync in offline.
            throw new CoreNetworkError();
        }

        let courseId: number | undefined;

        await Promise.all(entries.map(async (data) => {
            courseId = courseId || data.courseid;

            try {
                // First of all upload the attachments (if any).
                const itemId = await this.uploadAttachments(glossaryId, data, siteId);

                // Now try to add the entry.
                await AddonModGlossary.addEntryOnline(glossaryId, data.concept, data.definition, data.options, itemId, siteId);

                result.updated = true;

                await this.deleteAddEntry(glossaryId, data.concept, data.timecreated, siteId);
            } catch (error) {
                if (!CoreWSError.isWebServiceError(error)) {
                    // Couldn't connect to server, reject.
                    throw error;
                }

                // The WebService has thrown an error, this means that responses cannot be submitted. Delete them.
                result.updated = true;

                await this.deleteAddEntry(glossaryId, data.concept, data.timecreated, siteId);

                // Responses deleted, add a warning.
                this.addOfflineDataDeletedWarning(result.warnings, data.concept, error);
            }
        }));

        if (result.updated && courseId) {
            // Data has been sent to server. Now invalidate the WS calls.
            try {
                const glossary = await AddonModGlossary.getGlossaryById(courseId, glossaryId);

                await AddonModGlossary.invalidateGlossaryEntries(glossary, true);
            } catch {
                // Ignore errors.
            }
        }

        // Sync finished, set sync time.
        await CorePromiseUtils.ignoreErrors(this.setSyncTime(syncId, siteId));

        return result;
    }

    /**
     * Synchronize offline ratings.
     *
     * @param cmId Course module to be synced. If not defined, sync all glossaries.
     * @param force Wether to force sync not depending on last execution.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if sync is successful, rejected otherwise.
     */
    async syncRatings(cmId?: number, force?: boolean, siteId?: string): Promise<AddonModGlossarySyncResult> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const results = await CoreRatingSync.syncRatings('mod_glossary', 'entry', ContextLevel.MODULE, cmId, 0, force, siteId);

        let updated = false;
        const warnings: string[] = [];

        await CorePromiseUtils.allPromises(results.map(async (result) => {
            if (result.updated.length) {
                updated = true;

                // Invalidate entry of updated ratings.
                await Promise.all(result.updated.map((itemId) => AddonModGlossary.invalidateEntry(itemId, siteId)));
            }

            if (result.warnings.length) {
                const glossary = await AddonModGlossary.getGlossary(result.itemSet.courseId, result.itemSet.instanceId, { siteId });

                result.warnings.forEach((warning) => {
                    this.addOfflineDataDeletedWarning(warnings, glossary.name, warning);
                });
            }
        }));

        return { updated, warnings };
    }

    /**
     * Delete a new entry.
     *
     * @param glossaryId Glossary ID.
     * @param concept Glossary entry concept.
     * @param timeCreated Time to allow duplicated entries.
     * @param siteId Site ID. If not defined, current site.
     */
    protected async deleteAddEntry(glossaryId: number, concept: string, timeCreated: number, siteId?: string): Promise<void> {
        await Promise.all([
            AddonModGlossaryOffline.deleteOfflineEntry(glossaryId, timeCreated, siteId),
            AddonModGlossaryHelper.deleteStoredFiles(glossaryId, concept, timeCreated, siteId),
        ]);
    }

    /**
     * Upload attachments of an offline entry.
     *
     * @param glossaryId Glossary ID.
     * @param entry Offline entry.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with draftid if uploaded, resolved with 0 if nothing to upload.
     */
    protected async uploadAttachments(glossaryId: number, entry: AddonModGlossaryOfflineEntry, siteId?: string): Promise<number> {
        if (!entry.attachments) {
            // No attachments.
            return 0;
        }

        // Has some attachments to sync.
        let files: CoreFileEntry[] = entry.attachments.online || [];

        if (entry.attachments.offline) {
            // Has offline files.
            const storedFiles = await CorePromiseUtils.ignoreErrors(
                AddonModGlossaryHelper.getStoredFiles(glossaryId, entry.concept, entry.timecreated, siteId),
                [], // Folder not found, no files to add.
            );

            files = files.concat(storedFiles);
        }

        return CoreFileUploader.uploadOrReuploadFiles(files, ADDON_MOD_GLOSSARY_COMPONENT_LEGACY, glossaryId, siteId);
    }

    /**
     * Get the ID of a glossary sync.
     *
     * @param glossaryId Glossary ID.
     * @param userId User the entries belong to.. If not defined, current user.
     * @returns Sync ID.
     */
    protected getGlossarySyncId(glossaryId: number, userId?: number): string {
        userId = userId || CoreSites.getCurrentSiteUserId();

        return `glossary#${glossaryId}#${userId}`;
    }

}

export const AddonModGlossarySync = makeSingleton(AddonModGlossarySyncProvider);

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [GLOSSARY_AUTO_SYNCED]: AddonModGlossaryAutoSyncedData;
    }

}

/**
 * Data returned by a glossary sync.
 */
export type AddonModGlossarySyncResult = CoreSyncResult;

/**
 * Data passed to GLOSSARY_AUTO_SYNCED event.
 */
export type AddonModGlossaryAutoSyncedData = {
    glossaryId: number;
    userId: number;
    warnings: string[];
};
