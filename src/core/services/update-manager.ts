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
import { CoreConstants, CoreConfigSettingKey } from '@/core/constants';
import { CoreLogger } from '@static/logger';
import { makeSingleton } from '@singletons';
import { CoreH5P } from '@features/h5p/services/h5p';
import { CoreLoginHelper } from '@features/login/services/login-helper';
import { CoreSites } from './sites';
import { CorePromiseUtils } from '@static/promise-utils';
import { CoreRedirects } from '@static/redirects';
import { CoreZoomLevel } from '@features/settings/services/settings-helper';
import { CorePromisedValue } from '@classes/promised-value';
import { CoreFile } from './file';
import { CorePlatform } from './platform';
import { NO_SITE_ID } from '@features/login/constants';

/**
 * Factory to handle app updates. This factory shouldn't be used outside of core.
 *
 * This service handles processes that need to be run when updating the app, like migrate Ionic 1 database data to Ionic 3.
 */
@Injectable({ providedIn: 'root' })
export class CoreUpdateManagerProvider {

    protected static readonly VERSION_APPLIED = 'version_applied';
    protected static readonly PREVIOUS_APP_FOLDER = 'previous_app_folder';

    protected logger: CoreLogger;
    protected doneDeferred: CorePromisedValue<void>;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreUpdateManagerProvider');
        this.doneDeferred = new CorePromisedValue();
    }

    /**
     * Returns a promise resolved when the load function is done.
     *
     * @returns Promise resolved when the load function is done.
     */
    get donePromise(): Promise<void> {
        return this.doneDeferred;
    }

    /**
     * Check if the app has been updated and performs the needed processes.
     * This function shouldn't be used outside of core.
     *
     * @returns Promise resolved when the update process finishes.
     */
    async initialize(): Promise<void> {
        const promises: Promise<unknown>[] = [];
        const versionCode = CoreConstants.CONFIG.versioncode;

        const [versionApplied, previousAppFolder, currentAppFolder] = await Promise.all([
            CoreConfig.get<number>(CoreUpdateManagerProvider.VERSION_APPLIED, 0),
            CoreConfig.get<string>(CoreUpdateManagerProvider.PREVIOUS_APP_FOLDER, ''),
            CorePlatform.isMobile() ? CorePromiseUtils.ignoreErrors(CoreFile.getBasePath(), '') : '',
        ]);

        if (versionCode > versionApplied) {
            promises.push(this.checkCurrentSiteAllowed());
        }

        if (
            (versionCode >= 3950 && versionApplied < 3950 && versionApplied > 0) ||
            (currentAppFolder && currentAppFolder !== previousAppFolder)
        ) {
            // Delete content indexes if the app folder has changed.
            // This happens in iOS every time the app is updated, even if the version hasn't changed.
            promises.push(CoreH5P.h5pPlayer.deleteAllContentIndexes());
        }

        if (versionCode >= 41000 && versionApplied < 41000 && versionApplied > 0) {
            promises.push(this.upgradeFontSizeNames());
        }

        if (versionCode >= 43000 && versionApplied < 43000 && versionApplied > 0) {
            promises.push(CoreSites.moveTokensToSecureStorage());
        }

        try {
            await Promise.all(promises);

            await Promise.all([
                CoreConfig.set(CoreUpdateManagerProvider.VERSION_APPLIED, versionCode),
                currentAppFolder ? CoreConfig.set(CoreUpdateManagerProvider.PREVIOUS_APP_FOLDER, currentAppFolder) : undefined,
            ]);
        } catch (error) {
            this.logger.error(`Error applying update from ${versionApplied} to ${versionCode}`, error);
        } finally {
            this.doneDeferred.resolve();
        }
    }

    /**
     * If there is a current site, check if it's still supported in the new app.
     *
     * @returns Promise resolved when done.
     */
    protected async checkCurrentSiteAllowed(): Promise<void> {
        const sites = await CoreLoginHelper.getAvailableSites();

        if (!sites.length) {
            return;
        }

        const currentSiteId = await CorePromiseUtils.ignoreErrors(CoreSites.getStoredCurrentSiteId());
        if (!currentSiteId) {
            return;
        }

        const site = await CorePromiseUtils.ignoreErrors(CoreSites.getSite(currentSiteId));
        if (!site) {
            return;
        }

        const isUrlAllowed = await CoreLoginHelper.isSiteUrlAllowed(site.getURL(), false);
        if (isUrlAllowed) {
            return;
        }

        // Site no longer supported, remove it as current site.
        await CoreSites.removeStoredCurrentSite();

        // Tell the app to open add site so the user can add the new site.
        CoreRedirects.storeRedirect(NO_SITE_ID, {
            redirectPath: '/login/sites',
            redirectOptions: {
                params: {
                    openAddSite: true,
                },
            },
        });
    }

    protected async upgradeFontSizeNames(): Promise<void> {
        const storedFontSizeName = await CoreConfig.get<string>(CoreConfigSettingKey.ZOOM_LEVEL, CoreZoomLevel.NONE);
        switch (storedFontSizeName) {
            case 'low':
                await CoreConfig.set(CoreConfigSettingKey.ZOOM_LEVEL, CoreZoomLevel.NONE);
                break;

            case 'normal':
                await CoreConfig.set(CoreConfigSettingKey.ZOOM_LEVEL, CoreZoomLevel.MEDIUM);
                break;
        }
    }

}

export const CoreUpdateManager = makeSingleton(CoreUpdateManagerProvider);
