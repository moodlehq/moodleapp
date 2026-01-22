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
} from '@features/user/services/user-delegate';
import { CoreNavigator } from '@services/navigator';
import { makeSingleton } from '@singletons';
import { CoreDataPrivacy } from '../dataprivacy';
import { CORE_DATAPRIVACY_PAGE_NAME } from '@features/dataprivacy/constants';

/**
 * Handler to visualize custom reports.
 */
@Injectable({ providedIn: 'root' })
export class CoreDataPrivacyUserHandlerService implements CoreUserProfileHandler {

    protected pageName = CORE_DATAPRIVACY_PAGE_NAME;

    readonly type = CoreUserProfileHandlerType.LIST_ACCOUNT_ITEM;
    name = 'CoreDataPrivacy';
    priority = 100;

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return await CoreDataPrivacy.isEnabled();
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreUserProfileListHandlerData {
        return {
            class: 'core-data-privacy',
            icon: 'fas-user-shield',
            title: 'core.dataprivacy.pluginname',
            action: async (event): Promise<void> => {
                event.preventDefault();
                event.stopPropagation();
                await CoreNavigator.navigateToSitePath(this.pageName);
            },
        };
    }

}

export const CoreDataPrivacyUserHandler = makeSingleton(CoreDataPrivacyUserHandlerService);
