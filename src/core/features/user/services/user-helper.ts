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
import { CoreUser, CoreUserProfile, CoreUserRole } from './user';
import { CoreTime } from '@singletons/time';

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
     * @deprecated since 4.3. Not used anymore.
     */
    formatAddress(address?: string, city?: string, country?: string): string {
        const separator = Translate.instant('core.listsep');
        let values = [address, city, country];

        values = values.filter((value) => value && value.length > 0);

        return values.join(`${separator} `);
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
            const translation = Translate.instant(`core.user.${value.shortname}`);

            return translation.indexOf('core.user.') < 0 ? translation : value.shortname;
        }).join(`${separator} `);
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

    /**
     * Get the user initials.
     *
     * @param user User object.
     * @returns User initials.
     * @deprecated since 4.4. Use getUserInitialsFromParts instead.
     */
    getUserInitials(user: Partial<CoreUserProfile>): string {
        if (!user.firstname && !user.lastname) {
            // @TODO: Use local info or check WS to get initials from.
            return '';
        }

        return (user.firstname?.charAt(0) || '') + (user.lastname?.charAt(0) || '');
    }

    /**
     * Get the user initials.
     *
     * @param parts User name parts. Containing firstname, lastname, fullname and userId.
     * @returns User initials.
     */
    async getUserInitialsFromParts(parts: CoreUserNameParts): Promise<string> {
        if (!parts.firstname && !parts.lastname) {
            if (!parts.fullname && parts.userId) {
                const user = await CoreUser.getProfile(parts.userId, undefined, true);
                parts.fullname = user.fullname || '';
            }

            if (parts.fullname) {
                const split = parts.fullname.split(' ');

                parts.firstname = split[0];
                if (split.length > 1) {
                    parts.lastname = split[split.length - 1];
                }
            }
        }

        if (!parts.firstname && !parts.lastname) {
            return 'UNK';
        }

        return (parts.firstname?.charAt(0) || '') + (parts.lastname?.charAt(0) || '');
    }

    /**
     * Translates legacy timezone names.
     *
     * @param tz Timezone name.
     * @returns Readable timezone name.
     * @deprecated since 5.0. Use CoreTime.translateLegacyTimezone instead.
     */
    translateLegacyTimezone(tz: string): string {
        return CoreTime.translateLegacyTimezone(tz);
    }

}

export const CoreUserHelper = makeSingleton(CoreUserHelperProvider);

type CoreUserNameParts = { firstname?: string; lastname?: string; fullname?: string; userId?: number };
