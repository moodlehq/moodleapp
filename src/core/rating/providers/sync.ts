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
import { TranslateService } from '@ngx-translate/core';
import { CoreSyncBaseProvider } from '@classes/base-sync';
import { CoreAppProvider } from '@providers/app';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSyncProvider } from '@providers/sync';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreRatingProvider } from './rating';
import { CoreRatingOfflineProvider, CoreRatingItemSet } from './offline';
import { CoreEventsProvider } from '@providers/events';

/**
 * Service to sync ratings.
 */
@Injectable()
export class CoreRatingSyncProvider extends CoreSyncBaseProvider {

    static SYNCED_EVENT = 'core_rating_synced';

    constructor(translate: TranslateService,
            appProvider: CoreAppProvider,
            private eventsProvider: CoreEventsProvider,
            loggerProvider: CoreLoggerProvider,
            sitesProvider: CoreSitesProvider,
            syncProvider: CoreSyncProvider,
            textUtils: CoreTextUtilsProvider,
            timeUtils: CoreTimeUtilsProvider,
            private utils: CoreUtilsProvider,
            private ratingProvider: CoreRatingProvider,
            private ratingOffline: CoreRatingOfflineProvider) {

        super('CoreRatingSyncProvider', loggerProvider, sitesProvider, appProvider, syncProvider, textUtils, translate, timeUtils);
    }

    /**
     * Try to synchronize all the ratings of a certain component, instance or item set.
     *
     * This function should be called from the sync provider of activities with ratings.
     *
     * @param {string} component Component. Example: "mod_forum".
     * @param {string} ratingArea Rating Area. Example: "post".
     * @param {string} [contextLevel] Context level: course, module, user, etc.
     * @param {numnber} [instanceId] Context instance id.
     * @param {number} [itemSetId] Item set id.
     * @param {boolean} [force] Wether to force sync not depending on last execution.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved if sync is successful, rejected if sync fails.
     */
    syncRatings(component: string, ratingArea: string, contextLevel?: string, instanceId?: number, itemSetId?: number,
            force?: boolean, siteId?: string): Promise<{itemSet: CoreRatingItemSet, updated: number[], warnings: string[]}[]> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.ratingOffline.getItemSets(component, ratingArea, contextLevel, instanceId, itemSetId, siteId)
                .then((itemSets) => {
            const results = [];
            const promises = itemSets.map((itemSet) => {
                const promise = force ? this.syncItemSet(component, ratingArea, itemSet.contextLevel, itemSet.instanceId,
                        itemSet.itemSetId, siteId) : this.syncItemSetIfNeeded(component, ratingArea, itemSet.contextLevel,
                        itemSet.instanceId, itemSet.itemSetId, siteId);

                return promise.then((result) => {
                    if (result.updated) {
                        // Sync successful, send event.
                        this.eventsProvider.trigger(CoreRatingSyncProvider.SYNCED_EVENT, {
                            ...itemSet,
                            warnings: result.warnings
                        }, siteId);
                    }

                    results.push({itemSet, ...result});
                });
            });

            return Promise.all(promises).then(() => {
                return results;
            });
        });
    }

    /**
     * Sync ratings of an item set only if a certain time has passed since the last time.
     *
     * @param {string} component Component. Example: "mod_forum".
     * @param {string} ratingArea Rating Area. Example: "post".
     * @param {string} contextLevel Context level: course, module, user, etc.
     * @param {number} instanceId Context instance id.
     * @param {number} itemSetId Item set id. Example: forum discussion id.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when ratings are synced or if it doesn't need to be synced.
     */
    protected syncItemSetIfNeeded(component: string, ratingArea: string,  contextLevel: string, instanceId: number,
            itemSetId: number, siteId?: string): Promise<{updated: number[], warnings: string[]}> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const syncId = this.getItemSetSyncId(component, ratingArea, contextLevel, instanceId, itemSetId);

        return this.isSyncNeeded(syncId, siteId).then((needed) => {
            if (needed) {
                return this.syncItemSet(component, ratingArea, contextLevel, instanceId, itemSetId, siteId);
            }
        });
    }

    /**
     * Synchronize all offline ratings of an item set.
     *
     * @param {string} component Component. Example: "mod_forum".
     * @param {string} ratingArea Rating Area. Example: "post".
     * @param {string} contextLevel Context level: course, module, user, etc.
     * @param {number} instanceId Context instance id.
     * @param {number} itemSetId Item set id. Example: forum discussion id.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved if sync is successful, rejected otherwise.
     */
    protected syncItemSet(component: string, ratingArea: string, contextLevel: string, instanceId: number, itemSetId: number,
            siteId?: string): Promise<{updated: number[], warnings: string[]}> {

        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const syncId = this.getItemSetSyncId(component, ratingArea, contextLevel, instanceId, itemSetId);
        if (this.isSyncing(syncId, siteId)) {
            // There's already a sync ongoing for this item set, return the promise.
            return this.getOngoingSync(syncId, siteId);
        }

        this.logger.debug(`Try to sync ratings of component '${component}' rating area '${ratingArea}'` +
            ` context level '${contextLevel}' instance ${instanceId} item set ${itemSetId}`);

        const updated = [];
        const warnings = [];

        return this.ratingOffline.getRatings(component, ratingArea, contextLevel, instanceId, itemSetId, siteId).then((ratings) => {
            if (!ratings.length) {
                // Nothing to sync.
                return;
            } else if (!this.appProvider.isOnline()) {
                // Cannot sync in offline.
                return Promise.reject(null);
            }

            const promises = ratings.map((rating) => {
                return this.ratingProvider.addRatingOnline(component, ratingArea, rating.contextlevel, rating.instanceid,
                        rating.itemid, rating.scaleid, rating.rating, rating.rateduserid, rating.aggregation, siteId)
                        .catch((error) => {
                    if (this.utils.isWebServiceError(error)) {
                        warnings.push(this.textUtils.getErrorMessageFromError(error));
                    } else {
                        // Couldn't connect to server, reject.
                        return Promise.reject(error);
                    }
                }).then(() => {
                    updated.push(rating.itemid);

                    return this.ratingOffline.deleteRating(component, ratingArea, rating.contextlevel, rating.instanceid,
                            rating.itemid, siteId).finally(() => {
                        return this.ratingProvider.invalidateRatingItems(rating.contextlevel, rating.instanceid, component,
                                ratingArea, rating.itemid, rating.scaleid, undefined, siteId);
                    });
                });
            });

            return Promise.all(promises).then(() => {
                // All done, return the warnings.
                return { updated, warnings };
            });
        });
    }

    /**
     * Get the sync id of an item set.
     *
     * @param {string} component Component. Example: "mod_forum".
     * @param {string} ratingArea Rating Area. Example: "post".
     * @param {string} contextLevel Context level: course, module, user, etc.
     * @param {number} instanceId Context instance id.
     * @param {number} itemSetId Item set id. Example: forum discussion id.
     * @return {string} Sync id.
     */
    protected getItemSetSyncId(component: string, ratingArea: string, contextLevel: string, instanceId: number, itemSetId: number):
            string {
        return `itemSet#${component}#${ratingArea}#${contextLevel}#${instanceId}#${itemSetId}`;
    }
}
