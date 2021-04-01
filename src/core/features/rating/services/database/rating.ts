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
import { CoreSiteSchema } from '@services/sites';

/**
 * Database variables for CoreRatingOffline service.
 */
export const RATINGS_TABLE = 'rating_ratings';
export const RATINGS_SITE_SCHEMA: CoreSiteSchema = {
    name: 'CoreRatingOfflineProvider',
    version: 1,
    tables: [
        {
            name: RATINGS_TABLE,
            columns: [
                {
                    name: 'component',
                    type: 'TEXT',
                },
                {
                    name: 'ratingarea',
                    type: 'TEXT',
                },
                {
                    name: 'contextlevel',
                    type: 'INTEGER',
                },
                {
                    name: 'instanceid',
                    type: 'INTEGER',
                },
                {
                    name: 'itemid',
                    type: 'INTEGER',
                },
                {
                    name: 'itemsetid',
                    type: 'INTEGER',
                },
                {
                    name: 'courseid',
                    type: 'INTEGER',
                },
                {
                    name: 'scaleid',
                    type: 'INTEGER',
                },
                {
                    name: 'rating',
                    type: 'INTEGER',
                },
                {
                    name: 'rateduserid',
                    type: 'INTEGER',
                },
                {
                    name: 'aggregation',
                    type: 'INTEGER',
                },
            ],
            primaryKeys: ['component', 'ratingarea', 'contextlevel', 'instanceid', 'itemid'],
        },
    ],
};

/**
 * Primary data to identify a stored rating.
 */
export type CoreRatingDBPrimaryData = {
    component: string;
    ratingarea: string;
    contextlevel: ContextLevel;
    instanceid: number;
    itemid: number;
};

/**
 * Rating stored.
 */
export type CoreRatingDBRecord = CoreRatingDBPrimaryData & {
    itemsetid: number;
    courseid: number;
    scaleid: number;
    rating: number;
    rateduserid: number;
    aggregation: number;
};
