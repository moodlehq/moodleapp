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

import { AddonPrivateFiles } from '@addons/privatefiles/services/privatefiles';
import { makeSingleton } from '@singletons';
import {
    CoreUserDelegateContext,
    CoreUserProfileHandlerType,
    CoreUserProfileHandler,
    CoreUserProfileHandlerData,
} from '@features/user/services/user-delegate';
import { CoreUserProfile } from '@features/user/services/user';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';

/**
 * Handler to inject an option into user menu.
 */
@Injectable({ providedIn: 'root' })
export class AddonPrivateFilesUserHandlerService implements CoreUserProfileHandler {

    static readonly PAGE_NAME = 'private';

    name = 'AddonPrivateFiles';
    priority = 400;
    type = CoreUserProfileHandlerType.LIST_ITEM;
    cacheEnabled = true;

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return AddonPrivateFiles.isPluginEnabled();
    }

    /**
     * @inheritdoc
     */
    async isEnabledForContext(context: CoreUserDelegateContext): Promise<boolean> {
        // Private files only available in user menu.
        if (context !== CoreUserDelegateContext.USER_MENU) {
            return false;
        }

        // Check if feature is disabled.
        const currentSite = CoreSites.getCurrentSite();
        if (!currentSite) {
            return false;
        }

        // This option used to belong to main menu, check the original disabled feature value.
        return !currentSite.isFeatureDisabled('CoreMainMenuDelegate_AddonPrivateFiles');
    }

    /**
     * @inheritdoc
     */
    async isEnabledForUser(user: CoreUserProfile, context: CoreUserDelegateContext): Promise<boolean> {
        // Private files only available for the current user.
        return user.id == CoreSites.getCurrentSiteUserId() && context === CoreUserDelegateContext.USER_MENU;
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreUserProfileHandlerData {
        return {
            icon: 'fas-folder',
            title: 'addon.privatefiles.files',
            class: 'addon-privatefiles-handler',
            action: (event): void => {
                event.preventDefault();
                event.stopPropagation();
                CoreNavigator.navigateToSitePath(AddonPrivateFilesUserHandlerService.PAGE_NAME);
            },
        };
    }

}

export const AddonPrivateFilesUserHandler = makeSingleton(AddonPrivateFilesUserHandlerService);
