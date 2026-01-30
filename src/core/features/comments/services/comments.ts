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
import { CoreSite } from '@classes/sites/site';
import { CoreNetwork } from '@services/network';
import { CoreSites } from '@services/sites';
import { CoreWSError } from '@classes/errors/wserror';
import { CoreWSExternalWarning } from '@services/ws';
import { makeSingleton } from '@singletons';
import { CoreEvents } from '@static/events';
import { CoreCommentsOffline } from './comments-offline';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { ContextLevel, CoreCacheUpdateFrequency } from '@/core/constants';
import { CorePromiseUtils } from '@static/promise-utils';
import { CoreTextFormat } from '@static/text';

declare module '@static/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [CoreCommentsProvider.REFRESH_COMMENTS_EVENT]: CoreCommentsRefreshCommentsEventData;
        [CoreCommentsProvider.COMMENTS_COUNT_CHANGED_EVENT]: CoreCommentsCountChangedEventData;
    }

}

/**
 * Service that provides some features regarding comments.
 */
@Injectable( { providedIn: 'root' })
export class CoreCommentsProvider {

    protected static readonly ROOT_CACHE_KEY = 'mmComments:';

    static readonly REFRESH_COMMENTS_EVENT = 'core_comments_refresh_comments';
    static readonly COMMENTS_COUNT_CHANGED_EVENT = 'core_comments_count_changed';

    static pageSize = 1; // At least it will be one.
    static pageSizeOK = false; // If true, the pageSize is definitive. If not, it's a temporal value to reduce WS calls.

    /**
     * Initialize the module service.
     */
    initialize(): void {
        // Reset comments page size.
        CoreEvents.on(CoreEvents.LOGIN, () => {
            CoreCommentsProvider.pageSize = 1;
            CoreCommentsProvider.pageSizeOK = false;
        });

    }

    /**
     * Add a comment.
     *
     * @param content Comment text.
     * @param contextLevel Contextlevel system, course, user...
     * @param instanceId The Instance id of item associated with the context level.
     * @param component Component name.
     * @param itemId Associated id.
     * @param area String comment area. Default empty.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: true if comment was sent to server, false if stored in device.
     */
    async addComment(
        content: string,
        contextLevel: ContextLevel,
        instanceId: number,
        component: string,
        itemId: number,
        area = '',
        siteId?: string,
    ): Promise<CoreCommentsData | false> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        // Convenience function to store a comment to be synchronized later.
        const storeOffline = async (): Promise<false> => {
            await CoreCommentsOffline.saveComment(content, contextLevel, instanceId, component, itemId, area, siteId);

            return false;
        };

        if (!CoreNetwork.isOnline()) {
            // App is offline, store the comment.
            return storeOffline();
        }

