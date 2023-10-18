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
import { CoreUserProfile, CoreUserRole } from './user';

/**
 * Service that provides some features regarding users information.
 */
@Injectable({ providedIn: 'root' })
export class CoreUserHelperProvider {

    protected static readonly LEGACY_TIMEZONES = {
        '-13.0': 'Australia/Perth',
        '-12.5': 'Etc/GMT+12',
        '-12.0': 'Etc/GMT+12',
        '-11.5': 'Etc/GMT+11',
        '-11.0': 'Etc/GMT+11',
        '-10.5': 'Etc/GMT+10',
        '-10.0': 'Etc/GMT+10',
        '-9.5': 'Etc/GMT+9',
        '-9.0': 'Etc/GMT+9',
        '-8.5': 'Etc/GMT+8',
        '-8.0': 'Etc/GMT+8',
        '-7.5': 'Etc/GMT+7',
        '-7.0': 'Etc/GMT+7',
        '-6.5': 'Etc/GMT+6',
        '-6.0': 'Etc/GMT+6',
        '-5.5': 'Etc/GMT+5',
        '-5.0': 'Etc/GMT+5',
        '-4.5': 'Etc/GMT+4',
        '-4.0': 'Etc/GMT+4',
        '-3.5': 'Etc/GMT+3',
        '-3.0': 'Etc/GMT+3',
        '-2.5': 'Etc/GMT+2',
        '-2.0': 'Etc/GMT+2',
        '-1.5': 'Etc/GMT+1',
        '-1.0': 'Etc/GMT+1',
        '-0.5': 'Etc/GMT',
        '0': 'Etc/GMT',
        '0.0': 'Etc/GMT',
        '0.5': 'Etc/GMT',
        '1.0': 'Etc/GMT-1',
        '1.5': 'Etc/GMT-1',
        '2.0': 'Etc/GMT-2',
        '2.5': 'Etc/GMT-2',
        '3.0': 'Etc/GMT-3',
        '3.5': 'Etc/GMT-3',
        '4.0': 'Etc/GMT-4',
        '4.5': 'Asia/Kabul',
        '5.0': 'Etc/GMT-5',
        '5.5': 'Asia/Kolkata',
        '6.0': 'Etc/GMT-6',
        '6.5': 'Asia/Rangoon',
        '7.0': 'Etc/GMT-7',
        '7.5': 'Etc/GMT-7',
        '8.0': 'Etc/GMT-8',
        '8.5': 'Etc/GMT-8',
        '9.0': 'Etc/GMT-9',
        '9.5': 'Australia/Darwin',
        '10.0': 'Etc/GMT-10',
        '10.5': 'Etc/GMT-10',
        '11.0': 'Etc/GMT-11',
        '11.5': 'Etc/GMT-11',
        '12.0': 'Etc/GMT-12',
        '12.5': 'Etc/GMT-12',
        '13.0': 'Etc/GMT-13',
    };

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

    /**
     * Get the user initials.
     *
     * @param user User object.
     * @returns Promise resolved with the user data.
     */
    getUserInitials(user: Partial<CoreUserProfile>): string {
        if (!user.firstname && !user.lastname) {
            // @TODO: Use local info or check WS to get initials from.
            return '';
        }

        return (user.firstname?.charAt(0) || '') + (user.lastname?.charAt(0) || '');
    }

    /**
     * Translates legacy timezone names.
     *
     * @param tz Timezone name.
     * @returns Readable timezone name.
     */
    translateLegacyTimezone(tz: string): string {
        return CoreUserHelperProvider.LEGACY_TIMEZONES[tz] ?? tz;
    }

}

export const CoreUserHelper = makeSingleton(CoreUserHelperProvider);
