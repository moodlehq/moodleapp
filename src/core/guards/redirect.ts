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

import { CanActivateFn } from '@angular/router';
import { CoreRedirects } from '@static/redirects';
import { CoreRedirectPayload } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { Router } from '@singletons';
import { NO_SITE_ID } from '@features/login/constants';

/**
 * Guard to check if there is a pending redirect and trigger it.
 *
 * @returns True if there's no redirect, redirection route otherwise.
 */
export const redirectGuard: CanActivateFn = async () => {
    const redirect = CoreRedirects.consumeMemoryRedirect();
        if (!redirect) {
            return true;
        }

        // Redirect to site path.
        if (redirect.siteId && redirect.siteId !== NO_SITE_ID) {
            const redirectData: CoreRedirectPayload = {
                urlToOpen: redirect.urlToOpen,
            };

            if (redirect.redirectPath !== 'main') {
                // Only pass redirect path if the page to load isn't the main menu.
                redirectData.redirectPath = redirect.redirectPath;
                redirectData.redirectOptions = redirect.redirectOptions;
            }

            const loggedIn = await CoreSites.loadSite(
                redirect.siteId,
                redirectData,
            );
            const route = Router.parseUrl('/main');

            route.queryParams = redirectData;

            return loggedIn ? route : true;
        }

        // Abort redirect.
        if (!redirect.redirectPath) {
            return true;
        }

        // Redirect to non-site path.
        const route = Router.parseUrl(redirect.redirectPath);
        route.queryParams = redirect.redirectOptions?.params || {};

        return route;
};
