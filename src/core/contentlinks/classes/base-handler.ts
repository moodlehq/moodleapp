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

import { CoreContentLinksHandler, CoreContentLinksAction } from '../providers/delegate';

/**
 * Base handler to be registered in CoreContentLinksHandler. It is useful to minimize the amount of
 * functions that handlers need to implement.
 *
 * It allows you to specify a "pattern" (RegExp) that will be used to check if the handler handles a URL and to get its site URL.
 */
export class CoreContentLinksHandlerBase implements CoreContentLinksHandler {
    /**
     * A name to identify the handler.
     * @type {string}
     */
    name = 'CoreContentLinksHandlerBase';

    /**
     * Handler's priority. The highest priority is treated first.
     * @type {number}
     */
    priority = 0;

    /**
     * Whether the isEnabled function should be called for all the users in a site. It should be true only if the isEnabled call
     * can return different values for different users in same site.
     * @type {boolean}
     */
    checkAllUsers = false;

    /**
     * Name of the feature this handler is related to.
     * It will be used to check if the feature is disabled (@see CoreSite.isFeatureDisabled).
     * @type {string}
     */
    featureName = '';

    /**
     * A pattern to use to detect if the handler handles a URL and to get its site URL. Required if "handles" and
     * "getSiteUrl" functions aren't overridden.
     * @type {RexExp}
     */
    pattern?: RegExp;

    constructor() {
        // Nothing to do.
    }

    /**
     * Get the list of actions for a link (url).
     *
     * @param {string[]} siteIds List of sites the URL belongs to.
     * @param {string} url The URL to treat.
     * @param {any} params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param {number} [courseId] Course ID related to the URL. Optional but recommended.
     * @return {CoreContentLinksAction[]|Promise<CoreContentLinksAction[]>} List of (or promise resolved with list of) actions.
     */
    getActions(siteIds: string[], url: string, params: any, courseId?: number):
            CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        return [];
    }

    /**
     * Check if a URL is handled by this handler.
     *
     * @param {string} url The URL to check.
     * @return {boolean} Whether the URL is handled by this handler
     */
    handles(url: string): boolean {
        return this.pattern && url.search(this.pattern) >= 0;
    }

    /**
     * If the URL is handled by this handler, return the site URL.
     *
     * @param {string} url The URL to check.
     * @return {string} Site URL if it is handled, undefined otherwise.
     */
    getSiteUrl(url: string): string {
        if (this.pattern) {
            const position = url.search(this.pattern);
            if (position > -1) {
                return url.substr(0, position);
            }
        }
    }

    /**
     * Check if the handler is enabled for a certain site (site + user) and a URL.
     * If not defined, defaults to true.
     *
     * @param {string} siteId The site ID.
     * @param {string} url The URL to treat.
     * @param {any} params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param {number} [courseId] Course ID related to the URL. Optional but recommended.
     * @return {boolean|Promise<boolean>} Whether the handler is enabled for the URL and site.
     */
    isEnabled(siteId: string, url: string, params: any, courseId?: number): boolean | Promise<boolean> {
        return true;
    }
}
