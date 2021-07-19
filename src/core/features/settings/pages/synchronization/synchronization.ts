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

import { Component, OnDestroy, OnInit } from '@angular/core';

import { CoreConstants } from '@/core/constants';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreSites, CoreSiteBasicInfo } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreConfig } from '@services/config';
import { CoreSettingsHelper } from '@features/settings/services/settings-helper';
import { Translate } from '@singletons';

/**
 * Page that displays the synchronization settings.
 */
@Component({
    selector: 'page-core-app-settings-synchronization',
    templateUrl: 'synchronization.html',
})
export class CoreSettingsSynchronizationPage implements OnInit, OnDestroy {

    sites: CoreSiteBasicInfo[] = [];
    sitesLoaded = false;
    currentSiteId = '';
    syncOnlyOnWifi = false;
    protected isDestroyed = false;
    protected sitesObserver: CoreEventObserver;

    constructor() {

        this.currentSiteId = CoreSites.getCurrentSiteId();

        this.sitesObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, async (data) => {
            const site = await CoreSites.getSite(data.siteId);

            const siteEntry = this.sites.find((siteEntry) => siteEntry.id == site.id);
            if (siteEntry) {
                const siteInfo = site.getInfo();

                siteEntry.siteName = site.getSiteName();

                if (siteInfo) {
                    siteEntry.siteUrl = siteInfo.siteurl;
                    siteEntry.fullName = siteInfo.fullname;
                }
            }
        });
    }

    /**
     * View loaded.
     */
    async ngOnInit(): Promise<void> {
        try {
            this.sites = await CoreSites.getSortedSites();
        } catch {
            // Ignore errors.
        }

        this.sitesLoaded = true;

        this.syncOnlyOnWifi = await CoreConfig.get(CoreConstants.SETTINGS_SYNC_ONLY_ON_WIFI, true);
    }

    /**
     * Called when sync only on wifi setting is enabled or disabled.
     */
    syncOnlyOnWifiChanged(): void {
        CoreConfig.set(CoreConstants.SETTINGS_SYNC_ONLY_ON_WIFI, this.syncOnlyOnWifi ? 1 : 0);
    }

    /**
     * Syncrhonizes a site.
     *
     * @param siteId Site ID.
     */
    async synchronize(siteId: string): Promise<void> {
        // Using syncOnlyOnWifi false to force manual sync.
        try {
            await CoreSettingsHelper.synchronizeSite(false, siteId);
        } catch (error) {
            if (this.isDestroyed) {
                return;
            }

            CoreDomUtils.showErrorModalDefault(error, 'core.settings.errorsyncsite', true);
        }
    }

    /**
     * Returns true if site is beeing synchronized.
     *
     * @param siteId Site ID.
     * @return True if site is beeing synchronized, false otherwise.
     */
    isSynchronizing(siteId: string): boolean {
        return !!CoreSettingsHelper.getSiteSyncPromise(siteId);
    }

    /**
     * Show information about sync actions.
     */
    showInfo(): void {
        CoreDomUtils.showAlert(
            Translate.instant('core.help'),
            Translate.instant('core.settings.synchronizenowhelp'),
        );
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.sitesObserver?.off();
    }

}
