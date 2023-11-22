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
import { CoreSite } from '@classes/sites/site';
import { CoreUser } from '@features/user/services/user';
import { CoreNetwork } from '@services/network';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CoreWSExternalWarning } from '@services/ws';
import { makeSingleton } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { CoreRatingOffline } from './rating-offline';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';

const ROOT_CACHE_KEY = 'CoreRating:';

/**
 * Service to handle ratings.
 */
@Injectable( { providedIn: 'root' })
export class CoreRatingProvider {

    static readonly AGGREGATE_NONE = 0; // No ratings.
    static readonly AGGREGATE_AVERAGE = 1;
    static readonly AGGREGATE_COUNT = 2;
    static readonly AGGREGATE_MAXIMUM = 3;
    static readonly AGGREGATE_MINIMUM = 4;
    static readonly AGGREGATE_SUM = 5;

    static readonly UNSET_RATING = -999;

    static readonly AGGREGATE_CHANGED_EVENT = 'core_rating_aggregate_changed';
    static readonly RATING_SAVED_EVENT = 'core_rating_rating_saved';

    /**
     * Add a rating to an item.
     *
     * @param component Component. Example: "mod_forum".
     * @param ratingArea Rating area. Example: "post".
     * @param contextLevel Context level: course, module, user, etc.
     * @param instanceId Context instance id.
     * @param itemId Item id. Example: forum post id.
     * @param itemSetId Item set id. Example: forum discussion id.
     * @param courseId Course id.
     * @param scaleId Scale id.
     * @param rating Rating value. Use CoreRatingProvider.UNSET_RATING to delete rating.
     * @param ratedUserId Rated user id.
     * @param aggregateMethod Aggregate method.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the aggregated rating or void if stored offline.
     */
    async addRating(
        component: string,
        ratingArea: string,
        contextLevel: ContextLevel,
        instanceId: number,
        itemId: number,
        itemSetId: number,
        courseId: number,
        scaleId: number,
        rating: number,
        ratedUserId: number,
        aggregateMethod: number,
        siteId?: string,
    ): Promise<CoreRatingAddRatingWSResponse | void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        // Convenience function to store a rating to be synchronized later.
        const storeOffline = async (): Promise<void> => {
            await CoreRatingOffline.addRating(
                component,
                ratingArea,
                contextLevel,
                instanceId,
                itemId,
                itemSetId,
                courseId,
                scaleId,
                rating,
                ratedUserId,
                aggregateMethod,
                siteId,
            );

            CoreEvents.trigger(CoreRatingProvider.RATING_SAVED_EVENT, {
                component,
                ratingArea,
                contextLevel,
                instanceId,
                itemSetId,
                itemId,
            }, siteId);
        };

        if (!CoreNetwork.isOnline()) {
            // App is offline, store the action.
            return storeOffline();
        }

