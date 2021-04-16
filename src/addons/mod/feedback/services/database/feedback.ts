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
 * Database variables for AddonModFeedbackOfflineProvider.
 */
export const FEEDBACK_TABLE_NAME = 'addon_mod_feedback_answers';
export const OFFLINE_SITE_SCHEMA: CoreSiteSchema = {
    name: 'AddonModFeedbackOfflineProvider',
    version: 1,
    tables: [
        {
            name: FEEDBACK_TABLE_NAME,
            columns: [
                {
                    name: 'feedbackid',
                    type: 'INTEGER',
                },
                {
                    name: 'page',
                    type: 'INTEGER',
                },
                {
                    name: 'courseid',
                    type: 'INTEGER',
                },
                {
                    name: 'responses',
                    type: 'TEXT',
                },
                {
                    name: 'timemodified',
                    type: 'INTEGER',
                },
            ],
            primaryKeys: ['feedbackid', 'page'],
        },
    ],
};

/**
 * Response data.
 */
export type AddonModFeedbackResponseDBRecord = {
    feedbackid: number;
    page: number;
    courseid: number;
    responses: string;
    timemodified: number;
};
