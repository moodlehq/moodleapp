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
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton } from '@singletons';

/**
 * Cron handler to log out sites when does not meet the app requirements.
 */
@Injectable({ providedIn: 'root' })
export class CoreLoginCronHandlerService implements CoreCronHandler {

    name = 'CoreLoginCronHandler';

    /**
     * @inheritdoc
     */
    async execute(siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();
        if (!siteId) {
            return;
        }

        // Check logged in site minimun required version.
        // Do not check twice in the same 10 minutes.
        const site = await CoreSites.getSite(siteId);

        const config = await CoreUtils.ignoreErrors(site.getPublicConfig({
            readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
        }));

        CoreUtils.ignoreErrors(CoreSites.checkApplication(config));
    }

    /**
     * @inheritdoc
     */
    isSync(): boolean {
        // Defined to true to be checked on sync site.
        return true;
    }

}

export const CoreLoginCronHandler = makeSingleton(CoreLoginCronHandlerService);