        try {
            await CoreRatingOffline.deleteRating(component, ratingArea, contextLevel, instanceId, itemId, siteId);

            const response = await this.addRatingOnline(
                component,
                ratingArea,
                contextLevel,
                instanceId,
                itemId,
                scaleId,
                rating,
                ratedUserId,
                aggregateMethod,
                siteId,
            );

            return response;
        } catch (error) {
            if (CoreUtils.isWebServiceError(error)) {
                // The WebService has thrown an error or offline not supported, reject.
                return Promise.reject(error);
            }

            // Couldn't connect to server, store offline.
            return storeOffline();
        }
    }

    /**
     * Add a rating to an item. It will fail if offline or cannot connect.
     *
     * @param component Component. Example: "mod_forum".
     * @param ratingArea Rating area. Example: "post".
     * @param contextLevel Context level: course, module, user, etc.
     * @param instanceId Context instance id.
     * @param itemId Item id. Example: forum post id.
     * @param scaleId Scale id.
     * @param rating Rating value. Use CoreRatingProvider.UNSET_RATING to delete rating.
     * @param ratedUserId Rated user id.
     * @param aggregateMethod Aggregate method.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the aggregated rating.
     */
    async addRatingOnline(
        component: string,
        ratingArea: string,
        contextLevel: ContextLevel,
        instanceId: number,
        itemId: number,
        scaleId: number,
        rating: number,
        ratedUserId: number,
        aggregateMethod: number,
        siteId?: string,
    ): Promise<CoreRatingAddRatingWSResponse> {

        const site = await CoreSites.getSite(siteId);
        const params: CoreRatingAddRatingWSParams = {
            contextlevel: contextLevel,
            instanceid: instanceId,
            component,
            ratingarea: ratingArea,
            itemid: itemId,
            scaleid: scaleId,
            rating,
            rateduserid: ratedUserId,
            aggregation: aggregateMethod,
        };

        const response = await site.write<CoreRatingAddRatingWSResponse>('core_rating_add_rating', params);

        await this.invalidateRatingItems(contextLevel, instanceId, component, ratingArea, itemId, scaleId);

        CoreEvents.trigger(CoreRatingProvider.AGGREGATE_CHANGED_EVENT, {
            contextLevel,
            instanceId,
            component,
            ratingArea,
            itemId,
            aggregate: response.aggregate,
            count: response.count,
        });

        return response;
    }

    /**
     * Get item ratings.
     *
     * @param contextLevel Context level: course, module, user, etc.
     * @param instanceId Context instance id.
     * @param component Component. Example: "mod_forum".
     * @param ratingArea Rating area. Example: "post".
     * @param itemId Item id. Example: forum post id.
     * @param scaleId Scale id.
     * @param sort Sort field.
     * @param courseId Course id. Used for fetching user profiles.
     * @param siteId Site ID. If not defined, current site.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @returns Promise resolved with the list of ratings.
     */
    async getItemRatings(
        contextLevel: ContextLevel,
        instanceId: number,
        component: string,
        ratingArea: string,
        itemId: number,
        scaleId: number,
        sort: string = 'timemodified',
        courseId?: number,
        siteId?: string,
        ignoreCache: boolean = false,
    ): Promise<CoreRatingItemRating[]> {
        const site = await CoreSites.getSite(siteId);

        const params: CoreRatingGetItemRatingsWSParams = {
            contextlevel: contextLevel,
            instanceid: instanceId,
            component,
            ratingarea: ratingArea,
            itemid: itemId,
            scaleid: scaleId,
            sort,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getItemRatingsCacheKey(contextLevel, instanceId, component, ratingArea, itemId, scaleId, sort),
            updateFrequency: CoreSite.FREQUENCY_RARELY,
        };

        if (ignoreCache) {
            preSets.getFromCache = false;
            preSets.emergencyCache = false;
        }

        const response = await site.read<CoreRatingGetItemRatingsWSResponse>('core_rating_get_item_ratings', params, preSets);

        if (!site.isVersionGreaterEqualThan(['3.6.5', '3.7.1', '3.8'])) {
            // MDL-65042 We need to fetch profiles because the returned profile pictures are incorrect.
            const promises = response.ratings.map((rating: CoreRatingItemRating) =>
                CoreUser.getProfile(rating.userid, courseId, true, site.id).then((user) => {
                    rating.userpictureurl = user.profileimageurl || '';

                    return;
                }).catch(() => {
                    // Ignore error.
                    rating.userpictureurl = '';
                }));

            await Promise.all(promises);
        }

        return response.ratings;
    }

    /**
     * Invalidate item ratings.
     *
     * @param contextLevel Context level: course, module, user, etc.
     * @param instanceId Context instance id.
     * @param component Component. Example: "mod_forum".
     * @param ratingArea Rating area. Example: "post".
     * @param itemId Item id. Example: forum post id.
     * @param scaleId Scale id.
     * @param sort Sort field.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateRatingItems(
        contextLevel: ContextLevel,
        instanceId: number,
        component: string,
        ratingArea: string,
        itemId: number,
        scaleId: number,
        sort: string = 'timemodified',
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const key = this.getItemRatingsCacheKey(contextLevel, instanceId, component, ratingArea, itemId, scaleId, sort);

        await site.invalidateWsCacheForKey(key);
    }

    /**
     * Check if rating is disabled in a certain site.
     *
     * @param site Site. If not defined, use current site.
     * @returns Whether it's disabled.
     */
    isRatingDisabledInSite(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return !!site?.isFeatureDisabled('NoDelegate_CoreRating');
    }

    /**
     * Check if rating is disabled in a certain site.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @returns Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    async isRatingDisabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return this.isRatingDisabledInSite(site);
    }

    /**
     * Convenience function to merge two or more rating infos of the same instance.
     *
     * @param ratingInfos Array of rating infos.
     * @returns Merged rating info or undefined.
     */
    mergeRatingInfos(ratingInfos: CoreRatingInfo[]): CoreRatingInfo | undefined {
        let result: CoreRatingInfo | undefined;
        const scales: Record<number, CoreRatingScale> = {};
        const ratings: Record<number, CoreRatingInfoItem> = {};

        ratingInfos.forEach((ratingInfo) => {
            if (!ratingInfo) {
                // Skip null rating infos.
                return;
            }

            if (!result) {
                result = Object.assign({}, ratingInfo);
            }

            (ratingInfo.scales || []).forEach((scale) => {
                scales[scale.id] = scale;
            });

            (ratingInfo.ratings || []).forEach((rating) => {
                ratings[rating.itemid] = rating;
            });
        });

        if (result) {
            result.scales = CoreUtils.objectToArray(scales);
            result.ratings = CoreUtils.objectToArray(ratings);
        }

        return result;
    }

    /**
     * Prefetch individual ratings.
     *
     * This function should be called from the prefetch handler of activities with ratings.
     *
     * @param contextLevel Context level: course, module, user, etc.
     * @param instanceId Instance Id.
     * @param scaleId Scale Id.
     * @param courseId Course id. Used for prefetching user profiles.
     * @param ratingInfo Rating info returned by web services.
     * @param siteId Site id. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async prefetchRatings(
        contextLevel: ContextLevel,
        instanceId: number,
        scaleId: number,
        courseId?: number,
        ratingInfo?: CoreRatingInfo,
        siteId?: string,
    ): Promise<void> {
        if (!ratingInfo || !ratingInfo.ratings) {
            return;
        }

        const site = await CoreSites.getSite(siteId);
        const promises = ratingInfo.ratings.map((item) => this.getItemRatings(
            contextLevel,
            instanceId,
            ratingInfo.component,
            ratingInfo.ratingarea,
            item.itemid,
            scaleId,
            undefined,
            courseId,
            site.id,
            true,
        ));

        const ratingsResults = await Promise.all(promises);

        if (!site.isVersionGreaterEqualThan(['3.6.5', '3.7.1', '3.8'])) {
            const ratings: CoreRatingItemRating[] = [].concat.apply([], ratingsResults);

            const userIds = ratings.map((rating) => rating.userid);

            await CoreUser.prefetchProfiles(userIds, courseId, site.id);
        }
    }

    /**
     * Get cache key for rating items WS calls.
     *
     * @param contextLevel Context level: course, module, user, etc.
     * @param instanceId Instance Id.
     * @param component Component. Example: "mod_forum".
     * @param ratingArea Rating area. Example: "post".
     * @param itemId Item id. Example: forum post id.
     * @param scaleId Scale Id.
     * @param sort Sort field.
     * @returns Cache key.
     */
    protected getItemRatingsCacheKey(
        contextLevel: ContextLevel,
        instanceId: number,
        component: string,
        ratingArea: string,
        itemId: number,
        scaleId: number,
        sort: string,
    ): string {
        return `${ROOT_CACHE_KEY}${contextLevel}:${instanceId}:${component}:${ratingArea}:${itemId}:${scaleId}:${sort}`;
    }

}
export const CoreRating = makeSingleton(CoreRatingProvider);

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [CoreRatingProvider.AGGREGATE_CHANGED_EVENT]: CoreRatingAggregateChangedEventData;
        [CoreRatingProvider.RATING_SAVED_EVENT]: CoreRatingSavedEventData;
    }

}

