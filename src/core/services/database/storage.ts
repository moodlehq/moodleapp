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

import { SQLiteDBTableSchema } from '@classes/sqlitedb';
import { CoreAppSchema } from '@services/app-db';
import { CoreSiteSchema } from '@services/sites';

export const TABLE_NAME = 'core_storage';

export const TABLE_SCHEMA: SQLiteDBTableSchema = {
    name: TABLE_NAME,
    columns: [
        {
            name: 'key',
            type: 'TEXT',
            primaryKey: true,
        },
        {
            name: 'value',
            type: 'TEXT',
            notNull: true,
        },
    ],
};

export const APP_SCHEMA: CoreAppSchema = {
    name: 'CoreStorageService',
    version: 1,
    tables: [TABLE_SCHEMA],
};

export const SITE_SCHEMA: CoreSiteSchema = {
    name: 'CoreStorageService',
    version: 1,
    tables: [TABLE_SCHEMA],
};

/**
 * Storage table record type.
 */
export type CoreStorageRecord = {
    key: string;
    value: string;
};
