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
import { CorePushNotificationsClickHandler } from '@features/pushnotifications/services/push-delegate';
import { CorePushNotificationsNotificationBasicData } from '@features/pushnotifications/services/pushnotifications';
import { CoreNavigator } from '@services/navigator';
import { CoreUrlUtils } from '@services/utils/url';
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton } from '@singletons';
import { AddonCompetency } from '../competency';

/**
 * Handler for competencies push notifications clicks.
 */
@Injectable( { providedIn: 'root' })
export class AddonCompetencyPushClickHandlerService implements CorePushNotificationsClickHandler {

    name = 'AddonCompetencyPushClickHandler';
    priority = 200;

    /**
     * @inheritdoc
     */
    async handles(notification: AddonCompetencyPushNotificationData): Promise<boolean> {
        if (CoreUtils.isTrueOrOne(notification.notif) && notification.moodlecomponent == 'moodle' &&
                (notification.name == 'competencyplancomment' || notification.name == 'competencyusercompcomment')) {
            // If all competency features are disabled, don't handle the click.
            return AddonCompetency.allCompetenciesDisabled(notification.site).then((disabled) => !disabled);
        }

        return false;
    }

    /**
     * @inheritdoc
     */
    async handleClick(notification: AddonCompetencyPushNotificationData): Promise<void> {
        const contextUrlParams = CoreUrlUtils.extractUrlParams(notification.contexturl);

        if (notification.name == 'competencyplancomment') {
            // Open the learning plan.
            const planId = Number(contextUrlParams.id);

            await CoreUtils.ignoreErrors(AddonCompetency.invalidateLearningPlan(planId, notification.site));

            await CoreNavigator.navigateToSitePath(`${ADDON_COMPETENCY_LEARNING_PLANS_PAGE}/${planId}`, {
                siteId: notification.site,
            });

            return;
        }

        if (notification.contexturl && notification.contexturl.indexOf('user_competency_in_plan.php') != -1) {
            // Open the competency.
            const courseId = Number(notification.course);
            const competencyId = Number(contextUrlParams.competencyid);
            const planId = Number(contextUrlParams.planid);
            const userId = Number(contextUrlParams.userid);

            await CoreUtils.ignoreErrors(AddonCompetency.invalidateCompetencyInPlan(planId, competencyId, notification.site));

            if (courseId) {
                await CoreNavigator.navigateToSitePath(
                    `${COURSE_PAGE_NAME}/${courseId}/${ADDON_COMPETENCY_COMPETENCIES_PAGE}/${competencyId}`,
                    {
                        params: { userId },
                        siteId: notification.site,
                    },
                );

                return;
            }

            if (planId) {
                await CoreNavigator.navigateToSitePath(
                    `${ADDON_COMPETENCY_LEARNING_PLANS_PAGE}/competencies/${planId}/${competencyId}`,
                    {
                        params: { userId },
                        siteId: notification.site,
                    },
                );

                return;
            }
        }

        // Open the list of plans.
        const userId = Number(contextUrlParams.userid);

        await CoreUtils.ignoreErrors(AddonCompetency.invalidateLearningPlans(userId, notification.site));

        await CoreNavigator.navigateToSitePath(ADDON_COMPETENCY_LEARNING_PLANS_PAGE, {
            params: { userId },
            siteId: notification.site,
        });
    }

}
export const AddonCompetencyPushClickHandler = makeSingleton(AddonCompetencyPushClickHandlerService);

type AddonCompetencyPushNotificationData = CorePushNotificationsNotificationBasicData & {
    contexturl: string;
    course: number;
};
