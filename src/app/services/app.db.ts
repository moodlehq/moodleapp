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

/**
 * Database variables for CoreApp service.
 */
export const DBNAME = 'MoodleMobile';
export const SCHEMA_VERSIONS_TABLE_NAME = 'schema_versions';

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

export type SchemaVersionsDBEntry = {
    name: string;
    version: number;
};
