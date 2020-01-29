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

    constructor(logger: CoreLoggerProvider, private configProvider: CoreConfigProvider) {
        this.logger = logger.getInstance('CoreUpdateManagerProvider');
    }

    /**
     * Check if the app has been updated and performs the needed processes.
     * This function shouldn't be used outside of core.
     *
     * @return Promise resolved when the update process finishes.
     */
    load(): Promise<any> {
        const promises = [],
            versionCode = CoreConfigConstants.versioncode;

        return this.configProvider.get(this.VERSION_APPLIED, 0).then((versionApplied: number) => {

            // Put here the code to treat app updates.

            return Promise.all(promises).then(() => {
                return this.configProvider.set(this.VERSION_APPLIED, versionCode);
            }).catch((error) => {
                this.logger.error(`Error applying update from ${versionApplied} to ${versionCode}`, error);
            });
        });
    }
}
