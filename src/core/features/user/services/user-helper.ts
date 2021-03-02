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
     * @return Formatted address.
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
     * @return The formatted roles.
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

}

export const CoreUserHelper = makeSingleton(CoreUserHelperProvider);
