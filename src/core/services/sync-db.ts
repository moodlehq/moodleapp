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

import { CoreSiteSchema } from '@services/sites';

/**
 * Database variables for CoreSync service.
 */
export const SYNC_TABLE_NAME = 'sync';
export const SITE_SCHEMA: CoreSiteSchema = {
    name: 'CoreSyncProvider',
    version: 1,
    tables: [
        {
            name: SYNC_TABLE_NAME,
            columns: [
                {
                    name: 'component',
                    type: 'TEXT',
                    notNull: true,
                },
                {
                    name: 'id',
                    type: 'TEXT',
                    notNull: true,
                },
                {
                    name: 'time',
                    type: 'INTEGER',
                },
                {
                    name: 'warnings',
                    type: 'TEXT',
                },
            ],
            primaryKeys: ['component', 'id'],
        },
    ],
};

export type CoreSyncRecord = {
    component: string;
    id: string;
    time: number;
    warnings: string;
};
