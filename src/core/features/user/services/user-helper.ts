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
import { CoreTime } from '@static/time';

/**
 * Service that provides some features regarding users information.
 */
@Injectable({ providedIn: 'root' })
export class CoreUserHelperProvider {

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

            return !translation.includes('core.user.') ? translation : value.shortname;
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
     * @param userParts User name parts. Containing firstname, lastname, fullname and initials.
     * @returns User initials.
     */
    getUserInitials(userParts: CoreUserNameParts): string {
        if (userParts.initials) {
            return userParts.initials;
        }

        const nameFields = ['firstname', 'lastname'];
        const dummyUser = {
            firstname: 'firstname',
            lastname: 'lastname',
        };
        const nameFormat = Translate.instant('core.user.fullnamedisplay', { $a:dummyUser });
        const availableFieldsSorted = nameFields
            .filter((field) => nameFormat.indexOf(field) >= 0)
            .sort((a, b) => nameFormat.indexOf(a) - nameFormat.indexOf(b));

        if (!userParts.firstname && !userParts.lastname && userParts.fullname) {
            // It's a complete workaround.
            const split = userParts.fullname.split(' ');
            userParts.firstname = split[0];
            if (split.length > 1) {
                userParts.lastname = split[split.length - 1];
            }
        }

        const initials = availableFieldsSorted.reduce((initials, fieldName) =>
            initials + (userParts[fieldName]?.charAt(0) ?? ''), '');

        return initials || 'UNK';
    }

    /**
     * Get the user initials.
     *
     * @param userParts User name parts. Containing firstname, lastname, fullname and userId.
     * @returns User initials.
     * @deprecated since 5.3. Use getUserInitials instead.
     */
    async getUserInitialsFromParts(userParts: CoreUserNameParts & { userId?: number }): Promise<string> {
        return this.getUserInitials(userParts);
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

type CoreUserNameParts = {
    firstname?: string;
    lastname?: string;
    fullname?: string;
    initials?: string;
};
