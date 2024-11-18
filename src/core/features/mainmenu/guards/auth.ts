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
import { CoreLoginHelper } from '@features/login/services/login-helper';
import { CoreRedirects } from '@singletons/redirects';

import { CoreSites } from '@services/sites';
import { Router } from '@singletons';

/**
 * Guard to check if the user is authenticated.
 *
 * @returns True if user has sites, redirect route otherwise.
 */
export const authGuard: CanActivateFn = async () => {
    if (!CoreSites.isLoggedIn()) {
        return Router.parseUrl('/login');
    }

    if (CoreLoginHelper.isSiteLoggedOut()) {
        // Send the user to reconnect page.
        const newRoute = Router.parseUrl('/login/reconnect');
        const siteId = CoreSites.getCurrentSiteId();

        // Pass redirect data (if any and belongs to same site).
        let redirect = CoreRedirects.consumeMemoryRedirect();
        if (redirect?.siteId !== siteId) {
            redirect = null;
        }

        newRoute.queryParams = {
            siteId,
            ...redirect,
        };

        return newRoute;
    }

    return true;
};
