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
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton } from '@singletons';

/**
 * Profile grades handler.
 */
@Injectable({ providedIn: 'root' })
export class CoreGradesUserHandlerService implements CoreUserProfileHandler {

    name = 'CoreGrades:viewGrades';
    priority = 400;
    type = CoreUserDelegateService.TYPE_NEW_PAGE;
    viewGradesEnabledCache = {};

    /**
     * Clear view grades cache.
     * If a courseId and userId are specified, it will only delete the entry for that user and course.
     *
     * @param courseId Course ID.
     * @param userId User ID.
     */
    clearViewGradesCache(courseId?: number, userId?: number): void {
        if (courseId && userId) {
            delete this.viewGradesEnabledCache[this.getCacheKey(courseId, userId)];
        } else {
            this.viewGradesEnabledCache = {};
        }
    }

    /**
     * Get a cache key to identify a course and a user.
     *
     * @param courseId Course ID.
     * @param userId User ID.
     * @return Cache key.
     */
    protected getCacheKey(courseId: number, userId: number): string {
        return courseId + '#' + userId;
    }

    /**
     * Check if handler is enabled.
     *
     * @return Always enabled.
     */
    isEnabled(): Promise<boolean> {
        return Promise.resolve(true);
    }

    /**
     * Check if handler is enabled for this user in this context.
     *
     * @param user User to check.
     * @param courseId Course ID.
     * @return Promise resolved with true if enabled, resolved with false otherwise.
     */
    async isEnabledForUser(user: CoreUserProfile, courseId: number): Promise<boolean> {
        const cacheKey = this.getCacheKey(courseId, user.id);
        const cache = this.viewGradesEnabledCache[cacheKey];

        if (typeof cache != 'undefined') {
            return cache;
        }

        const enabled = await CoreUtils.ignoreErrors(CoreGrades.isPluginEnabledForCourse(courseId), false);

        this.viewGradesEnabledCache[cacheKey] = enabled;

        return enabled;
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @return Data needed to render the handler.
     */
    getDisplayData(): CoreUserProfileHandlerData {
        return {
            icon: 'stats-chart',
            title: 'core.grades.grades',
            class: 'core-grades-user-handler',
            action: (event, user, courseId): void => {
                event.preventDefault();
                event.stopPropagation();
                CoreNavigator.navigateToSitePath(`/grades/${courseId}`, {
                    params: { userId: user.id },
                });
            },
        };
    }

}

export const CoreGradesUserHandler = makeSingleton(CoreGradesUserHandlerService);
