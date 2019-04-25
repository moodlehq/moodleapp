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
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CorePushNotificationsClickHandler } from '@core/pushnotifications/providers/delegate';
import { CoreLoginHelperProvider } from '@core/login/providers/helper';
import { AddonCompetencyProvider } from './competency';

/**
 * Handler for competencies push notifications clicks.
 */
@Injectable()
export class AddonCompetencyPushClickHandler implements CorePushNotificationsClickHandler {
    name = 'AddonCompetencyPushClickHandler';
    priority = 200;

    constructor(private utils: CoreUtilsProvider, private urlUtils: CoreUrlUtilsProvider,
            private competencyProvider: AddonCompetencyProvider, private loginHelper: CoreLoginHelperProvider) {}

    /**
     * Check if a notification click is handled by this handler.
     *
     * @param {any} notification The notification to check.
     * @return {boolean} Whether the notification click is handled by this handler
     */
    handles(notification: any): boolean | Promise<boolean> {
        if (this.utils.isTrueOrOne(notification.notif) && notification.moodlecomponent == 'moodle' &&
                (notification.name == 'competencyplancomment' || notification.name == 'competencyusercompcomment')) {
            // If all competency features are disabled, don't handle the click.
            return this.competencyProvider.allCompetenciesDisabled(notification.site).then((disabled) => {
                return !disabled;
            });
        }

        return false;
    }

    /**
     * Handle the notification click.
     *
     * @param {any} notification The notification to check.
     * @return {Promise<any>} Promise resolved when done.
     */
    handleClick(notification: any): Promise<any> {
        const contextUrlParams = this.urlUtils.extractUrlParams(notification.contexturl);

        if (notification.name == 'competencyplancomment') {
            // Open the learning plan.
            const planId = Number(contextUrlParams.id);

            return this.competencyProvider.invalidateLearningPlan(planId, notification.site).catch(() => {
                // Ignore errors.
            }).then(() => {
                return this.loginHelper.redirect('AddonCompetencyPlanPage', { planId: planId }, notification.site);
            });
        } else {

            if (notification.contexturl && notification.contexturl.indexOf('user_competency_in_plan.php') != -1) {
                // Open the competency.
                const courseId = Number(notification.course),
                    competencyId = Number(contextUrlParams.competencyid),
                    planId = Number(contextUrlParams.planid),
                    userId = Number(contextUrlParams.userid);

                return this.competencyProvider.invalidateCompetencyInPlan(planId, competencyId, notification.site).catch(() => {
                    // Ignore errors.
                }).then(() => {
                    return this.loginHelper.redirect('AddonCompetencyCompetencyPage', {
                        planId: planId,
                        competencyId: competencyId,
                        courseId: courseId,
                        userId: userId
                    }, notification.site);
                });
            } else {
                // Open the list of plans.
                const userId = Number(contextUrlParams.userid);

                return this.competencyProvider.invalidateLearningPlans(userId, notification.site).catch(() => {
                    // Ignore errors.
                }).then(() => {
                    return this.loginHelper.redirect('AddonCompetencyPlanListPage', { userId: userId }, notification.site);
                });
            }
        }
    }
}
