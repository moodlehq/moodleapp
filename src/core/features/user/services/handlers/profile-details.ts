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

import {
    CoreUserProfileHandlerType,
    CoreUserProfileHandler,
    CoreUserProfileListHandlerData,
    CoreUserDelegateContext,
} from '../user-delegate';
import { makeSingleton } from '@singletons';
import { CoreNavigator } from '@services/navigator';

/**
 * Handler to see user details.
 */
@Injectable({ providedIn: 'root' })
export class CoreUserProfileDetailsHandlerService implements CoreUserProfileHandler {

    readonly type = CoreUserProfileHandlerType.LIST_ITEM;
    name = 'CoreUserProfileDetails';
    priority = 1500;

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
        return context !== CoreUserDelegateContext.USER_MENU;
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreUserProfileListHandlerData {
        return {
            icon: 'fas-user',
            title: 'core.user.details',
            class: 'core-user-profile-details',
            action: (event, user, context, contextId): void => {
                event.preventDefault();
                event.stopPropagation();

                CoreNavigator.navigateToSitePath('user/about', {
                    params: {
                        userId: user.id,
                        courseId: contextId,
                    },
                });
            },
        };
    }

}

export const CoreUserProfileDetailsHandler = makeSingleton(CoreUserProfileDetailsHandlerService);
