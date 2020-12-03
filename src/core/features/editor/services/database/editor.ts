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
 * Database variables for CoreEditorOffline service.
 */
export const DRAFT_TABLE = 'editor_draft';
export const SITE_SCHEMA: CoreSiteSchema = {
    name: 'CoreEditorProvider',
    version: 1,
    tables: [
        {
            name: DRAFT_TABLE,
            columns: [
                {
                    name: 'contextlevel',
                    type: 'TEXT',
                },
                {
                    name: 'contextinstanceid',
                    type: 'INTEGER',
                },
                {
                    name: 'elementid',
                    type: 'TEXT',
                },
                {
                    name: 'extraparams', // Moodle web uses a page hash built with URL. App will use some params stringified.
                    type: 'TEXT',
                },
                {
                    name: 'drafttext',
                    type: 'TEXT',
                    notNull: true,
                },
                {
                    name: 'pageinstance',
                    type: 'TEXT',
                    notNull: true,
                },
                {
                    name: 'timecreated',
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'timemodified',
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'originalcontent',
                    type: 'TEXT',
                },
            ],
            primaryKeys: ['contextlevel', 'contextinstanceid', 'elementid', 'extraparams'],
        },
    ],
};

/**
 * Primary data to identify a stored draft.
 */
export type CoreEditorDraftPrimaryData = {
    contextlevel: string; // Context level.
    contextinstanceid: number; // The instance ID related to the context.
    elementid: string; // Element ID.
    extraparams: string; // Extra params stringified.
};

/**
 * Draft data stored.
 */
export type CoreEditorDraft = CoreEditorDraftPrimaryData & {
    drafttext?: string; // Draft text stored.
    pageinstance?: string; // Unique identifier to prevent storing data from several sources at the same time.
    timecreated?: number; // Time created.
    timemodified?: number; // Time modified.
    originalcontent?: string; // Original content of the editor.
};