/**
 * Structure of the rating info returned by web services.
 */
export type CoreRatingInfo = {
    contextid: number; // Context id.
    component: string; // Context name.
    ratingarea: string; // Rating area name.
    canviewall?: boolean; // Whether the user can view all the individual ratings.
    canviewany?: boolean; // Whether the user can view aggregate of ratings of others.
    scales?: CoreRatingScale[]; // Different scales used information.
    ratings?: CoreRatingInfoItem[]; // The ratings.
};

/**
 * Structure of scales in the rating info.
 */
export type CoreRatingScale = {
    id: number; // Scale id.
    courseid?: number; // Course id.
    name?: string; // Scale name (when a real scale is used).
    max: number; // Max value for the scale.
    isnumeric: boolean; // Whether is a numeric scale.
    items?: { // Scale items. Only returned for not numerical scales.
        value: number; // Scale value/option id.
        name: string; // Scale name.
    }[];
};

/**
 * Structure of items in the rating info.
 */
export type CoreRatingInfoItem = {
    itemid: number; // Item id.
    scaleid?: number; // Scale id.
    scale?: CoreRatingScale; // Added for rendering purposes.
    userid?: number; // User who rated id.
    aggregate?: number; // Aggregated ratings grade.
    aggregatestr?: string; // Aggregated ratings as string.
    aggregatelabel?: string; // The aggregation label.
    count?: number; // Ratings count (used when aggregating).
    rating?: number; // The rating the user gave.
    canrate?: boolean; // Whether the user can rate the item.
    canviewaggregate?: boolean; // Whether the user can view the aggregated grade.
};

