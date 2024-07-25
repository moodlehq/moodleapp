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

import { CoreSiteError } from '@classes/errors/siteerror';
import { CoreLoginHelper } from '@features/login/services/login-helper';
import { CoreUserAuthenticatedSupportConfig } from '@features/user/classes/support/authenticated-support-config';
import { CoreUserNullSupportConfig } from '@features/user/classes/support/null-support-config';
import { CorePlatform } from '@services/platform';
import { CoreSites } from '@services/sites';
import { CoreCustomURLSchemes } from '@services/urlschemes';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUrl } from '@singletons/url';
import { CoreUtils } from '@services/utils/utils';
import { Translate } from '@singletons';
import { CoreEvents } from '@singletons/events';

let lastInAppUrl: string | null = null;

/**
 *
 */
export default function(): void {
    // Check URLs loaded in any InAppBrowser.
    CoreEvents.on(CoreEvents.IAB_LOAD_START, async (event) => {
        // URLs with a custom scheme can be prefixed with "http://" or "https://", we need to remove this.
        const protocol = CoreUrl.getUrlProtocol(event.url);
        const url = event.url.replace(/^https?:\/\//, '');
        const urlScheme = CoreUrl.getUrlProtocol(url);
        const isExternalApp = urlScheme && urlScheme !== 'file' && urlScheme !== 'cdvfile';

        if (CoreCustomURLSchemes.isCustomURL(url)) {
            // Close the browser if it's a valid SSO URL.
            CoreCustomURLSchemes.handleCustomURL(url).catch((error) => {
                CoreCustomURLSchemes.treatHandleCustomURLError(error);
            });
            CoreUtils.closeInAppBrowser();

            return;
        }

        if (isExternalApp && url.includes('://token=')) {
            // It's an SSO token for another app. Close the IAB and show an error.
            CoreUtils.closeInAppBrowser();
            CoreDomUtils.showErrorModal(new CoreSiteError({
                supportConfig: CoreSites.getCurrentSite()
                    ? CoreUserAuthenticatedSupportConfig.forCurrentSite()
                    : new CoreUserNullSupportConfig(),
                message: Translate.instant('core.errorurlschemeinvalidscheme', { $a: urlScheme }),
            }));

            return;
        }

        if (!CorePlatform.isAndroid()) {
            return;
        }

        // Check if the URL has a custom URL scheme. In Android they need to be opened manually.
        if (!isExternalApp) {
            lastInAppUrl = protocol ? `${protocol}://${url}` : url;

            return;
        }

        // Open in browser should launch the right app if found and do nothing if not found.
        CoreUtils.openInBrowser(url, { showBrowserWarning: false });

        // At this point the InAppBrowser is showing a "Webpage not available" error message.
        // Try to navigate to last loaded URL so this error message isn't found.
        if (lastInAppUrl) {
            CoreUtils.openInApp(lastInAppUrl);
        } else {
            // No last URL loaded, close the InAppBrowser.
            CoreUtils.closeInAppBrowser();
        }
    });

    // Check InAppBrowser closed.
    CoreEvents.on(CoreEvents.IAB_EXIT, () => {
        lastInAppUrl = null;

        if (CoreLoginHelper.isWaitingForBrowser()) {
            CoreLoginHelper.stopWaitingForBrowser();
            CoreLoginHelper.checkLogout();
        }
    });
}
