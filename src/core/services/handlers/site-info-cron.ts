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
import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';

/**
 * Cron handler to update site info every certain time.
 */
@Injectable({ providedIn: 'root' })
export class CoreSiteInfoCronHandlerService implements CoreCronHandler {

    name = 'CoreSiteInfoCronHandler';

    /**
     * @inheritdoc
     */
    async execute(siteId?: string): Promise<void> {
        if (!siteId) {
            const siteIds = await CoreSites.getSitesIds();

            await Promise.all(siteIds.map((siteId) => CoreSites.updateSiteInfo(siteId)));
        } else {
            await CoreSites.updateSiteInfo(siteId);
        }
    }

    /**
     * @inheritdoc
     */
    getInterval(): number {
        return 10800000; // 3 hours.
    }

    /**
     * @inheritdoc
     */
    isSync(): boolean {
        return false;
    }

}

export const CoreSiteInfoCronHandler = makeSingleton(CoreSiteInfoCronHandlerService);
