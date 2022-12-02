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
import { CoreNetworkError } from '@classes/errors/network-error';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreNetwork } from '@services/network';
import { CoreGroups } from '@services/groups';
import { CoreSites } from '@services/sites';
import { CoreSync } from '@services/sync';
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton, Translate } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { AddonModWikiPageDBRecord } from './database/wiki';
import { AddonModWiki, AddonModWikiProvider } from './wiki';
import { AddonModWikiOffline } from './wiki-offline';

/**
 * Service to sync wikis.
 */
@Injectable({ providedIn: 'root' })
export class AddonModWikiSyncProvider extends CoreSyncBaseProvider<AddonModWikiSyncSubwikiResult> {

    static readonly AUTO_SYNCED = 'addon_mod_wiki_autom_synced';
    static readonly MANUAL_SYNCED = 'addon_mod_wiki_manual_synced';

    protected componentTranslatableString = 'wiki';

    constructor() {
        super('AddonModWikiSyncProvider');
    }

    /**
     * Get a string to identify a subwiki. If it doesn't have a subwiki ID it will be identified by wiki ID, user ID and group ID.
     *
     * @param subwikiId Subwiki ID. If not defined, wikiId, userId and groupId should be defined.
     * @param wikiId Wiki ID. Optional, will be used to create the subwiki if subwiki ID not provided.
     * @param userId User ID. Optional, will be used to create the subwiki if subwiki ID not provided.
     * @param groupId Group ID. Optional, will be used to create the subwiki if subwiki ID not provided.
     * @returns Identifier.
     */
    getSubwikiBlockId(subwikiId?: number, wikiId?: number, userId?: number, groupId?: number): string {
        subwikiId = AddonModWikiOffline.convertToPositiveNumber(subwikiId);

        if (subwikiId && subwikiId > 0) {
            return String(subwikiId);
        }

        wikiId = AddonModWikiOffline.convertToPositiveNumber(wikiId);
        userId = AddonModWikiOffline.convertToPositiveNumber(userId);
        groupId = AddonModWikiOffline.convertToPositiveNumber(groupId);

        return `${wikiId}:${userId}:${groupId}`;
    }

    /**
     * Try to synchronize all the wikis in a certain site or in all sites.
     *
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @param force Wether to force sync not depending on last execution.
     * @returns Promise resolved if sync is successful, rejected if sync fails.
     */
    syncAllWikis(siteId?: string, force?: boolean): Promise<void> {
        return this.syncOnSites('all wikis', (siteId) => this.syncAllWikisFunc(!!force, siteId), siteId);
    }

    /**
     * Sync all wikis on a site.
     *
     * @param force Wether to force sync not depending on last execution.
     * @param siteId Site ID to sync.
     * @returns Promise resolved if sync is successful, rejected if sync fails.
     */
    protected async syncAllWikisFunc(force: boolean, siteId: string): Promise<void> {
        // Get all the pages created in offline.
        const pages = await AddonModWikiOffline.getAllNewPages(siteId);

        const subwikis: Record<string, boolean> = {};

        // Sync all subwikis.
        await Promise.all(pages.map(async (page) => {
            const index = this.getSubwikiBlockId(page.subwikiid, page.wikiid, page.userid, page.groupid);

            if (subwikis[index]) {
                // Already synced.
                return;
            }

            subwikis[index] = true;

            const result = force ?
                await this.syncSubwiki(page.subwikiid, page.wikiid, page.userid, page.groupid, siteId) :
                await this.syncSubwikiIfNeeded(page.subwikiid, page.wikiid, page.userid, page.groupid, siteId);

            if (result?.updated) {
                // Sync successful, send event.
                CoreEvents.trigger(AddonModWikiSyncProvider.AUTO_SYNCED, {
                    siteId: siteId,
                    subwikiId: page.subwikiid,
                    wikiId: page.wikiid,
                    userId: page.userid,
                    groupId: page.groupid,
                    created: result.created,
                    discarded: result.discarded,
                    warnings: result.warnings,
                });
            }
        }));
    }

