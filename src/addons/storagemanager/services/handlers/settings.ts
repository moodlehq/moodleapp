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

import { makeSingleton } from '@singletons';
import { CoreSettingsHandler, CoreSettingsHandlerData } from '@features/settings/services/settings-delegate';

/**
 * Mange storage settings handler.
 */
@Injectable({ providedIn: 'root' })
export class AddonStorageManagerSettingsHandlerService implements CoreSettingsHandler {

    static readonly PAGE_NAME = 'storage';

    name = 'AddonStorageManager';
    priority = 400;

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreSettingsHandlerData {
        return {
            icon: 'fas-box-archive',
            title: 'addon.storagemanager.managedownloads',
            page: AddonStorageManagerSettingsHandlerService.PAGE_NAME,
            class: 'addon-storagemanager-settings-handler',
        };
    }

}

export const AddonStorageManagerSettingsHandler = makeSingleton(AddonStorageManagerSettingsHandlerService);
