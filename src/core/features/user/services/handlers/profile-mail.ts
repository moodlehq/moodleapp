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

import { CoreUserDelegateService, CoreUserProfileHandler, CoreUserProfileHandlerData } from '../user-delegate';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CoreUserProfile } from '../user';
import { makeSingleton } from '@singletons';

/**
 * Handler to send a email to a user.
 */
@Injectable({ providedIn: 'root' })
export class CoreUserProfileMailHandlerService implements CoreUserProfileHandler {

    name = 'CoreUserProfileMail';
    priority = 700;
    type = CoreUserDelegateService.TYPE_COMMUNICATION;

    /**
     * Check if handler is enabled.
     *
     * @return Always enabled.
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * Check if handler is enabled for this user in this context.
     *
     * @param user User to check.
     * @param courseId Course ID.
     * @param navOptions Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param admOptions Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @return Promise resolved with true if enabled, resolved with false otherwise.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async isEnabledForUser(user: CoreUserProfile, courseId: number, navOptions?: unknown, admOptions?: unknown): Promise<boolean> {
        return user.id != CoreSites.instance.getCurrentSiteUserId() && !!user.email;
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @return Data needed to render the handler.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getDisplayData(user: CoreUserProfile, courseId: number): CoreUserProfileHandlerData {
        return {
            icon: 'mail',
            title: 'core.user.sendemail',
            class: 'core-user-profile-mail',
            action: (event: Event, user: CoreUserProfile): void => {
                event.preventDefault();
                event.stopPropagation();

                CoreUtils.instance.openInBrowser('mailto:' + user.email);
            },
        };
    }

}

export class CoreUserProfileMailHandler extends makeSingleton(CoreUserProfileMailHandlerService) {}
