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

import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavParams } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreSettingsDelegate, CoreSettingsHandlerData } from '../../providers/delegate';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider, CoreSiteBasicInfo } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreSharedFilesProvider } from '@core/sharedfiles/providers/sharedfiles';
import { CoreSettingsHelper, CoreSiteSpaceUsage } from '../../providers/helper';
import { CoreApp } from '@providers/app';

/**
 * Page that displays the list of site settings pages.
 */
@IonicPage({segment: 'core-site-preferences'})
@Component({
    selector: 'page-core-site-preferences',
    templateUrl: 'site.html',
})
export class CoreSitePreferencesPage {
    @ViewChild(CoreSplitViewComponent) splitviewCtrl: CoreSplitViewComponent;

    handlers: CoreSettingsHandlerData[];
    isIOS: boolean;
    selectedPage: string;
    siteId: string;
    siteInfo: CoreSiteBasicInfo[] = [];
    siteName: string;
    siteUrl: string;
    spaceUsage: CoreSiteSpaceUsage = {
        cacheEntries: 0,
        spaceUsage: 0
    };
    loaded = false;
    iosSharedFiles: number;
    protected sitesObserver: any;
    protected isDestroyed = false;

    constructor(protected settingsDelegate: CoreSettingsDelegate,
            protected settingsHelper: CoreSettingsHelper,
            protected sitesProvider: CoreSitesProvider,
            protected domUtils: CoreDomUtilsProvider,
            protected eventsProvider: CoreEventsProvider,
            protected sharedFilesProvider: CoreSharedFilesProvider,
            protected translate: TranslateService,
            navParams: NavParams,
    ) {

        this.isIOS = CoreApp.instance.isIOS();

        this.selectedPage = navParams.get('page') || false;

        this.sitesObserver = this.eventsProvider.on(CoreEventsProvider.SITE_UPDATED, (data) => {
            if (data.siteId == this.siteId) {
                this.refreshData();
            }
        });
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.fetchData().finally(() => {
            this.loaded = true;

            if (this.selectedPage) {
                this.openHandler(this.selectedPage);
            } else if (this.splitviewCtrl.isOn()) {
                if (this.isIOS) {
                    this.openHandler('CoreSharedFilesListPage', {manage: true, siteId: this.siteId, hideSitePicker: true});
                } else if (this.handlers.length > 0) {
                    this.openHandler(this.handlers[0].page, this.handlers[0].params);
                }
            }
        });
    }

    /**
     * Fetch Data.
     */
    protected async fetchData(): Promise<void> {
        this.handlers = this.settingsDelegate.getHandlers();
        const currentSite = this.sitesProvider.getCurrentSite();
        this.siteId = currentSite.id;
        this.siteInfo = currentSite.getInfo();
        this.siteName = currentSite.getSiteName();
        this.siteUrl = currentSite.getURL();

        const promises = [];

        promises.push(this.settingsHelper.getSiteSpaceUsage(this.siteId).then((spaceUsage) => this.spaceUsage = spaceUsage));

        if (this.isIOS) {
            promises.push(this.sharedFilesProvider.getSiteSharedFiles(this.siteId).then((files) =>
                this.iosSharedFiles = files.length
            ));
        }

        await Promise.all(promises);
    }

    /**
     * Syncrhonizes the site.
     */
    synchronize(siteId: string): void {
        // Using syncOnlyOnWifi false to force manual sync.
        this.settingsHelper.synchronizeSite(false, this.siteId).catch((error) => {
            if (this.isDestroyed) {
                return;
            }
            this.domUtils.showErrorModalDefault(error, 'core.settings.errorsyncsite', true);
        });
    }

    /**
     * Returns true if site is beeing synchronized.
     *
     * @return True if site is beeing synchronized, false otherwise.
     */
    isSynchronizing(): boolean {
        return this.siteId && !!this.settingsHelper.getSiteSyncPromise(this.siteId);
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     */
    refreshData(refresher?: any): void {
        this.fetchData().finally(() => {
            refresher && refresher.complete();
        });
    }

    /**
     * Deletes files of a site and the tables that can be cleared.
     *
     * @param siteData Site object with space usage.
     */
    deleteSiteStorage(): void {
        this.settingsHelper.deleteSiteStorage(this.siteName, this.siteId).then((newInfo) => {
            this.spaceUsage = newInfo;
        }).catch(() => {
            // Ignore cancelled confirmation modal.
        });
    }

    /**
     * Open a handler.
     *
     * @param page Page to open.
     * @param params Params of the page to open.
     */
    openHandler(page: string, params?: any): void {
        this.selectedPage = page;
        this.splitviewCtrl.push(page, params);
    }

    /**
     * Show information about space usage actions.
     */
    showSpaceInfo(): void {
        this.domUtils.showAlert(this.translate.instant('core.help'),
            this.translate.instant('core.settings.spaceusagehelp'));
    }

    /**
     * Show information about sync actions.
     */
    showSyncInfo(): void {
        this.domUtils.showAlert(this.translate.instant('core.help'),
            this.translate.instant('core.settings.synchronizenowhelp'));
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.sitesObserver && this.sitesObserver.off();
    }
}
