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
import { CoreSiteSchema } from '@services/sites';
import { SQLiteDB, SQLiteDBTableSchema } from '@classes/sqlitedb';

/**
 * Database variables for CoreSites service.
 */
export const SITES_TABLE_NAME = 'sites_2';
export const SCHEMA_VERSIONS_TABLE_NAME = 'schema_versions';

/**
 * Database variables for CoreSite class.
 */
export const WS_CACHE_TABLE = 'wscache_2';
export const CONFIG_TABLE = 'core_site_config';
export const LAST_VIEWED_TABLE = 'core_site_last_viewed';
export const LAST_VIEWED_PRIMARY_KEYS = ['component', 'id'] as const;

// Schema to register in App DB.
export const APP_SCHEMA: CoreAppSchema = {
    name: 'CoreSitesProvider',
    version: 2,
    tables: [
        {
            name: SITES_TABLE_NAME,
            columns: [
                {
                    name: 'id',
                    type: 'TEXT',
                    primaryKey: true,
                },
                {
                    name: 'siteUrl',
                    type: 'TEXT',
                    notNull: true,
                },
                {
                    name: 'token',
                    type: 'TEXT',
                },
                {
                    name: 'info',
                    type: 'TEXT',
                },
                {
                    name: 'privateToken',
                    type: 'TEXT',
                },
                {
                    name: 'config',
                    type: 'TEXT',
                },
                {
                    name: 'loggedOut',
                    type: 'INTEGER',
                },
                {
                    name: 'oauthId',
                    type: 'INTEGER',
                },
            ],
        },
    ],
    async migrate(db: SQLiteDB, oldVersion: number): Promise<void> {
        if (oldVersion < 2) {
            await db.migrateTable('sites', SITES_TABLE_NAME);
        }
    },
};

// Schema to register for Site DB.
export const SITE_SCHEMA: CoreSiteSchema = {
    name: 'CoreSitesProvider',
    version: 3,
    canBeCleared: [WS_CACHE_TABLE],
    tables: [
        {
            name: WS_CACHE_TABLE,
            columns: [
                {
                    name: 'id',
                    type: 'TEXT',
                    primaryKey: true,
                },
                {
                    name: 'data',
                    type: 'TEXT',
                },
                {
                    name: 'key',
                    type: 'TEXT',
                },
                {
                    name: 'expirationTime',
                    type: 'INTEGER',
                },
                {
                    name: 'component',
                    type: 'TEXT',
                },
                {
                    name: 'componentId',
                    type: 'INTEGER',
                },
            ],
        },
        {
            name: CONFIG_TABLE,
            columns: [
                {
                    name: 'name',
                    type: 'TEXT',
                    unique: true,
                    notNull: true,
                },
                {
                    name: 'value',
                },
            ],
        },
        {
            name: LAST_VIEWED_TABLE,
            columns: [
                {
                    name: 'component',
                    type: 'TEXT',
                },
                {
                    name: 'id',
                    type: 'INTEGER',
                },
                {
                    name: 'value',
                    type: 'TEXT',
                    notNull: true,
                },
                {
                    name: 'data',
                    type: 'TEXT',
                },
                {
                    name: 'timeaccess',
                    type: 'INTEGER',
                },
            ],
            primaryKeys: [...LAST_VIEWED_PRIMARY_KEYS],
        },
    ],
};

// Table for site DB to include the schema versions. It's not part of SITE_SCHEMA because it needs to be created first.
export const SCHEMA_VERSIONS_TABLE_SCHEMA: SQLiteDBTableSchema = {
    name: SCHEMA_VERSIONS_TABLE_NAME,
    columns: [
        {
            name: 'name',
            type: 'TEXT',
            primaryKey: true,
        },
        {
            name: 'version',
            type: 'INTEGER',
        },
    ],
};

export type SiteDBEntry = {
    id: string;
    siteUrl: string;
    token: string;
    info?: string | null;
    privateToken: string;
    config?: string | null;
    loggedOut: number;
    oauthId?: number | null;
};

export type SchemaVersionsDBEntry = {
    name: string;
    version: number;
};

export type CoreSiteConfigDBRecord = {
    name: string;
    value: string | number;
};

export type CoreSiteWSCacheRecord = {
    id: string;
    data: string;
    expirationTime: number;
    key?: string;
    component?: string;
    componentId?: number;
};

export type CoreSiteLastViewedDBRecord = {
    component: string;
    id: number;
    value: string;
    timeaccess: number;
    data?: string;
};

export type CoreSiteLastViewedDBPrimaryKeys = typeof LAST_VIEWED_PRIMARY_KEYS[number];
