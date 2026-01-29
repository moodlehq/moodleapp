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

import {
    ADDON_COMPETENCY_COMPETENCIES_PAGE,
    ADDON_COMPETENCY_LEARNING_PLANS_PAGE,
    ADDONS_COMPETENCY_COMPONENT_NAME,
    ADDONS_COMPETENCY_USER_PROFILE_FEATURE_NAME,
    ADDONS_COMPETENCY_USER_MENU_FEATURE_NAME,
} from '@addons/competency/constants';
import { Injectable } from '@angular/core';
import { CORE_COURSE_PAGE_NAME } from '@features/course/constants';
import { CoreUserProfile } from '@features/user/services/user';
import {
    CoreUserProfileHandler,
    CoreUserProfileHandlerType,
    CoreUserProfileListHandlerData,
    CoreUserDelegateContext,
} from '@features/user/services/user-delegate';
import { PARTICIPANTS_PAGE_NAME } from '@features/user/constants';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';
import { AddonCompetency } from '../competency';

/**
 * Profile competencies handler.
 */
@Injectable( { providedIn: 'root' })
export class AddonCompetencyUserHandlerService implements CoreUserProfileHandler {

    readonly type = CoreUserProfileHandlerType.LIST_ITEM;
    // This name doesn't match any disabled feature, they'll be checked in isEnabledForContext.
    name = `${ADDONS_COMPETENCY_COMPONENT_NAME}:fakename`;
    priority = 100;
    cacheEnabled = true;

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return AddonCompetency.areCompetenciesEnabled();
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
            if (currentSite.isFeatureDisabled(ADDONS_COMPETENCY_USER_MENU_FEATURE_NAME)) {
                return false;
            }
        } else if (currentSite.isFeatureDisabled(ADDONS_COMPETENCY_USER_PROFILE_FEATURE_NAME)) {
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
    getDisplayData(user: CoreUserProfile, context: CoreUserDelegateContext): CoreUserProfileListHandlerData {
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
                CoreNavigator.navigateToSitePath([
                    CORE_COURSE_PAGE_NAME,
                    contextId,
                    PARTICIPANTS_PAGE_NAME,
                    user.id,
                    ADDON_COMPETENCY_COMPETENCIES_PAGE,
                ].join('/'));
            },
        };
    }

}
export const AddonCompetencyUserHandler = makeSingleton(AddonCompetencyUserHandlerService);
