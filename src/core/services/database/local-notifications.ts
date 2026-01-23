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

import { CorePromisedValue } from '@classes/promised-value';
import { CoreAppSchema } from '@services/app-db';

/**
 * Database variables for CoreLocalNotifications service.
 */
export const LOCAL_NOTIFICATIONS_SITES_TABLE_NAME = 'notification_sites'; // Store to asigne unique codes to each site.
export const COMPONENTS_TABLE_NAME = 'notification_components'; // Store to asigne unique codes to each component.
export const TRIGGERED_TABLE_NAME = 'notifications_triggered'; // Store to prevent re-triggering notifications.
export const APP_SCHEMA: CoreAppSchema = {
    name: 'CoreLocalNotificationsProvider',
    version: 1,
    tables: [
        {
            name: LOCAL_NOTIFICATIONS_SITES_TABLE_NAME,
            columns: [
                {
                    name: 'id',
                    type: 'TEXT',
                    primaryKey: true,
                },
                {
                    name: 'code',
                    type: 'INTEGER',
                    notNull: true,
                },
            ],
        },
        {
            name: COMPONENTS_TABLE_NAME,
            columns: [
                {
                    name: 'id',
                    type: 'TEXT',
                    primaryKey: true,
                },
                {
                    name: 'code',
                    type: 'INTEGER',
                    notNull: true,
                },
            ],
        },
        {
            name: TRIGGERED_TABLE_NAME,
            columns: [
                {
                    name: 'id',
                    type: 'INTEGER',
                    primaryKey: true,
                },
                {
                    name: 'at',
                    type: 'INTEGER',
                    notNull: true,
                },
            ],
        },
    ],
};

export type CodeRequestsQueueItem = {
    table: typeof LOCAL_NOTIFICATIONS_SITES_TABLE_NAME | typeof COMPONENTS_TABLE_NAME;
    id: string;
    deferreds: CorePromisedValue<number>[];
};

export type CoreLocalNotificationsSitesDBRecord = {
    id: string;
    code: number;
};

export type CoreLocalNotificationsComponentsDBRecord = {
    id: string;
    code: number;
};

export type CoreLocalNotificationsTriggeredDBRecord = {
    id: number;
    at: number;
};
