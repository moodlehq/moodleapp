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
import { CoreSitesProvider, CoreSiteSchema } from '@providers/sites';
import { CoreUtilsProvider } from '@providers/utils/utils';

/**
 * Structure of offline ratings.
 */
export interface CoreRatingOfflineRating {
    component: string;
    ratingarea: string;
    contextlevel: string;
    instanceid: number;
    itemid: number;
    itemsetid: number;
    courseid: number;
    scaleid: number;
    rating: number;
    rateduserid: number;
    aggregation: number;
}

/**
 * Structure of item sets.
 */
export interface CoreRatingItemSet {
    component: string;
    ratingArea: string;
    contextLevel: string;
    instanceId: number;
    itemSetId: number;
    courseId: number;
}

/**
 * Service to handle offline data for rating.
 */
@Injectable()
export class CoreRatingOfflineProvider {

    // Variables for database.
    static RATINGS_TABLE = 'rating_ratings';
    protected siteSchema: CoreSiteSchema = {
        name: 'CoreRatingOfflineProvider',
        version: 1,
        tables: [
            {
                name: CoreRatingOfflineProvider.RATINGS_TABLE,
                columns: [
                    {
                        name: 'component',
                        type: 'TEXT'
                    },
                    {
                        name: 'ratingarea',
                        type: 'TEXT'
                    },
                    {
                        name: 'contextlevel',
                        type: 'INTEGER',
                    },
                    {
                        name: 'instanceid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'itemid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'itemsetid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'courseid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'scaleid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'rating',
                        type: 'INTEGER'
                    },
                    {
                        name: 'rateduserid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'aggregation',
                        type: 'INTEGER'
                    }
                ],
                primaryKeys: ['component', 'ratingarea', 'contextlevel', 'instanceid', 'itemid']
            }
        ]
    };

    constructor(private sitesProvider: CoreSitesProvider, private utils: CoreUtilsProvider) {
        this.sitesProvider.registerSiteSchema(this.siteSchema);
    }

    /**
     * Get an offline rating.
     *
     * @param contextLevel Context level: course, module, user, etc.
     * @param instanceId Context instance id.
     * @param component Component. Example: "mod_forum".
     * @param ratingArea Rating area. Example: "post".
     * @param itemId Item id. Example: forum post id.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the saved rating, rejected if not found.
     */
    getRating(contextLevel: string, instanceId: number, component: string, ratingArea: string, itemId: number,  siteId?: string):
            Promise<CoreRatingOfflineRating> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const conditions = {
                contextlevel: contextLevel,
                instanceid: instanceId,
                component: component,
                ratingarea: ratingArea,
                itemid: itemId
            };

            return site.getDb().getRecord(CoreRatingOfflineProvider.RATINGS_TABLE, conditions);
        });
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
     * @return Promise resolved when the rating is saved.
     */
    addRating(component: string, ratingArea: string, contextLevel: string, instanceId: number, itemId: number, itemSetId: number,
            courseId: number, scaleId: number, rating: number, ratedUserId: number, aggregateMethod: number, siteId?: string):
            Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const data: CoreRatingOfflineRating = {
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
                aggregation: aggregateMethod
            };

            return site.getDb().insertRecord(CoreRatingOfflineProvider.RATINGS_TABLE, data);
        });
    }

    /**
     * Delete offline rating.
     *
     * @param component Component. Example: "mod_forum".
     * @param ratingArea Rating area. Example: "post".
     * @param contextLevel Context level: course, module, user, etc.
     * @param itemId Item id. Example: forum post id.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the rating is saved.
     */
    deleteRating(component: string, ratingArea: string, contextLevel: string, instanceId: number, itemId: number, siteId?: string):
            Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const conditions = {
                component: component,
                ratingarea: ratingArea,
                contextlevel: contextLevel,
                instanceid: instanceId,
                itemid: itemId
            };

            return site.getDb().deleteRecords(CoreRatingOfflineProvider.RATINGS_TABLE, conditions);
        });
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
     * @return Promise resolved with the list of item set ids.
     */
    getItemSets(component: string, ratingArea: string, contextLevel?: string, instanceId?: number, itemSetId?: number,
            siteId?: string): Promise<CoreRatingItemSet[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const fields = 'DISTINCT contextlevel, instanceid, itemsetid, courseid';
            const conditions: any = {
                component,
                ratingarea: ratingArea
            };
            if (contextLevel != null && instanceId != null) {
                conditions.contextlevel = contextLevel;
                conditions.instanceId = instanceId;
            }
            if (itemSetId != null) {
                conditions.itemSetId = itemSetId;
            }

            return site.getDb().getRecords(CoreRatingOfflineProvider.RATINGS_TABLE, conditions, undefined, fields)
                    .then((records: any[]) => {
                return records.map((record) => {
                    return {
                        component,
                        ratingArea,
                        contextLevel: record.contextlevel,
                        instanceId: record.instanceid,
                        itemSetId: record.itemsetid,
                        courseId: record.courseid
                    };
                });
            });
        });
    }

    /**
     * Get offline ratings of an item set.
     *
     * @param component Component. Example: "mod_forum".
     * @param ratingArea Rating Area. Example: "post".
     * @param contextLevel Context level: course, module, user, etc.
     * @param itemId Item id. Example: forum post id.
     * @param itemSetId Item set id. Example: forum discussion id.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the list of ratings.
     */
    getRatings(component: string, ratingArea: string, contextLevel: string, instanceId: number, itemSetId: number, siteId?: string):
            Promise<CoreRatingOfflineRating[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const conditions = {
                component,
                ratingarea: ratingArea,
                contextlevel: contextLevel,
                instanceid: instanceId,
                itemsetid: itemSetId
            };

            return site.getDb().getRecords(CoreRatingOfflineProvider.RATINGS_TABLE, conditions);
        });
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
     * @return Promise resolved with a boolean.
     */
    hasRatings(component: string, ratingArea: string, contextLevel?: string, instanceId?: number, itemSetId?: number,
            siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const conditions: any = {
                component,
                ratingarea: ratingArea
            };
            if (contextLevel != null && instanceId != null) {
                conditions.contextlevel = contextLevel;
                conditions.instanceId = instanceId;
            }
            if (itemSetId != null) {
                conditions.itemsetid = itemSetId;
            }

            return this.utils.promiseWorks(site.getDb().recordExists(CoreRatingOfflineProvider.RATINGS_TABLE, conditions));
        });
    }
}
