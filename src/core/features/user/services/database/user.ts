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
import { CoreUserBasicData } from '../user';
import { getStoredCacheDBSchema } from '@classes/stored-cache';

/**
 * Database variables for CoreUser service.
 */
export const USERS_TABLE_NAME = 'users';
export const CORE_USER_CACHE_SITE_SCHEMA: CoreSiteSchema = {
    name: 'CoreUserProvider',
    version: 1,
    canBeCleared: [USERS_TABLE_NAME],
    tables: [
        {
            name: USERS_TABLE_NAME,
            columns: [
                {
                    name: 'id',
                    type: 'INTEGER',
                    primaryKey: true,
                },
                {
                    name: 'data',
                    type: 'TEXT',
                },
                {
                    name: 'timemodified',
                    type: 'INTEGER',
                },
            ],
        },
    ],
};

export const USERS_CACHE_TABLE_NAME = 'users_cache';
export const CORE_USER_CACHE_SITE_SCHEMA = getStoredCacheDBSchema('CoreUser', USERS_CACHE_TABLE_NAME);

/**
 * Database variables for CoreUserOffline service.
 */
export const USER_PREFERENCES_TABLE_NAME = 'user_preferences';
export const CORE_USER_OFFLINE_SITE_SCHEMA: CoreSiteSchema = {
    name: 'CoreUserOfflineProvider',
    version: 1,
    tables: [
        {
            name: USER_PREFERENCES_TABLE_NAME,
            columns: [
                {
                    name: 'name',
                    type: 'TEXT',
                    unique: true,
                    notNull: true,
                },
                {
                    name: 'value',
                    type: 'TEXT',
                },
                {
                    name: 'onlinevalue',
                    type: 'TEXT',
                },
            ],
        },
    ],
};

/**
 * Data stored in DB for users.
 */
export type CoreUserDBRecord = CoreUserBasicData;

/**
 * Structure of offline user preferences.
 */
export type CoreUserPreferenceDBRecord = {
    name: string;
    value: string;
    onlinevalue: string | null;
};
