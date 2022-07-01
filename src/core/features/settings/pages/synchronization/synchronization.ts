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
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreConfig } from '@services/config';
import { CoreSettingsHelper } from '@features/settings/services/settings-helper';
import { Translate } from '@singletons';
import { CoreAccountsList, CoreLoginHelper } from '@features/login/services/login-helper';

/**
 * Page that displays the synchronization settings.
 */
@Component({
    selector: 'page-core-app-settings-synchronization',
    templateUrl: 'synchronization.html',
    styleUrls: ['../../../login/sitelist.scss'],
})
export class CoreSettingsSynchronizationPage implements OnInit, OnDestroy {

    accountsList: CoreAccountsList = {
        sameSite: [],
        otherSites: [],
        count: 0,
    };

    sitesLoaded = false;
    syncOnlyOnWifi = false;
    protected isDestroyed = false;
    protected sitesObserver: CoreEventObserver;

    constructor() {

        this.sitesObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, async (data) => {
            const siteId = data.siteId;

            let siteEntry = siteId === this.accountsList.currentSite?.id
                ? this.accountsList.currentSite
                : undefined;

            if (!siteEntry) {
                siteEntry = this.accountsList.sameSite.find((siteEntry) => siteEntry.id === siteId);
            }

            if (!siteEntry) {
                this.accountsList.otherSites.some((sites) => {
                    siteEntry = sites.find((siteEntry) => siteEntry.id === siteId);

                    return siteEntry;
                });
            }

            if (!siteEntry) {
                return;
            }

            const site = await CoreSites.getSite(siteId);

            const siteInfo = site.getInfo();

            siteEntry.siteName = site.getSiteName();

            if (siteInfo) {
                siteEntry.siteUrl = siteInfo.siteurl;
                siteEntry.fullName = siteInfo.fullname;
            }
        });
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        const currentSiteId = CoreSites.getCurrentSiteId();

        try {
            this.accountsList = await CoreLoginHelper.getAccountsList(currentSiteId);
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

            CoreDomUtils.showErrorModalDefault(error, 'core.settings.sitesyncfailed', true);
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
