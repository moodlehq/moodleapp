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

import { CoreAppSchema } from '@services/app';
import { CoreSiteSchema } from '@services/sites';
import { SQLiteDB, SQLiteDBTableSchema } from '@classes/sqlitedb';
import { CoreSite } from '@classes/site';

/**
 * Database variables for CoreSites service.
 */
export const SITES_TABLE_NAME = 'sites_2';
export const CURRENT_SITE_TABLE_NAME = 'current_site';
export const SCHEMA_VERSIONS_TABLE_NAME = 'schema_versions';

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
        {
            name: CURRENT_SITE_TABLE_NAME,
            columns: [
                {
                    name: 'id',
                    type: 'INTEGER',
                    primaryKey: true,
                },
                {
                    name: 'siteId',
                    type: 'TEXT',
                    notNull: true,
                    unique: true,
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
    version: 2,
    canBeCleared: [CoreSite.WS_CACHE_TABLE],
    tables: [
        {
            name: CoreSite.WS_CACHE_TABLE,
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
            name: CoreSite.CONFIG_TABLE,
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
    ],
    async migrate(db: SQLiteDB, oldVersion: number): Promise<void> {
        if (oldVersion < 2) {
            await db.migrateTable('wscache', CoreSite.WS_CACHE_TABLE, (record) => ({
                id: record.id,
                data: record.data,
                key: record.key,
                expirationTime: record.expirationTime,
                component: null,
                componentId: null,
            }));
        }
    },
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

export type CurrentSiteDBEntry = {
    id: number;
    siteId: string;
};

export type SchemaVersionsDBEntry = {
    name: string;
    version: number;
};
