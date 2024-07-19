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
import { CoreConfig } from '@services/config';

import { CoreFileHelper } from '@services/file-helper';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUrl } from '@singletons/url';
import { CoreUtils } from '@services/utils/utils';
import { Translate } from '@singletons';
import { CoreConstants } from '../constants';

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
     * @param url URL to open.
     * @returns Promise resolved if confirmed, rejected if rejected.
     */
    static async confirmOpenBrowserIfNeeded(url: string): Promise<void> {
        if (!CoreUrl.isHttpURL(url)) {
            // Only ask confirm for http(s), other cases usually launch external apps.
            return;
        }

        // Check if the user decided not to see the warning.
        const dontShowWarning = await CoreConfig.get(CoreConstants.SETTINGS_DONT_SHOW_EXTERNAL_LINK_WARN, 0);
        if (dontShowWarning) {
            return;
        }

        // Remove common sensitive information from the URL.
        url = url
            .replace(/token=[^&#]+/gi, 'token=secret')
            .replace(/tokenpluginfile\.php\/[^/]+/gi, 'tokenpluginfile.php/secret');

        const dontShowAgain = await CoreDomUtils.showPrompt(
            Translate.instant('core.warnopeninbrowser', { url }),
            undefined,
            Translate.instant('core.dontshowagain'),
            'checkbox',
        );

        if (dontShowAgain) {
            CoreConfig.set(CoreConstants.SETTINGS_DONT_SHOW_EXTERNAL_LINK_WARN, 1);
        }
    }

    /**
     * "Safe" implementation of window.open. It will open the URL without overriding the app.
     *
     * @param url URL to open.
     * @param name Name of the browsing context into which to load the URL.
     * @returns Promise resolved when done.
     */
    static async open(url: string, name?: string): Promise<void> {
        if (CoreUrl.isLocalFileUrl(url)) {
            const filename = url.substring(url.lastIndexOf('/') + 1);

            if (!CoreFileHelper.isOpenableInApp({ filename })) {
                try {
                    await CoreFileHelper.showConfirmOpenUnsupportedFile(false, { filename });
                } catch {
                    return; // Cancelled, stop.
                }
            }

            await CoreUtils.openFile(url);
        } else {
            let treated = false;

            if (name != '_system') {
                // Check if it can be opened in the app.
                treated = await CoreContentLinksHelper.handleLink(url, undefined, true, true);
            }

            if (!treated) {
                // Not opened in the app, open with browser. Check if we need to auto-login.
                if (!CoreSites.isLoggedIn()) {
                    // Not logged in, cannot auto-login.
                    CoreUtils.openInBrowser(url);
                } else {
                    await CoreSites.getRequiredCurrentSite().openInBrowserWithAutoLogin(url);
                }
            }
        }
    }

}
