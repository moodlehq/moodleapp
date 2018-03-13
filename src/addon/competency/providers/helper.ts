// (C) Copyright 2015 Martin Dougiamas
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
import { CoreSitesProvider } from '@providers/sites';
import { CoreUserProvider } from '@core/user/providers/user';

/**
 * Service that provides some features regarding learning plans.
 */
@Injectable()
export class AddonCompetencyHelperProvider {

    constructor(private sitesProvider: CoreSitesProvider, private userProvider: CoreUserProvider) {
    }

    /**
     * Convenient helper to get the user profile image.
     *
     * @param  {number} userId User Id
     * @return {Promise<any>}  User profile Image URL or true if default icon.
     */
    getProfile(userId: number): Promise<any> {
        if (!userId || userId == this.sitesProvider.getCurrentSiteUserId()) {
            return Promise.resolve(false);
        }

        // Get the user profile to retrieve the user image.
        return this.userProvider.getProfile(userId, null, true).then((user) => {
            user.profileimageurl = user.profileimageurl || true;

            return user;
        });
    }
}
