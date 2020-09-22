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

import { NavController } from 'ionic-angular';
import { CoreFileHelper } from '@providers/file-helper';
import { CoreSites } from '@providers/sites';
import { CoreUrlUtils } from '@providers/utils/url';
import { CoreUtils } from '@providers/utils/utils';
import { CoreContentLinksHelper } from '@core/contentlinks/providers/helper';

/**
 * Options for the open function.
 */
export type CoreWindowOpenOptions = {
    /**
     * NavController to use when opening the link in the app.
     */
    navCtrl?: NavController;
};

/**
 * Singleton with helper functions for windows.
 */
export class CoreWindow {

    /**
     * "Safe" implementation of window.open. It will open the URL without overriding the app.
     *
     * @param url URL to open.
     * @param name Name of the browsing context into which to load the URL.
     * @param options Other options.
     * @return Promise resolved when done.
     */
    static async open(url: string, name?: string, options?: CoreWindowOpenOptions): Promise<void> {
        if (CoreUrlUtils.instance.isLocalFileUrl(url)) {
            const filename = url.substr(url.lastIndexOf('/') + 1);

            if (!CoreFileHelper.instance.isOpenableInApp({ filename })) {
                try {
                    await CoreFileHelper.instance.showConfirmOpenUnsupportedFile();
                } catch (error) {
                    return; // Cancelled, stop.
                }
            }

            await CoreUtils.instance.openFile(url);
        } else {
            let treated: boolean;
            options = options || {};

            if (name != '_system') {
                // Check if it can be opened in the app.
                treated = await CoreContentLinksHelper.instance.handleLink(url, undefined, options.navCtrl, true, true);
            }

            if (!treated) {
                // Not opened in the app, open with browser. Check if we need to auto-login
                if (!CoreSites.instance.isLoggedIn()) {
                    // Not logged in, cannot auto-login.
                    CoreUtils.instance.openInBrowser(url);
                } else {
                    await CoreSites.instance.getCurrentSite().openInBrowserWithAutoLoginIfSameSite(url);
                }
            }
        }
    }
}
