// (C) Copyright 2015 Martin Dougiamas
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
import { CoreAppProvider } from '@providers/app';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSite } from '@classes/site';
import { CoreCommentsOfflineProvider } from './offline';

/**
 * Service that provides some features regarding comments.
 */
@Injectable()
export class CoreCommentsProvider {

    static REFRESH_COMMENTS_EVENT = 'core_comments_refresh_comments';

    protected ROOT_CACHE_KEY = 'mmComments:';
    static pageSize = null;
    static pageSizeOK = false; // If true, the pageSize is definitive. If not, it's a temporal value to reduce WS calls.

    constructor(private sitesProvider: CoreSitesProvider, private utils: CoreUtilsProvider, private appProvider: CoreAppProvider,
        private commentsOffline: CoreCommentsOfflineProvider) {}

    /**
     * Add a comment.
     *
     * @param  {string} content      Comment text.
     * @param  {string} contextLevel Contextlevel system, course, user...
     * @param  {number} instanceId   The Instance id of item associated with the context level.
     * @param  {string} component    Component name.
     * @param  {number} itemId       Associated id.
     * @param  {string} [area='']    String comment area. Default empty.
     * @param  {string} [siteId]     Site ID. If not defined, current site.
     * @return {Promise<boolean>}    Promise resolved with boolean: true if comment was sent to server, false if stored in device.
     */
    addComment(content: string, contextLevel: string, instanceId: number, component: string, itemId: number, area: string = '',
            siteId?: string): Promise<boolean> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Convenience function to store a comment to be synchronized later.
        const storeOffline = (): Promise<any> => {
            return this.commentsOffline.saveComment(content, contextLevel, instanceId, component, itemId, area, siteId).then(() => {
                return Promise.resolve(false);
            });
        };

        if (!this.appProvider.isOnline()) {
            // App is offline, store the comment.
            return storeOffline();
        }

