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
 * Database variables for CoreCourse service.
 */
export const ACTIVITY_LOG_TABLE = 'course_activity_log';
export const SITE_SCHEMA: CoreSiteSchema = {
    name: 'CoreCourseLogHelperProvider',
    version: 1,
    tables: [
        {
            name: ACTIVITY_LOG_TABLE,
            columns: [
                {
                    name: 'component',
                    type: 'TEXT',
                },
                {
                    name: 'componentid',
                    type: 'INTEGER',
                },
                {
                    name: 'ws',
                    type: 'TEXT',
                },
                {
                    name: 'data',
                    type: 'TEXT',
                },
                {
                    name: 'time',
                    type: 'INTEGER',
                },
            ],
            primaryKeys: ['component', 'componentid', 'ws', 'time'],
        },
    ],
};

export type CoreCourseActivityLogDBRecord = {
    component: string;
    componentid: number;
    ws: string;
    time: number;
    data?: string;
};
