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
 * Database variables for AddonModSurveyOfflineProvider.
 */
export const SURVEY_TABLE = 'addon_mod_survey_answers';
export const ADDON_MOD_SURVEY_OFFLINE_SITE_SCHEMA: CoreSiteSchema = {
    name: 'AddonModSurveyOfflineProvider',
    version: 1,
    tables: [
        {
            name: SURVEY_TABLE,
            columns: [
                {
                    name: 'surveyid',
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
                    name: 'answers',
                    type: 'TEXT',
                },
                {
                    name: 'timecreated',
                    type: 'INTEGER',
                },
            ],
            primaryKeys: ['surveyid', 'userid'],
        },
    ],
};

/**
 * Survey offline answers.
 */
export type AddonModSurveyAnswersDBRecord = {
    surveyid: number;
    userid: number;
    name: string;
    courseid: number;
    answers: string;
    timecreated: number;
};
