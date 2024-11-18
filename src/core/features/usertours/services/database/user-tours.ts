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

/**
 * Database variables for CoreUserTours service.
 */
export const USER_TOURS_TABLE_NAME = 'user_tours';
export const APP_SCHEMA: CoreAppSchema = {
    name: 'CoreUserTours',
    version: 1,
    tables: [
        {
            name: USER_TOURS_TABLE_NAME,
            columns: [
                {
                    name: 'id',
                    type: 'TEXT',
                    primaryKey: true,
                },
                {
                    name: 'acknowledgedTime',
                    type: 'INTEGER',
                },
            ],
        },
    ],
};

/**
 * User Tours database entry.
 */
export type CoreUserToursDBEntry = {
    id: string;
    acknowledgedTime: number;
};
