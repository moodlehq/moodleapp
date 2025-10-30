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
import { ADDON_PRIVATE_FILES_PAGE_NAME } from '@addons/privatefiles/constants';

/**
 * Handler to inject an option into user menu.
 */
@Injectable({ providedIn: 'root' })
export class AddonPrivateFilesUserHandlerService implements CoreUserProfileHandler {

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
    async isEnabledForUser(user: CoreUserProfile, context: CoreUserDelegateContext): Promise<boolean> {
        return user.id === CoreSites.getCurrentSiteUserId() && context === CoreUserDelegateContext.USER_MENU;
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
                CoreNavigator.navigateToSitePath(ADDON_PRIVATE_FILES_PAGE_NAME);
            },
        };
    }

}

export const AddonPrivateFilesUserHandler = makeSingleton(AddonPrivateFilesUserHandlerService);
