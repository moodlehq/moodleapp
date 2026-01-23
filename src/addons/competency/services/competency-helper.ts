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
import { CoreUser, CoreUserProfile } from '@features/user/services/user';
import { makeSingleton, Translate } from '@singletons';
import { AddonCompetencyLearningPlanStatus, AddonCompetencyReviewStatus } from '../constants';

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
    getCompetencyStatusName(status: AddonCompetencyReviewStatus): string {
        let statusTranslateName: string;
        switch (status) {
            case AddonCompetencyReviewStatus.IDLE:
                statusTranslateName = 'idle';
                break;
            case AddonCompetencyReviewStatus.IN_REVIEW:
                statusTranslateName = 'inreview';
                break;
            case AddonCompetencyReviewStatus.WAITING_FOR_REVIEW:
                statusTranslateName = 'waitingforreview';
                break;
            default:
                // We can use the current status name.
                return String(status);
        }

        return Translate.instant(`addon.competency.usercompetencystatus_${statusTranslateName}`);
    }

    /**
     * Get the status name translated.
     *
     * @param status Plan Status name.
     * @returns The status name translated.
     * @todo Move statutes into an enum.
     */
    getPlanStatusName(status: AddonCompetencyLearningPlanStatus): string {
        let statusTranslateName: string;
        switch (status) {
            case AddonCompetencyLearningPlanStatus.DRAFT:
                statusTranslateName = 'draft';
                break;
            case AddonCompetencyLearningPlanStatus.ACTIVE:
                statusTranslateName = 'active';
                break;
            case AddonCompetencyLearningPlanStatus.COMPLETE:
                statusTranslateName = 'complete';
                break;
            case AddonCompetencyLearningPlanStatus.WAITING_FOR_REVIEW:
                statusTranslateName = 'waitingforreview';
                break;
            case AddonCompetencyLearningPlanStatus.IN_REVIEW:
                statusTranslateName = 'inreview';
                break;
            default:
                // We can use the current status name.
                return String(status);
        }

        return Translate.instant(`addon.competency.planstatus${statusTranslateName}`);
    }

}
export const AddonCompetencyHelper = makeSingleton(AddonCompetencyHelperProvider);
