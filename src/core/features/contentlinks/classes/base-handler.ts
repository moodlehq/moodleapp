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

import { CoreContentLinksHandler, CoreContentLinksAction } from '../services/contentlinks-delegate';

/**
 * Base handler to be registered in CoreContentLinksHandler. It is useful to minimize the amount of
 * functions that handlers need to implement.
 *
 * It allows you to specify a "pattern" (RegExp) that will be used to check if the handler handles a URL and to get its site URL.
 */
export class CoreContentLinksHandlerBase implements CoreContentLinksHandler {

    /**
     * A name to identify the handler.
     */
    name = 'CoreContentLinksHandlerBase';

    /**
     * Handler's priority. The highest priority is treated first.
     */
    priority = 0;

    /**
     * Whether the isEnabled function should be called for all the users in a site. It should be true only if the isEnabled call
     * can return different values for different users in same site.
     */
    checkAllUsers = false;

    /**
     * Name of the feature this handler is related to.
     * It will be used to check if the feature is disabled (@see CoreSite.isFeatureDisabled).
     */
    featureName = '';

    /**
     * A pattern to use to detect if the handler handles a URL and to get its site URL. Required if "handles" and
     * "getSiteUrl" functions aren't overridden.
     */
    pattern?: RegExp;

    /**
     * If true, a "^" will be added to the beginning of the pattern. It's recommended to avoid collisions with other handlers.
     */
    patternMatchStart = true;

    /**
     * Get the list of actions for a link (url).
     *
     * @param siteIds List of sites the URL belongs to.
     * @param url The URL to treat.
     * @param params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param courseId Course ID related to the URL. Optional but recommended.
     * @param data Extra data to handle the URL.
     * @returns List of (or promise resolved with list of) actions.
     */
    getActions(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        siteIds: string[],
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        url: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        params: Record<string, string>,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        courseId?: number,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        data?: unknown,
    ): CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        return [];
    }

    /**
     * Check if a URL is handled by this handler.
     *
     * @param url The URL to check.
     * @returns Whether the URL is handled by this handler
     */
    handles(url: string): boolean {
        let pattern = this.pattern;

        if (pattern && this.patternMatchStart) {
            let patternString = pattern.toString();
            patternString = patternString.substring(1, patternString.length - 1); // Remove slashes from beginning and end.
            pattern = new RegExp('^' + patternString);
        }

        return !!pattern && url.search(pattern) >= 0;
    }

    /**
     * If the URL is handled by this handler, return the site URL.
     *
     * @param url The URL to check.
     * @returns Site URL if it is handled, undefined otherwise.
     */
    getSiteUrl(url: string): string | undefined {
        if (this.pattern) {
            const position = url.search(this.pattern);
            if (position > -1) {
                return url.substring(0, position);
            }
        }
    }

    /**
     * Check if the handler is enabled for a certain site (site + user) and a URL.
     * If not defined, defaults to true.
     *
     * @param siteId The site ID.
     * @param url The URL to treat.
     * @param params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param courseId Course ID related to the URL. Optional but recommended.
     * @returns Whether the handler is enabled for the URL and site.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async isEnabled(siteId: string, url: string, params: Record<string, string>, courseId?: number): Promise<boolean> {
        return true;
    }

}
