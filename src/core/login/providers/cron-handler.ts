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
 * Cron handler to log out sites when does not meet the app requirements.
 */
@Injectable()
export class CoreLoginCronHandler implements CoreCronHandler {
    name = 'CoreLoginCronHandler';

    constructor(private sitesProvider: CoreSitesProvider) {}

    /**
     * Execute the process.
     * Receives the ID of the site affected, undefined for all sites.
     *
     * @param siteId ID of the site affected, undefined for all sites.
     * @return Promise resolved when done, rejected if failure.
     */
    execute(siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();
        if (!siteId) {
            return Promise.resolve();
        }

        // Check logged in site minimun required version.
        // Do not check twice in the same 10 minutes.
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getPublicConfig().catch(() => {
                return {};
            }).then((config) => {
                this.sitesProvider.checkRequiredMinimumVersion(config).catch(() => {
                    // Ignore errors.

                });
            });
        });
    }

    /**
     * Check whether it's a synchronization process or not. True if not defined.
     *
     * @return Whether it's a synchronization process or not.
     */
    isSync(): boolean {
        // Defined to true to be checked on sync site.
        return true;
    }
}