        // Send comment to server.
        try {
            return await this.addCommentOnline(content, contextLevel, instanceId, component, itemId, area, siteId);
        } catch (error) {
            if (CoreWSError.isWebServiceError(error)) {
                // It's a WebService error, the user cannot send the message so don't store it.
                throw error;
            }

            return storeOffline();
        }
    }

    /**
     * Add a comment. It will fail if offline or cannot connect.
     *
     * @param content Comment text.
     * @param contextLevel Contextlevel system, course, user...
     * @param instanceId The Instance id of item associated with the context level.
     * @param component Component name.
     * @param itemId Associated id.
     * @param area String comment area. Default empty.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when added, rejected otherwise.
     */
    async addCommentOnline(
        content: string,
        contextLevel: ContextLevel,
        instanceId: number,
        component: string,
        itemId: number,
        area = '',
        siteId?: string,
    ): Promise<CoreCommentsData> {
        const comments: CoreCommentsCommentBasicData[] = [
            {
                contextlevel: contextLevel,
                instanceid: instanceId,
                component: component,
                itemid: itemId,
                area: area,
                content: content,
            },
        ];

        const commentsResponse = await this.addCommentsOnline(comments, siteId);

        // A comment was added, invalidate them.
        await CorePromiseUtils.ignoreErrors(
            this.invalidateCommentsData(contextLevel, instanceId, component, itemId, area, siteId),
        );

        return commentsResponse[0];
    }

    /**
     * Add several comments. It will fail if offline or cannot connect.
     *
     * @param comments Comments to save.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when added, rejected otherwise. Promise resolved doesn't mean that comments
     *         have been added, the resolve param can contain errors for comments not sent.
     */
    async addCommentsOnline(
        comments: CoreCommentsCommentBasicData[],
        siteId?: string,
    ): Promise<CoreCommentsAddCommentsWSResponse> {
        if (!comments || !comments.length) {
            return [];
        }

        const site = await CoreSites.getSite(siteId);
        const data: CoreCommentsAddCommentsWSParams = {
            comments: comments,
        };

        return site.write('core_comment_add_comments', data);
    }

    /**
     * Check if comments are enabled in a certain site.
     *
     * @param site Site. If not defined, use current site.
     * @returns Whether it's enabled.
     */
    areCommentsEnabledInSite(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        if (!site) {
            return false;
        }

        return site.canUseAdvancedFeature('usecomments') && !site.isFeatureDisabled('NoDelegate_CoreComments');
    }

    /**
     * Check if comments are enabled in a certain site.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @returns Promise resolved with true if enabled, rejected or resolved with false otherwise.
     */
    async areCommentsEnabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return this.areCommentsEnabledInSite(site);
    }

    /**
     * Delete a comment.
     *
     * @param comment Comment object to delete.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when deleted (with true if deleted in online, false otherwise), rejected otherwise.
     *  Promise resolved doesn't mean that comments have been deleted,the resolve param can contain errors for comment
     *  not deleted.
     */
    async deleteComment(comment: CoreCommentsCommentBasicData, siteId?: string): Promise<boolean> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        // Offline comment, just delete it.
        if (!comment.id) {
            await CoreCommentsOffline.removeComment(
                comment.contextlevel,
                comment.instanceid,
                comment.component,
                comment.itemid,
                comment.area,
                siteId,
            );

            return false;
        }

        // Convenience function to store the action to be synchronized later.
        const storeOffline = async (): Promise<boolean> => {
            if (!comment.id) {
                return false;
            }

            await CoreCommentsOffline.deleteComment(
                comment.id,
                comment.contextlevel,
                comment.instanceid,
                comment.component,
                comment.itemid,
                comment.area,
                siteId,
            );

            return false;
        };

        if (!CoreNetwork.isOnline()) {
            // App is offline, store the comment.
            return storeOffline();
        }

        // Send comment to server.
        try {
            await this.deleteCommentsOnline(
                [comment.id],
                comment.contextlevel,
                comment.instanceid,
                comment.component,
                comment.itemid,
                comment.area,
                siteId,
            );

            return true;
        } catch (error) {
            if (CoreWSError.isWebServiceError(error)) {
                // It's a WebService error, the user cannot send the comment so don't store it.
                throw error;
            }

            return storeOffline();
        }
    }

    /**
     * Delete a comment. It will fail if offline or cannot connect.
     *
     * @param commentIds Comment IDs to delete.
     * @param contextLevel Contextlevel system, course, user...
     * @param instanceId The Instance id of item associated with the context level.
     * @param component Component name.
     * @param itemId Associated id.
     * @param area String comment area. Default empty.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when deleted, rejected otherwise. Promise resolved doesn't mean that comments
     *         have been deleted, the resolve param can contain errors for comments not deleted.
     */
    async deleteCommentsOnline(
        commentIds: number[],
        contextLevel: ContextLevel,
        instanceId: number,
        component: string,
        itemId: number,
        area = '',
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const data: CoreCommentsDeleteCommentsWSParams = {
            comments: commentIds,
        };

        await site.write('core_comment_delete_comments', data);

        await CorePromiseUtils.ignoreErrors(
            this.invalidateCommentsData(contextLevel, instanceId, component, itemId, area, siteId),
        );
    }

    /**
     * Returns whether WS to add/delete comments are available in site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with true if available, resolved with false or rejected otherwise.
     * @since 3.8
     */
    async isAddCommentsAvailable(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        // First check if it's disabled.
        if (!this.areCommentsEnabledInSite(site)) {
            return false;
        }

        return site.wsAvailable('core_comment_add_comments');
    }

    /**
     * Get cache key for get comments data WS calls.
     *
     * @param contextLevel Contextlevel system, course, user...
     * @param instanceId The Instance id of item associated with the context level.
     * @param component Component name.
     * @param itemId Associated id.
     * @param area String comment area. Default empty.
     * @returns Cache key.
     */
    protected getCommentsCacheKey(
        contextLevel: ContextLevel,
        instanceId: number,
        component: string,
        itemId: number,
        area = '',
    ): string {
        return `${this.getCommentsPrefixCacheKey(contextLevel, instanceId)}:${component}:${itemId}:${area}`;
    }

    /**
     * Get cache key for get comments instance data WS calls.
     *
     * @param contextLevel Contextlevel system, course, user...
     * @param instanceId The Instance id of item associated with the context level.
     * @returns Cache key.
     */
    protected getCommentsPrefixCacheKey(contextLevel: ContextLevel, instanceId: number): string {
        return `${CoreCommentsProvider.ROOT_CACHE_KEY}comments:${contextLevel}:${instanceId}`;
    }

    /**
     * Retrieve a list of comments.
     *
     * @param contextLevel Contextlevel system, course, user...
     * @param instanceId The Instance id of item associated with the context level.
     * @param component Component name.
     * @param itemId Associated id.
     * @param area String comment area. Default empty.
     * @param page Page number (0 based). Default 0.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the comments.
     */
    async getComments(
        contextLevel: ContextLevel,
        instanceId: number,
        component: string,
        itemId: number,
        area = '',
        page = 0,
        siteId?: string,
    ): Promise<CoreCommentsGetCommentsWSResponse> {
        const site = await CoreSites.getSite(siteId);

        const params: CoreCommentsGetCommentsWSParams = {
            contextlevel: contextLevel,
            instanceid: instanceId,
            component: component,
            itemid: itemId,
            area: area,
            page: page,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCommentsCacheKey(contextLevel, instanceId, component, itemId, area),
            updateFrequency: CoreCacheUpdateFrequency.SOMETIMES,
        };
        const response = await site.read<CoreCommentsGetCommentsWSResponse>('core_comment_get_comments', params, preSets);

        if (response.comments) {
            // Update pageSize with the greatest count at the moment.
            if (response.count === undefined && response.comments.length > CoreCommentsProvider.pageSize) {
                CoreCommentsProvider.pageSize = response.comments.length;
            }

            return response;
        }

        throw new CoreError('No comments returned');
    }

    /**
     * Get comments count number to show on the comments component.
     *
     * @param contextLevel Contextlevel system, course, user...
     * @param instanceId The Instance id of item associated with the context level.
     * @param component Component name.
     * @param itemId Associated id.
     * @param area String comment area. Default empty.
     * @param siteId Site ID. If not defined, current site.
     * @returns Comments count with plus sign if needed.
     */
    async getCommentsCount(
        contextLevel: ContextLevel,
        instanceId: number,
        component: string,
        itemId: number,
        area = '',
        siteId?: string,
    ): Promise<string> {

        siteId = siteId ? siteId : CoreSites.getCurrentSiteId();
        let trueCount = false;

        // Convenience function to get comments number on a page.
        const getCommentsPageCount = async (page: number): Promise<number> => {
            try {
                const response = await this.getComments(contextLevel, instanceId, component, itemId, area, page, siteId);
                // Count is only available in 3.8 onwards.

                if (response.count !== undefined) {
                    trueCount = true;

                    return response.count;
                }

                if (response.comments) {
                    return response.comments.length || 0;
                }

                return -1;
            } catch {
                return -1;
            }
        };

        const count = await getCommentsPageCount(0);

        if (trueCount || count < CoreCommentsProvider.pageSize) {
            return `${count}`;
        } else if (CoreCommentsProvider.pageSizeOK && count >= CoreCommentsProvider.pageSize) {
            // Page Size is ok, show + in case it reached the limit.
            return `${CoreCommentsProvider.pageSize - 1}+`;
        }

        const countMore = await getCommentsPageCount(1);
        // Page limit was reached on the previous call.
        if (countMore > 0) {
            CoreCommentsProvider.pageSizeOK = true;

            return `${CoreCommentsProvider.pageSize - 1}+`;
        }

        return `${count}`;
    }

    /**
     * Invalidates comments data.
     *
     * @param contextLevel Contextlevel system, course, user...
     * @param instanceId The Instance id of item associated with the context level.
     * @param component Component name.
     * @param itemId Associated id.
     * @param area String comment area. Default empty.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateCommentsData(
        contextLevel: ContextLevel,
        instanceId: number,
        component: string,
        itemId: number,
        area = '',
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await CorePromiseUtils.allPromises([
            // This is done with starting with to avoid conflicts with previous keys that were including page.
            site.invalidateWsCacheForKeyStartingWith(this.getCommentsCacheKey(
                contextLevel,
                instanceId,
                component,
                itemId,
                area,
            ) + ':'),

            site.invalidateWsCacheForKey(this.getCommentsCacheKey(contextLevel, instanceId, component, itemId, area)),
        ]);
    }

    /**
     * Invalidates all comments data for an instance.
     *
     * @param contextLevel Contextlevel system, course, user...
     * @param instanceId The Instance id of item associated with the context level.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateCommentsByInstance(contextLevel: ContextLevel, instanceId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getCommentsPrefixCacheKey(contextLevel, instanceId));
    }

}
export const CoreComments = makeSingleton(CoreCommentsProvider);

/**
 * Data returned by comment_area_exporter.
 */
