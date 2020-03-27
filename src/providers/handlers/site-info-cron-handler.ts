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
import { CoreCronHandler } from '@providers/cron';
import { CoreSitesProvider } from '@providers/sites';

/**
 * Cron handler to update site info every certain time.
 */
@Injectable()
export class CoreSiteInfoCronHandler implements CoreCronHandler {
    name = 'CoreSiteInfoCronHandler';

    constructor(protected sitesProvider: CoreSitesProvider) {}

    /**
     * Execute the process.
     * Receives the ID of the site affected, undefined for all sites.
     *
     * @param siteId ID of the site affected, undefined for all sites.
     * @return Promise resolved when done, rejected if failure.
     */
    async execute(siteId?: string): Promise<any> {
        if (!siteId) {
            const siteIds = await this.sitesProvider.getSitesIds();

            return Promise.all(siteIds.map((siteId) => this.sitesProvider.updateSiteInfo(siteId)));
        } else {
            return this.sitesProvider.updateSiteInfo(siteId);
        }
    }

    /**
     * Returns handler's interval in milliseconds. Defaults to CoreCronDelegate.DEFAULT_INTERVAL.
     *
     * @return Interval time (in milliseconds).
     */
    getInterval(): number {
        return 10800000; // 3 hours.
    }

    /**
     * Check whether it's a synchronization process or not. True if not defined.
     *
     * @return Whether it's a synchronization process or not.
     */
    isSync(): boolean {
        return false;
    }
}
