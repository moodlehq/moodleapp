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

import { CoreContentLinksHelper } from '@features/contentlinks/services/contentlinks-helper';

import { CoreFileHelper } from '@services/file-helper';
import { CoreSites } from '@services/sites';
import { CoreUrl } from '@singletons/url';
import { CoreOpener } from './opener';

/**
 * Singleton with helper functions for windows.
 */
export class CoreWindow {

    // Avoid creating singleton instances.
    private constructor() {
        // Nothing to do.
    }

    /**
     * Show a confirm before opening a link in browser, unless the user previously marked to not show again.
     *
     * @returns Only shows a deprecation warning.
     * @deprecated since 5.0. Not used anymore. Use CoreOpener.openInBrowser and it will confirm if needed.
     */
    static async confirmOpenBrowserIfNeeded(): Promise<void> {
        const { CoreLogger } = await import('@singletons/logger');

        CoreLogger.getInstance('CoreWindow')
            .warn('confirmOpenBrowserIfNeeded has been deprecated since 5.0. Not used anymore.\
                 Use CoreOpener.openInBrowser and it will confirm if needed.');

    }

    /**
     * "Safe" implementation of window.open. It will open the URL without overriding the app.
     *
     * @param url URL to open.
     * @param name Name of the browsing context into which to load the URL.
     */
    static async open(url: string, name?: string): Promise<void> {
        // Check for forceexternal parameter first
        try {
            const urlObject = new URL(url);
            const forceExternal = urlObject.searchParams.get('forceexternal');

            if (forceExternal === '1') {
                // Force external browser opening
                console.log('Opening in external browser because forceexternal=1:', url);
                await CoreOpener.openInBrowser(url);

                return;
            }
        } catch (error) {
            // Invalid URL, continue with normal flow
            console.warn('Error parsing URL for forceexternal parameter:', error);
        }

        if (CoreUrl.isLocalFileUrl(url)) {
            const filename = url.substring(url.lastIndexOf('/') + 1);

            if (!CoreFileHelper.isOpenableInApp({ filename })) {
                try {
                    await CoreFileHelper.showConfirmOpenUnsupportedFile(false, { filename });
                } catch {
                    // Cancelled, stop.
                    return;
                }
            }

            await CoreOpener.openFile(url);
        } else {
            let treated = false;

            if (name !== '_system') {
                // Check if it can be opened in the app.
                treated = await CoreContentLinksHelper.handleLink(url, undefined, true, true);
            }

            if (!treated) {
                // Not opened in the app, open with browser. Check if we need to auto-login.
                if (!CoreSites.isLoggedIn()) {
                    // Not logged in, cannot auto-login.
                    CoreOpener.openInBrowser(url);
                } else {
                    await CoreSites.getRequiredCurrentSite().openInBrowserWithAutoLogin(url);
                }
            }
        }
    }

    /**
     * Open a URL in the system's external browser.
     *
     * @param url The URL to open.
     * @returns Promise resolved when done.
     */
    static async handleLinkExternally(url: string): Promise<void> {
        // Force external browser opening
        if (!url) {
            return;
        }

        console.log('Opening in external browser using handleLinkExternally:', url);
        await CoreOpener.openInBrowser(url);
    }

}