        // Send comment to server.
        return this.addCommentOnline(content, contextLevel, instanceId, component, itemId, area, siteId).then((comments) => {
            return comments;
        }).catch((error) => {
            if (this.utils.isWebServiceError(error)) {
                // It's a WebService error, the user cannot send the message so don't store it.
                return Promise.reject(error);
            }

            // Error sending comment, store it to retry later.
            return storeOffline();
        });
    }

    /**
     * Add a comment. It will fail if offline or cannot connect.
     *
     * @param  {string} content      Comment text.
     * @param  {string} contextLevel Contextlevel system, course, user...
     * @param  {number} instanceId   The Instance id of item associated with the context level.
     * @param  {string} component    Component name.
     * @param  {number} itemId       Associated id.
     * @param  {string} [area='']    String comment area. Default empty.
     * @param  {string} [siteId]     Site ID. If not defined, current site.
     * @return {Promise<any>}        Promise resolved when added, rejected otherwise.
     */
    addCommentOnline(content: string, contextLevel: string, instanceId: number, component: string, itemId: number,
            area: string = '', siteId?: string): Promise<any> {
        const comments = [
            {
                contextlevel: contextLevel,
                instanceid: instanceId,
                component: component,
                itemid: itemId,
                area: area,
                content: content
            }
        ];

        return this.addCommentsOnline(comments, siteId).then((commentsResponse) => {
               // A cooment was added, invalidate them.
            return this.invalidateCommentsData(contextLevel, instanceId, component, itemId, area, siteId).catch(() => {
                // Ignore errors.
            }).then(() => {
                return commentsResponse;
            });
        });
    }

    /**
     * Add several comments. It will fail if offline or cannot connect.
     *
     * @param  {any[]}  comments Comments to save.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}    Promise resolved when added, rejected otherwise. Promise resolved doesn't mean that comments
     *                           have been added, the resolve param can contain errors for comments not sent.
     */
    addCommentsOnline(comments: any[], siteId?: string): Promise<any> {
        if (!comments || !comments.length) {
            return Promise.resolve();
        }

        return this.sitesProvider.getSite(siteId).then((site) => {
            const data = {
                comments: comments
            };

            return site.write('core_comment_add_comments', data);
        });
    }

    /**
     * Check if Calendar is disabled in a certain site.
     *
     * @param {CoreSite} [site] Site. If not defined, use current site.
     * @return {boolean} Whether it's disabled.
     */
    areCommentsDisabledInSite(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.isFeatureDisabled('NoDelegate_CoreComments');
    }

    /**
     * Check if comments are disabled in a certain site.
     *
     * @param  {string} [siteId] Site Id. If not defined, use current site.
     * @return {Promise<boolean>} Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    areCommentsDisabled(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.areCommentsDisabledInSite(site);
        });
    }

    /**
     * Delete a comment.
     *
     * @param  {any} comment         Comment object to delete.
     * @param  {string} [siteId]     Site ID. If not defined, current site.
     * @return {Promise<void>}       Promise resolved when deleted, rejected otherwise. Promise resolved doesn't mean that comments
     *                               have been deleted, the resolve param can contain errors for comments not deleted.
     */
    deleteComment(comment: any, siteId?: string): Promise<void> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        if (!comment.id) {
            return this.commentsOffline.removeComment(comment.contextlevel, comment.instanceid, comment.component, comment.itemid,
                    comment.area, siteId);
        }

        // Convenience function to store the action to be synchronized later.
        const storeOffline = (): Promise<any> => {
            return this.commentsOffline.deleteComment(comment.id, comment.contextlevel, comment.instanceid, comment.component,
                    comment.itemid, comment.area, siteId).then(() => {
                return false;
            });
        };

        if (!this.appProvider.isOnline()) {
            // App is offline, store the comment.
            return storeOffline();
        }

        // Send comment to server.
        return this.deleteCommentsOnline([comment.id], comment.contextlevel, comment.instanceid, comment.component, comment.itemid,
                comment.area, siteId).then(() => {
            return true;
        }).catch((error) => {
            if (this.utils.isWebServiceError(error)) {
                // It's a WebService error, the user cannot send the comment so don't store it.
                return Promise.reject(error);
            }

            // Error sending comment, store it to retry later.
            return storeOffline();
        });
    }

    /**
     * Delete a comment. It will fail if offline or cannot connect.
     *
     * @param  {number[]} commentIds Comment IDs to delete.
     * @param  {string} contextLevel Contextlevel system, course, user...
     * @param  {number} instanceId   The Instance id of item associated with the context level.
     * @param  {string} component    Component name.
     * @param  {number} itemId       Associated id.
     * @param  {string} [area='']    String comment area. Default empty.
     * @param  {string} [siteId]     Site ID. If not defined, current site.
     * @return {Promise<void>}       Promise resolved when deleted, rejected otherwise. Promise resolved doesn't mean that comments
     *                               have been deleted, the resolve param can contain errors for comments not deleted.
     */
    deleteCommentsOnline(commentIds: number[], contextLevel: string, instanceId: number, component: string, itemId: number,
            area: string = '', siteId?: string): Promise<void> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const data = {
                comments: commentIds
            };

            return site.write('core_comment_delete_comments', data).then((response) => {
                // A comment was deleted, invalidate comments.
                return this.invalidateCommentsData(contextLevel, instanceId, component, itemId, area, siteId).catch(() => {
                    // Ignore errors.
                });
            });
        });
    }

    /**
     * Returns whether WS to add/delete comments are available in site.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with true if available, resolved with false or rejected otherwise.
     * @since 3.8
     */
    isAddCommentsAvailable(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            // First check if it's disabled.
            if (this.areCommentsDisabledInSite(site)) {
                return false;
            }

            return site.wsAvailable('core_comment_add_comments');
        });
    }

    /**
     * Get cache key for get comments data WS calls.
     *
     * @param  {string} contextLevel Contextlevel system, course, user...
     * @param  {number} instanceId   The Instance id of item associated with the context level.
     * @param  {string} component    Component name.
     * @param  {number} itemId       Associated id.
     * @param  {string} [area='']    String comment area. Default empty.
     * @return {string} Cache key.
     */
    protected getCommentsCacheKey(contextLevel: string, instanceId: number, component: string, itemId: number,
            area: string = ''): string {
        return this.getCommentsPrefixCacheKey(contextLevel, instanceId) + ':' + component + ':' + itemId + ':' + area;
    }

    /**
     * Get cache key for get comments instance data WS calls.
     *
     * @param  {string} contextLevel Contextlevel system, course, user...
     * @param  {number} instanceId   The Instance id of item associated with the context level.
     * @return {string} Cache key.
     */
    protected getCommentsPrefixCacheKey(contextLevel: string, instanceId: number): string {
        return this.ROOT_CACHE_KEY + 'comments:' + contextLevel + ':' + instanceId;
    }

    /**
     * Retrieve a list of comments.
     *
     * @param  {string} contextLevel Contextlevel system, course, user...
     * @param  {number} instanceId   The Instance id of item associated with the context level.
     * @param  {string} component    Component name.
     * @param  {number} itemId       Associated id.
     * @param  {string} [area='']    String comment area. Default empty.
     * @param  {number} [page=0]     Page number (0 based). Default 0.
     * @param  {string} [siteId]     Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved with the comments.
     */
    getComments(contextLevel: string, instanceId: number, component: string, itemId: number, area: string = '', page: number = 0,
            siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params: any = {
                contextlevel: contextLevel,
                instanceid: instanceId,
                component: component,
                itemid: itemId,
                area: area,
                page: page,
            };

            const preSets = {
                cacheKey: this.getCommentsCacheKey(contextLevel, instanceId, component, itemId, area),
                updateFrequency: CoreSite.FREQUENCY_SOMETIMES
            };

            return site.read('core_comment_get_comments', params, preSets).then((response) => {
                if (response.comments) {
                    return response;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get comments count number to show on the comments component.
     *
     * @param  {string} contextLevel Contextlevel system, course, user...
     * @param  {number} instanceId   The Instance id of item associated with the context level.
     * @param  {string} component    Component name.
     * @param  {number} itemId       Associated id.
     * @param  {string} [area='']    String comment area. Default empty.
     * @param  {string} [siteId]     Site ID. If not defined, current site.
     * @return {Promise<string>}     Comments count with plus sign if needed.
     */
    getCommentsCount(contextLevel: string, instanceId: number, component: string, itemId: number, area: string = '',
            siteId?: string): Promise<string> {

        siteId = siteId ? siteId : this.sitesProvider.getCurrentSiteId();

        // Convenience function to get comments number on a page.
        const getCommentsPageCount = (page: number): Promise<number> => {
            return this.getComments(contextLevel, instanceId, component, itemId, area, page, siteId).then((response) => {
                if (response.comments) {
                    // Update pageSize with the greatest count at the moment.
                    if (response.comments && response.comments.length > CoreCommentsProvider.pageSize) {
                        CoreCommentsProvider.pageSize = response.comments.length;
                    }

                    return response.comments && response.comments.length ? response.comments.length : 0;
                }

                return -1;
            }).catch(() => {
                return -1;
            });
        };

        return getCommentsPageCount(0).then((count) => {
            if (CoreCommentsProvider.pageSizeOK && count >= CoreCommentsProvider.pageSize) {
                // Page Size is ok, show + in case it reached the limit.
                return (CoreCommentsProvider.pageSize - 1) + '+';
            } else if (count < 0 || (CoreCommentsProvider.pageSize && count < CoreCommentsProvider.pageSize)) {
                return count + '';
            }

            // Call to update page size.
            return getCommentsPageCount(1).then((countMore) => {
                // Page limit was reached on the previous call.
                if (countMore > 0) {

                    return (CoreCommentsProvider.pageSize - 1) + '+';
                }

                return count + '';
            });
        });
    }

    /**
     * Invalidates comments data.
     *
     * @param  {string} contextLevel Contextlevel system, course, user...
     * @param  {number} instanceId   The Instance id of item associated with the context level.
     * @param  {string} component    Component name.
     * @param  {number} itemId       Associated id.
     * @param  {string} [area='']    String comment area. Default empty.
     * @param  {string} [siteId]     Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateCommentsData(contextLevel: string, instanceId: number, component: string, itemId: number,
            area: string = '', siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {

            return this.utils.allPromises([
                // This is done with starting with to avoid conflicts with previous keys that were including page.
                site.invalidateWsCacheForKeyStartingWith(this.getCommentsCacheKey(contextLevel, instanceId, component, itemId,
                    area) + ':'),

                site.invalidateWsCacheForKey(this.getCommentsCacheKey(contextLevel, instanceId, component, itemId, area))
            ]);
        });
    }

    /**
     * Invalidates all comments data for an instance.
     *
     * @param  {string} contextLevel Contextlevel system, course, user...
     * @param  {number} instanceId   The Instance id of item associated with the context level.
     * @param  {string} [siteId]     Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateCommentsByInstance(contextLevel: string, instanceId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getCommentsPrefixCacheKey(contextLevel, instanceId));
        });
    }
}
