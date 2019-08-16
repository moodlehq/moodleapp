// (C) Copyright 2015 Martin Dougiamas
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
import { CoreSitesProvider, CoreSiteSchema } from '@providers/sites';

/**
 * Structure of offline user preferences.
 */
export interface CoreUserOfflinePreference {
    name: string;
    value: string;
    onlinevalue: string;
}

/**
 * Service to handle offline user preferences.
 */
@Injectable()
export class CoreUserOfflineProvider {

    // Variables for database.
    static PREFERENCES_TABLE = 'user_preferences';
    protected siteSchema: CoreSiteSchema = {
        name: 'CoreUserOfflineProvider',
        version: 1,
        tables: [
            {
                name: CoreUserOfflineProvider.PREFERENCES_TABLE,
                columns: [
                    {
                        name: 'name',
                        type: 'TEXT',
                        unique: true,
                        notNull: true
                    },
                    {
                        name: 'value',
                        type: 'TEXT'
                    },
                    {
                        name: 'onlinevalue',
                        type: 'TEXT'
                    },
                ]
            }
        ]
    };

    constructor(private sitesProvider: CoreSitesProvider) {
        this.sitesProvider.registerSiteSchema(this.siteSchema);
    }

    /**
     * Get preferences that were changed offline.
     *
     * @return {Promise<CoreUserOfflinePreference[]>} Promise resolved with list of preferences.
     */
    getChangedPreferences(siteId?: string): Promise<CoreUserOfflinePreference[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecordsSelect(CoreUserOfflineProvider.PREFERENCES_TABLE, 'value != onlineValue');
        });
    }

    /**
     * Get an offline preference.
     *
     * @param {string} name Name of the preference.
     * @return {Promise<CoreUserOfflinePreference>} Promise resolved with the preference, rejected if not found.
     */
    getPreference(name: string, siteId?: string): Promise<CoreUserOfflinePreference> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const conditions = { name };

            return site.getDb().getRecord(CoreUserOfflineProvider.PREFERENCES_TABLE, conditions);
        });
    }

    /**
     * Set an offline preference.
     *
     * @param {string} name Name of the preference.
     * @param {string} value Value of the preference.
     * @param {string} onlineValue Online value of the preference. If unedfined, preserve previously stored value.
     * @return {Promise<CoreUserPreference>} Promise resolved when done.
     */
    setPreference(name: string, value: string, onlineValue?: string, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            let promise: Promise<string>;
            if (typeof onlineValue == 'undefined') {
                promise = this.getPreference(name, site.id).then((preference) => preference.onlinevalue);
            } else {
                promise = Promise.resolve(onlineValue);
            }

            return promise.then((onlineValue) => {
                const record = { name, value, onlinevalue: onlineValue };

                return site.getDb().insertRecord(CoreUserOfflineProvider.PREFERENCES_TABLE, record);
            });
        });
    }
}
