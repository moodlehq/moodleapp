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

import { CoreConfig } from '@services/config';
import { CoreConstants } from '@/core/constants';
import { CoreLogger } from '@singletons/logger';
import { makeSingleton } from '@singletons';
import { CoreH5P } from '@features/h5p/services/h5p';

const VERSION_APPLIED = 'version_applied';

/**
 * Factory to handle app updates. This factory shouldn't be used outside of core.
 *
 * This service handles processes that need to be run when updating the app, like migrate Ionic 1 database data to Ionic 3.
 */
@Injectable({ providedIn: 'root' })
export class CoreUpdateManagerProvider {

    protected logger: CoreLogger;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreUpdateManagerProvider');
    }

    /**
     * Check if the app has been updated and performs the needed processes.
     * This function shouldn't be used outside of core.
     *
     * @return Promise resolved when the update process finishes.
     */
    async load(): Promise<void> {
        const promises: Promise<unknown>[] = [];
        const versionCode = CoreConstants.CONFIG.versioncode;

        const versionApplied = await CoreConfig.get<number>(VERSION_APPLIED, 0);

        if (versionCode >= 3950 && versionApplied < 3950 && versionApplied > 0) {
            promises.push(CoreH5P.h5pPlayer.deleteAllContentIndexes());
        }

        try {
            await Promise.all(promises);

            await CoreConfig.set(VERSION_APPLIED, versionCode);
        } catch (error) {
            this.logger.error(`Error applying update from ${versionApplied} to ${versionCode}`, error);
        }
    }

}

export const CoreUpdateManager = makeSingleton(CoreUpdateManagerProvider);
