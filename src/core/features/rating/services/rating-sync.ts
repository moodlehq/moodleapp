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
import { CoreSyncBaseProvider } from '@classes/base-sync';
import { CoreNetworkError } from '@classes/errors/network-error';
import { CoreNetwork } from '@services/network';
import { CoreSites } from '@services/sites';
import { CoreErrorHelper } from '@services/error-helper';
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { CoreRating } from './rating';
import { CoreRatingItemSet, CoreRatingOffline } from './rating-offline';

/**
 * Service to sync ratings.
 */
@Injectable( { providedIn: 'root' })
export class CoreRatingSyncProvider extends CoreSyncBaseProvider<CoreRatingSyncItem> {

    static readonly SYNCED_EVENT = 'core_rating_synced';

    constructor() {
        super('CoreRatingSyncProvider');
    }

    /**
     * Try to synchronize all the ratings of a certain component, instance or item set.
     *
     * This function should be called from the sync provider of activities with ratings.
     *
     * @param component Component. Example: "mod_forum".
     * @param ratingArea Rating Area. Example: "post".
     * @param contextLevel Context level: course, module, user, etc.
     * @param instanceId Context instance id.
     * @param itemSetId Item set id.
     * @param force Wether to force sync not depending on last execution.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if sync is successful, rejected if sync fails.
     */
    async syncRatings(
        component: string,
        ratingArea: string,
        contextLevel?: ContextLevel,
        instanceId?: number,
        itemSetId?: number,
        force?: boolean,
        siteId?: string,
    ): Promise<CoreRatingSyncItemResult[]> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const itemSets = await CoreRatingOffline.getItemSets(component, ratingArea, contextLevel, instanceId, itemSetId, siteId);

        const results: CoreRatingSyncItemResult[] = [];
        await Promise.all(itemSets.map(async (itemSet) => {
            const result = force
                ? await this.syncItemSet(
                    component,
                    ratingArea,
                    itemSet.contextLevel,
                    itemSet.instanceId,
                    itemSet.itemSetId,
                    siteId,
                )
                : await this.syncItemSetIfNeeded(
                    component,
                    ratingArea,
                    itemSet.contextLevel,
                    itemSet.instanceId,
                    itemSet.itemSetId,
                    siteId,
                );

            if (result) {
                if (result.updated) {
                    // Sync successful, send event.
                    CoreEvents.trigger(CoreRatingSyncProvider.SYNCED_EVENT, {
                        ...itemSet,
                        warnings: result.warnings,
                    }, siteId);
                }

                results.push(
                    {
                        itemSet,
                        ...result,
                    },
                );
            }
        }));

