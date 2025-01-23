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

import { ActivatedRouteSnapshot, CanActivateFn } from '@angular/router';
import { Router } from '@singletons';
import { AddonMessages } from '../services/messages';
import { ADDON_MESSAGES_PAGE_NAME } from '../constants';

/**
 * Guard to redirect to the right page based on the current Moodle site version.
 *
 * @returns Route.
 */
export const messagesIndexGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
    const enabled = AddonMessages.isGroupMessagingEnabled();
    const path = `/main/${ADDON_MESSAGES_PAGE_NAME}/` + ( enabled ? 'group-conversations' : 'index');

    const newRoute = Router.parseUrl(path);

    newRoute.queryParams = route.queryParams;

    return newRoute;
};
