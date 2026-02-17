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

import { AfterViewInit, Component, OnDestroy, viewChild } from '@angular/core';

import { CoreSettingsHandlerToDisplay } from '../../services/settings-delegate';
import { CoreEventObserver, CoreEvents } from '@static/events';
import { CoreSites } from '@services/sites';
import { CoreNavigator } from '@services/navigator';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreListItemsManager } from '@classes/items-management/list-items-manager';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';
import { CoreSettingsHelper } from '@features/settings/services/settings-helper';
import { CoreNetwork } from '@services/network';
import { Translate } from '@singletons';
import { CoreConfigSettingKey } from '@/core/constants';
import { CoreConfig } from '@services/config';
import { CoreSettingsHandlersSource } from '@features/settings/classes/settings-handlers-source';
import { CoreToasts } from '@services/overlays/toasts';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that displays the list of site settings pages.
 */
@Component({
    selector: 'page-core-site-preferences',
    templateUrl: 'site.html',
    imports: [
        CoreSharedModule,
    ],
})
export default class CoreSitePreferencesPage implements AfterViewInit, OnDestroy {

    readonly splitView = viewChild.required(CoreSplitViewComponent);

    handlers: CoreListItemsManager<CoreSettingsHandlerToDisplay, CoreSettingsHandlersSource>;

    dataSaver = false;
    readonly limitedConnection = CoreNetwork.isCellularSignal;
    readonly isOnline = CoreNetwork.onlineSignal;

    protected siteId: string;
    protected sitesObserver: CoreEventObserver;
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
    }

    /**
     * @inheritdoc
     */
    async ngAfterViewInit(): Promise<void> {
        this.dataSaver = await CoreConfig.get(CoreConfigSettingKey.SYNC_ONLY_ON_WIFI, true);

        const pageToOpen = CoreNavigator.getRouteParam('page');

        try {
            await this.fetchData();
        } finally {
            const handler = pageToOpen ? this.handlers.items.find(handler =>
                ('page' in handler) && handler.page === pageToOpen) : undefined;

            if (handler) {
                this.handlers.watchSplitViewOutlet(this.splitView());

                await this.handlers.select(handler);
            } else {
                await this.handlers.start(this.splitView());
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
     * Handle click on a handler. Only for non toggle handlers.
     *
     * @param handler Handler clicked.
     */
    handlerAction(handler: CoreSettingsHandlerToDisplay): void {
        if ('action' in handler && handler.action) {
            handler.action();
        } else if ('page' in handler && handler.page) {
            this.handlers.select(handler);
        }
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.sitesObserver.off();
        this.handlers.destroy();
    }

}