export type CoreCommentsArea = {
    component: string; // Component.
    commentarea: string; // Commentarea.
    itemid: number; // Itemid.
    courseid: number; // Courseid.
    contextid: number; // Contextid.
    cid: string; // Cid.
    autostart: boolean; // Autostart.
    canpost: boolean; // Canpost.
    canview: boolean; // Canview.
    count: number; // Count.
    collapsediconkey: string; // Collapsediconkey.
    displaytotalcount: boolean; // Displaytotalcount.
    displaycancel: boolean; // Displaycancel.
    fullwidth: boolean; // Fullwidth.
    linktext: string; // Linktext.
    notoggle: boolean; // Notoggle.
    template: string; // Template.
    canpostorhascomments: boolean; // Canpostorhascomments.
};

/**
 * Params of core_comment_add_comments WS.
 */
type CoreCommentsAddCommentsWSParams = {
    comments: CoreCommentsCommentBasicData[];
};

export type CoreCommentsCommentBasicData = {
    id?: number; // Comment ID.
    contextlevel: ContextLevel; // Contextlevel system, course, user...
    instanceid: number; // The id of item associated with the contextlevel.
    component: string; // Component.
    content: string; // Component.
    itemid: number; // Associated id.
    area?: string; // String comment area.
};

/**
 * Comments Data returned by WS.
 */
