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
import { CORE_COURSE_PAGE_NAME } from '@features/course/constants';

import { CoreGrades } from '@features/grades/services/grades';
import { CoreUserProfile } from '@features/user/services/user';
import {
    CoreUserDelegateContext,
    CoreUserProfileHandlerType ,
    CoreUserProfileHandler,
    CoreUserProfileHandlerData,
} from '@features/user/services/user-delegate';
import { PARTICIPANTS_PAGE_NAME } from '@features/user/constants';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { makeSingleton } from '@singletons';
import { GRADES_PAGE_NAME } from '../../constants';

/**
 * Profile grades handler.
 */
@Injectable({ providedIn: 'root' })
export class CoreGradesUserHandlerService implements CoreUserProfileHandler {

    name = 'CoreGrades'; // This name doesn't match any disabled feature, they'll be checked in isEnabledForContext.
    priority = 500;
    type = CoreUserProfileHandlerType.LIST_ITEM;
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
    async isEnabledForContext(context: CoreUserDelegateContext, courseId: number): Promise<boolean> {
        // Check if feature is disabled.
        const currentSite = CoreSites.getCurrentSite();
        if (!currentSite) {
            return false;
        }

        if (context === CoreUserDelegateContext.USER_MENU) {
            // This option used to belong to main menu, check the original disabled feature value.
            if (currentSite.isFeatureDisabled('CoreMainMenuDelegate_CoreGrades')) {
                return false;
            }
        } else if (currentSite.isFeatureDisabled('CoreUserDelegate_CoreGrades:viewGrades')) {
            return false;
        }

        if (context === CoreUserDelegateContext.COURSE) {
            return CorePromiseUtils.ignoreErrors(CoreGrades.isPluginEnabledForCourse(courseId), false);
        } else {
            return CoreGrades.isCourseGradesEnabled();
        }
    }

    /**
     * @inheritdoc
     */
    async isEnabledForUser(user: CoreUserProfile, context: CoreUserDelegateContext, contextId: number): Promise<boolean> {
        if (context === CoreUserDelegateContext.COURSE) {
            return CorePromiseUtils.promiseWorks(CoreGrades.getCourseGradesTable(contextId, user.id));
        }

        // All course grades only available for the current user.
        return user.id === CoreSites.getCurrentSiteUserId();
    }

    /**
     * @inheritdoc
     */
    getDisplayData(user: CoreUserProfile, context: CoreUserDelegateContext): CoreUserProfileHandlerData {
        if (context === CoreUserDelegateContext.COURSE) {
            return {
                icon: 'fas-chart-bar',
                title: 'core.grades.grades',
                class: 'core-grades-user-handler',
                action: (event, user, context, contextId): void => {
                    event.preventDefault();
                    event.stopPropagation();
                    CoreNavigator.navigateToSitePath(
                        [CORE_COURSE_PAGE_NAME, contextId, PARTICIPANTS_PAGE_NAME, user.id, GRADES_PAGE_NAME].join('/'),
                    );
                },
            };
        } else {
            return {
                icon: 'fas-chart-bar',
                title: 'core.grades.grades',
                class: 'core-grades-coursesgrades-handler',
                action: (event): void => {
                    event.preventDefault();
                    event.stopPropagation();
                    CoreNavigator.navigateToSitePath(GRADES_PAGE_NAME);
                },
            };
        }
    }

}

export const CoreGradesUserHandler = makeSingleton(CoreGradesUserHandlerService);
