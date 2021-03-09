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
import { CoreUserProfile, CoreUserProvider } from '@features/user/services/user';
import { CoreUserProfileHandler, CoreUserDelegateService, CoreUserProfileHandlerData } from '@features/user/services/user-delegate';
import { CoreNavigator } from '@services/navigator';
import { makeSingleton } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { AddonCourseCompletion } from '../coursecompletion';

/**
 * Profile course completion handler.
 */
@Injectable({ providedIn: 'root' })
export class AddonCourseCompletionUserHandlerService implements CoreUserProfileHandler {

    name = 'AddonCourseCompletion';
    type = CoreUserDelegateService.TYPE_NEW_PAGE;
    priority = 200;

    protected enabledCache = {};

    constructor() {
        CoreEvents.on(CoreEvents.LOGOUT, () => {
            this.enabledCache = {};
        });

        CoreEvents.on(CoreUserProvider.PROFILE_REFRESHED, (data) => {
            const cacheKey = data.userId + '-' + data.courseId;

            delete this.enabledCache[cacheKey];
        });
    }

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return AddonCourseCompletion.isPluginViewEnabled();
    }

    /**
     * @inheritdoc
     */
    async isEnabledForUser(user: CoreUserProfile, courseId?: number): Promise<boolean> {
        if (!courseId) {
            return false;
        }

        const courseEnabled = await AddonCourseCompletion.isPluginViewEnabledForCourse(courseId);
        // If is not enabled in the course, is not enabled for the user.
        if (!courseEnabled) {
            return false;
        }

        const cacheKey = user.id + '-' + courseId;
        if (typeof this.enabledCache[cacheKey] !== 'undefined') {
            return this.enabledCache[cacheKey];
        }

        const enabled = await AddonCourseCompletion.isPluginViewEnabledForUser(courseId, user.id);
        this.enabledCache[cacheKey] = enabled;

        return enabled;
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreUserProfileHandlerData {
        return {
            icon: 'fas-tasks',
            title: 'addon.coursecompletion.coursecompletion',
            class: 'addon-coursecompletion-handler',
            action: (event, user, courseId): void => {
                event.preventDefault();
                event.stopPropagation();
                CoreNavigator.navigateToSitePath('/coursecompletion', {
                    params: { courseId, userId: user.id },
                });
            },
        };
    }

}
export const AddonCourseCompletionUserHandler = makeSingleton(AddonCourseCompletionUserHandlerService);
