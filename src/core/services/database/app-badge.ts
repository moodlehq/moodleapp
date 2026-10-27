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

import { CoreAppSchema } from '@services/app-db';

/**
 * Database variables for CoreAppBadge service.
 */
export const CORE_APP_BADGE_TABLE_NAME = 'core_app_badge';
export const CORE_APP_BADGE_TABLE_PRIMARY_KEYS = ['siteId', 'component'] as const;
export const APP_SCHEMA: CoreAppSchema = {
    name: 'CoreAppBadgeService',
    version: 1,
    tables: [
        {
            name: CORE_APP_BADGE_TABLE_NAME,
            columns: [
                {
                    name: 'siteId',
                    type: 'TEXT',
                },
                {
                    name: 'component',
                    type: 'TEXT',
                },
                {
                    name: 'counter',
                    type: 'INTEGER',
                },
            ],
            primaryKeys: [...CORE_APP_BADGE_TABLE_PRIMARY_KEYS],
        },
    ],
    async install(db): Promise<void> {
        // Migrate legacy counters before the badge service loads its eager cache.
        await db.migrateTable(
            'addon_pushnotifications_badge',
            CORE_APP_BADGE_TABLE_NAME,
            (record) => ({
                siteId: record.siteid,
                component: record.addon,
                counter: record.number,
            }),
        );
    },
};

export type CoreAppBadgeDBPrimaryKeys = typeof CORE_APP_BADGE_TABLE_PRIMARY_KEYS[number];

/**
 * Data stored in DB for badge.
 */
export type CoreAppBadgeDBRecord = {
    siteId: string;
    component: string;
    counter: number;
};
