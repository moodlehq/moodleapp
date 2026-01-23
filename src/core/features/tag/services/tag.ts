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
import { CoreSite } from '@classes/sites/site';
import { CoreWSExternalWarning } from '@services/ws';
import { makeSingleton, Translate } from '@singletons';
import { CoreError } from '@classes/errors/error';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CoreCacheUpdateFrequency } from '@/core/constants';

/**
 * Service to handle tags.
 */
@Injectable({ providedIn: 'root' })
export class CoreTagProvider {

    protected static readonly ROOT_CACHE_KEY = 'CoreTag:';

    static readonly SEARCH_LIMIT = 150;

    /**
     * Check whether tags are available in a certain site.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @returns Promise resolved with true if available, resolved with false otherwise.
     * @since 3.7
     */
    async areTagsAvailable(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return this.areTagsAvailableInSite(site);
    }

    /**
     * Check whether tags are available in a certain site.
     *
     * @param site Site. If not defined, use current site.
     * @returns True if available.
     * @since 3.7
     */
    areTagsAvailableInSite(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return !!site && site.canUseAdvancedFeature('usetags') &&
            site.wsAvailable('core_tag_get_tagindex_per_area') &&
            site.wsAvailable('core_tag_get_tag_cloud') &&
            site.wsAvailable('core_tag_get_tag_collections') &&
            !site.isFeatureDisabled('NoDelegate_CoreTag');
    }

    /**
     * Fetch the tag cloud.
     *
     * @param collectionId Tag collection ID.
     * @param isStandard Whether to return only standard tags.
     * @param sort Sort order for display (id, name, rawname, count, flag, isstandard, tagcollid).
     * @param search Search string.
     * @param fromContextId Context ID where this tag cloud is displayed.
     * @param contextId Only retrieve tag instances in this context.
     * @param recursive Retrieve tag instances in the context and its children.
     * @param limit Maximum number of tags to retrieve. Defaults to SEARCH_LIMIT.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the tag cloud.
     * @since 3.7
     */
    async getTagCloud(
        collectionId: number = 0,
        isStandard: boolean = false,
        sort: string = 'name',
        search: string = '',
        fromContextId: number = 0,
        contextId: number = 0,
        recursive: boolean = true,
        limit?: number,
        siteId?: string,
    ): Promise<CoreTagCloud> {
        limit = limit || CoreTagProvider.SEARCH_LIMIT;

        const site = await CoreSites.getSite(siteId);
        const params: CoreTagGetTagCloudWSParams = {
            tagcollid: collectionId,
            isstandard: isStandard,
            limit,
            sort,
            search,
            fromctx: fromContextId,
            ctx: contextId,
            rec: recursive,
        };
        const preSets: CoreSiteWSPreSets = {
            updateFrequency: CoreCacheUpdateFrequency.SOMETIMES,
            cacheKey: this.getTagCloudKey(collectionId, isStandard, sort, search, fromContextId, contextId, recursive),
            getFromCache: search != '', // Try to get updated data when searching.
        };

        return site.read('core_tag_get_tag_cloud', params, preSets);
    }

    /**
     * Fetch the tag collections.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the tag collections.
     * @since 3.7
     */
    async getTagCollections(siteId?: string): Promise<CoreTagCollection[]> {
        const site = await CoreSites.getSite(siteId);
        const preSets: CoreSiteWSPreSets = {
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            cacheKey: this.getTagCollectionsKey(),
        };

        const response: CoreTagCollections = await site.read('core_tag_get_tag_collections', null, preSets);

        if (!response || !response.collections) {
            throw new CoreError('Cannot fetch tag collections');
        }

        return response.collections;
    }

