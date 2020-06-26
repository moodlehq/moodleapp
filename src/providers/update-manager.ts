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
import { CoreConfigProvider } from './config';
import { CoreInitHandler, CoreInitDelegate } from './init';
import { CoreLoggerProvider } from './logger';
import { CoreConfigConstants } from '../configconstants';
import { CoreH5P } from '@core/h5p/providers/h5p';
import { makeSingleton } from '@singletons/core.singletons';

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

    protected VERSION_APPLIED = 'version_applied';
    protected logger;

    constructor(logger: CoreLoggerProvider,
            protected configProvider: CoreConfigProvider) {
        this.logger = logger.getInstance('CoreUpdateManagerProvider');
    }

    /**
     * Check if the app has been updated and performs the needed processes.
     * This function shouldn't be used outside of core.
     *
     * @return Promise resolved when the update process finishes.
     */
    async load(): Promise<any> {
        const promises = [];
        const versionCode = CoreConfigConstants.versioncode;

        const versionApplied: number = await this.configProvider.get(this.VERSION_APPLIED, 0);

        if (versionCode >= 3900 && versionApplied < 3900 && versionApplied > 0) {
            promises.push(CoreH5P.instance.h5pPlayer.deleteAllContentIndexes());
        }

        try {
            await Promise.all(promises);

            await this.configProvider.set(this.VERSION_APPLIED, versionCode);
        } catch (error) {
            this.logger.error(`Error applying update from ${versionApplied} to ${versionCode}`, error);
        }
    }
}

export class CoreUpdateManager extends makeSingleton(CoreUpdateManagerProvider) {}
