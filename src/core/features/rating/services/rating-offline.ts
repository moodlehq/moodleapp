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
import { CoreSites } from '@services/sites';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { makeSingleton } from '@singletons';
import { CoreRatingDBPrimaryData, CoreRatingDBRecord, RATINGS_TABLE } from './database/rating';

/**
 * Structure of item sets.
 */
export type CoreRatingItemSet = {
    component: string;
    ratingArea: string;
    contextLevel: ContextLevel;
    instanceId: number;
    itemSetId: number;
    courseId: number;
};

/**
 * Service to handle offline data for rating.
 */
@Injectable( { providedIn: 'root' })
export class CoreRatingOfflineProvider {

    /**
     * Get an offline rating.
     *
     * @param contextLevel Context level: course, module, user, etc.
     * @param instanceId Context instance id.
     * @param component Component. Example: "mod_forum".
     * @param ratingArea Rating area. Example: "post".
     * @param itemId Item id. Example: forum post id.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the saved rating, rejected if not found.
     */
    async getRating(
        contextLevel: ContextLevel,
        instanceId: number,
        component: string,
        ratingArea: string,
        itemId: number,
        siteId?: string,
    ): Promise<CoreRatingDBRecord> {
        const site = await CoreSites.getSite(siteId);

        const conditions: CoreRatingDBPrimaryData = {
            contextlevel: contextLevel,
            instanceid: instanceId,
            component: component,
            ratingarea: ratingArea,
            itemid: itemId,
        };

        return site.getDb().getRecord(RATINGS_TABLE, conditions);
    }

    /**
     * Add an offline rating.
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
     * @returns Promise resolved when the rating is saved.
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
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const data: CoreRatingDBRecord = {
            component: component,
            ratingarea: ratingArea,
            contextlevel: contextLevel,
            instanceid: instanceId,
            itemid: itemId,
            itemsetid: itemSetId,
            courseid: courseId,
            scaleid: scaleId,
            rating: rating,
            rateduserid: ratedUserId,
            aggregation: aggregateMethod,
        };

        await site.getDb().insertRecord(RATINGS_TABLE, data);
    }

    /**
     * Delete offline rating.
     *
     * @param component Component. Example: "mod_forum".
     * @param ratingArea Rating area. Example: "post".
     * @param contextLevel Context level: course, module, user, etc.
     * @param instanceId Instance Id.
     * @param itemId Item Id. Example: forum post id.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the rating is saved.
     */
    async deleteRating(
        component: string,
        ratingArea: string,
        contextLevel: ContextLevel,
        instanceId: number,
        itemId: number,
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const conditions: CoreRatingDBPrimaryData = {
            component: component,
            ratingarea: ratingArea,
            contextlevel: contextLevel,
            instanceid: instanceId,
            itemid: itemId,
        };

        await site.getDb().deleteRecords(RATINGS_TABLE, conditions);
    }

    /**
     * Get the list of item sets in a component or instance.
     *
     * @param component Component. Example: "mod_forum".
     * @param ratingArea Rating Area. Example: "post".
     * @param contextLevel Context level: course, module, user, etc.
     * @param instanceId Context instance id.
     * @param itemSetId Item set id.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the list of item set ids.
     */
    async getItemSets(
        component: string,
        ratingArea: string,
        contextLevel?: ContextLevel,
        instanceId?: number,
        itemSetId?: number,
        siteId?: string,
    ): Promise<CoreRatingItemSet[]> {
        const site = await CoreSites.getSite(siteId);

        const fields = 'DISTINCT contextlevel, instanceid, itemsetid, courseid';

        const conditions: Partial<CoreRatingDBRecord> = {
            component,
            ratingarea: ratingArea,
        };

        if (contextLevel && instanceId) {
            conditions.contextlevel = contextLevel;
            conditions.instanceid = instanceId;
        }

        if (itemSetId) {
            conditions.itemsetid = itemSetId;
        }

        const records = await site.getDb().getRecords<CoreRatingDBRecord>(RATINGS_TABLE, conditions, undefined, fields);

        return records.map((record) => ({
            component,
            ratingArea,
            contextLevel: record.contextlevel,
            instanceId: record.instanceid,
            itemSetId: record.itemsetid,
            courseId: record.courseid,
        }));
    }

    /**
     * Get offline ratings of an item set.
     *
     * @param component Component. Example: "mod_forum".
     * @param ratingArea Rating Area. Example: "post".
     * @param contextLevel Context level: course, module, user, etc.
     * @param instanceId Context instance id.
     * @param itemSetId Item set id. Example: forum discussion id.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the list of ratings.
     */
    async getRatings(
        component: string,
        ratingArea: string,
        contextLevel: ContextLevel,
        instanceId: number,
        itemSetId: number,
        siteId?: string,
    ): Promise<CoreRatingDBRecord[]> {
        const site = await CoreSites.getSite(siteId);

        const conditions: Partial<CoreRatingDBRecord> = {
            component,
            ratingarea: ratingArea,
            contextlevel: contextLevel,
            instanceid: instanceId,
            itemsetid: itemSetId,
        };

        return site.getDb().getRecords(RATINGS_TABLE, conditions);
    }

    /**
     * Return whether a component, instance or item set has offline ratings.
     *
     * @param component Component. Example: "mod_forum".
     * @param ratingArea Rating Area. Example: "post".
     * @param contextLevel Context level: course, module, user, etc.
     * @param instanceId Context instance id.
     * @param itemSetId Item set id. Example: forum discussion id.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with a boolean.
     */
    async hasRatings(
        component: string,
        ratingArea: string,
        contextLevel?: ContextLevel,
        instanceId?: number,
        itemSetId?: number,
        siteId?: string,
    ): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        const conditions: Partial<CoreRatingDBRecord> = {
            component,
            ratingarea: ratingArea,
        };
        if (contextLevel && instanceId) {
            conditions.contextlevel = contextLevel;
            conditions.instanceid = instanceId;
        }
        if (itemSetId) {
            conditions.itemsetid = itemSetId;
        }

        return CorePromiseUtils.promiseWorks(site.getDb().recordExists(RATINGS_TABLE, conditions));
    }

}
export const CoreRatingOffline = makeSingleton(CoreRatingOfflineProvider);