/**
 * Structure of a rating returned by the item ratings web service.
 */
export type CoreRatingItemRating = {
    id: number; // Rating id.
    userid: number; // User id.
    userpictureurl: string; // URL user picture.
    userfullname: string; // User fullname.
    rating: string; // Rating on scale.
    timemodified: number; // Time modified (timestamp).
};

/**
 * Params of core_rating_get_item_ratings WS.
 */
type CoreRatingGetItemRatingsWSParams = {
    contextlevel: ContextLevel; // Context level: course, module, user, etc...
    instanceid: number; // The instance id of item associated with the context level.
    component: string; // Component.
    ratingarea: string; // Rating area.
    itemid: number; // Associated id.
    scaleid: number; // Scale id.
    sort: string; // Sort order (firstname, rating or timemodified).
};

/**
 * Data returned by core_rating_get_item_ratings WS.
 */
export type CoreRatingGetItemRatingsWSResponse = {
    ratings: CoreRatingItemRating[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of core_rating_add_rating WS.
 */
type CoreRatingAddRatingWSParams = {
    contextlevel: ContextLevel; // Context level: course, module, user, etc...
    instanceid: number; // The instance id of item associated with the context level.
    component: string; // Component.
    ratingarea: string; // Rating area.
    itemid: number; // Associated id.
    scaleid: number; // Scale id.
    rating: number; // User rating.
    rateduserid: number; // Rated user id.
    aggregation?: number; // Agreggation method.
};

/**
 * Data returned by core_rating_add_rating WS.
 */
export type CoreRatingAddRatingWSResponse = {
    success: boolean; // Whether the rate was successfully created.
    aggregate?: string; // New aggregate.
    count?: number; // Ratings count.
    itemid?: number; // Rating item id.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Data sent by AGGREGATE_CHANGED_EVENT event.
 */
export type CoreRatingAggregateChangedEventData = {
    contextLevel: ContextLevel;
    instanceId: number;
    component: string;
    ratingArea: string;
    itemId: number;
    aggregate?: string;
    count?: number;
};

/**
 * Data sent by RATING_SAVED_EVENT event.
 */
export type CoreRatingSavedEventData = {
    component: string;
    ratingArea: string;
    contextLevel: ContextLevel;
    instanceId: number;
    itemSetId: number;
    itemId: number;
};
