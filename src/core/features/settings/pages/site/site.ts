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
import { ActivatedRoute, Params, Router } from '@angular/router';
import { IonRefresher } from '@ionic/angular';

import { CoreSettingsDelegate, CoreSettingsHandlerData } from '../../services/settings-delegate';
import { CoreEventObserver, CoreEvents, CoreEventSiteUpdatedData } from '@singletons/events';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
// import { CoreSplitViewComponent } from '@components/split-view/split-view';
// import { CoreSharedFiles } from '@features/sharedfiles/services/sharedfiles';
import { CoreSettingsHelper, CoreSiteSpaceUsage } from '../../services/settings-helper';
import { CoreApp } from '@services/app';
import { CoreSiteInfo } from '@classes/site';
import { Translate } from '@singletons';

/**
 * Page that displays the list of site settings pages.
 */
@Component({
    selector: 'page-core-site-preferences',
    templateUrl: 'site.html',
})
export class CoreSitePreferencesPage implements OnInit, OnDestroy {

    // @ViewChild(CoreSplitViewComponent) splitviewCtrl?: CoreSplitViewComponent;

    isIOS: boolean;
    selectedPage?: string;

    handlers: CoreSettingsHandlerData[] = [];
    siteId: string;
    siteInfo?: CoreSiteInfo;
    siteName?: string;
    siteUrl?: string;
    spaceUsage: CoreSiteSpaceUsage = {
        cacheEntries: 0,
        spaceUsage: 0,
    };

    loaded = false;
    iosSharedFiles = 0;
    protected sitesObserver: CoreEventObserver;
    protected isDestroyed = false;

    constructor(
        protected route: ActivatedRoute,
        protected router: Router, // Will be removed when splitview is implemented
    ) {

        this.isIOS = CoreApp.instance.isIOS();
        this.siteId = CoreSites.instance.getCurrentSiteId();

        this.selectedPage = route.snapshot.paramMap.get('page') || undefined;

        this.sitesObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, (data: CoreEventSiteUpdatedData) => {
            if (data.siteId == this.siteId) {
                this.refreshData();
            }
        });
    }

    /**
     * View loaded.
     */
    ngOnInit(): void {
        this.fetchData().finally(() => {
            this.loaded = true;

            if (this.selectedPage) {
                this.openHandler(this.selectedPage);
            } /* else if (this.splitviewCtrl.isOn()) {
                if (this.isIOS) {
                    this.openHandler('CoreSharedFilesListPage', { manage: true, siteId: this.siteId, hideSitePicker: true });
                } else if (this.handlers.length > 0) {
                    this.openHandler(this.handlers[0].page, this.handlers[0].params);
                }
            }*/
        });
    }

    /**
     * Fetch Data.
     */
    protected async fetchData(): Promise<void> {
        this.handlers = CoreSettingsDelegate.instance.getHandlers();

        const currentSite = CoreSites.instance.getCurrentSite();
        this.siteInfo = currentSite!.getInfo();
        this.siteName = currentSite!.getSiteName();
        this.siteUrl = currentSite!.getURL();

        const promises: Promise<void>[] = [];

        promises.push(CoreSettingsHelper.instance.getSiteSpaceUsage(this.siteId)
            .then((spaceUsage) => {
                this.spaceUsage = spaceUsage;

                return;
            }));

        /* if (this.isIOS) {
            promises.push(CoreSharedFiles.instance.getSiteSharedFiles(this.siteId)
                .then((files) => {
                this.iosSharedFiles = files.length;

                return;
            }));
        }*/

        await Promise.all(promises);
    }

    /**
     * Syncrhonizes the site.
     */
    async synchronize(): Promise<void> {
        try {
            // Using syncOnlyOnWifi false to force manual sync.
            await CoreSettingsHelper.instance.synchronizeSite(false, this.siteId);
        } catch (error) {
            if (this.isDestroyed) {
                return;
            }
            CoreDomUtils.instance.showErrorModalDefault(error, 'core.settings.errorsyncsite', true);
        }

    }

    /**
     * Returns true if site is beeing synchronized.
     *
     * @return True if site is beeing synchronized, false otherwise.
     */
    isSynchronizing(): boolean {
        return !!CoreSettingsHelper.instance.getSiteSyncPromise(this.siteId);
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     */
    refreshData(refresher?: CustomEvent<IonRefresher>): void {
        this.fetchData().finally(() => {
            refresher?.detail.complete();
        });
    }

    /**
     * Deletes files of a site and the tables that can be cleared.
     *
     * @param siteData Site object with space usage.
     */
    async deleteSiteStorage(): Promise<void> {
        try {
            this.spaceUsage = await CoreSettingsHelper.instance.deleteSiteStorage(this.siteName || '', this.siteId);
        } catch {
            // Ignore cancelled confirmation modal.
        }
    }

    /**
     * Open a handler.
     *
     * @param page Page to open.
     * @param params Params of the page to open.
     */
    openHandler(page: string, params?: Params): void {
        this.selectedPage = page;
        // this.splitviewCtrl.push(page, params);
        this.router.navigate([page], { relativeTo: this.route, queryParams: params });
    }

    /**
     * Show information about space usage actions.
     */
    showSpaceInfo(): void {
        CoreDomUtils.instance.showAlert(
            Translate.instance.instant('core.help'),
            Translate.instance.instant('core.settings.spaceusagehelp'),
        );
    }

    /**
     * Show information about sync actions.
     */
    showSyncInfo(): void {
        CoreDomUtils.instance.showAlert(
            Translate.instance.instant('core.help'),
            Translate.instance.instant('core.settings.synchronizenowhelp'),
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
