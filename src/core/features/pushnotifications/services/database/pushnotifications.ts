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

import { SQLiteDB } from '@classes/sqlitedb';
import { CoreAppDB, CoreAppSchema } from '@services/app-db';
import { APP_SCHEMA as BADGE_SCHEMA, CORE_APP_BADGE_TABLE_NAME } from '@services/database/app-badge';
import { CoreSiteSchema } from '@services/sites';

/**
 * Database variables for CorePushNotificationsProvider service.
 * Keep "addon" in some names for backwards compatibility.
 */
export const PENDING_UNREGISTER_TABLE_NAME = 'addon_pushnotifications_pending_unregister';
export const REGISTERED_DEVICES_TABLE_NAME = 'addon_pushnotifications_registered_devices_2';
export const REGISTERED_DEVICES_TABLE_PRIMARY_KEYS = ['appid', 'uuid'] as const;
export const APP_SCHEMA: CoreAppSchema = {
    name: 'CorePushNotificationsProvider',
    version: 2,
    tables: [
        {
            name: PENDING_UNREGISTER_TABLE_NAME,
            columns: [
                {
                    name: 'siteid',
                    type: 'TEXT',
                    primaryKey: true,
                },
                {
                    name: 'siteurl',
                    type: 'TEXT',
                },
                {
                    name: 'token',
                    type: 'TEXT',
                },
                {
                    name: 'info',
                    type: 'TEXT',
                },
            ],
        },
    ],
    async migrate(db: SQLiteDB, oldVersion: number): Promise<void> {
        if (oldVersion < 2) {
            await CoreAppDB.createTablesFromSchema(BADGE_SCHEMA);

            await db.migrateTable(
                'addon_pushnotifications_badge',
                CORE_APP_BADGE_TABLE_NAME,
                (record) => ({
                    siteId: record.siteid,
                    addon: record.addon,
                    counter: record.number,
                }),
            );
        }
    },
};
export const SITE_SCHEMA: CoreSiteSchema = {
    name: 'AddonPushNotificationsProvider',
    version: 2,
    tables: [
        {
            name: REGISTERED_DEVICES_TABLE_NAME,
            columns: [
                {
                    name: 'appid',
                    type: 'TEXT',
                },
                {
                    name: 'uuid',
                    type: 'TEXT',
                },
                {
                    name: 'name',
                    type: 'TEXT',
                },
                {
                    name: 'model',
                    type: 'TEXT',
                },
                {
                    name: 'platform',
                    type: 'TEXT',
                },
                {
                    name: 'version',
                    type: 'TEXT',
                },
                {
                    name: 'pushid',
                    type: 'TEXT',
                },
                {
                    name: 'publickey',
                    type: 'TEXT',
                },
            ],
            primaryKeys: [...REGISTERED_DEVICES_TABLE_PRIMARY_KEYS],
        },
    ],
    async migrate(db: SQLiteDB, oldVersion: number): Promise<void> {
        if (oldVersion < 2) {
            // Schema changed in v4.2.
            await db.migrateTable('addon_pushnotifications_registered_devices', REGISTERED_DEVICES_TABLE_NAME);
        }
    },
};

/**
 * Data stored in DB for pending unregisters.
 */
export type CorePushNotificationsPendingUnregisterDBRecord = {
    siteid: string;
    siteurl: string;
    token: string;
    info: string;
};

/**
 * Data stored in DB for registered devices.
 */
export type CorePushNotificationsRegisteredDeviceDBRecord = {
    appid: string; // App ID.
    uuid: string; // Device UUID.
    name: string; // Device name.
    model: string; // Device model.
    platform: string; // Device platform.
    version: string; // Device version.
    pushid: string; // Push ID.
    publickey?: string; // Public key.
};

export type CorePushNotificationsRegisteredDeviceDBPrimaryKeys = typeof REGISTERED_DEVICES_TABLE_PRIMARY_KEYS[number];
