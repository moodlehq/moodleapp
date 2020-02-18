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

import { Injectable } from '@angular/core';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider, CoreSiteSchema } from '@providers/sites';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUtilsProvider } from '@providers/utils/utils';

/**
 * Service with features regarding rich text editor in offline.
 */
@Injectable()
export class CoreEditorOfflineProvider {

    protected DRAFT_TABLE = 'editor_draft';

    protected logger;
    protected siteSchema: CoreSiteSchema = {
        name: 'CoreEditorProvider',
        version: 1,
        tables: [
            {
                name: this.DRAFT_TABLE,
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

    constructor(
            logger: CoreLoggerProvider,
            protected sitesProvider: CoreSitesProvider,
            protected textUtils: CoreTextUtilsProvider,
            protected utils: CoreUtilsProvider) {
        this.logger = logger.getInstance('CoreEditorProvider');

        this.sitesProvider.registerSiteSchema(this.siteSchema);
    }

    /**
     * Delete a draft from DB.
     *
     * @param contextLevel Context level.
     * @param contextInstanceId The instance ID related to the context.
     * @param elementId Element ID.
     * @param extraParams Object with extra params to identify the draft.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async deleteDraft(contextLevel: string, contextInstanceId: number, elementId: string, extraParams: {[name: string]: any},
            siteId?: string): Promise<void> {

        try {
            const db = await this.sitesProvider.getSiteDb(siteId);

            const params = this.fixDraftPrimaryData(contextLevel, contextInstanceId, elementId, extraParams);

            return db.deleteRecords(this.DRAFT_TABLE, params);
        } catch (error) {
            // Ignore errors, probably no draft stored.
        }
    }

    /**
     * Return an object with the draft primary data converted to the right format.
     *
     * @param contextLevel Context level.
     * @param contextInstanceId The instance ID related to the context.
     * @param elementId Element ID.
     * @param extraParams Object with extra params to identify the draft.
     * @return Object with the fixed primary data.
     */
    protected fixDraftPrimaryData(contextLevel: string, contextInstanceId: number, elementId: string,
            extraParams: {[name: string]: any}): CoreEditorDraftPrimaryData {

        return {
            contextlevel: contextLevel,
            contextinstanceid: contextInstanceId,
            elementid: elementId,
            extraparams: this.utils.sortAndStringify(extraParams || {}),
        };
    }

    /**
     * Get a draft from DB.
     *
     * @param contextLevel Context level.
     * @param contextInstanceId The instance ID related to the context.
     * @param elementId Element ID.
     * @param extraParams Object with extra params to identify the draft.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the draft data. Undefined if no draft stored.
     */
    async getDraft(contextLevel: string, contextInstanceId: number, elementId: string, extraParams: {[name: string]: any},
            siteId?: string): Promise<CoreEditorDraft> {

        const db = await this.sitesProvider.getSiteDb(siteId);

        const params = this.fixDraftPrimaryData(contextLevel, contextInstanceId, elementId, extraParams);

        return db.getRecord(this.DRAFT_TABLE, params);
    }

    /**
     * Get draft to resume it.
     *
     * @param contextLevel Context level.
     * @param contextInstanceId The instance ID related to the context.
     * @param elementId Element ID.
     * @param extraParams Object with extra params to identify the draft.
     * @param pageInstance Unique identifier to prevent storing data from several sources at the same time.
     * @param originalContent Original content of the editor.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the draft data. Undefined if no draft stored.
     */
    async resumeDraft(contextLevel: string, contextInstanceId: number, elementId: string, extraParams: {[name: string]: any},
            pageInstance: string, originalContent?: string, siteId?: string): Promise<CoreEditorDraft> {

        try {
            // Check if there is a draft stored.
            const entry = await this.getDraft(contextLevel, contextInstanceId, elementId, extraParams, siteId);

            // There is a draft stored. Update its page instance.
            try {
                const db = await this.sitesProvider.getSiteDb(siteId);

                entry.pageinstance = pageInstance;
                entry.timemodified = Date.now();

                if (originalContent && entry.originalcontent != originalContent) {
                    entry.originalcontent = originalContent;
                    entry.drafttext = ''; // "Discard" the draft.
                }

                await db.insertRecord(this.DRAFT_TABLE, entry);
            } catch (error) {
                // Ignore errors saving the draft. It shouldn't happen.
            }

            return entry;
        } catch (error) {
            // No draft stored. Store an empty draft to save the pageinstance.
            await this.saveDraft(contextLevel, contextInstanceId, elementId, extraParams, pageInstance, '', originalContent,
                    siteId);
        }
    }

    /**
     * Save a draft in DB.
     *
     * @param contextLevel Context level.
     * @param contextInstanceId The instance ID related to the context.
     * @param elementId Element ID.
     * @param extraParams Object with extra params to identify the draft.
     * @param pageInstance Unique identifier to prevent storing data from several sources at the same time.
     * @param draftText The text to store.
     * @param originalContent Original content of the editor.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async saveDraft(contextLevel: string, contextInstanceId: number, elementId: string, extraParams: {[name: string]: any},
            pageInstance: string, draftText: string, originalContent?: string, siteId?: string): Promise<void> {

        let timecreated = Date.now();
        let entry: CoreEditorDraft;

        // Check if there is a draft already stored.
        try {
            entry = await this.getDraft(contextLevel, contextInstanceId, elementId, extraParams, siteId);

            timecreated = entry.timecreated;
        } catch (error) {
            // No draft already stored.
        }

        if (entry) {
            if (entry.pageinstance != pageInstance) {
                this.logger.warning(`Discarding draft because of pageinstance. Context '${contextLevel}' '${contextInstanceId}', ` +
                        `element '${elementId}'`);
                throw null;
            }

            if (!originalContent) {
                // Original content not set, use the one in the entry.
                originalContent = entry.originalcontent;
            }
        }

        const db = await this.sitesProvider.getSiteDb(siteId);

        const data: CoreEditorDraft = this.fixDraftPrimaryData(contextLevel, contextInstanceId, elementId, extraParams);

        data.drafttext = (draftText || '').trim();
        data.pageinstance = pageInstance;
        data.timecreated = timecreated;
        data.timemodified = Date.now();
        if (originalContent) {
            data.originalcontent = originalContent;
        }

        await db.insertRecord(this.DRAFT_TABLE, data);
    }
}

/**
 * Primary data to identify a stored draft.
 */
type CoreEditorDraftPrimaryData = {
    contextlevel: string; // Context level.
    contextinstanceid: number; // The instance ID related to the context.
    elementid: string; // Element ID.
    extraparams: string; // Extra params stringified.
};

/**
 * Draft data stored.
 */
type CoreEditorDraft = CoreEditorDraftPrimaryData & {
    drafttext?: string; // Draft text stored.
    pageinstance?: string; // Unique identifier to prevent storing data from several sources at the same time.
    timecreated?: number; // Time created.
    timemodified?: number; // Time modified.
    originalcontent?: string; // Original content of the editor.
};
