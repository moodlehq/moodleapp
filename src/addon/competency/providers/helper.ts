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
import { TranslateService } from '@ngx-translate/core';
import { CoreSitesProvider } from '@providers/sites';
import { CoreUserProvider } from '@core/user/providers/user';
import { AddonCompetencyProvider } from './competency';

/**
 * Service that provides some features regarding learning plans.
 */
@Injectable()
export class AddonCompetencyHelperProvider {

    constructor(private sitesProvider: CoreSitesProvider, private userProvider: CoreUserProvider,
            private translate: TranslateService) {
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

    /**
     * Get the review status name translated.
     *
     * @param {number} status
     * @return {string}
     */
    getCompetencyStatusName(status: number): string {
        let statusTranslateName;
        switch (status) {
            case AddonCompetencyProvider.REVIEW_STATUS_IDLE:
                statusTranslateName = 'idle';
                break;
            case AddonCompetencyProvider.REVIEW_STATUS_IN_REVIEW:
                statusTranslateName = 'inreview';
                break;
            case AddonCompetencyProvider.REVIEW_STATUS_WAITING_FOR_REVIEW:
                statusTranslateName = 'waitingforreview';
                break;
            default:
                // We can use the current status name.
                return String(status);
        }

        return this.translate.instant('addon.competency.usercompetencystatus_' + statusTranslateName);
    }

    /**
     * Get the status name translated.
     *
     * @param {number} status
     * @return {string}
     */
    getPlanStatusName(status: number): string {
        let statusTranslateName;
        switch (status) {
            case AddonCompetencyProvider.STATUS_DRAFT:
                statusTranslateName = 'draft';
                break;
            case AddonCompetencyProvider.STATUS_ACTIVE:
                statusTranslateName = 'active';
                break;
            case AddonCompetencyProvider.STATUS_COMPLETE:
                statusTranslateName = 'complete';
                break;
            case AddonCompetencyProvider.STATUS_WAITING_FOR_REVIEW:
                statusTranslateName = 'waitingforreview';
                break;
            case AddonCompetencyProvider.STATUS_IN_REVIEW:
                statusTranslateName = 'inreview';
                break;
            default:
                // We can use the current status name.
                return String(status);
        }

        return this.translate.instant('addon.competency.planstatus' + statusTranslateName);
    }
}
