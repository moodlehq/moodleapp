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
 * Database variables for for CoreConfig service.
 */
export const CONFIG_TABLE_NAME = 'core_config';

export const APP_SCHEMA: CoreAppSchema = {
    name: 'CoreConfigProvider',
    version: 1,
    tables: [
        {
            name: CONFIG_TABLE_NAME,
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
};

export type ConfigDBEntry = {
    name: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any;
};
