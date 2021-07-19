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

import { AfterViewInit, Component, OnDestroy, ViewChild } from '@angular/core';
import { Params } from '@angular/router';
import { IonRefresher } from '@ionic/angular';

import { CoreSettingsDelegate, CoreSettingsHandlerToDisplay } from '../../services/settings-delegate';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreSettingsHelper, CoreSiteSpaceUsage } from '../../services/settings-helper';
import { CoreApp } from '@services/app';
import { CoreSiteInfo } from '@classes/site';
import { Translate } from '@singletons';
import { CoreNavigator } from '@services/navigator';
import { CorePageItemsListManager } from '@classes/page-items-list-manager';
import { CoreSplitViewComponent } from '@components/split-view/split-view';

/**
 * Page that displays the list of site settings pages.
 */
@Component({
    selector: 'page-core-site-preferences',
    templateUrl: 'site.html',
})
export class CoreSitePreferencesPage implements AfterViewInit, OnDestroy {

    @ViewChild(CoreSplitViewComponent) splitView!: CoreSplitViewComponent;

    handlers: CoreSettingsSitePreferencesManager;

    isIOS: boolean;
    siteId: string;
    siteInfo?: CoreSiteInfo;
    siteName?: string;
    siteUrl?: string;
    spaceUsage: CoreSiteSpaceUsage = {
        cacheEntries: 0,
        spaceUsage: 0,
    };

    protected sitesObserver: CoreEventObserver;
    protected isDestroyed = false;

    constructor() {

        this.isIOS = CoreApp.isIOS();
        this.siteId = CoreSites.getCurrentSiteId();
        this.handlers = new CoreSettingsSitePreferencesManager(CoreSitePreferencesPage);

        this.sitesObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, (data) => {
            if (data.siteId == this.siteId) {
                this.refreshData();
            }
        });
    }

    /**
     * View loaded.
     */
    async ngAfterViewInit(): Promise<void> {
        const pageToOpen = CoreNavigator.getRouteParam('page');

        try {
            await this.fetchData();
        } finally {

            const handler = pageToOpen ? this.handlers.items.find(handler => handler.page == pageToOpen) : undefined;

            if (handler) {
                this.handlers.select(handler);
                this.handlers.watchSplitViewOutlet(this.splitView);
            } else {
                this.handlers.start(this.splitView);
            }
        }
    }

    /**
     * Fetch Data.
     */
    protected async fetchData(): Promise<void> {
        this.handlers.setItems(CoreSettingsDelegate.getHandlers());

        const currentSite = CoreSites.getCurrentSite();
        this.siteInfo = currentSite!.getInfo();
        this.siteName = currentSite!.getSiteName();
        this.siteUrl = currentSite!.getURL();

        this.spaceUsage = await CoreSettingsHelper.getSiteSpaceUsage(this.siteId);
    }

    /**
     * Syncrhonizes the site.
     */
    async synchronize(): Promise<void> {
        try {
            // Using syncOnlyOnWifi false to force manual sync.
            await CoreSettingsHelper.synchronizeSite(false, this.siteId);
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
     * @return True if site is beeing synchronized, false otherwise.
     */
    isSynchronizing(): boolean {
        return !!CoreSettingsHelper.getSiteSyncPromise(this.siteId);
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     */
    refreshData(refresher?: IonRefresher): void {
        this.fetchData().finally(() => {
            refresher?.complete();
        });
    }

    /**
     * Deletes files of a site and the tables that can be cleared.
     *
     * @param siteData Site object with space usage.
     */
    async deleteSiteStorage(): Promise<void> {
        try {
            this.spaceUsage = await CoreSettingsHelper.deleteSiteStorage(this.siteName || '', this.siteId);
        } catch {
            // Ignore cancelled confirmation modal.
        }
    }

    /**
     * Show information about space usage actions.
     */
    showSpaceInfo(): void {
        CoreDomUtils.showAlert(
            Translate.instant('core.help'),
            Translate.instant('core.settings.spaceusagehelp'),
        );
    }

    /**
     * Show information about sync actions.
     */
    showSyncInfo(): void {
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

/**
 * Helper class to manage sections.
 */
class CoreSettingsSitePreferencesManager extends CorePageItemsListManager<CoreSettingsHandlerToDisplay> {

    /**
     * @inheritdoc
     */
    protected getItemPath(handler: CoreSettingsHandlerToDisplay): string {
        return handler.page;
    }

    /**
     * @inheritdoc
     */
    protected getItemQueryParams(handler: CoreSettingsHandlerToDisplay): Params {
        return handler.params || {};
    }

}
