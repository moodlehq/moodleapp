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
import { NavController } from '@ionic/angular';

import { CoreFileHelper } from '@services/file-helper';
import { CoreSites } from '@services/sites';
import { CoreUrlUtils } from '@services/utils/url';
import { CoreUtils } from '@services/utils/utils';

/**
 * Options for the open function.
 *
 * @deprecated since 3.9.5
 */
export type CoreWindowOpenOptions = {
    /**
     * NavController to use when opening the link in the app.
     *
     * @deprecated since 3.9.5
     */
    navCtrl?: NavController;
};

/**
 * Singleton with helper functions for windows.
 */
export class CoreWindow {

    // Avoid creating singleton instances.
    private constructor() {
        // Nothing to do.
    }

    /**
     * "Safe" implementation of window.open. It will open the URL without overriding the app.
     *
     * @param url URL to open.
     * @param name Name of the browsing context into which to load the URL.
     * @return Promise resolved when done.
     */
    static async open(url: string, name?: string): Promise<void> {
        if (CoreUrlUtils.isLocalFileUrl(url)) {
            const filename = url.substr(url.lastIndexOf('/') + 1);

            if (!CoreFileHelper.isOpenableInApp({ filename })) {
                try {
                    await CoreFileHelper.showConfirmOpenUnsupportedFile();
                } catch (error) {
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
                // Not opened in the app, open with browser. Check if we need to auto-login
                if (!CoreSites.isLoggedIn()) {
                    // Not logged in, cannot auto-login.
                    CoreUtils.openInBrowser(url);
                } else {
                    await CoreSites.getCurrentSite()!.openInBrowserWithAutoLoginIfSameSite(url);
                }
            }
        }
    }

}
