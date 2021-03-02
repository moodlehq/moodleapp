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
import { makeSingleton } from '@singletons';
import { PREFERENCES_TABLE_NAME, CoreUserPreferenceDBRecord } from './database/user';

/**
 * Service to handle offline user preferences.
 */
@Injectable({ providedIn: 'root' })
export class CoreUserOfflineProvider {

    /**
     * Get preferences that were changed offline.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with list of preferences.
     */
    async getChangedPreferences(siteId?: string): Promise<CoreUserPreferenceDBRecord[]> {
        const site = await CoreSites.getSite(siteId);

        return site.getDb().getRecordsSelect(PREFERENCES_TABLE_NAME, 'value != onlineValue');
    }

    /**
     * Get an offline preference.
     *
     * @param name Name of the preference.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the preference, rejected if not found.
     */
    async getPreference(name: string, siteId?: string): Promise<CoreUserPreferenceDBRecord> {
        const site = await CoreSites.getSite(siteId);

        return site.getDb().getRecord(PREFERENCES_TABLE_NAME, { name });
    }

    /**
     * Set an offline preference.
     *
     * @param name Name of the preference.
     * @param value Value of the preference.
     * @param onlineValue Online value of the preference. If undefined, preserve previously stored value.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async setPreference(name: string, value: string, onlineValue?: string, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        if (typeof onlineValue == 'undefined') {
            const preference = await this.getPreference(name, site.id);

            onlineValue = preference.onlinevalue;
        }

        const record: CoreUserPreferenceDBRecord = {
            name,
            value,
            onlinevalue: onlineValue,
        };

        await site.getDb().insertRecord(PREFERENCES_TABLE_NAME, record);
    }

}

export const CoreUserOffline = makeSingleton(CoreUserOfflineProvider);