    /**
     * Fetch the tag index.
     *
     * @param id Tag ID.
     * @param name Tag name.
     * @param collectionId Tag collection ID.
     * @param areaId Tag area ID.
     * @param fromContextId Context ID where the link was displayed.
     * @param contextId Context ID where to search for items.
     * @param recursive Search in the context and its children.
     * @param page Page number.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the tag index per area.
     * @since 3.7
     */
    async getTagIndexPerArea(
        id: number,
        name: string = '',
        collectionId: number = 0,
        areaId: number = 0,
        fromContextId: number = 0,
        contextId: number = 0,
        recursive: boolean = true,
        page: number = 0,
        siteId?: string,
    ): Promise<CoreTagIndex[]> {
        const site = await CoreSites.getSite(siteId);
        const params: CoreTagGetTagindexPerAreaWSParams = {
            tagindex: {
                id,
                tag: name,
                tc: collectionId,
                ta: areaId,
                excl: true,
                from: fromContextId,
                ctx: contextId,
                rec: recursive,
                page,
            },
        };
        const preSets: CoreSiteWSPreSets = {
            updateFrequency: CoreCacheUpdateFrequency.OFTEN,
            cacheKey: this.getTagIndexPerAreaKey(id, name, collectionId, areaId, fromContextId, contextId, recursive),
        };

        let response: CoreTagIndex[];
        try {
            response = await site.read('core_tag_get_tagindex_per_area', params, preSets);
        } catch (error) {
            // Workaround for WS not passing parameter to error string.
            if (error && error.errorcode == 'notagsfound') {
                error.message = Translate.instant('core.tag.notagsfound', { $a: name || id || '' });
            }

            throw error;
        }

        if (!response) {
            throw new CoreError('Cannot fetch tag index per area');
        }

        return response;
    }

    /**
     * Invalidate tag cloud.
     *
     * @param collectionId Tag collection ID.
     * @param isStandard Whether to return only standard tags.
     * @param sort Sort order for display (id, name, rawname, count, flag, isstandard, tagcollid).
     * @param search Search string.
     * @param fromContextId Context ID where this tag cloud is displayed.
     * @param contextId Only retrieve tag instances in this context.
     * @param recursive Retrieve tag instances in the context and its children.
     */
    async invalidateTagCloud(
        collectionId: number = 0,
        isStandard: boolean = false,
        sort: string = 'name',
        search: string = '',
        fromContextId: number = 0,
        contextId: number = 0,
        recursive: boolean = true,
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        const key = this.getTagCloudKey(collectionId, isStandard, sort, search, fromContextId, contextId, recursive);

        await site.invalidateWsCacheForKey(key);
    }

    /**
     * Invalidate tag collections.
     *
     */
    async invalidateTagCollections(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        const key = this.getTagCollectionsKey();

        await site.invalidateWsCacheForKey(key);
    }

    /**
     * Invalidate tag index.
     *
     * @param id Tag ID.
     * @param name Tag name.
     * @param collectionId Tag collection ID.
     * @param areaId Tag area ID.
     * @param fromContextId Context ID where the link was displayed.
     * @param contextId Context ID where to search for items.
     * @param recursive Search in the context and its children.
     */
    async invalidateTagIndexPerArea(
        id: number,
        name: string = '',
        collectionId: number = 0,
        areaId: number = 0,
        fromContextId: number = 0,
        contextId: number = 0,
        recursive: boolean = true,
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        const key = this.getTagIndexPerAreaKey(id, name, collectionId, areaId, fromContextId, contextId, recursive);

        await site.invalidateWsCacheForKey(key);
    }

    /**
     * Get cache key for tag cloud.
     *
     * @param collectionId Tag collection ID.
     * @param isStandard Whether to return only standard tags.
     * @param sort Sort order for display (id, name, rawname, count, flag, isstandard, tagcollid).
     * @param search Search string.
     * @param fromContextId Context ID where this tag cloud is displayed.
     * @param contextId Only retrieve tag instances in this context.
     * @param recursive Retrieve tag instances in the context and it's children.
     * @returns Cache key.
     */
    protected getTagCloudKey(
        collectionId: number,
        isStandard: boolean,
        sort: string,
        search: string,
        fromContextId: number,
        contextId: number,
        recursive: boolean,
    ): string {
        return CoreTagProvider.ROOT_CACHE_KEY +
            'cloud:' +
            collectionId + ':' +
            (isStandard ? 1 : 0) + ':' +
            sort + ':' + search + ':' +
            fromContextId + ':' +
            contextId + ':' +
            (recursive ? 1 : 0);
    }

    /**
     * Get cache key for tag collections.
     *
     * @returns Cache key.
     */
    protected getTagCollectionsKey(): string {
        return `${CoreTagProvider.ROOT_CACHE_KEY}collections`;
    }

