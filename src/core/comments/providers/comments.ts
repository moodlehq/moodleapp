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
import { CoreSitesProvider } from '@providers/sites';
import { CoreSite } from '@classes/site';

/**
 * Service that provides some features regarding comments.
 */
@Injectable()
export class CoreCommentsProvider {

    protected ROOT_CACHE_KEY = 'mmComments:';

    constructor(private sitesProvider: CoreSitesProvider) {}

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
     * Get cache key for get comments data WS calls.
     *
     * @param  {string} contextLevel Contextlevel system, course, user...
     * @param  {number} instanceId   The Instance id of item associated with the context level.
     * @param  {string} component    Component name.
     * @param  {number} itemId       Associated id.
     * @param  {string} [area='']    String comment area. Default empty.
     * @param  {number} [page=0]     Page number (0 based). Default 0.
     * @return {string} Cache key.
     */
    protected getCommentsCacheKey(contextLevel: string, instanceId: number, component: string,
            itemId: number, area: string = '', page: number = 0): string {
        return this.getCommentsPrefixCacheKey(contextLevel, instanceId) + ':' + component + ':' + itemId + ':' + area + ':' + page;
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
    getComments(contextLevel: string, instanceId: number, component: string, itemId: number,
            area: string = '', page: number = 0, siteId?: string): Promise<any> {
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
                cacheKey: this.getCommentsCacheKey(contextLevel, instanceId, component, itemId, area, page),
                updateFrequency: CoreSite.FREQUENCY_SOMETIMES
            };

            return site.read('core_comment_get_comments', params, preSets).then((response) => {
                if (response.comments) {
                    return response.comments;
                }

                return Promise.reject(null);
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
     * @param  {number} [page=0]     Page number (0 based). Default 0.
     * @param  {string} [siteId]     Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateCommentsData(contextLevel: string, instanceId: number, component: string, itemId: number,
            area: string = '', page: number = 0, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getCommentsCacheKey(contextLevel, instanceId, component, itemId, area, page));
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
