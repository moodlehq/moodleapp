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
 * Database variables for AddonModBookProvider service.
 */
export const LAST_CHAPTER_VIEWED_TABLE = 'addon_mod_book_last_chapter_viewed';
export const BOOK_SITE_SCHEMA: CoreSiteSchema = {
    name: 'AddonModBookProvider',
    version: 1,
    tables: [
        {
            name: LAST_CHAPTER_VIEWED_TABLE,
            columns: [
                {
                    name: 'id',
                    type: 'INTEGER',
                    primaryKey: true,
                },
                {
                    name: 'chapterid',
                    type: 'INTEGER',
                    notNull: true,
                },
            ],
        },
    ],
};

export type AddonModBookLastChapterViewedDBRecord = {
    id: number;
    chapterid: number;
};
