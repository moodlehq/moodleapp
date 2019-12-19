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
import { TranslateService } from '@ngx-translate/core';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';

/**
 * Service to handle tags.
 */
@Injectable()
export class CoreTagProvider {

    static SEARCH_LIMIT = 150;

    protected ROOT_CACHE_KEY = 'CoreTag:';

    constructor(private sitesProvider: CoreSitesProvider, private translate: TranslateService) {}

    /**
     * Check whether tags are available in a certain site.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @return Promise resolved with true if available, resolved with false otherwise.
     * @since 3.7
     */
    areTagsAvailable(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.areTagsAvailableInSite(site);
        });
    }

    /**
     * Check whether tags are available in a certain site.
     *
     * @param site Site. If not defined, use current site.
     * @return True if available.
     */
    areTagsAvailableInSite(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.wsAvailable('core_tag_get_tagindex_per_area') &&
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
     * @return Promise resolved with the tag cloud.
     * @since 3.7
     */
    getTagCloud(collectionId: number = 0, isStandard: boolean = false, sort: string = 'name', search: string = '',
            fromContextId: number = 0, contextId: number = 0, recursive: boolean = true, limit?: number, siteId?: string):
            Promise<CoreTagCloud> {
        limit = limit || CoreTagProvider.SEARCH_LIMIT;

        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                tagcollid: collectionId,
                isstandard: isStandard,
                limit: limit,
                sort: sort,
                search: search,
                fromctx: fromContextId,
                ctx: contextId,
                rec: recursive
            };
            const preSets: CoreSiteWSPreSets = {
                updateFrequency: CoreSite.FREQUENCY_SOMETIMES,
                cacheKey: this.getTagCloudKey(collectionId, isStandard, sort, search, fromContextId, contextId, recursive),
                getFromCache: search != '' // Try to get updated data when searching.
            };

            return site.read('core_tag_get_tag_cloud', params, preSets);
        });
    }

    /**
     * Fetch the tag collections.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the tag collections.
     * @since 3.7
     */
    getTagCollections(siteId?: string): Promise<CoreTagCollection[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const preSets: CoreSiteWSPreSets = {
                updateFrequency: CoreSite.FREQUENCY_RARELY,
                cacheKey: this.getTagCollectionsKey()
            };

            return site.read('core_tag_get_tag_collections', null, preSets).then((response) => {
                if (!response || !response.collections) {
                    return Promise.reject(null);
                }

                return response.collections;
            });
        });
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
     * @return Promise resolved with the tag index per area.
     * @since 3.7
     */
    getTagIndexPerArea(id: number, name: string = '', collectionId: number = 0, areaId: number = 0, fromContextId: number = 0,
            contextId: number = 0, recursive: boolean = true, page: number = 0, siteId?: string): Promise<CoreTagIndex[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                tagindex: {
                    id: id,
                    tag: name,
                    tc: collectionId,
                    ta: areaId,
                    excl: true,
                    from: fromContextId,
                    ctx: contextId,
                    rec: recursive,
                    page: page
                },
            };
            const preSets: CoreSiteWSPreSets = {
                updateFrequency: CoreSite.FREQUENCY_OFTEN,
                cacheKey: this.getTagIndexPerAreaKey(id, name, collectionId, areaId, fromContextId, contextId, recursive)
            };

            return site.read('core_tag_get_tagindex_per_area', params, preSets).catch((error) => {
                // Workaround for WS not passing parameter to error string.
                if (error && error.errorcode == 'notagsfound') {
                    error.message = this.translate.instant('core.tag.notagsfound', {$a: name || id || ''});
                }

                return Promise.reject(error);
            }).then((response) => {
                if (!response || !response.length) {
                    return Promise.reject(null);
                }

                return response;
            });
        });
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
     * @return Promise resolved when the data is invalidated.
     */
    invalidateTagCloud(collectionId: number = 0, isStandard: boolean = false, sort: string = 'name', search: string = '',
            fromContextId: number = 0, contextId: number = 0, recursive: boolean = true, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const key = this.getTagCloudKey(collectionId, isStandard, sort, search, fromContextId, contextId, recursive);

            return site.invalidateWsCacheForKey(key);
        });
    }

    /**
     * Invalidate tag collections.
     *
     * @return Promise resolved when the data is invalidated.
     */
    invalidateTagCollections(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const key = this.getTagCollectionsKey();

            return site.invalidateWsCacheForKey(key);
        });
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
     * @return Promise resolved when the data is invalidated.
     */
    invalidateTagIndexPerArea(id: number, name: string = '', collectionId: number = 0, areaId: number = 0,
            fromContextId: number = 0, contextId: number = 0, recursive: boolean = true, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const key = this.getTagIndexPerAreaKey(id, name, collectionId, areaId, fromContextId, contextId, recursive);

            return site.invalidateWsCacheForKey(key);
        });
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
     * @return Cache key.
     */
    protected getTagCloudKey(collectionId: number, isStandard: boolean, sort: string, search: string, fromContextId: number,
            contextId: number, recursive: boolean): string {
        return this.ROOT_CACHE_KEY + 'cloud:' + collectionId + ':' + (isStandard ? 1 : 0) + ':' + sort + ':' + search + ':' +
            fromContextId + ':' + contextId + ':' +  (recursive ? 1 : 0);
    }

    /**
     * Get cache key for tag collections.
     *
     * @return Cache key.
     */
    protected getTagCollectionsKey(): string {
        return this.ROOT_CACHE_KEY + 'collections';
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
     * @return Cache key.
     */
    protected getTagIndexPerAreaKey(id: number, name: string, collectionId: number, areaId: number,  fromContextId: number,
            contextId: number, recursive: boolean): string {
        return this.ROOT_CACHE_KEY + 'index:' + id + ':' + name + ':' + collectionId + ':' + areaId + ':' + fromContextId + ':'
            + contextId + ':' +  (recursive ? 1 : 0);
    }
}

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
    id: number;
    name: string;
    isdefault: boolean;
    component: string;
    sortoder: number;
    searchable: boolean;
    customurl: string;
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
    id: number;
    name: string;
    rawname: string;
    isstandard: boolean;
    tagcollid: number;
    taginstanceid: number;
    taginstancecontextid: number;
    itemid: number;
    ordering: number;
    flag: number;
};