    /**
     * Get cache key for tag index.
     *
     * @param id Tag ID.
     * @param name Tag name.
     * @param collectionId Tag collection ID.
     * @param areaId Tag area ID.
     * @param fromContextId Context ID where the link was displayed.
     * @param contextId Context ID where to search for items.
     * @param recursive Search in the context and its children.
     * @returns Cache key.
     */
    protected getTagIndexPerAreaKey(
        id: number,
        name: string,
        collectionId: number,
        areaId: number,
        fromContextId: number,
        contextId: number,
        recursive: boolean,
    ): string {
        return CoreTagProvider.ROOT_CACHE_KEY +
            'index:' + id + ':' +
            name + ':' + collectionId + ':' +
            areaId + ':' + fromContextId + ':' +
            contextId + ':' +
            (recursive ? 1 : 0);
    }

}

export const CoreTag = makeSingleton(CoreTagProvider);

/**
 * Params of core_tag_get_tag_cloud WS.
 */
export type CoreTagGetTagCloudWSParams = {
    tagcollid?: number; // Tag collection id.
    isstandard?: boolean; // Whether to return only standard tags.
    limit?: number; // Maximum number of tags to retrieve.
    sort?: string; // Sort order for display (id, name, rawname, count, flag, isstandard, tagcollid).
    search?: string; // Search string.
    fromctx?: number; // Context id where this tag cloud is displayed.
    ctx?: number; // Only retrieve tag instances in this context.
    rec?: boolean; // Retrieve tag instances in the $ctx context and it's children.
};

/**
 * Structure of a tag cloud returned by WS.
 */
export type CoreTagCloud = {
    tags: CoreTagCloudTag[];
    tagscount: number;
    totalcount: number;
};

/**
 * Structure of a tag cloud tag returned by WS.
 */
export type CoreTagCloudTag = {
    name: string;
    viewurl: string;
    flag: boolean;
    isstandard: boolean;
    count: number;
    size: number;
};

/**
 * Structure of a tag collection returned by WS.
 */
export type CoreTagCollection = {
    id: number; // Collection id.
    name: string; // Collection name.
    isdefault: boolean; // Whether is the default collection.
    component: string; // Component the collection is related to.
    sortorder: number; // Collection ordering in the list.
    searchable: boolean; // Whether the tag collection is searchable.
    customurl: string; // Custom URL for the tag page instead of /tag/index.php.
};

/**
 * Structure of tag collections returned by WS.
 */
export type CoreTagCollections = {
    collections: CoreTagCollection[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of core_tag_get_tagindex_per_area WS.
 */
export type CoreTagGetTagindexPerAreaWSParams = {
    tagindex: {
        id?: number; // Tag id.
        tag?: string; // Tag name.
        tc?: number; // Tag collection id.
        ta?: number; // Tag area id.
        excl?: boolean; // Exlusive mode for this tag area.
        from?: number; // Context id where the link was displayed.
        ctx?: number; // Context id where to search for items.
        rec?: boolean; // Search in the context recursive.
        page?: number; // Page number (0-based).
    }; // Parameters.
};

/**
 * Structure of a tag index returned by WS.
 */
export type CoreTagIndex = {
    tagid: number;
    ta: number;
    component: string;
    itemtype: string;
    nextpageurl: string;
    prevpageurl: string;
    exclusiveurl: string;
    exclusivetext: string;
    title: string;
    content: string;
    hascontent: number;
    anchor: string;
};

/**
 * Structure of a tag item returned by WS.
 */
export type CoreTagItem = {
    id: number; // Tag id.
    name: string; // Tag name.
    rawname: string; // The raw, unnormalised name for the tag as entered by users.
    isstandard: boolean; // Whether this tag is standard.
    tagcollid: number; // Tag collection id.
    taginstanceid: number; // Tag instance id.
    taginstancecontextid: number; // Context the tag instance belongs to.
    itemid: number; // Id of the record tagged.
    ordering: number; // Tag ordering.
    flag: number; // Whether the tag is flagged as inappropriate.
    viewurl?: string; // @since 4.4. The url to view the tag.
};
