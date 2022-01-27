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
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * @inheritdoc
     */
    async isEnabledForUser(user: CoreUserProfile): Promise<boolean> {
        return user.id != CoreSites.getCurrentSiteUserId() && !!user.email;
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreUserProfileHandlerData {
        return {
            icon: 'mail',
            title: 'core.user.sendemail',
            class: 'core-user-profile-mail',
            action: (event, user): void => {
                event.preventDefault();
                event.stopPropagation();

                CoreUtils.openInBrowser('mailto:' + user.email, { showBrowserWarning: false });
            },
        };
    }

}

export const CoreUserProfileMailHandler = makeSingleton(CoreUserProfileMailHandlerService);
