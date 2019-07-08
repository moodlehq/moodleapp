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

    constructor(private sitesProvider: CoreSitesProvider) {}

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
}
