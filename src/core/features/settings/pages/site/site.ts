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

import { CoreSettingsHandlerToDisplay, CoreSettingsPageHandlerToDisplay } from '../../services/settings-delegate';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';
import { CoreNavigator } from '@services/navigator';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreListItemsManager } from '@classes/items-management/list-items-manager';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';
import { CoreSettingsHelper } from '@features/settings/services/settings-helper';
import { CoreNetwork } from '@services/network';
import { Subscription } from 'rxjs';
import { NgZone, Translate } from '@singletons';
import { CoreConstants } from '@/core/constants';
import { CoreConfig } from '@services/config';
import { CoreSettingsHandlersSource } from '@features/settings/classes/settings-handlers-source';
import { CoreToasts } from '@services/overlays/toasts';
import { CoreAlerts } from '@services/overlays/alerts';

/**
 * Page that displays the list of site settings pages.
 */
@Component({
    selector: 'page-core-site-preferences',
    templateUrl: 'site.html',
})
export class CoreSitePreferencesPage implements AfterViewInit, OnDestroy {

    @ViewChild(CoreSplitViewComponent) splitView!: CoreSplitViewComponent;

    handlers: CoreListItemsManager<CoreSettingsPageHandlerToDisplay, CoreSettingsHandlersSource>;

    dataSaver = false;
    limitedConnection = false;
    isOnline = true;

    protected siteId: string;
    protected sitesObserver: CoreEventObserver;
    protected networkObserver: Subscription;
    protected isDestroyed = false;

    get handlerItems(): CoreSettingsHandlerToDisplay[] {
        return this.handlers.getSource().handlers;
    }

    constructor() {
        this.siteId = CoreSites.getCurrentSiteId();

        const source = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(CoreSettingsHandlersSource, []);

        this.handlers = new CoreListItemsManager(source, CoreSitePreferencesPage);

        this.sitesObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, () => {
            this.refreshData();
        }, this.siteId);

        this.isOnline = CoreNetwork.isOnline();
        this.limitedConnection = this.isOnline && CoreNetwork.isNetworkAccessLimited();

        this.networkObserver = CoreNetwork.onChange().subscribe(() => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            NgZone.run(() => {
                this.isOnline = CoreNetwork.isOnline();
                this.limitedConnection = this.isOnline && CoreNetwork.isNetworkAccessLimited();
            });
        });
    }

    /**
     * @inheritdoc
     */
    async ngAfterViewInit(): Promise<void> {
        this.dataSaver = await CoreConfig.get(CoreConstants.SETTINGS_SYNC_ONLY_ON_WIFI, true);

        const pageToOpen = CoreNavigator.getRouteParam('page');

        try {
            await this.fetchData();
        } finally {
            const handler = pageToOpen ? this.handlers.items.find(handler => handler.page == pageToOpen) : undefined;

            if (handler) {
                this.handlers.watchSplitViewOutlet(this.splitView);

                await this.handlers.select(handler);
            } else {
                await this.handlers.start(this.splitView);
            }
        }
    }

    /**
     * Fetch Data.
     */
    protected async fetchData(): Promise<void> {
        await this.handlers.load();
    }

    /**
     * Syncrhonizes the site.
     */
    async synchronize(): Promise<void> {
        try {
            // Using syncOnlyOnWifi false to force manual sync.
            await CoreSettingsHelper.synchronizeSite(false, this.siteId);

            CoreToasts.show({
                message: 'core.settings.sitesynccompleted',
                translateMessage: true,
            });
        } catch (error) {
            if (this.isDestroyed) {
                return;
            }
            CoreAlerts.showError(error, { default: Translate.instant('core.settings.sitesyncfailed') });
        }

    }

    /**
     * Returns true if site is beeing synchronized.
     *
     * @returns True if site is beeing synchronized, false otherwise.
     */
    isSynchronizing(): boolean {
        return !!CoreSettingsHelper.getSiteSyncPromise(this.siteId);
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     */
    refreshData(refresher?: HTMLIonRefresherElement): void {
        this.handlers.getSource().setDirty(true);
        this.fetchData().finally(() => {
            refresher?.complete();
        });
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.sitesObserver.off();
        this.networkObserver.unsubscribe();
        this.handlers.destroy();
    }

}
