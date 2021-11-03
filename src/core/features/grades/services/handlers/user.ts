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

import { CoreGrades } from '@features/grades/services/grades';
import { CoreUserProfile } from '@features/user/services/user';
import {
    CoreUserDelegateService ,
    CoreUserProfileHandler,
    CoreUserProfileHandlerData,
} from '@features/user/services/user-delegate';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton } from '@singletons';

/**
 * Profile grades handler.
 */
@Injectable({ providedIn: 'root' })
export class CoreGradesUserHandlerService implements CoreUserProfileHandler {

    static readonly PAGE_NAME = 'grades';

    name = 'CoreGrades:viewGrades';
    priority = 400;
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
    async isEnabledForCourse(courseId?: number): Promise<boolean> {
        if (courseId) {
            return CoreUtils.ignoreErrors(CoreGrades.isPluginEnabledForCourse(courseId), false);
        } else {
            return CoreGrades.isCourseGradesEnabled();
        }
    }

    /**
     * @inheritdoc
     */
    async isEnabledForUser(user: CoreUserProfile, courseId?: number): Promise<boolean> {
        if (courseId) {
            return CoreUtils.promiseWorks(CoreGrades.getCourseGradesTable(courseId, user.id));
        }

        // All course grades only available for the current user.
        return user.id == CoreSites.getCurrentSiteUserId();
    }

    /**
     * @inheritdoc
     */
    getDisplayData(user: CoreUserProfile, courseId?: number): CoreUserProfileHandlerData {
        if (courseId) {
            return {
                icon: 'fas-chart-bar',
                title: 'core.grades.grades',
                class: 'core-grades-user-handler',
                action: (event, user, courseId): void => {
                    event.preventDefault();
                    event.stopPropagation();
                    CoreNavigator.navigateToSitePath(`/user-grades/${courseId}`, {
                        params: { userId: user.id },
                    });
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
                    CoreNavigator.navigateToSitePath(CoreGradesUserHandlerService.PAGE_NAME);
                },
            };
        }
    }

}

export const CoreGradesUserHandler = makeSingleton(CoreGradesUserHandlerService);
