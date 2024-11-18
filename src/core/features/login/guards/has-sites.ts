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
import { CoreSites } from '@services/sites';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { Router } from '@singletons';
import { CoreLoginHelper } from '../services/login-helper';

/**
 * Guard to check if the user has any sites stored.
 *
 * @returns True if user has sites, redirect route otherwise.
 */
export const hasSitesGuard: CanActivateFn = async () => {
    const sites = await CorePromiseUtils.ignoreErrors(CoreSites.getSites(), []);

    if (sites.length > 0) {
        return true;
    }

    const [path, params] = await CoreLoginHelper.getAddSiteRouteInfo();
    const route = Router.parseUrl(path);

    route.queryParams = params;

    return route;
};
