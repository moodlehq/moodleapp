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
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSyncBaseProvider } from '@classes/base-sync';
import { CoreAppProvider } from '@providers/app';
import { CoreUserOfflineProvider } from './offline';
import { CoreUserProvider } from './user';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { TranslateService } from '@ngx-translate/core';
import { CoreSyncProvider } from '@providers/sync';

/**
 * Service to sync user preferences.
 */
@Injectable()
export class CoreUserSyncProvider extends CoreSyncBaseProvider {

    static AUTO_SYNCED = 'core_user_autom_synced';

    constructor(loggerProvider: CoreLoggerProvider, sitesProvider: CoreSitesProvider, appProvider: CoreAppProvider,
            translate: TranslateService, syncProvider: CoreSyncProvider, textUtils: CoreTextUtilsProvider,
            private userOffline: CoreUserOfflineProvider, private userProvider: CoreUserProvider,
            private utils: CoreUtilsProvider, timeUtils: CoreTimeUtilsProvider) {
        super('CoreUserSync', loggerProvider, sitesProvider, appProvider, syncProvider, textUtils, translate, timeUtils);
    }

    /**
     * Try to synchronize user preferences in a certain site or in all sites.
     *
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @return Promise resolved if sync is successful, rejected if sync fails.
     */
    syncPreferences(siteId?: string): Promise<any> {
        const syncFunctionLog = 'all user preferences';

        return this.syncOnSites(syncFunctionLog, this.syncPreferencesFunc.bind(this), [], siteId);
    }

    /**
     * Sync user preferences of a site.
     *
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @param Promise resolved if sync is successful, rejected if sync fails.
     */
    protected syncPreferencesFunc(siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const syncId = 'preferences';

        if (this.isSyncing(syncId, siteId)) {
            // There's already a sync ongoing, return the promise.
            return this.getOngoingSync(syncId, siteId);
        }

        const warnings = [];

        this.logger.debug(`Try to sync user preferences`);

        const syncPromise = this.userOffline.getChangedPreferences(siteId).then((preferences) => {
            return this.utils.allPromises(preferences.map((preference) => {
                return this.userProvider.getUserPreferenceOnline(preference.name, siteId).then((onlineValue) => {
                    if (preference.onlinevalue != onlineValue) {
                        // Prefernce was changed on web while the app was offline, do not sync.
                        return this.userOffline.setPreference(preference.name, onlineValue, onlineValue, siteId);
                    }

                    return this.userProvider.setUserPreference(preference.name, preference.value, siteId).catch((error) => {
                        if (this.utils.isWebServiceError(error)) {
                            warnings.push(this.textUtils.getErrorMessageFromError(error));
                        } else {
                            // Couldn't connect to server, reject.
                            return Promise.reject(error);
                        }
                    });
                });
            }));
        }).then(() => {
            // All done, return the warnings.
            return warnings;
        });

        return this.addOngoingSync(syncId, syncPromise, siteId);
    }
}
