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
import { CoreUserDelegate, CoreUserProfileHandler, CoreUserProfileHandlerData } from '@core/user/providers/user-delegate';
import { CoreSitesProvider } from '@providers/sites';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { CoreEventsProvider } from '@providers/events';
import { CoreUserProvider } from '@core/user/providers/user';
import { AddonCompetencyProvider } from './competency';

/**
 * Profile competencies handler.
 */
@Injectable()
export class AddonCompetencyUserHandler implements CoreUserProfileHandler {
    name = 'AddonCompetency:learningPlan';
    priority = 900;
    type = CoreUserDelegate.TYPE_NEW_PAGE;
    participantsNavEnabledCache = {};
    usersNavEnabledCache = {};

    constructor(private linkHelper: CoreContentLinksHelperProvider, protected sitesProvider: CoreSitesProvider,
            private competencyProvider: AddonCompetencyProvider, eventsProvider: CoreEventsProvider) {
        eventsProvider.on(CoreEventsProvider.LOGOUT, this.clearUsersNavCache.bind(this));
        eventsProvider.on(CoreUserProvider.PROFILE_REFRESHED, this.clearUsersNavCache.bind(this));
    }

    /**
     * Clear users nav cache.
     */
    private clearUsersNavCache(): void {
        this.participantsNavEnabledCache = {};
        this.usersNavEnabledCache = {};
    }

    /**
     * Whether or not the handler is enabled on a site level.
     * @return {boolean|Promise<boolean>} Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }

    /**
     * Check if handler is enabled for this user in this context.
     *
     * @param {any} user     User to check.
     * @param {number} courseId Course ID.
     * @param  {any} [navOptions] Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param  {any} [admOptions] Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @return  {boolean|Promise<boolean>}   Promise resolved with true if enabled, resolved with false otherwise.
     */
    isEnabledForUser(user: any, courseId: number, navOptions?: any, admOptions?: any): boolean | Promise<boolean> {
        if (courseId) {
            const cacheKey = courseId + '.' + user.id;

            // Link on a user course profile.
            if (typeof this.participantsNavEnabledCache[cacheKey] != 'undefined') {
                return this.participantsNavEnabledCache[cacheKey];
            }

            return this.competencyProvider.getCourseCompetencies(courseId, user.id).then((response) => {
                const enabled = response.competencies.length > 0;
                this.participantsNavEnabledCache[cacheKey] = enabled;

                return enabled;
            }).catch((message) => {
                this.participantsNavEnabledCache[cacheKey] = false;

                return false;
            });
        } else {
            // Link on a user site profile.
            if (typeof this.usersNavEnabledCache[user.id] != 'undefined') {
                return this.usersNavEnabledCache[user.id];
            }

            return this.competencyProvider.getLearningPlans(user.id).then((plans) => {
                // Check the user has at least one learn plan available.
                const enabled = plans.length > 0;
                this.usersNavEnabledCache[user.id] = enabled;

                return enabled;
            });
        }
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @return {CoreUserProfileHandlerData} Data needed to render the handler.
     */
    getDisplayData(user: any, courseId: number): CoreUserProfileHandlerData {
        if (courseId) {
            return {
                icon: 'ribbon',
                title: 'addon.competency.competencies',
                class: 'addon-competency-handler',
                action: (event, navCtrl, user, courseId): void => {
                    event.preventDefault();
                    event.stopPropagation();
                    // Always use redirect to make it the new history root (to avoid "loops" in history).
                    this.linkHelper.goInSite(navCtrl, 'AddonCompetencyCourseCompetenciesPage', {courseId, userId: user.id});
                }
            };
        } else {
            return {
                icon: 'map',
                title: 'addon.competency.learningplans',
                class: 'addon-competency-handler',
                action: (event, navCtrl, user, courseId): void => {
                    event.preventDefault();
                    event.stopPropagation();
                    // Always use redirect to make it the new history root (to avoid "loops" in history).
                    this.linkHelper.goInSite(navCtrl, 'AddonCompetencyPlanListPage', {userId: user.id});
                }
            };
        }
    }
}
