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
import { CoreCronHandler } from '@services/cron';
import { makeSingleton } from '@singletons';
import { AddonMessagesSync } from '../messages-sync';

/**
 * Synchronization cron handler.
 */
@Injectable({ providedIn: 'root' })
export class AddonMessagesSyncCronHandlerService implements CoreCronHandler {

    name = 'AddonMessagesSyncCronHandler';

    /**
     * Execute the process.
     * Receives the ID of the site affected, undefined for all sites.
     *
     * @param siteId ID of the site affected, undefined for all sites.
     * @return Promise resolved when done, rejected if failure.
     */
    execute(siteId?: string): Promise<void> {
        return AddonMessagesSync.syncAllDiscussions(siteId);
    }

    /**
     * Get the time between consecutive executions.
     *
     * @return Time between consecutive executions (in ms).
     */
    getInterval(): number {
        return 300000; // 5 minutes.
    }

}

export const AddonMessagesSyncCronHandler = makeSingleton(AddonMessagesSyncCronHandlerService);
