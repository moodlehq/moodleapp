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
 * Database variables for AddonModChoiceOfflineProvider.
 */
export const RESPONSES_TABLE_NAME = 'addon_mod_choice_responses';
export const OFFLINE_SITE_SCHEMA: CoreSiteSchema = {
    name: 'AddonModChoiceOfflineProvider',
    version: 1,
    tables: [
        {
            name: RESPONSES_TABLE_NAME,
            columns: [
                {
                    name: 'choiceid',
                    type: 'INTEGER',
                },
                {
                    name: 'name',
                    type: 'TEXT',
                },
                {
                    name: 'courseid',
                    type: 'INTEGER',
                },
                {
                    name: 'userid',
                    type: 'INTEGER',
                },
                {
                    name: 'responses',
                    type: 'TEXT',
                },
                {
                    name: 'deleting',
                    type: 'INTEGER',
                },
                {
                    name: 'timecreated',
                    type: 'INTEGER',
                },
            ],
            primaryKeys: ['choiceid', 'userid'],
        },
    ],
};

/**
 * Response data.
 */
export type AddonModChoiceResponsesDBRecord = {
    choiceid: number;
    userid: number;
    courseid: number;
    name: string;
    responses: string;
    deleting: number;
    timecreated: number;
};
