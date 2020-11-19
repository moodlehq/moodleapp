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
import { CoreInitHandler, CoreInitDelegate } from '@services/init';
import { CoreConstants } from '@/core/constants';
import { makeSingleton } from '@singletons/core.singletons';
import { CoreLogger } from '@singletons/logger';

const VERSION_APPLIED = 'version_applied';

/**
 * Factory to handle app updates. This factory shouldn't be used outside of core.
 *
 * This service handles processes that need to be run when updating the app, like migrate Ionic 1 database data to Ionic 3.
 */
@Injectable()
export class CoreUpdateManagerProvider implements CoreInitHandler {

    // Data for init delegate.
    name = 'CoreUpdateManager';
    priority = CoreInitDelegate.MAX_RECOMMENDED_PRIORITY + 300;
    blocking = true;

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
        const promises = [];
        const versionCode = CoreConstants.CONFIG.versioncode;

        const versionApplied = await CoreConfig.instance.get<number>(VERSION_APPLIED, 0);

        if (versionCode >= 3900 && versionApplied < 3900 && versionApplied > 0) {
            // @todo: H5P update.
        }

        try {
            await Promise.all(promises);

            await CoreConfig.instance.set(VERSION_APPLIED, versionCode);
        } catch (error) {
            this.logger.error(`Error applying update from ${versionApplied} to ${versionCode}`, error);
        }
    }

}

export class CoreUpdateManager extends makeSingleton(CoreUpdateManagerProvider) {}
