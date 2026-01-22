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
import {
    CoreUserProfileHandler,
    CoreUserProfileHandlerType,
    CoreUserProfileListHandlerData,
    CoreUserDelegateContext,
} from '@features/user/services/user-delegate';
import { CoreNavigator } from '@services/navigator';
import { makeSingleton } from '@singletons';
import { AddonCourseCompletion } from '../coursecompletion';

/**
 * Profile course completion handler.
 */
@Injectable({ providedIn: 'root' })
export class AddonCourseCompletionUserHandlerService implements CoreUserProfileHandler {

    readonly type = CoreUserProfileHandlerType.LIST_ITEM;
    name = 'AddonCourseCompletion:viewCompletion';
    priority = 350;
    cacheEnabled = true;

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return AddonCourseCompletion.isPluginViewEnabled();
    }

    /**
     * @inheritdoc
     */
    async isEnabledForContext(context: CoreUserDelegateContext, courseId: number): Promise<boolean> {
        if (context !== CoreUserDelegateContext.COURSE) {
            return false;
        }

        return AddonCourseCompletion.isPluginViewEnabledForCourse(courseId);
    }

    /**
     * @inheritdoc
     */
    async isEnabledForUser(user: CoreUserProfile, context: CoreUserDelegateContext,  contextId: number): Promise<boolean> {
        return AddonCourseCompletion.isPluginViewEnabledForUser(contextId, user.id);
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreUserProfileListHandlerData {
        return {
            icon: 'fas-list-check',
            title: 'addon.coursecompletion.coursecompletion',
            class: 'addon-coursecompletion-handler',
            action: (event, user, context, contextId): void => {
                event.preventDefault();
                event.stopPropagation();
                CoreNavigator.navigateToSitePath('/coursecompletion', {
                    params: { courseId: contextId, userId: user.id },
                });
            },
        };
    }

}
export const AddonCourseCompletionUserHandler = makeSingleton(AddonCourseCompletionUserHandlerService);