    /**
     * Sync a subwiki only if a certain time has passed since the last time.
     *
     * @param subwikiId Subwiki ID. If not defined, wikiId, userId and groupId should be defined.
     * @param wikiId Wiki ID. Optional, will be used to create the subwiki if subwiki ID not provided.
     * @param userId User ID. Optional, will be used to create the subwiki if subwiki ID not provided.
     * @param groupId Group ID. Optional, will be used to create the subwiki if subwiki ID not provided.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when subwiki is synced or doesn't need to be synced.
     */
    async syncSubwikiIfNeeded(
        subwikiId: number,
        wikiId?: number,
        userId?: number,
        groupId?: number,
        siteId?: string,
    ): Promise<AddonModWikiSyncSubwikiResult | undefined> {

        const blockId = this.getSubwikiBlockId(subwikiId, wikiId, userId, groupId);

        const needed = await this.isSyncNeeded(blockId, siteId);

        if (needed) {
            return this.syncSubwiki(subwikiId, wikiId, userId, groupId, siteId);
        }
    }

    /**
     * Synchronize a subwiki.
     *
     * @param subwikiId Subwiki ID. If not defined, wikiId, userId and groupId should be defined.
     * @param wikiId Wiki ID. Optional, will be used to create the subwiki if subwiki ID not provided.
     * @param userId User ID. Optional, will be used to create the subwiki if subwiki ID not provided.
     * @param groupId Group ID. Optional, will be used to create the subwiki if subwiki ID not provided.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if sync is successful, rejected otherwise.
     */
    syncSubwiki(
        subwikiId: number,
        wikiId?: number,
        userId?: number,
        groupId?: number,
        siteId?: string,
    ): Promise<AddonModWikiSyncSubwikiResult> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const subwikiBlockId = this.getSubwikiBlockId(subwikiId, wikiId, userId, groupId);
        const currentSyncPromise = this.getOngoingSync(subwikiBlockId, siteId);

        if (currentSyncPromise) {
            // There's already a sync ongoing for this subwiki, return the promise.
            return currentSyncPromise;
        }

        // Verify that subwiki isn't blocked.
        if (CoreSync.isBlocked(AddonModWikiProvider.COMPONENT, subwikiBlockId, siteId)) {
            this.logger.debug(`Cannot sync subwiki ${subwikiBlockId} because it is blocked.`);

            throw new CoreSyncBlockedError(Translate.instant('core.errorsyncblocked', { $a: this.componentTranslate }));
        }

        this.logger.debug(`Try to sync subwiki ${subwikiBlockId}`);

