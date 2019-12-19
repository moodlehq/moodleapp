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
import { CoreUserDelegate, CoreUserProfileHandler, CoreUserProfileHandlerData } from './user-delegate';
import { CoreSitesProvider } from '@providers/sites';
import { CoreUtilsProvider } from '@providers/utils/utils';

/**
 * Profile links email handler.
 */
@Injectable()
export class CoreUserProfileMailHandler implements CoreUserProfileHandler {
    name = 'CoreUserProfileMail';
    priority = 700;
    type = CoreUserDelegate.TYPE_COMMUNICATION;

    constructor(protected sitesProvider: CoreSitesProvider, protected utils: CoreUtilsProvider) { }

    /**
     * Check if handler is enabled.
     *
     * @return Always enabled.
     */
    isEnabled(): boolean {
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
    isEnabledForUser(user: any, courseId: number, navOptions?: any, admOptions?: any): boolean | Promise<boolean> {
        // Not current user required.
        return user.id != this.sitesProvider.getCurrentSite().getUserId() && !!user.email;
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @return Data needed to render the handler.
     */
    getDisplayData(user: any, courseId: number): CoreUserProfileHandlerData {
        return {
            icon: 'mail',
            title: 'core.user.sendemail',
            class: 'core-user-profile-mail',
            action: (event, navCtrl, user, courseId): void => {
                event.preventDefault();
                event.stopPropagation();

                this.utils.openInBrowser('mailto:' + user.email);
            }
        };
    }
}