        return results;
    }

    /**
     * Sync ratings of an item set only if a certain time has passed since the last time.
     *
     * @param component Component. Example: "mod_forum".
     * @param ratingArea Rating Area. Example: "post".
     * @param contextLevel Context level: course, module, user, etc.
     * @param instanceId Context instance id.
     * @param itemSetId Item set id. Example: forum discussion id.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when ratings are synced or if it doesn't need to be synced.
     */
    protected async syncItemSetIfNeeded(
        component: string,
        ratingArea: string,
        contextLevel: ContextLevel,
        instanceId: number,
        itemSetId: number,
        siteId?: string,
    ): Promise<CoreRatingSyncItem | undefined> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const syncId = this.getItemSetSyncId(component, ratingArea, contextLevel, instanceId, itemSetId);

        const needed = await this.isSyncNeeded(syncId, siteId);

        if (needed) {
            return this.syncItemSet(component, ratingArea, contextLevel, instanceId, itemSetId, siteId);
        }
    }

    /**
     * Synchronize all offline ratings of an item set.
     *
     * @param component Component. Example: "mod_forum".
     * @param ratingArea Rating Area. Example: "post".
     * @param contextLevel Context level: course, module, user, etc.
     * @param instanceId Context instance id.
     * @param itemSetId Item set id. Example: forum discussion id.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if sync is successful, rejected otherwise.
     */
    protected syncItemSet(
        component: string,
        ratingArea: string,
        contextLevel: ContextLevel,
        instanceId: number,
        itemSetId: number,
        siteId?: string,
    ): Promise<CoreRatingSyncItem> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const syncId = this.getItemSetSyncId(component, ratingArea, contextLevel, instanceId, itemSetId);
        const currentSyncPromise = this.getOngoingSync(syncId, siteId);
        if (currentSyncPromise) {
            // There's already a sync ongoing for this item set, return the promise.
            return currentSyncPromise;
        }

        this.logger.debug(`Try to sync ratings of component '${component}' rating area '${ratingArea}'` +
            ` context level '${contextLevel}' instance ${instanceId} item set ${itemSetId}`);

        // Get offline events.
        const syncPromise = this.performSyncItemSet(component, ratingArea, contextLevel, instanceId, itemSetId, siteId);

        return this.addOngoingSync(syncId, syncPromise, siteId);
    }

    /**
     * Synchronize all offline ratings of an item set.
     *
     * @param component Component. Example: "mod_forum".
     * @param ratingArea Rating Area. Example: "post".
     * @param contextLevel Context level: course, module, user, etc.
     * @param instanceId Context instance id.
     * @param itemSetId Item set id. Example: forum discussion id.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if sync is successful, rejected otherwise.
     */
    protected async performSyncItemSet(
        component: string,
        ratingArea: string,
        contextLevel: ContextLevel,
        instanceId: number,
        itemSetId: number,
        siteId: string,
    ): Promise<CoreRatingSyncItem> {
        const result: CoreRatingSyncItem = {
            updated: [],
            warnings: [],
        };

        const ratings = await CoreRatingOffline.getRatings(component, ratingArea, contextLevel, instanceId, itemSetId, siteId);

        if (!ratings.length) {
            // Nothing to sync.
            return result;
        }
        if (!CoreNetwork.isOnline()) {
            // Cannot sync in offline.
            throw new CoreNetworkError();
        }

        const promises = ratings.map(async (rating) => {
            try {
                await CoreRating.addRatingOnline(
                    component,
                    ratingArea,
                    rating.contextlevel,
                    rating.instanceid,
                    rating.itemid,
                    rating.scaleid,
                    rating.rating,
                    rating.rateduserid,
                    rating.aggregation,
                    siteId,
                );
            } catch (error) {
                if (!CoreUtils.isWebServiceError(error)) {
                    // Couldn't connect to server, reject.
                    throw error;
                }

                const warning = CoreErrorHelper.getErrorMessageFromError(error);

                if (warning) {
                    result.warnings.push(warning);
                }
            }

            result.updated.push(rating.itemid);

            try {
                return CoreRatingOffline.deleteRating(
                    component,
                    ratingArea,
                    rating.contextlevel,
                    rating.instanceid,
                    rating.itemid,
                    siteId,
                );
            } finally {
                await CoreRating.invalidateRatingItems(
                    rating.contextlevel,
                    rating.instanceid,
                    component,
                    ratingArea,
                    rating.itemid,
                    rating.scaleid,
                    undefined,
                    siteId,
                );
            }
        });

        await Promise.all(promises);

        // All done, return the result.
        return result;
    }

    /**
     * Get the sync id of an item set.
     *
     * @param component Component. Example: "mod_forum".
     * @param ratingArea Rating Area. Example: "post".
     * @param contextLevel Context level: course, module, user, etc.
     * @param instanceId Context instance id.
     * @param itemSetId Item set id. Example: forum discussion id.
     * @returns Sync id.
     */
    protected getItemSetSyncId(
        component: string,
        ratingArea: string,
        contextLevel: ContextLevel,
        instanceId: number,
        itemSetId: number,
    ): string {
        return `itemSet#${component}#${ratingArea}#${contextLevel}#${instanceId}#${itemSetId}`;
    }

}
export const CoreRatingSync = makeSingleton(CoreRatingSyncProvider);

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [CoreRatingSyncProvider.SYNCED_EVENT]: CoreRatingSyncEventData;
    }

}

export type CoreRatingSyncItem = {
    warnings: string[];
    updated: number[];
};

export type CoreRatingSyncItemResult = CoreRatingSyncItem & {
    itemSet: CoreRatingItemSet;
};

/**
 * Data passed to SYNCED_EVENT event.
 */
export type CoreRatingSyncEventData = CoreRatingItemSet & {
    warnings: string[];
};
