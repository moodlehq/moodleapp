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
 * Database variables for AddonModQuizAccessPasswordHandlerService.
 */
export const PASSWORD_TABLE_NAME = 'addon_mod_quiz_access_password';
export const SITE_SCHEMA: CoreSiteSchema = {
    name: 'AddonModQuizAccessPasswordHandler',
    version: 1,
    tables: [
        {
            name: PASSWORD_TABLE_NAME,
            columns: [
                {
                    name: 'id',
                    type: 'INTEGER',
                    primaryKey: true,
                },
                {
                    name: 'password',
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

/**
 * Quiz attempt.
 */
export type AddonModQuizAccessPasswordDBRecord = {
    id: number;
    password: string;
    timemodified: number;
};
