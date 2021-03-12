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
import { CoreUserProfileHandler, CoreUserDelegateService, CoreUserProfileHandlerData } from '@features/user/services/user-delegate';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';
import { AddonNotes } from '../notes';

/**
 * Profile notes handler.
 */
@Injectable( { providedIn: 'root' } )
export class AddonNotesUserHandlerService implements CoreUserProfileHandler {

    name = 'AddonNotes:notes';
    priority = 100;
    type = CoreUserDelegateService.TYPE_NEW_PAGE;
    cacheEnabled = true;

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return AddonNotes.isPluginEnabled();
    }

    /**
     * @inheritdoc
     */
    async isEnabledForUser(user: CoreUserProfile, courseId?: number): Promise<boolean> {
        // Active course required.
        if (!courseId || user.id == CoreSites.getCurrentSiteUserId()) {
            return false;
        }

        // We are not using isEnabledForCourse because we need to cache the call.
        return AddonNotes.isPluginViewNotesEnabledForCourse(courseId);
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreUserProfileHandlerData {
        return {
            icon: 'fas-receipt',
            title: 'addon.notes.notes',
            class: 'addon-notes-handler',
            action: (event, user, courseId): void => {
                event.preventDefault();
                event.stopPropagation();
                CoreNavigator.navigateToSitePath('/notes', {
                    params: { courseId, userId: user.id },
                });
            },
        };
    }

}
export const AddonNotesUserHandler = makeSingleton(AddonNotesUserHandlerService);