        return this.addOngoingSync(subwikiBlockId, this.performSyncSubwiki(subwikiId, wikiId, userId, groupId, siteId), siteId);
    }

    /**
     * Synchronize a subwiki.
     *
     * @param subwikiId Subwiki ID. If not defined, wikiId, userId and groupId should be defined.
     * @param wikiId Wiki ID. Optional, will be used to create the subwiki if subwiki ID not provided.
     * @param userId User ID. Optional, will be used to create the subwiki if subwiki ID not provided.
     * @param groupId Group ID. Optional, will be used to create the subwiki if subwiki ID not provided.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if sync is successful, rejected otherwise.
     */
    protected async performSyncSubwiki(
        subwikiId: number,
        wikiId?: number,
        userId?: number,
        groupId?: number,
        siteId?: string,
    ): Promise<AddonModWikiSyncSubwikiResult> {
        const result: AddonModWikiSyncSubwikiResult = {
            warnings: [],
            updated: false,
            created: [],
            discarded: [],
        };
        const subwikiBlockId = this.getSubwikiBlockId(subwikiId, wikiId, userId, groupId);

        // Get offline pages to be sent.
        const pages = await CoreUtils.ignoreErrors(
            AddonModWikiOffline.getSubwikiNewPages(subwikiId, wikiId, userId, groupId, siteId),
            <AddonModWikiPageDBRecord[]> [],
        );

        if (!pages || !pages.length) {
            // Nothing to sync.
            await CoreUtils.ignoreErrors(this.setSyncTime(subwikiBlockId, siteId));

            return result;
        }

        if (!CoreNetwork.isOnline()) {
            // Cannot sync in offline.
            throw new CoreNetworkError();
        }

        // Send the pages.
        await Promise.all(pages.map(async (page) => {
            try {
                const pageId = await AddonModWiki.newPageOnline(page.title, page.cachedcontent, {
                    subwikiId,
                    wikiId,
                    userId,
                    groupId,
                    siteId,
                });

                result.updated = true;
                result.created.push({
                    pageId: pageId,
                    title: page.title,
                });

                // Delete the local page.
                await AddonModWikiOffline.deleteNewPage(page.title, subwikiId, wikiId, userId, groupId, siteId);
            } catch (error) {
                if (!CoreUtils.isWebServiceError(error)) {
                    // Couldn't connect to server, reject.
                    throw error;
                }

                // The WebService has thrown an error, this means that the page cannot be submitted. Delete it.
                await AddonModWikiOffline.deleteNewPage(page.title, subwikiId, wikiId, userId, groupId, siteId);

                result.updated = true;

                // Page deleted, add the page to discarded pages and add a warning.
                const warning = this.getOfflineDataDeletedWarning(page.title, error);

                result.discarded.push({
                    title: page.title,
                    warning: warning,
                });

                result.warnings.push(warning);
            }
        }));

        // Sync finished, set sync time.
        await CoreUtils.ignoreErrors(this.setSyncTime(subwikiBlockId, siteId));

        return result;
    }

    /**
     * Tries to synchronize a wiki.
     *
     * @param wikiId Wiki ID.
     * @param courseId Course ID.
     * @param cmId Wiki course module ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if sync is successful, rejected otherwise.
     */
    async syncWiki(wikiId: number, courseId?: number, cmId?: number, siteId?: string): Promise<AddonModWikiSyncWikiResult> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        // Sync offline logs.
        await CoreUtils.ignoreErrors(CoreCourseLogHelper.syncActivity(AddonModWikiProvider.COMPONENT, wikiId, siteId));

        // Sync is done at subwiki level, get all the subwikis.
        const subwikis = await AddonModWiki.getSubwikis(wikiId, { cmId, siteId });

        const result: AddonModWikiSyncWikiResult = {
            warnings: [],
            updated: false,
            subwikis: {},
            siteId: siteId,
        };

        await Promise.all(subwikis.map(async (subwiki) => {
            const data = await this.syncSubwiki(subwiki.id, subwiki.wikiid, subwiki.userid, subwiki.groupid, siteId);

            if (data && data.updated) {
                result.warnings = result.warnings.concat(data.warnings);
                result.updated = true;
                result.subwikis[subwiki.id] = {
                    created: data.created,
                    discarded: data.discarded,
                };
            }
        }));

        if (result.updated) {
            const promises: Promise<void>[] = [];

            // Something has changed, invalidate data.
            if (wikiId) {
                promises.push(AddonModWiki.invalidateSubwikis(wikiId));
                promises.push(AddonModWiki.invalidateSubwikiPages(wikiId));
                promises.push(AddonModWiki.invalidateSubwikiFiles(wikiId));
            }
            if (courseId) {
                promises.push(AddonModWiki.invalidateWikiData(courseId));
            }
            if (cmId) {
                promises.push(CoreGroups.invalidateActivityAllowedGroups(cmId));
                promises.push(CoreGroups.invalidateActivityGroupMode(cmId));
            }

            await CoreUtils.ignoreErrors(Promise.all(promises));
        }

        return result;
    }

}

export const AddonModWikiSync = makeSingleton(AddonModWikiSyncProvider);

/**
 * Data returned by a subwiki sync.
 */
export type AddonModWikiSyncSubwikiResult = {
    warnings: string[]; // List of warnings.
    updated: boolean; // Whether data was updated in the site.
    created: AddonModWikiCreatedPage[]; // List of created pages.
    discarded: AddonModWikiDiscardedPage[]; // List of discarded pages.
};

/**
 * Data returned by a wiki sync.
 */
export type AddonModWikiSyncWikiResult = {
    warnings: string[]; // List of warnings.
    updated: boolean; // Whether data was updated in the site.
    subwikis: {
        [subwikiId: number]: { // List of subwikis.
            created: AddonModWikiCreatedPage[];
            discarded: AddonModWikiDiscardedPage[];
        };
    };
    siteId: string; // Site ID.
};

/**
 * Data returned by a wiki sync for each subwiki synced.
 */
export type AddonModWikiSyncWikiSubwiki = {
    created: AddonModWikiCreatedPage[];
    discarded: AddonModWikiDiscardedPage[];
};

/**
 * Data to identify a page created in sync.
 */
export type AddonModWikiCreatedPage = {
    pageId: number;
    title: string;
};

/**
 * Data to identify a page discarded in sync.
 */
export type AddonModWikiDiscardedPage = {
    title: string;
    warning: string;
};

/**
 * Data passed to AUTO_SYNCED event.
 */
export type AddonModWikiAutoSyncData = {
    siteId: string;
    subwikiId: number;
    wikiId: number;
    userId: number;
    groupId: number;
    created: AddonModWikiCreatedPage[];
    discarded: AddonModWikiDiscardedPage[];
    warnings: string[];
};

/**
 * Data passed to MANUAL_SYNCED event.
 */
export type AddonModWikiManualSyncData = AddonModWikiSyncWikiResult & {
    wikiId: number;
};
