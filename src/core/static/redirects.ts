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

import { CoreRedirectPayload } from '@services/navigator';
import { CoreLogger } from './logger';
import { CoreObject } from './object';
import { CoreWS } from '@services/ws';
import { CorePromiseUtils } from './promise-utils';

/**
 * Static class with helper functions to manage redirects.
 *
 * This static class is not necessary to be exported for site plugins.
 */
export class CoreRedirects {

    private static redirect?: CoreRedirectData;
    protected static logger = CoreLogger.getInstance('CoreRedirects');

    // Avoid creating instances.
    private constructor() {
        // Nothing to do.
    }

    /**
     * Read redirect data from local storage and clear it if it existed.
     */
    static consumeStorageRedirect(): void {
        if (!localStorage?.getItem) {
            return;
        }

        try {
            // Read data from storage.
            const jsonData = localStorage.getItem('CoreRedirect');

            if (!jsonData) {
                return;
            }

            // Clear storage.
            localStorage.removeItem('CoreRedirect');

            // Remember redirect data.
            const data: CoreRedirectData = JSON.parse(jsonData);

            if (!CoreObject.isEmpty(data)) {
                CoreRedirects.redirect = data;
            }
        } catch (error) {
            CoreRedirects.logger.error('Error loading redirect data:', error);
        }
    }

    /**
     * Retrieve and forget redirect data.
     *
     * @returns Redirect data if any.
     */
    static consumeMemoryRedirect(): CoreRedirectData | null {
        const redirect = CoreRedirects.getRedirect();

        CoreRedirects.forgetRedirect();

        if (redirect && (!redirect.timemodified || Date.now() - redirect.timemodified > 300000)) {
            // Redirect data is only valid for 5 minutes, discard it.
            return null;
        }

        return redirect;
    }

    /**
     * Forget redirect data.
     */
    static forgetRedirect(): void {
        delete CoreRedirects.redirect;
    }

    /**
     * Retrieve redirect data.
     *
     * @returns Redirect data if any.
     */
    static getRedirect(): CoreRedirectData | null {
        return CoreRedirects.redirect || null;
    }

    /**
     * Store redirect params.
     *
     * @param siteId Site ID.
     * @param redirectData Redirect data.
     */
    static storeRedirect(siteId: string, redirectData: CoreRedirectPayload = {}): void {
        if (!redirectData.redirectPath && !redirectData.urlToOpen) {
            return;
        }

        try {
            const redirect: CoreRedirectData = {
                siteId,
                timemodified: Date.now(),
                ...redirectData,
            };

            localStorage.setItem('CoreRedirect', JSON.stringify(redirect));
        } catch {
            // Ignore errors.
        }
    }

    /**
     * Check if a URL has a redirect.
     *
     * @param url The URL to check.
     * @returns Promise resolved with boolean_ whether there is a redirect.
     */
    static async checkRedirect(url: string): Promise<boolean> {
        if (!window.fetch) {
            // Cannot check if there is a redirect, assume it's false.
            return false;
        }

        const initOptions: RequestInit = { redirect: 'follow' };

        // Some browsers implement fetch but no AbortController.
        const controller = AbortController ? new AbortController() : false;

        if (controller) {
            initOptions.signal = controller.signal;
        }

        try {
            const response = await CorePromiseUtils.timeoutPromise(window.fetch(url, initOptions), CoreWS.getRequestTimeout());

            return response.redirected;
        } catch (error) {
            if (error.timeout && controller) {
                // Timeout, abort the request.
                controller.abort();
            }

            // There was a timeout, cannot determine if there's a redirect. Assume it's false.
            return false;
        }
    }

}

/**
 * Data stored for a redirect to another page/site.
 */
export type CoreRedirectData = CoreRedirectPayload & {
    siteId?: string; // ID of the site to load.
    timemodified?: number; // Timestamp when this redirect was last modified.
};
