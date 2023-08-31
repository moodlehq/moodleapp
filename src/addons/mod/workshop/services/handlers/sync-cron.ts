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

import { asyncInstance } from '@/core/utils/async-instance';
import { ADDON_MOD_WORKSHOP_SYNC_CRON_NAME } from '@addons/mod/workshop/constants';
import { CoreCronHandler } from '@services/cron';

export class AddonModWorkshopSyncCronHandlerService {

    name = ADDON_MOD_WORKSHOP_SYNC_CRON_NAME;

}

/**
 * Get cron handler instance.
 *
 * @returns Cron handler.
 */
export function getCronHandlerInstance(): CoreCronHandler {
    const lazyHandler = asyncInstance(async () => {
        const { AddonModWorkshopSyncCronHandler } = await import('./sync-cron-lazy');

        return AddonModWorkshopSyncCronHandler.instance;
    });

    lazyHandler.setEagerInstance(new AddonModWorkshopSyncCronHandlerService());

    return lazyHandler;
}
