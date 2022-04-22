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

import { ADDON_COMPETENCY_COMPETENCIES_PAGE, ADDON_COMPETENCY_LEARNING_PLANS_PAGE } from '@addons/competency/competency.module';
import { Injectable } from '@angular/core';
import { COURSE_PAGE_NAME } from '@features/course/course.module';
import { CoreUserProfile } from '@features/user/services/user';
import {
    CoreUserProfileHandler,
    CoreUserDelegateService,
    CoreUserProfileHandlerData,
    CoreUserDelegateContext,
} from '@features/user/services/user-delegate';
import { PARTICIPANTS_PAGE_NAME } from '@features/user/user.module';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';
import { AddonCompetency } from '../competency';

/**
 * Profile competencies handler.
 */
@Injectable( { providedIn: 'root' })
export class AddonCompetencyUserHandlerService implements CoreUserProfileHandler {

    name = 'AddonCompetency'; // This name doesn't match any disabled feature, they'll be checked in isEnabledForContext.
    priority = 100;
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
    async isEnabledForContext(context: CoreUserDelegateContext): Promise<boolean> {
        // Check if feature is disabled.
        const currentSite = CoreSites.getCurrentSite();
        if (!currentSite) {
            return false;
        }

        if (context === CoreUserDelegateContext.USER_MENU) {
            // This option used to belong to main menu, check the original disabled feature value.
            if (currentSite.isFeatureDisabled('CoreMainMenuDelegate_AddonCompetency')) {
                return false;
            }
        } else if (currentSite.isFeatureDisabled('CoreUserDelegate_AddonCompetency:learningPlan')) {
            return false;
        }

        return true;
    }

    /**
     * @inheritdoc
     */
    async isEnabledForUser(user: CoreUserProfile, context: CoreUserDelegateContext, contextId: number): Promise<boolean> {
        try {
            if (context === CoreUserDelegateContext.COURSE) {
                return await AddonCompetency.canViewUserCompetenciesInCourse(contextId, user.id);
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
    getDisplayData(user: CoreUserProfile, context: CoreUserDelegateContext): CoreUserProfileHandlerData {
        if (context !== CoreUserDelegateContext.COURSE) {
            return {
                icon: 'fas-route',
                title: 'addon.competency.learningplans',
                class: 'addon-competency-handler',
                action: (event, user): void => {
                    event.preventDefault();
                    event.stopPropagation();
                    CoreNavigator.navigateToSitePath(ADDON_COMPETENCY_LEARNING_PLANS_PAGE, {
                        params: { userId: user.id },
                    });
                },
            };
        }

        return {
            icon: 'fas-award',
            title: 'addon.competency.competencies',
            class: 'addon-competency-handler',
            action: (event, user, context, contextId): void => {
                event.preventDefault();
                event.stopPropagation();
                CoreNavigator.navigateToSitePath(
                    [COURSE_PAGE_NAME, contextId, PARTICIPANTS_PAGE_NAME, user.id, ADDON_COMPETENCY_COMPETENCIES_PAGE].join('/'),
                );
            },
        };
    }

}
export const AddonCompetencyUserHandler = makeSingleton(AddonCompetencyUserHandlerService);
