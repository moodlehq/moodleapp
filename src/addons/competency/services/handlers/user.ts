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
import { CoreUserProfile } from '@features/user/services/user';
import { CoreUserProfileHandler, CoreUserDelegateService, CoreUserProfileHandlerData } from '@features/user/services/user-delegate';
import { CoreNavigator } from '@services/navigator';
import { makeSingleton } from '@singletons';
import { AddonCompetency } from '../competency';
import { AddonCompetencyMainMenuHandlerService } from './mainmenu';

/**
 * Profile competencies handler.
 */
@Injectable( { providedIn: 'root' })
export class AddonCompetencyUserHandlerService implements CoreUserProfileHandler {

    name = 'AddonCompetency:learningPlan';
    priority = 900;
    type = CoreUserDelegateService.TYPE_NEW_PAGE;
    cacheEnabled = true;

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * @inheritdoc
     */
    async isEnabledForUser(user: CoreUserProfile, courseId?: number): Promise<boolean> {
        try {
            if (courseId) {
                return AddonCompetency.canViewUserCompetenciesInCourse(courseId, user.id);
            } else {
                const plans = await AddonCompetency.getLearningPlans(user.id);

                // Check the user has at least one learn plan available.
                return plans.length > 0;
            }
        } catch {
            return false;
        }
    }

    /**
     * @inheritdoc
     */
    getDisplayData(user: CoreUserProfile, courseId: number): CoreUserProfileHandlerData {
        if (courseId) {
            return {
                icon: 'fas-award',
                title: 'addon.competency.competencies',
                class: 'addon-competency-handler',
                action: (event, user, courseId): void => {
                    event.preventDefault();
                    event.stopPropagation();
                    CoreNavigator.navigateToSitePath(
                        '/' + AddonCompetencyMainMenuHandlerService.PAGE_NAME + '/course/' + courseId,
                        {
                            params: { userId: user.id },
                        },
                    );

                },
            };
        } else {
            return {
                icon: 'fas-route',
                title: 'addon.competency.learningplans',
                class: 'addon-competency-handler',
                action: (event, user): void => {
                    event.preventDefault();
                    event.stopPropagation();
                    CoreNavigator.navigateToSitePath('/' + AddonCompetencyMainMenuHandlerService.PAGE_NAME, {
                        params: { userId: user.id },
                    });
                },
            };
        }
    }

}
export const AddonCompetencyUserHandler = makeSingleton(AddonCompetencyUserHandlerService);
