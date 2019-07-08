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
import { TranslateService } from '@ngx-translate/core';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';

/**
 * Structure of a tag index returned by WS.
 */
export interface CoreTagIndex {
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
}

/**
 * Structure of a tag item returned by WS.
 */
export interface CoreTagItem {
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
}

/**
 * Service to handle tags.
 */
@Injectable()
export class CoreTagProvider {

    protected ROOT_CACHE_KEY = 'CoreTag:';

    constructor(private sitesProvider: CoreSitesProvider, private translate: TranslateService) {}

    /**
     * Check whether tags are available in a certain site.
     *
     * @param {string} [siteId] Site Id. If not defined, use current site.
     * @return {Promise<boolean>} Promise resolved with true if available, resolved with false otherwise.
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
     * @param {CoreSite} [site] Site. If not defined, use current site.
     * @return {boolean} True if available.
     */
    areTagsAvailableInSite(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.wsAvailable('core_tag_get_tagindex_per_area') &&
                site.wsAvailable('core_tag_get_tag_cloud') &&
                site.wsAvailable('core_tag_get_tag_collections') &&
                !site.isFeatureDisabled('NoDelegate_CoreTag');
    }

    /**
     * Fetch the tag index.
     *
     * @param {number} [id=0] Tag ID.
     * @param {string} [name=''] Tag name.
     * @param {number} [collectionId=0] Tag collection ID.
     * @param {number} [areaId=0] Tag area ID.
     * @param {number} [fromContextId=0] Context ID where the link was displayed.
     * @param {number} [contextId=0] Context ID where to search for items.
     * @param {boolean} [recursive=true] Search in the context and its children.
     * @param {number} [page=0] Page number.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<CoreTagIndex[]>} Promise resolved with the tag index per area.
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
     * Invalidate tag index.
     *
     * @param {number} [id=0] Tag ID.
     * @param {string} [name=''] Tag name.
     * @param {number} [collectionId=0] Tag collection ID.
     * @param {number} [areaId=0] Tag area ID.
     * @param {number} [fromContextId=0] Context ID where the link was displayed.
     * @param {number} [contextId=0] Context ID where to search for items.
     * @param {boolean} [recursive=true] Search in the context and its children.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateTagIndexPerArea(id: number, name: string = '', collectionId: number = 0, areaId: number = 0,
            fromContextId: number = 0, contextId: number = 0, recursive: boolean = true, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const key = this.getTagIndexPerAreaKey(id, name, collectionId, areaId, fromContextId, contextId, recursive);

            return site.invalidateWsCacheForKey(key);
        });
    }

    /**
     * Get cache key for tag index.
     *
     * @param {number} id Tag ID.
     * @param {string} name Tag name.
     * @param {number} collectionId Tag collection ID.
     * @param {number} areaId Tag area ID.
     * @param {number} fromContextId Context ID where the link was displayed.
     * @param {number} contextId Context ID where to search for items.
     * @param {boolean} [recursive=true] Search in the context and its children.
     * @return {string} Cache key.
     */
    protected getTagIndexPerAreaKey(id: number, name: string, collectionId: number, areaId: number,  fromContextId: number,
            contextId: number, recursive: boolean): string {
        return this.ROOT_CACHE_KEY + 'index:' + id + ':' + name + ':' + collectionId + ':' + areaId + ':' + fromContextId + ':'
            + contextId + ':' +  (recursive ? 1 : 0);
    }
}
