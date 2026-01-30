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

import { CoreSites } from '@services/sites';
import { CoreErrorHelper } from '@services/error-helper';
import { CoreWSError } from '@classes/errors/wserror';
import { CoreSyncBaseProvider } from '@classes/base-sync';
import { makeSingleton } from '@singletons';
import { CoreUserPreferencesOffline } from './user-preferences-offline';
import { CoreUserPreferences } from './user-preferences';
import { CorePromiseUtils } from '@static/promise-utils';

/**
 * Service to sync user preferences.
 */
@Injectable({ providedIn: 'root' })
export class CoreUserSyncProvider extends CoreSyncBaseProvider<string[]> {

    constructor() {
        super('CoreUserSync');
    }

    /**
     * Try to synchronize user preferences in a certain site or in all sites.
     *
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @returns Promise resolved with warnings if sync is successful, rejected if sync fails.
     */
    syncPreferences(siteId?: string): Promise<void> {
        return this.syncOnSites('all user preferences', (siteId) => this.syncSitePreferences(siteId), siteId);
    }

    /**
     * Sync user preferences of a site.
     *
     * @param siteId Site ID to sync.
     * @returns Promise resolved with warnings if sync is successful, rejected if sync fails.
     */
    async syncSitePreferences(siteId: string): Promise<string[]> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const syncId = 'preferences';
        const currentSyncPromise = this.getOngoingSync(syncId, siteId);

        if (currentSyncPromise) {
            // There's already a sync ongoing, return the promise.
            return currentSyncPromise;
        }

        this.logger.debug('Try to sync user preferences');

        const syncPromise = this.performSyncSitePreferences(siteId);

        return this.addOngoingSync(syncId, syncPromise, siteId);
    }

    /**
     * Sync user preferences of a site.
     *
     * @param siteId Site ID to sync.
     * @returns Promise resolved if sync is successful, rejected if sync fails.
     */
    protected async performSyncSitePreferences(siteId: string): Promise<string[]> {
        const warnings: string[] = [];

        const preferences = await CoreUserPreferencesOffline.getChangedPreferences(siteId);

        await CorePromiseUtils.allPromises(preferences.map(async (preference) => {
            const onlineValue = await CoreUserPreferences.getPreferenceOnline(preference.name, siteId);

            if (onlineValue !== null && preference.onlinevalue != onlineValue) {
                // Preference was changed on web while the app was offline, do not sync.
                return CoreUserPreferencesOffline.setPreference(preference.name, onlineValue, onlineValue, siteId);
            }

            try {
                await CoreUserPreferences.setPreferenceOnline(preference.name, preference.value, undefined, siteId);
            } catch (error) {
                if (CoreWSError.isWebServiceError(error)) {
                    const warning = CoreErrorHelper.getErrorMessageFromError(error);
                    if (warning) {
                        warnings.push(warning);
                    }
                } else {
                    // Couldn't connect to server, reject.
                    throw error;
                }
            }
        }));

        // All done, return the warnings.
        return warnings;
    }

}

export const CoreUserSync = makeSingleton(CoreUserSyncProvider);
