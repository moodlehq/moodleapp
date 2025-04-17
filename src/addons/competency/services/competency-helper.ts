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
import { CoreSites } from '@services/sites';
import { AddonCompetencyProvider } from './competency';
import { CoreUser, CoreUserProfile } from '@features/user/services/user';
import { makeSingleton, Translate } from '@singletons';

/**
 * Service that provides some features regarding learning plans.
 */
@Injectable( { providedIn: 'root' })
export class AddonCompetencyHelperProvider {

    /**
     * Convenient helper to get the user profile image.
     *
     * @param userId User Id
     * @returns User profile Image URL or true if default icon.
     */
    async getProfile(userId?: number): Promise<CoreUserProfile | undefined> {
        if (!userId || userId == CoreSites.getCurrentSiteUserId()) {
            return;
        }

        // Get the user profile to retrieve the user image.
        return CoreUser.getProfile(userId, undefined, true);
    }

    /**
     * Get the review status name translated.
     *
     * @param status Competency Status name.
     * @returns The status name translated.
     * @todo Move statutes into an enum.
     */
    getCompetencyStatusName(status: number): string {
        let statusTranslateName: string;
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

        return Translate.instant('addon.competency.usercompetencystatus_' + statusTranslateName);
    }

    /**
     * Get the status name translated.
     *
     * @param status Plan Status name.
     * @returns The status name translated.
     * @todo Move statutes into an enum.
     */
    getPlanStatusName(status: number): string {
        let statusTranslateName: string;
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

        return Translate.instant('addon.competency.planstatus' + statusTranslateName);
    }

}
export const AddonCompetencyHelper = makeSingleton(AddonCompetencyHelperProvider);
