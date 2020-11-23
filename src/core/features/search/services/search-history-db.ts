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
 * Database variables for CoreSearchHistory service.
 */
export const SEARCH_HISTORY_TABLE_NAME = 'seach_history';
export const SITE_SCHEMA: CoreSiteSchema = {
    name: 'CoreSearchHistoryProvider',
    version: 1,
    tables: [
        {
            name: SEARCH_HISTORY_TABLE_NAME,
            columns: [
                {
                    name: 'searcharea',
                    type: 'TEXT',
                    notNull: true,
                },
                {
                    name: 'lastused',
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'times',
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'searchedtext',
                    type: 'TEXT',
                    notNull: true,
                },
            ],
            primaryKeys: ['searcharea', 'searchedtext'],
        },
    ],
};

/**
 * Search history item definition.
 */
export type CoreSearchHistoryDBRecord = {
    searcharea: string; // Search area where the search has been performed.
    lastused: number; // Timestamp of the last search.
    searchedtext: string; // Text of the performed search.
    times: number; // Times search has been performed (if previously in history).
};