export type CoreCommentsData = {
    id: number; // Comment ID.
    content: string; // The content text formatted.
    format: CoreTextFormat; // Content format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    timecreated: number; // Time created (timestamp).
    strftimeformat: string; // Time format.
    profileurl: string; // URL profile.
    fullname: string; // Fullname.
    time: string; // Time in human format.
    avatar: string; // HTML user picture.
    userid: number; // User ID.
    delete?: boolean; // Permission to delete=true/false.
};

/**
 * Data returned by core_comment_add_comments WS.
 */
export type CoreCommentsAddCommentsWSResponse = CoreCommentsData[];

/**
 * Params of core_comment_delete_comments WS.
 */
type CoreCommentsDeleteCommentsWSParams = {
    comments: number[];
};

/**
 * Params of core_comment_get_comments WS.
 */
type CoreCommentsGetCommentsWSParams = {
    contextlevel: ContextLevel; // Contextlevel system, course, user...
    instanceid: number; // The Instance id of item associated with the context level.
    component: string; // Component.
    itemid: number; // Associated id.
    area?: string; // String comment area.
    page?: number; // Page number (0 based).
    sortdirection?: string; // Sort direction: ASC or DESC.
};

/**
 * Data returned by core_comment_get_comments WS.
 */
export type CoreCommentsGetCommentsWSResponse = {
    comments: CoreCommentsData[]; // List of comments.
    count?: number; // @since 3.8. Total number of comments.
    perpage?: number; // @since 3.8. Number of comments per page.
    canpost?: boolean; // Whether the user can post in this comment area.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Data sent by COMMENTS_COUNT_CHANGED_EVENT event.
 */
export type CoreCommentsCountChangedEventData = {
    contextLevel: ContextLevel;
    instanceId: number;
    component: string;
    itemId: number;
    area: string;
    countChange: number;
};

/**
 * Data sent by REFRESH_COMMENTS_EVENT event.
 */
export type CoreCommentsRefreshCommentsEventData = {
    contextLevel?: ContextLevel;
    instanceId?: number;
    component?: string;
    itemId?: number;
    area?: string;
};
