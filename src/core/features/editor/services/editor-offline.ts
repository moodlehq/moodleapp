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
import { CoreError } from '@classes/errors/error';

import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton } from '@singletons';
import { CoreLogger } from '@singletons/logger';
import { CoreEditorDraft, CoreEditorDraftPrimaryData, DRAFT_TABLE } from './database/editor';

/**
 * Service with features regarding rich text editor in offline.
 */
@Injectable({ providedIn: 'root' })
export class CoreEditorOfflineProvider {

    protected logger: CoreLogger;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreEditorOfflineProvider');
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
    async deleteDraft(
        contextLevel: string,
        contextInstanceId: number,
        elementId: string,
        extraParams: Record<string, unknown>,
        siteId?: string,
    ): Promise<void> {
        try {
            const db = await CoreSites.getSiteDb(siteId);

            const params = this.fixDraftPrimaryData(contextLevel, contextInstanceId, elementId, extraParams);

            await db.deleteRecords(DRAFT_TABLE, params);
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
    protected fixDraftPrimaryData(
        contextLevel: string,
        contextInstanceId: number,
        elementId: string,
        extraParams: Record<string, unknown>,
    ): CoreEditorDraftPrimaryData {

        return {
            contextlevel: contextLevel,
            contextinstanceid: contextInstanceId,
            elementid: elementId,
            extraparams: CoreUtils.sortAndStringify(extraParams || {}),
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
    async getDraft(
        contextLevel: string,
        contextInstanceId: number,
        elementId: string,
        extraParams: Record<string, unknown>,
        siteId?: string,
    ): Promise<CoreEditorDraft> {

        const db = await CoreSites.getSiteDb(siteId);

        const params = this.fixDraftPrimaryData(contextLevel, contextInstanceId, elementId, extraParams);

        return db.getRecord(DRAFT_TABLE, params);
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
    async resumeDraft(
        contextLevel: string,
        contextInstanceId: number,
        elementId: string,
        extraParams: Record<string, unknown>,
        pageInstance: string,
        originalContent?: string,
        siteId?: string,
    ): Promise<CoreEditorDraft | undefined> {

        try {
            // Check if there is a draft stored.
            const entry = await this.getDraft(contextLevel, contextInstanceId, elementId, extraParams, siteId);

            // There is a draft stored. Update its page instance.
            try {
                const db = await CoreSites.getSiteDb(siteId);

                entry.pageinstance = pageInstance;
                entry.timemodified = Date.now();

                if (originalContent && entry.originalcontent != originalContent) {
                    entry.originalcontent = originalContent;
                    entry.drafttext = ''; // "Discard" the draft.
                }

                await db.insertRecord(DRAFT_TABLE, entry);
            } catch (error) {
                // Ignore errors saving the draft. It shouldn't happen.
            }

            return entry;
        } catch (error) {
            // No draft stored. Store an empty draft to save the pageinstance.
            await this.saveDraft(
                contextLevel,
                contextInstanceId,
                elementId,
                extraParams,
                pageInstance,
                '',
                originalContent,
                siteId,
            );
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
    async saveDraft(
        contextLevel: string,
        contextInstanceId: number,
        elementId: string,
        extraParams: Record<string, unknown>,
        pageInstance: string,
        draftText: string,
        originalContent?: string,
        siteId?: string,
    ): Promise<void> {

        let timecreated = Date.now();
        let entry: CoreEditorDraft | undefined;

        // Check if there is a draft already stored.
        try {
            entry = await this.getDraft(contextLevel, contextInstanceId, elementId, extraParams, siteId);

            timecreated = entry.timecreated || timecreated;
        } catch (error) {
            // No draft already stored.
        }

        if (entry) {
            if (entry.pageinstance != pageInstance) {
                this.logger.warn(`Discarding draft because of pageinstance. Context '${contextLevel}' '${contextInstanceId}', ` +
                    `element '${elementId}'`);

                throw new CoreError('Draft was discarded because it was modified in another page.');
            }

            if (!originalContent) {
                // Original content not set, use the one in the entry.
                originalContent = entry.originalcontent;
            }
        }

        const db = await CoreSites.getSiteDb(siteId);

        const data: CoreEditorDraft = this.fixDraftPrimaryData(contextLevel, contextInstanceId, elementId, extraParams);

        data.drafttext = (draftText || '').trim();
        data.pageinstance = pageInstance;
        data.timecreated = timecreated;
        data.timemodified = Date.now();
        if (originalContent) {
            data.originalcontent = originalContent;
        }

        await db.insertRecord(DRAFT_TABLE, data);
    }

}

export const CoreEditorOffline = makeSingleton(CoreEditorOfflineProvider);
