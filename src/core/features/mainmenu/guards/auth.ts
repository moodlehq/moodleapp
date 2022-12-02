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

import { Injectable } from '@angular/core';
import { CanLoad, CanActivate, UrlTree } from '@angular/router';
import { CoreLoginHelper } from '@features/login/services/login-helper';
import { CoreApp } from '@services/app';

import { CoreSites } from '@services/sites';
import { Router } from '@singletons';

@Injectable({ providedIn: 'root' })
export class CoreMainMenuAuthGuard implements CanLoad, CanActivate {

    /**
     * @inheritdoc
     */
    canActivate(): Promise<true | UrlTree> {
        return this.guard();
    }

    /**
     * @inheritdoc
     */
    canLoad(): Promise<true | UrlTree> {
        return this.guard();
    }

    /**
     * Check if the current user should be redirected to the authentication page.
     *
     * @returns Promise resolved with true if it's not redirected or the redirection route.
     */
    private async guard(): Promise<true | UrlTree> {
        if (!CoreSites.isLoggedIn()) {
            return Router.parseUrl('/login');
        }

        if (CoreLoginHelper.isSiteLoggedOut()) {
            // Send the user to reconnect page.
            const newRoute = Router.parseUrl('/login/reconnect');
            const siteId = CoreSites.getCurrentSiteId();

            // Pass redirect data (if any and belongs to same site).
            let redirect = CoreApp.consumeMemoryRedirect();
            if (!redirect?.timemodified || Date.now() - redirect.timemodified > 20000 || redirect.siteId !== siteId) {
                redirect = null;
            }

            newRoute.queryParams = {
                siteId,
                ...redirect,
            };

            return newRoute;
        }

        return true;
    }

}
