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
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';

import { makeSingleton, Translate } from '@singletons';
import { CoreUserRole } from './user';

/**
 * Service that provides some features regarding users information.
 */
@Injectable({ providedIn: 'root' })
export class CoreUserHelperProvider {

    /**
     * Formats a user address, concatenating address, city and country.
     *
     * @param address Address.
     * @param city City.
     * @param country Country.
     * @returns Formatted address.
     */
    formatAddress(address?: string, city?: string, country?: string): string {
        const separator = Translate.instant('core.listsep');
        let values = [address, city, country];

        values = values.filter((value) => value && value.length > 0);

        return values.join(separator + ' ');
    }

    /**
     * Formats a user role list, translating and concatenating them.
     *
     * @param roles List of user roles.
     * @returns The formatted roles.
     */
    formatRoleList(roles?: CoreUserRole[]): string {
        if (!roles || roles.length <= 0) {
            return '';
        }

        const separator = Translate.instant('core.listsep');

        return roles.map((value) => {
            const translation = Translate.instant('core.user.' + value.shortname);

            return translation.indexOf('core.user.') < 0 ? translation : value.shortname;
        }).join(separator + ' ');
    }

    /**
     * Open a page with instructions on how to complete profile.
     *
     * @param siteId The site ID. Undefined for current site.
     */
    async openCompleteProfile(siteId?: string): Promise<void> {
        const currentSite = CoreSites.getCurrentSite();
        siteId = siteId ?? currentSite?.getId();

        if (!currentSite || siteId !== currentSite.getId()) {
            return; // Site that triggered the event is not current site.
        }

        // If current page is already complete profile, stop.
        if (CoreNavigator.isCurrent('/user/completeprofile')) {
            return;
        }

        await CoreNavigator.navigate('/user/completeprofile', { params: { siteId }, reset: true });
    }

}

export const CoreUserHelper = makeSingleton(CoreUserHelperProvider);
