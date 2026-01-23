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
import { CoreSites } from '@services/sites';
import { CoreTime } from '@singletons/time';
import { makeSingleton } from '@singletons';
import { COMMENTS_TABLE, COMMENTS_DELETED_TABLE, CoreCommentsDBRecord, CoreCommentsDeletedDBRecord } from './database/comments';
import { ContextLevel } from '@/core/constants';

/**
 * Service to handle offline comments.
 */
@Injectable( { providedIn: 'root' })
export class CoreCommentsOfflineProvider {

    /**
     * Get all offline comments.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with comments.
     */
    async getAllComments(siteId?: string): Promise<(CoreCommentsDBRecord | CoreCommentsDeletedDBRecord)[]> {
        const site = await CoreSites.getSite(siteId);
        const results = await Promise.all([
            site.getDb().getRecords<CoreCommentsDBRecord>(COMMENTS_TABLE),
            site.getDb().getRecords<CoreCommentsDeletedDBRecord>(COMMENTS_DELETED_TABLE),
        ]);

        return results.flat();
    }

    /**
     * Get an offline comment.
     *
     * @param contextLevel Contextlevel system, course, user...
     * @param instanceId The Instance id of item associated with the context level.
     * @param component Component name.
     * @param itemId Associated id.
     * @param area String comment area. Default empty.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the comments.
     */
    async getComment(
        contextLevel: ContextLevel,
        instanceId: number,
        component: string,
        itemId: number,
        area = '',
        siteId?: string,
    ): Promise<CoreCommentsDBRecord | undefined> {
        try {
            const site = await CoreSites.getSite(siteId);

            return await site.getDb().getRecord(COMMENTS_TABLE, {
                contextlevel: contextLevel,
                instanceid: instanceId,
                component: component,
                itemid: itemId,
                area: area,
            });
        } catch {
            return;
        }
    }

    /**
     * Get all offline comments added or deleted of a special area.
     *
     * @param contextLevel Contextlevel system, course, user...
     * @param instanceId The Instance id of item associated with the context level.
     * @param component Component name.
     * @param itemId Associated id.
     * @param area String comment area. Default empty.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the comments.
     */
    async getComments(
        contextLevel: ContextLevel,
        instanceId: number,
        component: string,
        itemId: number,
        area = '',
        siteId?: string,
    ): Promise<(CoreCommentsDBRecord | CoreCommentsDeletedDBRecord)[]> {
        let comments: (CoreCommentsDBRecord | CoreCommentsDeletedDBRecord)[] = [];

        siteId = siteId || CoreSites.getCurrentSiteId();

        const comment = await this.getComment(contextLevel, instanceId, component, itemId, area, siteId);

        comments = comment ? [comment] : [];

        const deletedComments = await this.getDeletedComments(contextLevel, instanceId, component, itemId, area, siteId);
        comments = comments.concat(deletedComments);

        return comments;
    }

    /**
     * Get all offline deleted comments.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with comments.
     */
    async getAllDeletedComments(siteId?: string): Promise<CoreCommentsDeletedDBRecord[]> {
        const site = await CoreSites.getSite(siteId);

        return site.getDb().getRecords(COMMENTS_DELETED_TABLE);
    }

    /**
     * Get an offline comment.
     *
     * @param contextLevel Contextlevel system, course, user...
     * @param instanceId The Instance id of item associated with the context level.
     * @param component Component name.
     * @param itemId Associated id.
     * @param area String comment area. Default empty.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the comments.
     */
    async getDeletedComments(
        contextLevel: ContextLevel,
        instanceId: number,
        component: string,
        itemId: number,
        area = '',
        siteId?: string,
    ): Promise<CoreCommentsDeletedDBRecord[]> {
        try {
            const site = await CoreSites.getSite(siteId);

            return await site.getDb().getRecords(COMMENTS_DELETED_TABLE, {
                contextlevel: contextLevel,
                instanceid: instanceId,
                component: component,
                itemid: itemId,
                area: area,
            });
        } catch {
            return [];
        }
    }

    /**
     * Remove an offline comment.
     *
     * @param contextLevel Contextlevel system, course, user...
     * @param instanceId The Instance id of item associated with the context level.
     * @param component Component name.
     * @param itemId Associated id.
     * @param area String comment area. Default empty.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if deleted, rejected if failure.
     */
    async removeComment(
        contextLevel: ContextLevel,
        instanceId: number,
        component: string,
        itemId: number,
        area = '',
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.getDb().deleteRecords(COMMENTS_TABLE, {
            contextlevel: contextLevel,
            instanceid: instanceId,
            component: component,
            itemid: itemId,
            area: area,
        });
    }

    /**
     * Remove an offline deleted comment.
     *
     * @param contextLevel Contextlevel system, course, user...
     * @param instanceId The Instance id of item associated with the context level.
     * @param component Component name.
     * @param itemId Associated id.
     * @param area String comment area. Default empty.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if deleted, rejected if failure.
     */
    async removeDeletedComments(
        contextLevel: ContextLevel,
        instanceId: number,
        component: string,
        itemId: number,
        area = '',
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.getDb().deleteRecords(COMMENTS_DELETED_TABLE, {
            contextlevel: contextLevel,
            instanceid: instanceId,
            component: component,
            itemid: itemId,
            area: area,
        });
    }

    /**
     * Save a comment to be sent later.
     *
     * @param content Comment text.
     * @param contextLevel Contextlevel system, course, user...
     * @param instanceId The Instance id of item associated with the context level.
     * @param component Component name.
     * @param itemId Associated id.
     * @param area String comment area. Default empty.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if stored, rejected if failure.
     */
    async saveComment(
        content: string,
        contextLevel: ContextLevel,
        instanceId: number,
        component: string,
        itemId: number,
        area = '',
        siteId?: string,
    ): Promise<CoreCommentsDBRecord> {
        const site = await CoreSites.getSite(siteId);
        const now = CoreTime.timestamp();
        const data: CoreCommentsDBRecord = {
            contextlevel: contextLevel,
            instanceid: instanceId,
            component: component,
            itemid: itemId,
            area: area,
            content: content,
            lastmodified: now,
        };

        await site.getDb().insertRecord(COMMENTS_TABLE, data);

        return data;
    }

    /**
     * Delete a comment offline to be sent later.
     *
     * @param commentId Comment ID.
     * @param contextLevel Contextlevel system, course, user...
     * @param instanceId The Instance id of item associated with the context level.
     * @param component Component name.
     * @param itemId Associated id.
     * @param area String comment area. Default empty.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if stored, rejected if failure.
     */
    async deleteComment(
        commentId: number,
        contextLevel: ContextLevel,
        instanceId: number,
        component: string,
        itemId: number,
        area = '',
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        const now = CoreTime.timestamp();
        const data: CoreCommentsDeletedDBRecord = {
            contextlevel: contextLevel,
            instanceid: instanceId,
            component: component,
            itemid: itemId,
            area: area,
            commentid: commentId,
            deleted: now,
        };

        await site.getDb().insertRecord(COMMENTS_DELETED_TABLE, data);
    }

    /**
     * Undo delete a comment.
     *
     * @param commentId Comment ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if deleted, rejected if failure.
     */
    async undoDeleteComment(commentId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.getDb().deleteRecords(COMMENTS_DELETED_TABLE, { commentid: commentId });
    }

}
export const CoreCommentsOffline = makeSingleton(CoreCommentsOfflineProvider);
